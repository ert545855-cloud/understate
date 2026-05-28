// #13 Time-Limited Events Routes
const express = require('express');
const router  = express.Router();
const { authMiddleware } = require('../middleware/authMiddleware');
const { adminMiddleware } = require('../middleware/adminMiddleware');
const eventSvc = require('../services/eventService');

let _io = null;
function setIO(io) { _io = io; }

router.get('/', async (req, res) => {
  const events = await eventSvc.getAll(req.query.all === 'true');
  res.json({ success: true, events });
});

router.get('/active', async (req, res) => {
  const events = await eventSvc.getActive();
  res.json({ success: true, events });
});

router.post('/:eventId/join', authMiddleware, async (req, res) => {
  const result = await eventSvc.join(req.user.id, parseInt(req.params.eventId));
  res.json({ success: result.ok, ...result });
});

router.post('/:eventId/claim', authMiddleware, async (req, res) => {
  const result = await eventSvc.claimEventReward(req.user.id, parseInt(req.params.eventId));
  res.json({ success: result.ok, ...result });
});

// Admin: create event
router.post('/', adminMiddleware, async (req, res) => {
  const { eventType, title, description, startsAt, endsAt, rewards } = req.body;
  if (!title || !startsAt || !endsAt) return res.status(400).json({ success: false, message: 'title, startsAt, endsAt gerekli' });
  const result = await eventSvc.createEvent({ eventType, title, description, startsAt: new Date(startsAt), endsAt: new Date(endsAt), rewards });
  if (result.ok && _io) _io.emit('newTimedEvent', { eventId: result.eventId, title, eventType });
  res.json({ success: result.ok, ...result });
});

module.exports = router;
module.exports.setIO = setIO;
