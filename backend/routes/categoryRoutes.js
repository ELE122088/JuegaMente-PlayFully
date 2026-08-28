const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/categoryController');

const { protect, adminOnly } = require('../middleware/authMiddleware');

router.get('/', getCategories);
router.get('/mine', protect, adminOnly, getMyCategories);
router.get('/room/:code', getCategoryByRoomCode);
router.get('/:id/ranking', protect, getCategoryRanking);
router.delete('/:id/ranking/:historyId', protect, adminOnly, deleteRankingItem);
router.delete('/:id/ranking', protect, adminOnly, clearCategoryRanking);
router.get('/:id', getCategoryById);
router.post('/', protect, adminOnly, createCategory);
router.put('/:id', protect, adminOnly, updateCategory);
router.delete('/:id', protect, adminOnly, deleteCategory);

module.exports = router;

