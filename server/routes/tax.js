// #15 Tax Routes
const express = require('express');
const router  = express.Router();
const { authMiddleware } = require('../middleware/authMiddleware');
const { adminMiddleware } = require('../middleware/adminMiddleware');
const taxSvc = require('../services/taxService');

router.get('/', async (req, res) => {
  const rates = await taxSvc.getAllRates();
  res.json({ success: true, rates });
});

router.get('/:city', authMiddleware, async (req, res) => {
  const rates = await taxSvc.getRates(decodeURIComponent(req.params.city));
  res.json({ success: true, rates });
});

router.put('/:city', adminMiddleware, async (req, res) => {
  const { income, trade, property } = req.body;
  const result = await taxSvc.setRates(decodeURIComponent(req.params.city), { income, trade, property }, req.user.id);
  res.json({ success: result.ok });
});

module.exports = router;
