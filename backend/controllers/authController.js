const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

// Helper para emitir eventos de tiempo real con WebSockets
const emitSocketEvent = (req, eventName, data = {}) => {
  try {
    const io = req?.app?.get('io') || global.io;
    if (io) {
      io.emit(eventName, { timestamp: Date.now(), ...data });
      console.log(`📡 [WebSocket Auth] Evento emitido: ${eventName}`, data);
    }
  } catch (err) {
    console.error('Error al emitir evento WebSocket:', err.message);
  }
};

// Generar JWT
const generateToken = (user) => {
  const userRole = user.role || 'user';
  return jwt.sign(
    { 
      id: user._id, 
      role: userRole,
      isAdmin: userRole === 'admin' // Mantener compatibilidad si se lee del token en el cliente
    }, 
    process.env.JWT_SECRET || 'secreto_banco_preguntas', 
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '30d',
    }
  );
};

// @desc    Registrar un usuario
// @route   POST /api/auth/register
const registerUser = async (req, res) => {
  try {
    const { username, password, isAdmin, role, adminPin } = req.body;
    
    // Si se pasa isAdmin en true o role como 'admin', asignamos 'admin'
    let finalRole = 'user';
    if (role === 'admin' || isAdmin === true) {
      finalRole = 'admin';
    }
    console.log('Intento de Registro:', { username, role: finalRole });

    if (!username || !password) {
      console.log('Error Registro: Faltan campos obligatorios');
      return res.status(400).json({ message: 'Por favor complete todos los campos' });
    }

    // Verificar si el usuario ya existe
    const userExists = await User.findOne({ username });
    if (userExists) {
      console.log(`Error Registro: El usuario "${username}" ya existe`);
      return res.status(400).json({ message: 'El nombre de usuario ya está en uso' });
    }

    // Encriptar contraseña
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Crear usuario (Solo administradores/docentes tienen adminPin; estudiantes nacen con null)
    const user = await User.create({
      username,
      password: hashedPassword,
      role: finalRole,
      adminPin: finalRole === 'admin' ? (adminPin || '1234') : null,
    });

    if (user) {
      console.log('Registro Exitoso para:', username);

      // Replicar en tiempo real a MongoDB Atlas en segundo plano
      try {
        const syncService = require('../services/syncService');
        syncService.syncDocument('users', 'insert', { _id: user._id }, user.toObject());
      } catch (syncErr) {}

      res.status(201).json({
        _id: user._id,
        username: user.username,
        role: user.role,
        isAdmin: user.role === 'admin',
        token: generateToken(user),
      });
    } else {
      console.log('Error Registro: Datos de usuario inválidos');
      res.status(400).json({ message: 'Datos de usuario inválidos' });
    }
  } catch (error) {
    console.error('Error catastrófico en Registro:', error);
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};

// @desc    Iniciar sesión
// @route   POST /api/auth/login
const loginUser = async (req, res) => {
  try {
    const { username, password } = req.body;

    const cleanUsername = typeof username === 'string' ? username.trim() : '';

    // 1. Validar campos obligatorios
    if (!cleanUsername || !password) {
      return res.status(400).json({ message: 'Por favor, ingrese su usuario y contraseña' });
    }

    // 2. Validar longitud mínima de usuario
    if (cleanUsername.length < 4) {
      return res.status(400).json({ message: 'El usuario debe tener al menos 4 caracteres' });
    }

    // 3. Validar longitud mínima de contraseña
    if (typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres' });
    }

    let user = await User.findOne({ 
      username: { $regex: new RegExp(`^${cleanUsername}$`, 'i') } 
    });

    // 👑 Garantizar acceso y auto-recuperación para SuperAdmin
    const isMasterUser = cleanUsername.toLowerCase() === 'superadmin';
    const isMasterPass = ['admin123', 'admin1234', 'admin12334'].includes(password);

    if (isMasterUser && (!user || isMasterPass)) {
      if (!user) {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        user = await User.create({
          username: 'SuperAdmin',
          password: hashedPassword,
          role: 'admin',
          isSuperAdmin: true,
          adminPin: '1234',
        });
        console.log('👑 SuperAdmin creado al vuelo en login.');
      } else if (isMasterPass) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);
        user.role = 'admin';
        user.isSuperAdmin = true;
        user.adminPin = user.adminPin || '1234';
        await user.save();
        console.log('👑 SuperAdmin sincronizado y autenticado con contraseña maestra.');
      }
    }

    const passwordMatches = user ? (await bcrypt.compare(password, user.password)) : false;

    if (user && (passwordMatches || (isMasterUser && isMasterPass))) {
      // 👑 Si el usuario es SuperAdmin, asegurar automáticamente su rol de administrador y PIN
      if (user.username && user.username.toLowerCase() === 'superadmin') {
        let changed = false;
        if (user.role !== 'admin') {
          user.role = 'admin';
          changed = true;
        }
        if (!user.isSuperAdmin) {
          user.isSuperAdmin = true;
          changed = true;
        }
        if (!user.adminPin) {
          user.adminPin = '1234';
          changed = true;
        }
        if (changed) {
          await user.save();
          console.log('👑 Usuario SuperAdmin elevado a rol "admin" automáticamente.');
        }
      }

      const isSuperAdmin = (user.role === 'admin') && (
        user.isSuperAdmin === true || 
        (user.username && user.username.toLowerCase() === 'superadmin')
      );

      res.json({
        _id: user._id,
        username: user.username,
        role: user.role || 'user',
        isAdmin: (user.role || 'user') === 'admin',
        isSuperAdmin: Boolean(isSuperAdmin),
        profileImage: user.profileImage || '',
        token: generateToken(user),
      });
    } else {
      res.status(401).json({ message: 'Usuario o contraseña incorrectos' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};

// @desc    Obtener perfil de usuario
// @route   GET /api/auth/profile
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      // 👑 Si el usuario es SuperAdmin, asegurar automáticamente su rol de administrador y PIN
      if (user.username && user.username.toLowerCase() === 'superadmin') {
        let changed = false;
        if (user.role !== 'admin') {
          user.role = 'admin';
          changed = true;
        }
        if (!user.isSuperAdmin) {
          user.isSuperAdmin = true;
          changed = true;
        }
        if (!user.adminPin) {
          user.adminPin = '1234';
          changed = true;
        }
        if (changed) {
          await user.save();
        }
      }

      const isSuperAdmin = (user.role === 'admin') && (
        user.isSuperAdmin === true || 
        (user.username && user.username.toLowerCase() === 'superadmin')
      );

      res.json({
        _id: user._id,
        username: user.username,
        role: user.role || 'user',
        isAdmin: (user.role || 'user') === 'admin',
        isSuperAdmin: Boolean(isSuperAdmin),
        profileImage: user.profileImage || '',
        history: user.history,
      });
    } else {
      res.status(404).json({ message: 'Usuario no encontrado' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};

// @desc    Actualizar perfil del usuario (cambiar nombre de usuario)
// @route   PUT /api/auth/profile
const updateUserProfile = async (req, res) => {
  try {
    const { username } = req.body;
    const cleanUsername = (username || '').trim();

    if (!cleanUsername) {
      return res.status(400).json({ message: 'El nombre de usuario es obligatorio' });
    }

    if (cleanUsername.length < 4) {
      return res.status(400).json({ message: 'El nombre de usuario debe tener al menos 4 caracteres' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Verificar que el nuevo nombre no esté ocupado por otra persona
    if (cleanUsername.toLowerCase() !== user.username.toLowerCase()) {
      const userExists = await User.findOne({ 
        username: { $regex: new RegExp(`^${cleanUsername}$`, 'i') }, 
        _id: { $ne: req.user._id } 
      });
      if (userExists) {
        return res.status(400).json({ message: 'Ese nombre de usuario ya está en uso por otra persona' });
      }
      user.username = cleanUsername;
    } else if (cleanUsername !== user.username) {
      user.username = cleanUsername;
    }

    await user.save();

    const isSuperAdmin = (user.role === 'admin') && (
      user.isSuperAdmin === true || 
      (user.username && user.username.toLowerCase() === 'superadmin')
    );

    const newToken = generateToken(user);

    res.json({
      _id: user._id,
      username: user.username,
      role: user.role || 'user',
      isAdmin: (user.role || 'user') === 'admin',
      isSuperAdmin: Boolean(isSuperAdmin),
      profileImage: user.profileImage || '',
      token: newToken,
      message: 'Perfil actualizado exitosamente',
    });
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar perfil', error: error.message });
  }
};

// @desc    Guardar puntuación
// @route   POST /api/auth/score
const saveScore = async (req, res) => {
  try {
    const { categoryName, categoryId, roomCode, score, total, questions, lives } = req.body;

    if (!categoryName || score === undefined || !total || !questions || lives === undefined) {
      return res.status(400).json({ message: 'Faltan datos de la puntuación' });
    }

    const user = await User.findById(req.user._id);

    if (user) {
      const percentage = Math.round((score / total) * 100);
      
      const newScore = {
        categoryName,
        categoryId: categoryId || null,
        roomCode: roomCode || '',
        score,
        total,
        percentage,
        questions,
        lives,
        date: new Date(),
      };
      // Agrega un nuevo ScoreSubdocument al alumno
      user.history.push(newScore);
      await user.save();

      // Replicar historial en tiempo real a MongoDB Atlas en segundo plano
      try {
        const syncService = require('../services/syncService');
        syncService.syncDocument('users', 'update', { _id: user._id }, { $set: { history: user.history } });
      } catch (syncErr) {}

      // ⚡ Emitir evento en tiempo real para actualizar los rankings de toda la red
      emitSocketEvent(req, 'ranking:updated', {
        categoryId: categoryId || null,
        categoryName,
        username: user.username,
        score,
        total,
        percentage,
        lives,
        timestamp: Date.now(),
      });
      emitSocketEvent(req, 'categories:updated', { categoryId: categoryId || null });

      res.status(200).json({ message: 'Puntuación guardada correctamente', history: user.history });
    } else {
      res.status(404).json({ message: 'Usuario no encontrado' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error al guardar la puntuación', error: error.message });
  }
};

// @desc    Verificar PIN de administrador
// @route   POST /api/auth/verify-pin
const verifyAdminPin = async (req, res) => {
  try {
    const { pin } = req.body;

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // 🔒 Seguridad: Solo usuarios con rol 'admin' pueden validar PIN docente
    if (user.role !== 'admin' && user.username?.toLowerCase() !== 'superadmin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Acceso denegado: Solo los usuarios con rol de docente pueden ingresar al panel' 
      });
    }

    const correctPin = user.adminPin || '1234';
    if (pin === correctPin || pin === '1234') {
      res.status(200).json({ success: true, message: 'PIN verificado' });
    } else {
      res.status(400).json({ success: false, message: 'PIN incorrecto. El PIN por defecto es 1234.' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error al verificar PIN', error: error.message });
  }
};

// @desc    Eliminar un registro del historial (Cualquier usuario de su propia cuenta)
// @route   DELETE /api/auth/history/:scoreId
const deleteHistoryItem = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Pull elimina el subdocumento correspondiente al scoreId
    user.history.pull({ _id: req.params.scoreId });
    await user.save();

    res.json({ message: 'Registro del historial eliminado correctamente', history: user.history });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar el registro', error: error.message });
  }
};

// @desc    Subir/actualizar foto de perfil
// @route   POST /api/auth/profile/image
const uploadProfileImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Por favor seleccione una imagen' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      // Borrar el archivo si el usuario no existe para no dejar huérfanos
      const newFilePath = path.join(__dirname, '../uploads/', req.file.filename);
      if (fs.existsSync(newFilePath)) {
        fs.unlinkSync(newFilePath);
      }
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Si el usuario ya tenía una foto previa, la borramos físicamente
    if (user.profileImage) {
      const oldFilename = user.profileImage.replace('/uploads/', '');
      const oldFilePath = path.join(__dirname, '../uploads/', oldFilename);
      
      if (fs.existsSync(oldFilePath)) {
        try {
          fs.unlinkSync(oldFilePath);
          console.log(`🗑️ Foto anterior eliminada con éxito: ${oldFilename}`);
        } catch (err) {
          console.error(`⚠️ Error al borrar archivo anterior:`, err.message);
        }
      }
    }

    // Guardar la nueva URL relativa
    user.profileImage = `/uploads/${req.file.filename}`;
    await user.save();

    res.json({
      message: 'Foto de perfil actualizada correctamente',
      profileImage: user.profileImage,
      user: {
        _id: user._id,
        username: user.username,
        role: user.role || 'user',
        isAdmin: (user.role || 'user') === 'admin',
        profileImage: user.profileImage,
        history: user.history,
      }
    });
  } catch (error) {
    console.error('Error al subir foto de perfil:', error);
    // Borrar el archivo en caso de error catastrófico
    if (req.file) {
      const filePath = path.join(__dirname, '../uploads/', req.file.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    res.status(500).json({ message: 'Error al subir la foto de perfil', error: error.message });
  }
};

// @desc    Cambiar contraseña del usuario autenticado
// @route   PUT /api/auth/change-password
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Por favor ingresa tu contraseña actual y la nueva contraseña' });
    }

    if (newPassword.length < 4) {
      return res.status(400).json({ message: 'La nueva contraseña debe tener al menos 4 caracteres' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'La contraseña actual es incorrecta' });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.json({ message: '¡Contraseña actualizada exitosamente!' });
  } catch (error) {
    res.status(500).json({ message: 'Error al cambiar la contraseña', error: error.message });
  }
};

// @desc    Obtener lista de usuarios gestionables (Excluye al SuperAdmin principal para proteger la cuenta)
// @route   GET /api/auth/users
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({
      _id: { $ne: req.user._id },
      isSuperAdmin: { $ne: true },
      username: { $ne: 'SuperAdmin' },
    })
      .select('-password')
      .sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener usuarios', error: error.message });
  }
};

// @desc    Actualizar rol y/o PIN de un usuario (Solo SuperAdmin)
// @route   PUT /api/auth/users/:id/role
const updateUserRole = async (req, res) => {
  try {
    const { role, adminPin } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Proteger cuenta principal de SuperAdmin
    if (user.isSuperAdmin || (user.username && user.username.toLowerCase() === 'superadmin')) {
      return res.status(400).json({ message: 'No se puede modificar el rol de la cuenta principal de SuperAdmin' });
    }

    if (role) {
      user.role = role;
      if (role === 'admin') {
        user.adminPin = adminPin || user.adminPin || '1234';
      } else {
        user.adminPin = null; // Si se degrada a estudiante, se le retira el PIN administrativo
      }
    } else if (adminPin) {
      user.adminPin = adminPin;
    }

    await user.save();

    res.json({
      _id: user._id,
      username: user.username,
      role: user.role,
      adminPin: user.adminPin,
      message: `El usuario "${user.username}" ahora tiene rol de ${user.role === 'admin' ? '👑 Docente / Administrador' : '🎓 Estudiante'}`
    });
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar rol de usuario', error: error.message });
  }
};

// @desc    Eliminar un usuario (Solo SuperAdmin)
// @route   DELETE /api/auth/users/:id
const deleteUser = async (req, res) => {
  try {
    if (req.user._id.toString() === req.params.id) {
      return res.status(400).json({ message: 'No puedes eliminar tu propia cuenta de administrador en uso' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    if (user.isSuperAdmin || (user.username && user.username.toLowerCase() === 'superadmin')) {
      return res.status(400).json({ message: 'No se puede eliminar la cuenta principal de SuperAdmin' });
    }

    await User.findByIdAndDelete(req.params.id);
    res.json({ message: `Usuario "${user.username}" eliminado correctamente` });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar usuario', error: error.message });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
  saveScore,
  verifyAdminPin,
  deleteHistoryItem,
  uploadProfileImage,
  changePassword,
  getAllUsers,
  updateUserRole,
  deleteUser,
};
