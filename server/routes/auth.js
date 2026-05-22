const express = require('express');
const router = express.Router();
const { register, login, getProfile } = require('../auth/authController');
const { authMiddleware } = require('../middleware/authMiddleware');
const { authLimiter } = require('../middleware/rateLimiter');
const { sanitizeInput } = require('../middleware/sanitize');

router.post('/register', authLimiter, sanitizeInput, register);
router.post('/login', authLimiter, sanitizeInput, login);
router.get('/profile', authMiddleware, getProfile);

module.exports = router;
