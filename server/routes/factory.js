/**
 * Factory Routes — /api/factory
 */
const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/authMiddleware');
const { generalLimiter } = require('../middleware/rateLimiter');
const factory = require('../services/factoryService');
const db = require('../services/dbService');
const logger = require('../utils/logger');

function broadcast(req, factories) {
  try { req.app.get('io')?.emit('factory:sync', { factories }); } catch(_) {}
}

// GET /api/factory — tüm fabrikalar + kullanıcının aktif seansı
router.get('/', authMiddleware, async (req, res) => {
  try {
    const [factories, session] = await Promise.all([
      factory.getFactories(),
      factory.getActiveSession(req.user.id),
    ]);
    res.json({ success: true, factories, session });
  } catch (err) {
    logger.error('[Factory] GET /:', err.message);
    res.status(500).json({ success: false });
  }
});

// POST /api/factory/create — yeni fabrika kur
router.post('/create', authMiddleware, generalLimiter, async (req, res) => {
  try {
    const { name, type, level, data } = req.body;
    if (!name || !type) return res.status(400).json({ success: false, msg: 'İsim ve tür zorunlu' });
    const result = await factory.createFactory({
      name, type, level,
      ownerUsername: req.user.username,
      data: data || {},
    });
    if (!result.ok) return res.status(400).json({ success: false, msg: result.msg });
    const factories = await factory.getFactories();
    broadcast(req, factories);
    res.json({ success: true, factory: result.factory, factories });
  } catch (err) {
    logger.error('[Factory] POST /create:', err.message);
    res.status(500).json({ success: false });
  }
});

// POST /api/factory/sync — toplu fabrika senkronizasyonu (localStorage→DB geçişi için)
router.post('/sync', authMiddleware, generalLimiter, async (req, res) => {
  try {
    const { factories: list } = req.body;
    if (!Array.isArray(list)) return res.status(400).json({ success: false });
    for (const f of list) {
      if (f?.id && f?.name) await factory.upsertFactory(f);
    }
    const factories = await factory.getFactories();
    broadcast(req, factories);
    res.json({ success: true, factories });
  } catch (err) {
    logger.error('[Factory] POST /sync:', err.message);
    res.status(500).json({ success: false });
  }
});

// POST /api/factory/work/start — fabrikada çalışmaya başla
router.post('/work/start', authMiddleware, generalLimiter, async (req, res) => {
  try {
    const { factoryId, roleKey } = req.body;
    if (!factoryId || !roleKey) return res.status(400).json({ success: false, msg: 'factoryId ve roleKey zorunlu' });

    const user = await db.findUserById(req.user.id);
    const result = await factory.startWork({
      userId: req.user.id,
      username: req.user.username,
      factoryId,
      roleKey,
      playerLevel: user?.level || 1,
    });
    if (!result.ok) return res.status(400).json({ success: false, msg: result.msg });
    res.json({ success: true, session: result.session, role: result.role, factory: result.factory });
  } catch (err) {
    logger.error('[Factory] POST /work/start:', err.message);
    res.status(500).json({ success: false });
  }
});

// POST /api/factory/work/collect — maaş al
router.post('/work/collect', authMiddleware, generalLimiter, async (req, res) => {
  try {
    const user = await db.findUserById(req.user.id);
    const tradePoints = user?.game_data?.tradePoints || 0;
    const result = await factory.collectSalary({ userId: req.user.id, tradePoints });
    if (!result.ok) return res.status(400).json({ success: false, msg: result.msg });

    // DB'de para ve XP güncelle
    await db.updateUser(req.user.id, {
      money: (Number(user?.money) || 0) + result.earned,
      xp: (Number(user?.xp) || 0) + result.xpGain,
    });

    res.json({ success: true, earned: result.earned, xpGain: result.xpGain, session: result.session });
  } catch (err) {
    logger.error('[Factory] POST /work/collect:', err.message);
    res.status(500).json({ success: false });
  }
});

// POST /api/factory/work/cancel — çalışmayı iptal et
router.post('/work/cancel', authMiddleware, async (req, res) => {
  try {
    const result = await factory.cancelWork(req.user.id);
    res.json(result);
  } catch (err) {
    logger.error('[Factory] POST /work/cancel:', err.message);
    res.status(500).json({ success: false });
  }
});

module.exports = router;
