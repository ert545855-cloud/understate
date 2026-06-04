"use strict";
const express = require('express');
const router  = express.Router();
const db      = require('../services/dbService');
const { authMiddleware } = require('../middleware/authMiddleware');

const ALLOWED_CHANNELS = /^(klan_[a-zA-Z0-9_\-]{1,60}|global|genel|liderler|ticaret|savas_plani)$/i;

// GET /api/chat/history/:channel — son N mesaj
router.get('/history/:channel', authMiddleware, async (req, res) => {
  const channel = req.params.channel.toLowerCase();
  if (!ALLOWED_CHANNELS.test(channel))
    return res.status(400).json({ success: false, message: 'Geçersiz kanal' });
  const limit = Math.min(parseInt(req.query.limit) || 50, 200);
  if (!db.isReady()) return res.json({ success: true, messages: [] });
  const messages = await db.getChannelHistory(channel, limit).catch(() => []);
  res.json({ success: true, messages });
});

// POST /api/chat/message — mesaj kaydet (socket handler bunu çağırır, client de çağırabilir)
router.post('/message', authMiddleware, async (req, res) => {
  const { channel, message, room } = req.body;
  if (!channel || !message?.trim())
    return res.status(400).json({ success: false, message: 'channel ve message gerekli' });
  const ch = (room ? `${channel}_${room}` : channel).toLowerCase();
  if (!ALLOWED_CHANNELS.test(ch))
    return res.status(400).json({ success: false, message: 'Geçersiz kanal' });
  const text = String(message).trim().slice(0, 500);
  const msgId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  await db.saveChatMessage({
    channel: ch,
    message: text,
    sender:  req.user.username,
    userId:  req.user.id,
    filtered: false,
    msgId,
  }).catch(() => {});
  const io = req.app.get('io');
  if (io) {
    io.emit('chat', {
      id: msgId, channel: ch, room: room || null,
      message: text, sender: req.user.username,
      userId: req.user.id, timestamp: Date.now(),
    });
  }
  res.json({ success: true, msgId });
});

module.exports = router;
