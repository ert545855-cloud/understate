"use strict";
const express = require('express');
const router  = express.Router();
const { authMiddleware: authenticateToken } = require('../middleware/authMiddleware');
const { executeCrime, getCooldowns, getGangCrimeLog, CRIME_OPERATIONS } = require('../services/gangCrimeService');
const db = require('../services/dbService');

// GET /api/gang-crime/operations — tüm operasyonlar + kullanıcı cooldown durumları
router.get('/operations', authenticateToken, async (req, res) => {
  try {
    const cooldowns = await getCooldowns(req.user.id);
    const now = Date.now();
    const ops = CRIME_OPERATIONS.map(op => ({
      ...op,
      lastDone: cooldowns[op.id] || null,
      remainingMs: cooldowns[op.id]
        ? Math.max(0, cooldowns[op.id] + op.cooldownMs - now)
        : 0,
      ready: !cooldowns[op.id] || (cooldowns[op.id] + op.cooldownMs) <= now,
    }));
    res.json({ success: true, operations: ops });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/gang-crime/execute — operasyon gerçekleştir
router.post('/execute', authenticateToken, async (req, res) => {
  try {
    const { operationId, gangId } = req.body;
    if (!operationId) return res.status(400).json({ success: false, message: 'operationId gerekli' });

    const user = await db.findUserById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });

    // Çete seviyesini bul
    let gangLevel = 1;
    if (gangId) {
      const gang = await db.query('SELECT level FROM gangs WHERE id = $1', [gangId])
        .then(r => r.rows[0]).catch(() => null);
      if (gang) gangLevel = gang.level || 1;
    }

    const result = await executeCrime(
      req.user.id,
      gangId || null,
      operationId,
      gangLevel,
      user.level || 1
    );

    if (!result.success) {
      return res.status(400).json(result);
    }

    // Socket ile güncelle
    const io = req.app.get('io');
    if (io && user.socket_id && result.operationSuccess) {
      io.to(user.socket_id).emit('crimeResult', {
        operation: result.operation.name,
        success: result.operationSuccess,
        rewards: result.rewards,
        message: result.message,
        timestamp: Date.now(),
      });
    }

    res.json(result);
  } catch (err) {
    console.error('[gangCrime] execute error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/gang-crime/log/:gangId — çete suç geçmişi
router.get('/log/:gangId', authenticateToken, async (req, res) => {
  try {
    const log = await getGangCrimeLog(req.params.gangId, 30);
    res.json({ success: true, log });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
