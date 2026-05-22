const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { authMiddleware } = require('../middleware/authMiddleware');
const { sanitizeInput } = require('../middleware/sanitize');
const logger = require('../utils/logger');
const { getConnectionStatus } = require('../database/connection');

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

router.put('/', authMiddleware, sanitizeInput, async (req, res) => {
  try {
    if (!getConnectionStatus()) return res.status(503).json({ success: false, message: 'DB bağlı değil' });
    const { level, xp, money, inventory, equippedItems } = req.body;
    const updates = {};
    if (level !== undefined) updates.level = Math.max(1, parseInt(level) || 1);
    if (xp !== undefined) updates.xp = Math.max(0, parseInt(xp) || 0);
    if (money !== undefined) updates.money = Math.max(0, parseInt(money) || 0);
    if (inventory !== undefined) updates.inventory = inventory;
    if (equippedItems !== undefined) updates.equippedItems = equippedItems;

    const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true });
    res.json({ success: true, user: user.toPublicJSON() });
  } catch (err) {
    logger.error('Profile PUT:', err.message);
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
});

module.exports = router;
