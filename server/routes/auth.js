const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { register, login, getProfile, logout, refreshToken, forgotPassword, resetPassword } = require('../auth/authController');
const { authMiddleware } = require('../middleware/authMiddleware');
const { authLimiter } = require('../middleware/rateLimiter');
const { sanitizeInput } = require('../middleware/sanitize');
const { verifyToken } = require('../config/jwt');
const User = require('../models/User');
const mailService = require('../services/mailService');
const logger = require('../utils/logger');

router.post('/register',       authLimiter, sanitizeInput, register);
router.post('/login',          authLimiter, sanitizeInput, login);
router.get('/profile',         authMiddleware, getProfile);
router.post('/logout',         authMiddleware, logout);
router.post('/refresh',        authLimiter, refreshToken);
router.post('/forgot-password',authLimiter, forgotPassword);
router.post('/reset-password', authLimiter, resetPassword);

// ── Email Doğrulama (link tıklandığında) ────────────────────────────────────
router.get('/verify-email', async (req, res) => {
  try {
    const { userId, token } = req.query;
    if (!userId || !token) {
      return res.status(400).json({ success: false, message: 'Geçersiz doğrulama bağlantısı' });
    }
    const hashed = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      _id: userId,
      emailVerifyToken: hashed,
      emailVerifyExpiry: { $gt: new Date() },
    }).select('+emailVerifyToken +emailVerifyExpiry');

    if (!user) {
      return res.status(400).json({ success: false, message: 'Bağlantı geçersiz veya süresi dolmuş' });
    }
    await User.findByIdAndUpdate(userId, {
      emailVerified: true,
      emailVerifyToken: null,
      emailVerifyExpiry: null,
    });
    logger.info(`Email doğrulandı: ${user.username}`);
    // SPA'ya yönlendir — doğrulama başarılı bildirimi gösterilecek
    res.redirect('/?emailVerified=1');
  } catch (err) {
    logger.error('Email doğrulama hatası:', err.message);
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
});

// ── Email Doğrulama Yeniden Gönder ──────────────────────────────────────────
router.post('/resend-verify', authLimiter, authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('+emailVerifyToken +emailVerifyExpiry');
    if (!user) return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });
    if (user.emailVerified) return res.json({ success: true, message: 'Email zaten doğrulanmış' });

    const rawToken    = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    await User.findByIdAndUpdate(user._id, {
      emailVerifyToken:  hashedToken,
      emailVerifyExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    const baseUrl   = process.env.PUBLIC_URL || `${req.protocol}://${req.get('host')}`;
    const verifyUrl = `${baseUrl}/api/auth/verify-email?token=${rawToken}&userId=${user._id}`;
    await mailService.sendEmailVerification(user.email, user.username, verifyUrl);

    logger.info(`Doğrulama maili yeniden gönderildi: ${user.username}`);
    res.json({ success: true, message: 'Doğrulama maili gönderildi' });
  } catch (err) {
    logger.error('Resend verify hatası:', err.message);
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
});

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
