const jwt = require('jsonwebtoken');
const User = require('../models/User');

////Extrae y valida la firma del token en la cabecera Authorization: Bearer
const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Obtener el token del header (Bearer TOKEN)
      token = req.headers.authorization.split(' ')[1];

      // Verificar el token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secreto_banco_preguntas');

      // Buscar al usuario y adjuntarlo a la petición (excluyendo la contraseña)
      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
        return res.status(401).json({ message: 'Usuario no encontrado' });
      }

      next();
    } catch (error) {
      console.error(error);
      res.status(401).json({ message: 'No autorizado, token fallido' });
    }
  }

  if (!token) {
    res.status(401).json({ message: 'No autorizado, no hay token' });
  }
};

//// Verifica que el usuario tenga rol de docente para crear materias
const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'No autorizado, se requiere rol de docente o administrador' });
  }
};


// 👑 Middleware exclusivo para el SuperAdmin (Gestión y ascenso de docentes)
//// Protege exclusivamente las rutas de gestión de cuentas para que ningún docente pueda eliminarse a sí mismo o a otros colegas"
const superAdminOnly = (req, res, next) => {
  if (
    req.user && 
    req.user.role === 'admin' && 
    (req.user.isSuperAdmin === true || 
     (req.user.username && req.user.username.toLowerCase() === 'superadmin'))
  ) {
    next();
  } else {
    res.status(403).json({ 
      message: 'Acceso denegado: Solo el SuperAdmin tiene permisos para gestionar cuentas de usuarios y docentes' 
    });
  }
};

module.exports = { protect, adminOnly, superAdminOnly };
