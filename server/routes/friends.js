// #17 Friend System + #22 Block System Routes
const express = require('express');
const router  = express.Router();
const { authMiddleware } = require('../middleware/authMiddleware');
const friendSvc = require('../services/friendService');

router.get('/', authMiddleware, async (req, res) => {
  const friends = await friendSvc.getFriends(req.user.id);
  res.json({ success: true, friends });
});

router.get('/requests', authMiddleware, async (req, res) => {
  const pending = await friendSvc.getPendingRequests(req.user.id);
  res.json({ success: true, requests: pending });
});

router.post('/add', authMiddleware, async (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ success: false, message: 'username gerekli' });
  const result = await friendSvc.sendRequest(req.user.id, username);
  res.json({ success: result.ok, ...result });
});

router.post('/respond', authMiddleware, async (req, res) => {
  const { requesterId, accept } = req.body;
  if (!requesterId) return res.status(400).json({ success: false });
  const result = await friendSvc.respondRequest(req.user.id, requesterId, !!accept);
  res.json({ success: result.ok, ...result });
});

router.delete('/:friendId', authMiddleware, async (req, res) => {
  await friendSvc.removeFriend(req.user.id, req.params.friendId);
  res.json({ success: true });
});

// Block
router.post('/block', authMiddleware, async (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ success: false });
  const result = await friendSvc.blockUser(req.user.id, username);
  res.json({ success: result.ok, ...result });
});

router.delete('/block/:blockedId', authMiddleware, async (req, res) => {
  await friendSvc.unblockUser(req.user.id, req.params.blockedId);
  res.json({ success: true });
});

router.get('/blocks', authMiddleware, async (req, res) => {
  const list = await friendSvc.getBlockList(req.user.id);
  res.json({ success: true, blocks: list });
});

module.exports = router;
