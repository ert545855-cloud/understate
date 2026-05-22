const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { authMiddleware } = require('../middleware/authMiddleware');
const { sanitizeInput } = require('../middleware/sanitize');
const logger = require('../utils/logger');
const { getConnectionStatus } = require('../database/connection');

const SAVEABLE_FIELDS = [
  'level', 'xp', 'money', 'bankMoney', 'underCoin', 'hp',
  'score', 'creditScore', 'meritPoints', 'loyaltyPoints',
  'city', 'position', 'educationLevel', 'educationProgress',
  'inventory', 'equippedItems', 'holdings', 'gameData',
];

// GET /api/profile — load full cloud save
router.get('/', authMiddleware, async (req, res) => {
  try {
    if (!getConnectionStatus()) return res.status(503).json({ success: false, message: 'DB bağlı değil' });
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });
    res.json({ success: true, user: user.toPublicJSON() });
  } catch (err) {
    logger.error('Profile GET:', err.message);
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
});

// PUT /api/profile — auto-save / cloud save
router.put('/', authMiddleware, sanitizeInput, async (req, res) => {
  try {
    if (!getConnectionStatus()) return res.status(503).json({ success: false, message: 'DB bağlı değil' });
    const updates = { lastLogin: new Date() };
    for (const field of SAVEABLE_FIELDS) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }
    const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true });
    res.json({ success: true, user: user.toPublicJSON() });
  } catch (err) {
    logger.error('Profile PUT:', err.message);
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
});

module.exports = router;
