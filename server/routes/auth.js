const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { register, login, getProfile, logout, refreshToken, forgotPassword, resetPassword } = require('../auth/authController');
const { authMiddleware } = require('../middleware/authMiddleware');
const { authLimiter, registerLimiter } = require('../middleware/rateLimiter');
const { sanitizeInput } = require('../middleware/sanitize');
const { verifyToken } = require('../config/jwt');
const sb = require('../services/supabaseService');
const mailService = require('../services/mailService');
const logger = require('../utils/logger');

// Kayıt — kendi limiter'ı (login'den bağımsız)
router.post('/register',        registerLimiter, sanitizeInput, register);

// Login ve diğer auth işlemleri
router.post('/login',           authLimiter, sanitizeInput, login);
router.get('/profile',          authMiddleware, getProfile);
router.post('/logout',          authMiddleware, logout);
router.post('/refresh',         authLimiter, refreshToken);
router.post('/forgot-password', authLimiter, forgotPassword);
router.post('/reset-password',  authLimiter, resetPassword);

// ── Email Doğrulama ──────────────────────────────────────────────────────────
router.get('/verify-email', async (req, res) => {
  try {
    const { userId, token } = req.query;
    if (!userId || !token) return res.status(400).json({ success: false, message: 'Geçersiz doğrulama bağlantısı' });
    const hashed = crypto.createHash('sha256').update(token).digest('hex');
    const user = await sb.findUserByVerifyToken(hashed);
    if (!user || user.id !== userId) return res.status(400).json({ success: false, message: 'Bağlantı geçersiz veya süresi dolmuş' });
    await sb.updateUser(userId, { email_verified: true, email_verify_token: null, email_verify_expiry: null });
    logger.info(`Email doğrulandı: ${user.username}`);
    res.redirect('/?emailVerified=1');
  } catch (err) {
    logger.error('Email doğrulama hatası:', err.message);
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
});

// ── Doğrulama Maili Yeniden Gönder ──────────────────────────────────────────
router.post('/resend-verify', authLimiter, authMiddleware, async (req, res) => {
  try {
    if (!sb.isReady()) return res.status(503).json({ success: false, message: 'DB bağlı değil' });
    const user = await sb.findUserById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });
    if (user.email_verified) return res.json({ success: true, message: 'Email zaten doğrulanmış' });
    const rawToken    = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    await sb.updateUser(user.id, {
      email_verify_token:  hashedToken,
      email_verify_expiry: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });
    const baseUrl   = process.env.PUBLIC_URL || `${req.protocol}://${req.get('host')}`;
    const verifyUrl = `${baseUrl}/api/auth/verify-email?token=${rawToken}&userId=${user.id}`;
    await mailService.sendEmailVerification(user.email, user.username, verifyUrl);
    logger.info(`Doğrulama maili yeniden gönderildi: ${user.username}`);
    res.json({ success: true, message: 'Doğrulama maili gönderildi' });
  } catch (err) {
    logger.error('Resend verify hatası:', err.message);
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
});

// ── Token Doğrulama ──────────────────────────────────────────────────────────
router.get('/verify', (req, res) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer '))
    return res.status(401).json({ success: false, valid: false, message: 'Token bulunamadı' });
  try {
    const decoded = verifyToken(header.slice(7));
    const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);
    return res.json({ success: true, valid: true, expiresIn, shouldRefresh: expiresIn < 300, user: { id: decoded.id, username: decoded.username, role: decoded.role } });
  } catch {
    return res.status(401).json({ success: false, valid: false, message: 'Token geçersiz veya süresi dolmuş' });
  }
});

// ── Test Email (Admin) ─────────────────────────────────────────────
router.post('/test-email', async (req, res) => {
  try {
    const { email, type = 'verification' } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email adresi gerekli' });
    let result;
    if (type === 'verification') {
      result = await mailService.sendEmailVerification(email, 'Test Kullanici', 'https://example.com/verify?token=test');
    } else if (type === 'reset') {
      result = await mailService.sendPasswordReset(email, 'Test Kullanici', 'https://example.com/reset?token=test');
    } else if (type === 'welcome') {
      result = await mailService.sendWelcome(email, 'Test Kullanici');
    } else {
      return res.status(400).json({ success: false, message: 'Gecersiz email turu (verification|reset|welcome)' });
    }
    logger.info(`[Test Email] Gonderildi: ${email} (tur: ${type})`);
    res.json({ success: true, message: `Test emaili gonderildi: ${email}`, result });
  } catch (err) {
    logger.error('[Test Email] Hata:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
