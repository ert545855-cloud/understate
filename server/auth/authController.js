const User = require('../models/User');
const { signToken } = require('../config/jwt');
const logger = require('../utils/logger');
const { getConnectionStatus } = require('../database/connection');

async function register(req, res) {
  try {
    if (!getConnectionStatus()) {
      return res.status(503).json({ success: false, message: 'Veritabanı bağlı değil' });
    }

    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ success: false, message: 'Tüm alanları doldurun' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Şifre en az 6 karakter olmalı' });
    }

    const existing = await User.findOne({ $or: [{ username }, { email }] });
    if (existing) {
      const field = existing.username === username ? 'Kullanıcı adı' : 'Email';
      return res.status(409).json({ success: false, message: `${field} zaten kullanımda` });
    }

    const user = await User.create({ username, email, password });
    const token = signToken({ id: user._id, username: user.username });

    logger.success(`Yeni kullanıcı: ${username}`);
    res.status(201).json({ success: true, token, user: user.toPublicJSON() });
  } catch (err) {
    logger.error('Register hatası:', err.message);
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
}

async function login(req, res) {
  try {
    if (!getConnectionStatus()) {
      return res.status(503).json({ success: false, message: 'Veritabanı bağlı değil' });
    }

    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Kullanıcı adı ve şifre gerekli' });
    }

    const user = await User.findOne({
      $or: [{ username }, { email: username }],
    }).select('+password');

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Geçersiz kullanıcı adı veya şifre' });
    }

    user.lastLogin = new Date();
    await user.save();

    const token = signToken({ id: user._id, username: user.username });

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
