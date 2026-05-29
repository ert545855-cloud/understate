// Notifications REST API
const express = require('express');
const router  = express.Router();
const { authMiddleware } = require('../middleware/authMiddleware');
const db = require('../services/dbService');

// GET /api/notifications — list (paginated)
router.get('/', authMiddleware, async (req, res) => {
  const limit  = Math.min(parseInt(req.query.limit) || 50, 200);
  const unread = req.query.unread === 'true';
  if (!db.isReady()) return res.json({ success: true, notifications: [], unread: 0 });

  let rows = await db.getNotifications(req.user.id, limit);
  if (unread) rows = rows.filter(n => !n.read);

  const unreadCount = rows.filter(n => !n.read).length;
  res.json({ success: true, notifications: rows, unreadCount });
});

// GET /api/notifications/unread — unread count only (for badge)
router.get('/unread', authMiddleware, async (req, res) => {
  if (!db.isReady()) return res.json({ success: true, count: 0 });
  const count = await db.getUnreadCount(req.user.id);
  res.json({ success: true, count });
});

// POST /api/notifications/read — mark all read
router.post('/read', authMiddleware, async (req, res) => {
  if (!db.isReady()) return res.json({ success: true });
  await db.markNotificationsRead(req.user.id);
  res.json({ success: true });
});

// PATCH /api/notifications/:id/read — mark single read
router.patch('/:id/read', authMiddleware, async (req, res) => {
  if (!db.isReady()) return res.json({ success: true });
  await db.markNotificationRead(req.user.id, req.params.id);
  res.json({ success: true });
});

// DELETE /api/notifications/:id — delete one
router.delete('/:id', authMiddleware, async (req, res) => {
  if (!db.isReady()) return res.json({ success: true });
  await db.deleteNotification(req.user.id, req.params.id);
  res.json({ success: true });
});

// DELETE /api/notifications — delete all
router.delete('/', authMiddleware, async (req, res) => {
  if (!db.isReady()) return res.json({ success: true });
  await db.query('DELETE FROM notifications WHERE user_id = $1', [req.user.id]).catch(() => {});
  res.json({ success: true });
});

module.exports = router;
