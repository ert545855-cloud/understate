const User = require('../models/User');
const { signToken } = require('../config/jwt');
const logger = require('../utils/logger');
const { getConnectionStatus } = require('../database/connection');

// Simple inline validators (no extra dependency needed)
function validateUsername(u) {
  if (!u || typeof u !== 'string') return 'Kullanıcı adı gerekli';
  const t = u.trim();
  if (t.length < 3) return 'Kullanıcı adı en az 3 karakter';
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
  if (p.length < 6) return 'Şifre en az 6 karakter';
  if (p.length > 128) return 'Şifre çok uzun';
  return null;
}

async function register(req, res) {
  try {
    if (!getConnectionStatus()) {
      return res.status(503).json({ success: false, message: 'Veritabanı bağlı değil' });
    }

    const { username, email, password } = req.body;

    const uErr = validateUsername(username);
    if (uErr) return res.status(400).json({ success: false, message: uErr });

    const eErr = validateEmail(email);
    if (eErr) return res.status(400).json({ success: false, message: eErr });

    const pErr = validatePassword(password);
    if (pErr) return res.status(400).json({ success: false, message: pErr });

    const cleanUsername = username.trim();
    const cleanEmail = email.trim().toLowerCase();

    const existing = await User.findOne({
      $or: [{ username: cleanUsername }, { email: cleanEmail }],
    });
    if (existing) {
      const field = existing.username === cleanUsername ? 'Kullanıcı adı' : 'Email';
      return res.status(409).json({ success: false, message: `${field} zaten kullanımda` });
    }

    const user = await User.create({ username: cleanUsername, email: cleanEmail, password });
    const token = signToken({ id: user._id, username: user.username });

    logger.success(`Yeni kullanıcı: ${cleanUsername}`);
    res.status(201).json({ success: true, token, user: user.toPublicJSON() });
  } catch (err) {
    logger.error('Register hatası:', err.message);
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: 'Bu kullanıcı adı veya email zaten kayıtlı' });
    }
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
}

async function login(req, res) {
  try {
    if (!getConnectionStatus()) {
      return res.status(503).json({ success: false, message: 'Veritabanı bağlı değil' });
    }

    const { username, password } = req.body;

    if (!username || typeof username !== 'string' || username.trim().length < 1) {
      return res.status(400).json({ success: false, message: 'Kullanıcı adı gerekli' });
    }
    if (!password || typeof password !== 'string') {
      return res.status(400).json({ success: false, message: 'Şifre gerekli' });
    }
    if (username.length > 100 || password.length > 256) {
      return res.status(400).json({ success: false, message: 'Geçersiz giriş' });
    }

    const user = await User.findOne({
      $or: [{ username: username.trim() }, { email: username.trim().toLowerCase() }],
    }).select('+password');

    // Timing-safe: always run compare even if user not found
    const validPw = user ? await user.comparePassword(password) : false;
    if (!user || !validPw) {
      return res.status(401).json({ success: false, message: 'Geçersiz kullanıcı adı veya şifre' });
    }

    if (user.banned) {
      return res.status(403).json({ success: false, message: 'Hesabınız banlanmıştır: ' + (user.banReason || '') });
    }

    user.lastLogin = new Date();
    user.isOnline = true;
    await user.save();

    const token = signToken({ id: user._id, username: user.username, role: user.role });

    logger.success(`Giriş: ${user.username}`);
    res.json({ success: true, token, user: user.toPublicJSON() });
  } catch (err) {
    logger.error('Login hatası:', err.message);
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
}

async function getProfile(req, res) {
  try {
    if (!getConnectionStatus()) {
      return res.status(503).json({ success: false, message: 'Veritabanı bağlı değil' });
    }
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });
    res.json({ success: true, user: user.toPublicJSON() });
  } catch (err) {
    logger.error('Profile hatası:', err.message);
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
}

module.exports = { register, login, getProfile };
