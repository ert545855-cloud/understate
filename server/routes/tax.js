// #15 Tax Routes
const express = require('express');
const router  = express.Router();
const { authMiddleware } = require('../middleware/authMiddleware');
const taxSvc = require('../services/taxService');
const db = require('../services/dbService');

router.get('/', async (req, res) => {
  const rates = await taxSvc.getAllRates();
  res.json({ success: true, rates });
});

router.get('/:city', authMiddleware, async (req, res) => {
  const rates = await taxSvc.getRates(decodeURIComponent(req.params.city));
  res.json({ success: true, rates });
});

router.put('/:city', authMiddleware, async (req, res) => {
  const { income, trade, property } = req.body;
  const result = await taxSvc.setRates(decodeURIComponent(req.params.city), { income, trade, property }, req.user.id);
  res.json({ success: result.ok });
});

router.get('/summary/economy', async (req, res) => {
  if (!db.isReady()) return res.json({ success: true, treasury: 0, collected: 0 });
  const { rows } = await db.query(
    `SELECT value FROM game_state WHERE key='economy'`
  ).catch(() => ({ rows: [] }));
  const eco = rows[0]?.value || {};
  res.json({ success: true, treasury: eco.treasury || 0, inflation: eco.inflation || 5 });
});

module.exports = router;
