const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/authMiddleware');
const { saveUserFull } = require('../services/saveService');
const { validateSaveData } = require('../middleware/saveValidator');
const { generalLimiter } = require('../middleware/rateLimiter');
const db = require('../services/dbService');
const logger = require('../utils/logger');

const ALLOWED_FIELDS = new Set([
  'money', 'bank', 'bank_money', 'level', 'xp', 'city', 'under_coin',
  'inventory', 'buildings', 'businesses', 'position', 'health', 'hp',
  'stats', 'achievements', 'skills', 'party_id', 'gang_id',
  'game_data', 'settings', 'socket_id', 'is_online',
  'score', 'credit_score', 'creditScore',
  'merit_points', 'meritPoints',
  'loyalty_points', 'loyaltyPoints',
  'educationLevel', 'education_level',
  'educationProgress', 'education_progress',
  'positionTag', 'position_tag',
]);

const MAX_PAYLOAD_BYTES = 512 * 1024;

function validateSavePayload(body) {
  if (!body || typeof body !== 'object') return 'Geçersiz payload';
  const raw = JSON.stringify(body);
  if (raw.length > MAX_PAYLOAD_BYTES) return `Payload çok büyük (max ${MAX_PAYLOAD_BYTES / 1024}KB)`;
  const keys = Object.keys(body);
  if (keys.length === 0) return 'Boş payload';
  const invalid = keys.filter(k => !ALLOWED_FIELDS.has(k));
  if (invalid.length) return `İzinsiz alanlar: ${invalid.slice(0, 5).join(', ')}`;
  if (body.money !== undefined && (typeof body.money !== 'number' || body.money < 0 || body.money > 1e13))
    return 'Geçersiz para değeri';
  if (body.level !== undefined && (typeof body.level !== 'number' || body.level < 1 || body.level > 9999))
    return 'Geçersiz seviye değeri';
  if (body.xp !== undefined && (typeof body.xp !== 'number' || body.xp < 0 || body.xp > 1e12))
    return 'Geçersiz XP değeri';
  if (body.health !== undefined && (typeof body.health !== 'number' || body.health < 0 || body.health > 100))
    return 'Geçersiz sağlık değeri';
  return null;
}

const globalSaveThrottle = new Map();
function throttleSave(req, res, next) {
  const key = req.user?.id || req.ip;
  const now = Date.now();
  const last = globalSaveThrottle.get(key) || 0;
  if (now - last < 5000) {
    return res.status(429).json({ success: false, message: 'Çok sık kayıt. 5 saniye bekleyin.' });
  }
  globalSaveThrottle.set(key, now);
  next();
}

setInterval(() => {
  const cutoff = Date.now() - 60000;
  for (const [k, v] of globalSaveThrottle.entries()) {
    if (v < cutoff) globalSaveThrottle.delete(k);
  }
}, 60000);

router.post('/', authMiddleware, generalLimiter, throttleSave, async (req, res) => {
  const validationError = validateSavePayload(req.body);
  if (validationError) {
    logger.warn(`[Save] Validation hatasi user=${req.user?.id}: ${validationError}`);
    return res.status(400).json({ success: false, message: validationError });
  }
  try {
    // Delta kontrolü: mevcut DB değerlerini al ve anormal artışları engelle
    let sanitized = req.body;
    try {
      const current = await db.findUserById(req.user.id);
      if (current) {
        sanitized = validateSaveData(req.body, current, req.user.id);
      }
    } catch (deltaErr) {
      logger.warn(`[Save] Delta check hatası user=${req.user?.id}: ${deltaErr.message}`);
    }
    const saved = await saveUserFull(req.user.id, sanitized);
    if (!saved) return res.status(503).json({ success: false, message: 'Kayıt başarısız' });
    res.json({ success: true, message: 'Kaydedildi' });
  } catch (err) {
    logger.error('Save route:', err.message);
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
});

module.exports = router;
