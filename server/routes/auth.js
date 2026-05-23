const express = require('express');
const router = express.Router();
const { register, login, getProfile, logout, refreshToken, forgotPassword, resetPassword } = require('../auth/authController');
const { authMiddleware } = require('../middleware/authMiddleware');
const { authLimiter } = require('../middleware/rateLimiter');
const { sanitizeInput } = require('../middleware/sanitize');
const { verifyToken } = require('../config/jwt');

router.post('/register',       authLimiter, sanitizeInput, register);
router.post('/login',          authLimiter, sanitizeInput, login);
router.get('/profile',         authMiddleware, getProfile);
router.post('/logout',         authMiddleware, logout);
router.post('/refresh',        authLimiter, refreshToken);
router.post('/forgot-password',authLimiter, forgotPassword);
router.post('/reset-password', authLimiter, resetPassword);

// Token doğrulama — istemci "token hâlâ geçerli mi?" diye sorabilir
router.get('/verify', (req, res) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, valid: false, message: 'Token bulunamadı' });
  }
  try {
    const decoded = verifyToken(header.slice(7));
    // Sona 5 dakikadan az kaldıysa yenileme öner
    const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);
    return res.json({
      success: true,
      valid: true,
      expiresIn,
      shouldRefresh: expiresIn < 300,
      user: { id: decoded.id, username: decoded.username, role: decoded.role }
    });
  } catch (err) {
    return res.status(401).json({ success: false, valid: false, message: 'Token geçersiz veya süresi dolmuş' });
  }
});

module.exports = router;
