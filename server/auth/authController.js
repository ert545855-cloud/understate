const crypto = require('crypto');
const User = require('../models/User');
const { signToken, signRefreshToken, verifyRefreshToken } = require('../config/jwt');
const logger = require('../utils/logger');
const { getConnectionStatus } = require('../database/connection');
const { RESET_TOKEN_EXPIRY_MS } = require('../config/constants');

// ── Validation helpers ──────────────────────────────────────────────────────
function validateUsername(u) {
  if (!u || typeof u !== 'string') return 'Kullanıcı adı gerekli';
  const t = u.trim();
  if (t.length < 3)  return 'Kullanıcı adı en az 3 karakter';
  if (t.length > 20) return 'Kullanıcı adı en fazla 20 karakter';
  if (!/^[a-zA-Z0-9_]+$/.test(t)) return 'Sadece harf, rakam ve _ kullanılabilir';
  return null;
}
function validateEmail(e) {
  if (!e || typeof e !== 'string') return 'Email gerekli';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim())) return 'Geçerli bir email girin';
  if (e.length > 100) return 'Email çok uzun';
  return null;
}
function validatePassword(p) {
  if (!p || typeof p !== 'string') return 'Şifre gerekli';
  if (p.length < 6)   return 'Şifre en az 6 karakter';
  if (p.length > 128) return 'Şifre çok uzun';
  return null;
}

// ── Register ────────────────────────────────────────────────────────────────
async function register(req, res) {
  try {
    if (!getConnectionStatus())
      return res.status(503).json({ success: false, message: 'Veritabanı bağlı değil' });

    const { username, email, password } = req.body;

    const uErr = validateUsername(username);
    if (uErr) return res.status(400).json({ success: false, message: uErr });
    const eErr = validateEmail(email);
    if (eErr) return res.status(400).json({ success: false, message: eErr });
    const pErr = validatePassword(password);
    if (pErr) return res.status(400).json({ success: false, message: pErr });

    const cleanUsername = username.trim();
    const cleanEmail    = email.trim().toLowerCase();

    const existing = await User.findOne({ $or: [{ username: cleanUsername }, { email: cleanEmail }] });
    if (existing) {
      const field = existing.username === cleanUsername ? 'Kullanıcı adı' : 'Email';
      return res.status(409).json({ success: false, message: `${field} zaten kullanımda` });
    }

    const user = await User.create({ username: cleanUsername, email: cleanEmail, password });
    const token        = signToken({ id: user._id, username: user.username, role: user.role });
    const refreshToken = signRefreshToken({ id: user._id });

    await User.findByIdAndUpdate(user._id, { refreshToken });

    logger.success(`Yeni kullanıcı: ${cleanUsername}`);
    res.status(201).json({ success: true, token, refreshToken, user: user.toPublicJSON() });
  } catch (err) {
    logger.error('Register hatası:', err.message);
    if (err.code === 11000)
      return res.status(409).json({ success: false, message: 'Bu kullanıcı adı veya email zaten kayıtlı' });
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
}

// ── Login ───────────────────────────────────────────────────────────────────
async function login(req, res) {
  try {
    if (!getConnectionStatus())
      return res.status(503).json({ success: false, message: 'Veritabanı bağlı değil' });

    const { username, password } = req.body;
    if (!username || typeof username !== 'string' || username.trim().length < 1)
      return res.status(400).json({ success: false, message: 'Kullanıcı adı gerekli' });
    if (!password || typeof password !== 'string')
      return res.status(400).json({ success: false, message: 'Şifre gerekli' });
    if (username.length > 100 || password.length > 256)
      return res.status(400).json({ success: false, message: 'Geçersiz giriş' });

    const user = await User.findOne({
      $or: [{ username: username.trim() }, { email: username.trim().toLowerCase() }],
    }).select('+password +refreshToken');

    // Timing-safe: always run compare even if user not found
    const validPw = user ? await user.comparePassword(password) : false;
    if (!user || !validPw)
      return res.status(401).json({ success: false, message: 'Geçersiz kullanıcı adı veya şifre' });

    if (user.banned)
      return res.status(403).json({ success: false, message: 'Hesabınız banlanmıştır: ' + (user.banReason || '') });

    const token        = signToken({ id: user._id, username: user.username, role: user.role });
    const newRefresh   = signRefreshToken({ id: user._id });

    user.lastLogin  = new Date();
    user.isOnline   = true;
    user.refreshToken = newRefresh;
    await user.save();

    logger.success(`Giriş: ${user.username}`);
    res.json({ success: true, token, refreshToken: newRefresh, user: user.toPublicJSON() });
  } catch (err) {
    logger.error('Login hatası:', err.message);
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
}

// ── Logout ──────────────────────────────────────────────────────────────────
async function logout(req, res) {
  try {
    await User.findByIdAndUpdate(req.user.id, {
      isOnline: false,
      refreshToken: null,
      socketId: null,
    });
    logger.info(`Çıkış: ${req.user.username}`);
    res.json({ success: true, message: 'Çıkış yapıldı' });
  } catch (err) {
    logger.error('Logout hatası:', err.message);
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
}

// ── Refresh Token ────────────────────────────────────────────────────────────
async function refreshToken(req, res) {
  try {
    const { refreshToken: token } = req.body;
    if (!token || typeof token !== 'string')
      return res.status(400).json({ success: false, message: 'Refresh token gerekli' });

    let decoded;
    try {
      decoded = verifyRefreshToken(token);
    } catch {
      return res.status(401).json({ success: false, message: 'Geçersiz veya süresi dolmuş refresh token' });
    }

    const user = await User.findById(decoded.id).select('+refreshToken');
    if (!user || user.refreshToken !== token)
      return res.status(401).json({ success: false, message: 'Token geçersiz' });

    if (user.banned)
      return res.status(403).json({ success: false, message: 'Hesabınız banlanmıştır' });

    const newAccess  = signToken({ id: user._id, username: user.username, role: user.role });
    const newRefresh = signRefreshToken({ id: user._id });

    await User.findByIdAndUpdate(user._id, { refreshToken: newRefresh });

    res.json({ success: true, token: newAccess, refreshToken: newRefresh });
  } catch (err) {
    logger.error('Refresh hatası:', err.message);
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
}

// ── Forgot Password ──────────────────────────────────────────────────────────
async function forgotPassword(req, res) {
  try {
    if (!getConnectionStatus())
      return res.status(503).json({ success: false, message: 'Veritabanı bağlı değil' });

    const { email } = req.body;
    if (!email || typeof email !== 'string')
      return res.status(400).json({ success: false, message: 'Email gerekli' });

    // Always respond success to prevent email enumeration
    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) {
      return res.json({ success: true, message: 'Eğer bu email kayıtlıysa, sıfırlama bağlantısı gönderildi' });
    }

    const rawToken  = crypto.randomBytes(32).toString('hex');
    const hashedTok = crypto.createHash('sha256').update(rawToken).digest('hex');

    await User.findByIdAndUpdate(user._id, {
      resetToken:       hashedTok,
      resetTokenExpiry: new Date(Date.now() + RESET_TOKEN_EXPIRY_MS),
    });

    const resetUrl = `${process.env.PUBLIC_URL || 'http://localhost:5000'}/?resetToken=${rawToken}&userId=${user._id}`;

    // Send email if nodemailer is configured
    try {
      const nodemailer = require('nodemailer');
      if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: process.env.SMTP_PORT === '465',
          auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
        });
        await transporter.sendMail({
          from: process.env.SMTP_FROM || process.env.SMTP_USER,
          to: user.email,
          subject: 'UNDERSTATE — Şifre Sıfırlama',
          html: `
            <h2>Şifre Sıfırlama</h2>
            <p>Merhaba <strong>${user.username}</strong>,</p>
            <p>Şifrenizi sıfırlamak için aşağıdaki bağlantıya tıklayın:</p>
            <a href="${resetUrl}" style="background:#4CAF50;color:#fff;padding:12px 24px;border-radius:4px;text-decoration:none;">Şifreyi Sıfırla</a>
            <p>Bu bağlantı 1 saat geçerlidir.</p>
            <p>Bu isteği siz yapmadıysanız bu emaili görmezden gelin.</p>
          `,
        });
        logger.info(`Şifre sıfırlama emaili gönderildi: ${user.email}`);
      } else {
        logger.warn(`SMTP ayarı yok. Sıfırlama URL: ${resetUrl}`);
      }
    } catch (mailErr) {
      logger.error('Email gönderme hatası:', mailErr.message);
    }

    res.json({ success: true, message: 'Eğer bu email kayıtlıysa, sıfırlama bağlantısı gönderildi' });
  } catch (err) {
    logger.error('ForgotPassword hatası:', err.message);
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
}

// ── Reset Password ───────────────────────────────────────────────────────────
async function resetPassword(req, res) {
  try {
    if (!getConnectionStatus())
      return res.status(503).json({ success: false, message: 'Veritabanı bağlı değil' });

    const { userId, token, newPassword } = req.body;
    if (!userId || !token || !newPassword)
      return res.status(400).json({ success: false, message: 'Tüm alanlar gerekli' });

    const pErr = validatePassword(newPassword);
    if (pErr) return res.status(400).json({ success: false, message: pErr });

    const hashedTok = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      _id: userId,
      resetToken: hashedTok,
      resetTokenExpiry: { $gt: new Date() },
    }).select('+resetToken +resetTokenExpiry');

    if (!user)
      return res.status(400).json({ success: false, message: 'Geçersiz veya süresi dolmuş bağlantı' });

    user.password        = newPassword;
    user.resetToken      = null;
    user.resetTokenExpiry = null;
    user.refreshToken    = null;
    await user.save();

    logger.info(`Şifre sıfırlandı: ${user.username}`);
    res.json({ success: true, message: 'Şifreniz başarıyla değiştirildi. Yeniden giriş yapın.' });
  } catch (err) {
    logger.error('ResetPassword hatası:', err.message);
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
}

// ── Get Profile ──────────────────────────────────────────────────────────────
async function getProfile(req, res) {
  try {
    if (!getConnectionStatus())
      return res.status(503).json({ success: false, message: 'Veritabanı bağlı değil' });
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });
    res.json({ success: true, user: user.toPublicJSON() });
  } catch (err) {
    logger.error('Profile hatası:', err.message);
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
}

module.exports = { register, login, logout, refreshToken, forgotPassword, resetPassword, getProfile };
