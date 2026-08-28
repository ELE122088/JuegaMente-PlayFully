const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/authController');
const { protect, adminOnly, superAdminOnly } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/profile', protect, getUserProfile);
router.put('/profile', protect, updateUserProfile);
router.put('/change-password', protect, changePassword);
router.post('/score', protect, saveScore);
router.post('/verify-pin', protect, verifyAdminPin);
router.delete('/history/:scoreId', protect, deleteHistoryItem);

// 👑 Rutas de Gestión de Usuarios y Docentes (EXCLUSIVO SuperAdmin)
router.get('/users', protect, superAdminOnly, getAllUsers);
router.put('/users/:id/role', protect, superAdminOnly, updateUserRole);
router.delete('/users/:id', protect, superAdminOnly, deleteUser);

// Ruta para subir foto de perfil (con manejo elegante de errores de carga)
router.post('/profile/image', protect, (req, res, next) => {
  upload.single('profileImage')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ message: err.message });
    }
    next();
  });
}, uploadProfileImage);

module.exports = router;
