const Question = require('../models/Question');

// Helper para emitir eventos de tiempo real
const emitCategoryUpdate = (req, eventName = 'categories:updated', data = {}) => {
  try {
    const io = req?.app?.get('io') || global.io;
    if (io) {
      io.emit(eventName, { timestamp: Date.now(), ...data });
      console.log(`📡 [WebSocket Questions] Evento emitido: ${eventName}`, data);
    }
  } catch (err) {
    console.error('Error al emitir evento en questions:', err.message);
  }
};

// @desc    Obtener todas las preguntas
// @route   GET /api/questions
const getQuestions = async (req, res) => {
  try {
    const questions = await Question.find()
      .populate('category', 'name icon color')
      .populate('createdBy', 'username')
      .sort({ createdAt: -1 });
    res.json(questions);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener preguntas', error: error.message });
  }
};

// @desc    Obtener preguntas creadas por el docente autenticado
// @route   GET /api/questions/mine
const getMyQuestions = async (req, res) => {
  try {
    const questions = await Question.find({ createdBy: req.user._id })
      .populate('category', 'name icon color')
      .sort({ createdAt: -1 });
    res.json(questions);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener tus preguntas', error: error.message });
  }
};

// @desc    Obtener preguntas por categoría
// @route   GET /api/questions/category/:categoryId
const getQuestionsByCategory = async (req, res) => {
  try {
    const questions = await Question.find({ category: req.params.categoryId })
      .populate('category', 'name icon color')
      .sort({ createdAt: -1 });
    res.json(questions);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener preguntas', error: error.message });
  }
};

// @desc    Obtener preguntas aleatorias por categoría (para cuestionario)
// @route   GET /api/questions/random/:categoryId?limit=10
const getRandomQuestions = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    const questions = await Question.aggregate([
      { $match: { category: require('mongoose').Types.ObjectId.createFromHexString(req.params.categoryId) } },
      { $sample: { size: limit } },
    ]);

    // Populate manualmente ya que aggregate no soporta populate
    const populated = await Question.populate(questions, {
      path: 'category',
      select: 'name icon color',
    });

    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener preguntas aleatorias', error: error.message });
  }
};

// @desc    Crear una nueva pregunta
// @route   POST /api/questions
const createQuestion = async (req, res) => {
  try {
    const { text, options, correctAnswer, category } = req.body;
    const question = await Question.create({
      text,
      options,
      correctAnswer,
      category,
      createdBy: req.user?._id || null,
    });

    const populated = await question.populate('category', 'name icon color');
    emitCategoryUpdate(req, 'categories:updated', { action: 'question_create', categoryId: category });
    res.status(201).json(populated);
  } catch (error) {
    res.status(400).json({ message: 'Error al crear la pregunta', error: error.message });
  }
};

// @desc    Eliminar una pregunta
// @route   DELETE /api/questions/:id
const deleteQuestion = async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);
    if (!question) {
      return res.status(404).json({ message: 'Pregunta no encontrada' });
    }

    if (question.createdBy && req.user && !question.createdBy.equals(req.user._id)) {
      return res.status(403).json({ message: 'No tienes permiso para eliminar esta pregunta' });
    }

    const catId = question.category;
    await Question.findByIdAndDelete(req.params.id);
    emitCategoryUpdate(req, 'categories:updated', { action: 'question_delete', categoryId: catId });
    res.json({ message: 'Pregunta eliminada correctamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar la pregunta', error: error.message });
  }
};

// @desc    Actualizar una pregunta
// @route   PUT /api/questions/:id
const updateQuestion = async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);
    if (!question) {
      return res.status(404).json({ message: 'Pregunta no encontrada' });
    }

    if (question.createdBy && req.user && !question.createdBy.equals(req.user._id)) {
      return res.status(403).json({ message: 'No tienes permiso para editar esta pregunta' });
    }

    const { text, options, correctAnswer, category } = req.body;
    question.text = text || question.text;
    question.options = options || question.options;
    question.correctAnswer = correctAnswer !== undefined ? correctAnswer : question.correctAnswer;
    question.category = category || question.category;

    const updated = await question.save();
    const populated = await updated.populate('category', 'name icon color');
    emitCategoryUpdate(req, 'categories:updated', { action: 'question_update', categoryId: updated.category });
    res.json(populated);
  } catch (error) {
    res.status(400).json({ message: 'Error al actualizar la pregunta', error: error.message });
  }
};

// @desc    Crear preguntas en lote (Carga Masiva)
// @route   POST /api/questions/bulk
const createBulkQuestions = async (req, res) => {
  try {
    const { categoryId, questions } = req.body;

    if (!categoryId) {
      return res.status(400).json({ message: 'Debes seleccionar una categoría de destino' });
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ message: 'El formato debe ser una lista de preguntas válida' });
    }

    // Validar y estructurar cada pregunta
    const questionsToInsert = questions.map((q, idx) => {
      if (!q.text || !q.options || q.options.length !== 4 || q.correctAnswer === undefined) {
        throw new Error(`Pregunta #${idx + 1} inválida: Debe tener texto, 4 opciones y respuesta correcta (0-3)`);
      }
      return {
        text: String(q.text).trim(),
        options: q.options.map((opt) => String(opt).trim()),
        correctAnswer: Number(q.correctAnswer),
        category: categoryId,
        createdBy: req.user?._id || null,
      };
    });

    const inserted = await Question.insertMany(questionsToInsert);
    emitCategoryUpdate(req, 'categories:updated', { action: 'bulk_create', categoryId, count: inserted.length });
    res.status(201).json({
      message: `¡Se importaron ${inserted.length} preguntas exitosamente!`,
      count: inserted.length,
      questions: inserted,
    });
  } catch (error) {
    res.status(400).json({ message: error.message || 'Error al importar preguntas en lote' });
  }
};

module.exports = {
  getQuestions,
  getMyQuestions,
  getQuestionsByCategory,
  getRandomQuestions,
  createQuestion,
  createBulkQuestions,
  updateQuestion,
  deleteQuestion,
};
