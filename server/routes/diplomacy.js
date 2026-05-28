// #20 Alliance Diplomacy Routes
const express = require('express');
const router  = express.Router();
const { authMiddleware } = require('../middleware/authMiddleware');
const dipSvc = require('../services/diplomacyService');

let _io = null;
function setIO(io) { _io = io; }

router.get('/', async (req, res) => {
  const actions = await dipSvc.getAll({ status: req.query.status });
  res.json({ success: true, actions });
});

router.get('/alliance/:name', async (req, res) => {
  const actions = await dipSvc.getActive(req.params.name);
  res.json({ success: true, actions });
});

router.get('/types', (req, res) => {
  res.json({ success: true, types: dipSvc.VALID_ACTIONS });
});

router.post('/', authMiddleware, async (req, res) => {
  const result = await dipSvc.propose(req.user.id, req.body);
  if (result.ok && _io) _io.emit('diplomacyProposal', { id: result.id, ...req.body });
  res.json({ success: result.ok, ...result });
});

router.post('/:id/respond', authMiddleware, async (req, res) => {
  const { accept } = req.body;
  const result = await dipSvc.respond(parseInt(req.params.id), req.user.id, !!accept);
  if (result.ok && _io) _io.emit('diplomacyResponse', { id: req.params.id, status: result.status });
  res.json({ success: result.ok, ...result });
});

module.exports = router;
module.exports.setIO = setIO;
