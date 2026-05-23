const express = require('express');
const router = express.Router();
const { register, login, getProfile, logout, refreshToken, forgotPassword, resetPassword } = require('../auth/authController');
const { authMiddleware } = require('../middleware/authMiddleware');
const { authLimiter } = require('../middleware/rateLimiter');
const { sanitizeInput } = require('../middleware/sanitize');

router.post('/register',       authLimiter, sanitizeInput, register);
router.post('/login',          authLimiter, sanitizeInput, login);
router.get('/profile',         authMiddleware, getProfile);
router.post('/logout',         authMiddleware, logout);
router.post('/refresh',        authLimiter, refreshToken);
router.post('/forgot-password',authLimiter, forgotPassword);
router.post('/reset-password', authLimiter, resetPassword);

module.exports = router;
