const express = require('express');
const router = express.Router();
const sb = require('../services/supabaseService');
const { authMiddleware } = require('../middleware/authMiddleware');
const { sanitizeInput } = require('../middleware/sanitize');
const { userToPublic } = require('../auth/authController');
const logger = require('../utils/logger');

// GET /api/profile
router.get('/', authMiddleware, async (req, res) => {
  try {
    if (!sb.isReady()) return res.status(503).json({ success: false, message: 'DB bağlı değil' });
    const user = await sb.findUserById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });
    res.json({ success: true, user: userToPublic(user) });
  } catch (err) {
    logger.error('Profile GET:', err.message);
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
});

// PUT /api/profile — cloud save
router.put('/', authMiddleware, sanitizeInput, async (req, res) => {
  try {
    if (!sb.isReady()) return res.status(503).json({ success: false, message: 'DB bağlı değil' });
    await sb.saveUserGameData(req.user.id, req.body);
    const user = await sb.findUserById(req.user.id);
    res.json({ success: true, user: userToPublic(user) });
  } catch (err) {
    logger.error('Profile PUT:', err.message);
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
});

module.exports = router;
