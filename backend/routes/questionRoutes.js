const express = require('express');
const router = express.Router();
const {
  getQuestions,
  getMyQuestions,
  getQuestionsByCategory,
  getRandomQuestions,
  createQuestion,
  createBulkQuestions,
  updateQuestion,
  deleteQuestion,
} = require('../controllers/questionController');

const { protect, adminOnly } = require('../middleware/authMiddleware');

router.get('/', getQuestions);
router.get('/mine', protect, adminOnly, getMyQuestions);
router.get('/category/:categoryId', getQuestionsByCategory);
router.get('/random/:categoryId', getRandomQuestions);
router.post('/', protect, adminOnly, createQuestion);
router.post('/bulk', protect, adminOnly, createBulkQuestions);
router.put('/:id', protect, adminOnly, updateQuestion);
router.delete('/:id', protect, adminOnly, deleteQuestion);

module.exports = router;
