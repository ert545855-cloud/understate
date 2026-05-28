// #29 #30 #31 #32 Parliament Routes
const express = require('express');
const router  = express.Router();
const { authMiddleware } = require('../middleware/authMiddleware');
const { adminMiddleware } = require('../middleware/adminMiddleware');
const parlSvc = require('../services/parliamentService');

let _io = null;
function setIO(io) { _io = io; }

// Bills
router.get('/bills', async (req, res) => {
  const result = await parlSvc.getBills({ status: req.query.status, page: parseInt(req.query.page) || 1 });
  res.json({ success: true, ...result });
});

router.post('/bills', authMiddleware, async (req, res) => {
  const result = await parlSvc.proposeBill(req.user.id, req.body);
  if (result.ok && _io) _io.emit('parliamentBill', { action: 'new', billId: result.billId });
  res.json({ success: result.ok, ...result });
});

router.post('/bills/:billId/vote', authMiddleware, async (req, res) => {
  const { vote } = req.body;
  const result = await parlSvc.voteOnBill(req.user.id, parseInt(req.params.billId), vote);
  if (result.ok && _io) _io.emit('parliamentVote', { billId: req.params.billId, vote });
  res.json({ success: result.ok, ...result });
});

// Campaign spending (#30)
router.post('/campaign', authMiddleware, async (req, res) => {
  const result = await parlSvc.spendCampaign(req.user.id, req.body);
  res.json({ success: result.ok, ...result });
});

// Presidency (#32)
router.get('/president', async (req, res) => {
  const db = require('../services/dbService');
  const { rows } = await db.query(
    `SELECT id, username, level, city, presidency_until FROM users WHERE presidency_until > NOW() ORDER BY presidency_until DESC LIMIT 1`
  ).catch(() => ({ rows: [] }));
  res.json({ success: true, president: rows[0] || null });
});

router.post('/grant-presidency/:userId', adminMiddleware, async (req, res) => {
  const { days = 30 } = req.body;
  await parlSvc.grantPresidency(req.params.userId, days);
  if (_io) _io.emit('presidencyChange', { userId: req.params.userId });
  res.json({ success: true });
});

module.exports = router;
module.exports.setIO = setIO;
