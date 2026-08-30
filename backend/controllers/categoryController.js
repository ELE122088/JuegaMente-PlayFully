const Category = require('../models/Category');
const Question = require('../models/Question');
const User = require('../models/User');

// Helper para emitir eventos de tiempo real a todos los clientes conectados
const emitCategoryUpdate = (req, eventName = 'categories:updated', data = {}) => {
  try {
    const io = req?.app?.get('io') || global.io;
    if (io) {
      io.emit(eventName, { timestamp: Date.now(), ...data });
      console.log(`📡 [WebSocket] Evento emitido a toda la red: ${eventName}`, data);
    } else {
      console.warn('⚠️ No se encontró la instancia de Socket.io para emitir');
    }
  } catch (err) {
    console.error('Error al emitir evento de WebSocket:', err.message);
  }
};

// Helper para generar PIN de 6 dígitos numéricos
const generateRoomCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// @desc    Obtener todas las categorías (público / para estudiantes)
// @route   GET /api/categories
const getCategories = async (req, res) => {
  try {
    const categories = await Category.find()
      .populate('createdBy', 'username')
      .sort({ createdAt: -1 });

    // Migración y saneamiento al vuelo para asegurar isPublic, gameMode e initialLives
    const categoriesWithCount = await Promise.all(
      categories.map(async (cat) => {
        let changed = false;

        // Si es una categoría base del sistema (o no tiene creador), marcarla como pública de práctica (5 vidas)
        if (cat.isPublic === undefined || cat.isPublic === null) {
          if (!cat.createdBy || ['Matemáticas', 'Historia', 'Ciencias', 'Ciencia y Tecnología', 'Música'].includes(cat.name)) {
            cat.isPublic = true;
            cat.gameMode = 'practice';
            cat.initialLives = 5;
            cat.roomCode = null;
            changed = true;
          } else {
            cat.isPublic = false;
            cat.gameMode = 'exam';
            cat.initialLives = 3;
            if (!cat.roomCode) cat.roomCode = generateRoomCode();
            changed = true;
          }
        } else if (!cat.isPublic && !cat.roomCode) {
          cat.roomCode = generateRoomCode();
          changed = true;
        }

        if (changed) {
          await cat.save();
        }

        const questionCount = await Question.countDocuments({ category: cat._id });
        return {
          ...cat.toObject(),
          questionCount,
        };
      })
    );

    res.json(categoriesWithCount);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener categorías', error: error.message });
  }
};

// @desc    Obtener categorías creadas por el docente autenticado
// @route   GET /api/categories/mine
const getMyCategories = async (req, res) => {
  try {
    const categories = await Category.find({ createdBy: req.user._id }).sort({ createdAt: -1 });

    const categoriesWithCount = await Promise.all(
      categories.map(async (cat) => {
        if (!cat.isPublic && !cat.roomCode) {
          cat.roomCode = generateRoomCode();
          await cat.save();
        }
        const questionCount = await Question.countDocuments({ category: cat._id, createdBy: req.user._id });
        return {
          ...cat.toObject(),
          questionCount,
        };
      })
    );

    res.json(categoriesWithCount);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener tus categorías', error: error.message });
  }
};

// @desc    Obtener una categoría por Código de Sala (PIN de 6 dígitos)
// @route   GET /api/categories/room/:code
const getCategoryByRoomCode = async (req, res) => {
  try {
    const code = req.params.code.trim().toUpperCase();
    const category = await Category.findOne({ roomCode: code }).populate('createdBy', 'username');

    if (!category) {
      return res.status(404).json({ message: 'No se encontró ninguna sala con el código PIN ingresado' });
    }

    if (category.isActive === false) {
      return res.status(403).json({ message: '🚫 Este examen ha sido cerrado por el docente. Ya no se aceptan más intentos.' });
    }

    const questionCount = await Question.countDocuments({ category: category._id });

    res.json({
      ...category.toObject(),
      questionCount,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error al buscar la sala', error: error.message });
  }
};

const getCategoryRanking = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id).lean();
    if (!category) {
      return res.status(404).json({ message: 'Categoría no encontrada' });
    }

    // ⚡ Optimización de alto rendimiento: Proyectar solo los campos necesarios, excluyendo el pesado subdocumento 'questions' y usando .lean()
    const users = await User.find(
      {
        $or: [
          { 'history.categoryId': category._id },
          { 'history.categoryName': category.name }
        ]
      },
      {
        username: 1,
        profileImage: 1,
        'history._id': 1,
        'history.categoryId': 1,
        'history.categoryName': 1,
        'history.score': 1,
        'history.total': 1,
        'history.percentage': 1,
        'history.lives': 1,
        'history.date': 1,
      }
    ).lean();

    const ranking = [];
    users.forEach((u) => {
      const attempts = u.history.filter(
        (h) =>
          (h.categoryId && h.categoryId.toString() === category._id.toString()) ||
          (!h.categoryId && h.categoryName === category.name)
      );

      // Calcular cantidad de veces que el alumno sacó 100% en esta materia (constancia)
      const perfectCount = attempts.filter((a) => a.percentage === 100).length;
      const totalAttempts = attempts.length;

      attempts.forEach((attempt) => {
        ranking.push({
          historyId: attempt._id,
          userId: u._id,
          username: u.username,
          profileImage: u.profileImage,
          score: attempt.score,
          total: attempt.total,
          percentage: attempt.percentage,
          lives: attempt.lives,
          date: attempt.date,
          perfectCount,
          totalAttempts,
        });
      });
    });

    // 🏆 Ordenamiento multicriterio:
    // 1º Mayor porcentaje (%)
    // 2º Mayor cantidad de vidas conservadas (❤️)
    // 3º Mayor cantidad de victorias perfectas 100% (Constancia 🔥)
    ranking.sort((a, b) => {
      if (b.percentage !== a.percentage) return b.percentage - a.percentage;
      if (b.lives !== a.lives) return b.lives - a.lives;
      if ((b.perfectCount || 0) !== (a.perfectCount || 0)) return (b.perfectCount || 0) - (a.perfectCount || 0);
      return 0; // Empate total si todas las métricas son idénticas
    });

    // 🥇 Asignación de Puestos Compartidos (Empates Reales)
    let currentRank = 1;
    for (let i = 0; i < ranking.length; i++) {
      if (i > 0) {
        const prev = ranking[i - 1];
        const curr = ranking[i];
        
        // Empate absoluto si tienen idéntico porcentaje, mismas vidas y misma constancia de 100%
        const isTie =
          curr.percentage === prev.percentage &&
          curr.lives === prev.lives &&
          (curr.perfectCount || 0) === (prev.perfectCount || 0);

        if (!isTie) {
          currentRank = i + 1; // Siguiente puesto natural
        }
      }
      ranking[i].rank = currentRank;
      
      // Asignar medallas (si empatan en 1º, ambos tienen 🥇)
      if (currentRank === 1) ranking[i].medal = '🥇';
      else if (currentRank === 2) ranking[i].medal = '🥈';
      else if (currentRank === 3) ranking[i].medal = '🥉';
      else ranking[i].medal = `#${currentRank}`;
    }

    res.json({
      category: {
        _id: category._id,
        name: category.name,
        roomCode: category.roomCode,
        icon: category.icon,
        color: category.color,
      },
      ranking,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener el ranking', error: error.message });
  }
};

// @desc    Eliminar una calificación individual del ranking de una categoría
// @route   DELETE /api/categories/:categoryId/ranking/:historyId
const deleteRankingItem = async (req, res) => {
  try {
    const { historyId } = req.params;
    const result = await User.updateOne(
      { 'history._id': historyId },
      { $pull: { history: { _id: historyId } } }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({ message: 'Registro de calificación no encontrado' });
    }

    // Emitir evento en tiempo real para refrescar el ranking en pantallas activas
    emitCategoryUpdate(req, 'ranking:updated', { categoryId: req.params.categoryId });

    res.json({ message: 'Calificación eliminada correctamente del ranking' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar calificación', error: error.message });
  }
};

// @desc    Vaciar todo el ranking de una categoría
// @route   DELETE /api/categories/:categoryId/ranking
const clearCategoryRanking = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({ message: 'Categoría no encontrada' });
    }

    await User.updateMany(
      {
        $or: [
          { 'history.categoryId': category._id },
          { 'history.categoryName': category.name },
        ],
      },
      {
        $pull: {
          history: {
            $or: [
              { categoryId: category._id },
              { categoryName: category.name },
            ],
          },
        },
      }
    );

    // Emitir evento en tiempo real para refrescar el ranking en pantallas activas
    emitCategoryUpdate(req, 'ranking:updated', { categoryId: req.params.categoryId });

    res.json({ message: 'Ranking de la categoría vaciado correctamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al vaciar ranking', error: error.message });
  }
};

// @desc    Obtener una categoría por ID
// @route   GET /api/categories/:id
const getCategoryById = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id).populate('createdBy', 'username');
    if (!category) {
      return res.status(404).json({ message: 'Categoría no encontrada' });
    }
    res.json(category);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener la categoría', error: error.message });
  }
};

// @desc    Crear una nueva categoría
// @route   POST /api/categories
const createCategory = async (req, res) => {
  try {
    const { name, description, icon, color, isPublic, gameMode, initialLives, timePerQuestion, isActive } = req.body;
    const finalIsPublic = isPublic !== undefined ? Boolean(isPublic) : false;
    const finalGameMode = gameMode || (finalIsPublic ? 'practice' : 'exam');
    const finalInitialLives = initialLives ? Number(initialLives) : (finalGameMode === 'practice' ? 5 : 3);
    const finalTimePerQuestion = timePerQuestion !== undefined ? Number(timePerQuestion) : 15;
    const finalIsActive = isActive !== undefined ? Boolean(isActive) : true;

    let roomCode = null;
    if (!finalIsPublic) {
      roomCode = req.body.roomCode || generateRoomCode();
      while (await Category.findOne({ roomCode })) {
        roomCode = generateRoomCode();
      }
    }

    const category = await Category.create({
      name,
      description,
      icon,
      color,
      createdBy: req.user?._id || null,
      roomCode,
      isPublic: finalIsPublic,
      gameMode: finalGameMode,
      initialLives: finalInitialLives,
      timePerQuestion: finalTimePerQuestion,
      isActive: finalIsActive,
    });

    emitCategoryUpdate(req, 'categories:updated', { action: 'create', categoryId: category._id });
    res.status(201).json(category);
  } catch (error) {
    res.status(400).json({ message: 'Error al crear la categoría', error: error.message });
  }
};

// @desc    Eliminar una categoría
// @route   DELETE /api/categories/:id
const deleteCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Categoría no encontrada' });
    }

    // Validar propiedad si la categoría tiene creador asignado
    if (category.createdBy && req.user && !category.createdBy.equals(req.user._id)) {
      return res.status(403).json({ message: 'No tienes permiso para eliminar esta categoría' });
    }

    // Eliminar también las preguntas de esta categoría
    await Question.deleteMany({ category: req.params.id });
    await Category.findByIdAndDelete(req.params.id);

    emitCategoryUpdate(req, 'categories:updated', { action: 'delete', categoryId: req.params.id });
    res.json({ message: 'Categoría y sus preguntas eliminadas correctamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar la categoría', error: error.message });
  }
};

// @desc    Actualizar una categoría
// @route   PUT /api/categories/:id
const updateCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Categoría no encontrada' });
    }

    // Validar propiedad si la categoría tiene creador asignado
    if (category.createdBy && req.user && !category.createdBy.equals(req.user._id)) {
      return res.status(403).json({ message: 'No tienes permiso para editar esta categoría' });
    }

    const { name, description, icon, color, roomCode, isPublic, gameMode, initialLives, timePerQuestion, isActive } = req.body;
    if (name !== undefined) category.name = name;
    if (description !== undefined) category.description = description;
    if (icon !== undefined) category.icon = icon;
    if (color !== undefined) category.color = color;
    if (timePerQuestion !== undefined) category.timePerQuestion = Number(timePerQuestion);
    if (isActive !== undefined) category.isActive = Boolean(isActive);

    if (isPublic !== undefined) {
      category.isPublic = Boolean(isPublic);
      if (category.isPublic) {
        category.roomCode = null;
        category.gameMode = gameMode || 'practice';
        category.initialLives = initialLives ? Number(initialLives) : 5;
      } else {
        if (!category.roomCode) category.roomCode = roomCode || generateRoomCode();
        category.gameMode = gameMode || 'exam';
        category.initialLives = initialLives ? Number(initialLives) : 3;
      }
    } else {
      if (roomCode) category.roomCode = roomCode;
      if (gameMode) category.gameMode = gameMode;
      if (initialLives) category.initialLives = Number(initialLives);
    }

    const updated = await category.save();
    emitCategoryUpdate(req, 'categories:updated', { action: 'update', categoryId: updated._id });
    res.json(updated);
  } catch (error) {
    res.status(400).json({ message: 'Error al actualizar la categoría', error: error.message });
  }
};

module.exports = {
  getCategories,
  getMyCategories,
  getCategoryByRoomCode,
  getCategoryRanking,
  deleteRankingItem,
  clearCategoryRanking,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
};
