const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verificarToken } = require('../middlewares/authMiddleware');

// Rutas públicas
router.post('/login', authController.login);
router.post('/register', authController.register);
router.post('/request-reset', authController.requestPasswordReset);  
router.post('/reset-password', authController.resetPassword);

// Rutas protegidas
router.get('/me', verificarToken, authController.getMe);
router.put('/profile', verificarToken, authController.updateProfile);
router.put('/change-password', verificarToken, authController.changePassword);

module.exports = router;