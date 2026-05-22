const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/authMiddleware');
const { saveUserFull } = require('../services/saveService');
const { generalLimiter } = require('../middleware/rateLimiter');
const logger = require('../utils/logger');

router.post('/', authMiddleware, generalLimiter, async (req, res) => {
  try {
    const saved = await saveUserFull(req.user.id, req.body);
    if (!saved) {
      return res.status(503).json({ success: false, message: 'Kayıt başarısız' });
    }
    res.json({ success: true, message: 'Kaydedildi' });
  } catch (err) {
    logger.error('Save route:', err.message);
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
});

module.exports = router;
