/**
 * Jobs Routes — /api/jobs
 * Sunucu taraflı cooldown doğrulama ve ödül hesaplama.
 */
const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/authMiddleware');
const { generalLimiter } = require('../middleware/rateLimiter');
const { doJob, getCooldowns, STANDARD_JOBS } = require('../services/jobService');
const db = require('../services/dbService');
const logger = require('../utils/logger');

// GET /api/jobs — iş listesi + kullanıcının cooldown'ları
router.get('/', authMiddleware, async (req, res) => {
  try {
    const cooldowns = await getCooldowns(req.user.id);
    res.json({ success: true, jobs: STANDARD_JOBS, cooldowns });
  } catch (err) {
    logger.error('[Jobs] GET /:', err.message);
    res.status(500).json({ success: false });
  }
});

// POST /api/jobs/do — iş yap
router.post('/do', authMiddleware, generalLimiter, async (req, res) => {
  try {
    const { jobId } = req.body;
    if (!jobId) return res.status(400).json({ success: false, msg: 'jobId zorunlu' });

    const user = await db.findUserById(req.user.id);
    if (!user) return res.status(404).json({ success: false });

    const result = await doJob({
      userId: req.user.id,
      jobId,
      playerLevel: user.level || 1,
      tradePoints: user.game_data?.tradePoints || 0,
      packages: user.game_data?.packages || {},
      ucMultiplier: user.game_data?.ucMultiplier,
    });

    if (!result.ok) return res.status(400).json({ success: false, msg: result.msg, remaining: result.remaining });

    // DB'de para, XP ve UC güncelle
    const newMoney = (Number(user.money) || 0) + result.earned;
    const newXp = (Number(user.xp) || 0) + result.xpGain;
    const newUc = (Number(user.under_coin) || 0) + (result.ucEarned || 0);
    await db.updateUser(req.user.id, { money: newMoney, xp: newXp, under_coin: newUc });

    res.json({
      success: true,
      earned: result.earned,
      xpGain: result.xpGain,
      ucEarned: result.ucEarned || 0,
      job: result.job,
      newMoney,
      newXp,
      newUc,
    });
  } catch (err) {
    logger.error('[Jobs] POST /do:', err.message);
    res.status(500).json({ success: false });
  }
});

// GET /api/jobs/cooldowns — sadece cooldown'lar (polling için)
router.get('/cooldowns', authMiddleware, async (req, res) => {
  try {
    const cooldowns = await getCooldowns(req.user.id);
    res.json({ success: true, cooldowns });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

module.exports = router;
