// #17 Friend System + #22 Block System
const db     = require('./dbService');
const logger = require('../utils/logger');
const notif  = require('./notificationService');

async function sendRequest(userId, targetUsername) {
  if (!db.isReady()) return { ok: false, message: 'DB bağlı değil' };
  const { rows } = await db.query(`SELECT id FROM users WHERE LOWER(username)=LOWER($1)`, [targetUsername])
    .catch(() => ({ rows: [] }));
  const target = rows[0];
  if (!target) return { ok: false, message: 'Oyuncu bulunamadı' };
  if (target.id === userId) return { ok: false, message: 'Kendinize istek gönderemezsiniz' };

  const blocked = await isBlocked(target.id, userId);
  if (blocked) return { ok: false, message: 'Bu kullanıcı sizi engellemiş' };

  try {
    await db.query(
      `INSERT INTO friendships (user_id, friend_id, status) VALUES ($1,$2,'pending')
       ON CONFLICT (user_id, friend_id) DO NOTHING`,
      [userId, target.id]
    );
    // notify target
    const { rows: sr } = await db.query(`SELECT username FROM users WHERE id=$1`, [userId]).catch(() => ({ rows: [] }));
    if (sr[0]) notif.notifyFriendRequest(target.id, sr[0].username).catch(() => {});
    return { ok: true, message: 'Arkadaşlık isteği gönderildi', targetId: target.id };
  } catch(e) { return { ok: false, message: e.message }; }
}

async function respondRequest(userId, requesterId, accept) {
  if (!db.isReady()) return { ok: false };
  if (accept) {
    await db.query(
      `UPDATE friendships SET status='accepted', updated_at=NOW()
       WHERE user_id=$1 AND friend_id=$2 AND status='pending'`,
      [requesterId, userId]
    ).catch(() => {});
    await db.query(
      `INSERT INTO friendships (user_id, friend_id, status) VALUES ($1,$2,'accepted')
       ON CONFLICT (user_id, friend_id) DO UPDATE SET status='accepted', updated_at=NOW()`,
      [userId, requesterId]
    ).catch(() => {});
    // notify requester that their request was accepted
    const { rows: ur } = await db.query(`SELECT username FROM users WHERE id=$1`, [userId]).catch(() => ({ rows: [] }));
    if (ur[0]) notif.notifyFriendAccepted(requesterId, ur[0].username).catch(() => {});
    return { ok: true, accepted: true };
  } else {
    await db.query(
      `DELETE FROM friendships WHERE user_id=$1 AND friend_id=$2`,
      [requesterId, userId]
    ).catch(() => {});
    return { ok: true, accepted: false };
  }
}

async function removeFriend(userId, friendId) {
  if (!db.isReady()) return;
  await db.query(`DELETE FROM friendships WHERE (user_id=$1 AND friend_id=$2) OR (user_id=$2 AND friend_id=$1)`,
    [userId, friendId]).catch(() => {});
}

async function getFriends(userId) {
  if (!db.isReady()) return [];
  const { rows } = await db.query(
    `SELECT u.id, u.username, u.level, u.city, u.is_online,
            f.status, f.created_at AS friends_since
     FROM friendships f
     JOIN users u ON u.id = CASE WHEN f.user_id=$1 THEN f.friend_id ELSE f.user_id END
     WHERE (f.user_id=$1 OR f.friend_id=$1) AND f.status='accepted'`,
    [userId]
  ).catch(() => ({ rows: [] }));
  return rows;
}

async function getPendingRequests(userId) {
  if (!db.isReady()) return [];
  const { rows } = await db.query(
    `SELECT f.id, u.id AS from_user_id, u.username, u.level, f.created_at
     FROM friendships f JOIN users u ON u.id = f.user_id
     WHERE f.friend_id=$1 AND f.status='pending'`,
    [userId]
  ).catch(() => ({ rows: [] }));
  return rows;
}

async function blockUser(blockerId, targetUsername) {
  if (!db.isReady()) return { ok: false };
  const { rows } = await db.query(`SELECT id FROM users WHERE LOWER(username)=LOWER($1)`, [targetUsername])
    .catch(() => ({ rows: [] }));
  if (!rows[0]) return { ok: false, message: 'Oyuncu bulunamadı' };
  const targetId = rows[0].id;
  await db.query(`DELETE FROM friendships WHERE (user_id=$1 AND friend_id=$2) OR (user_id=$2 AND friend_id=$1)`,
    [blockerId, targetId]).catch(() => {});
  await db.query(`INSERT INTO user_blocks (blocker_id, blocked_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
    [blockerId, targetId]).catch(() => {});
  return { ok: true };
}

async function unblockUser(blockerId, blockedId) {
  if (!db.isReady()) return;
  await db.query(`DELETE FROM user_blocks WHERE blocker_id=$1 AND blocked_id=$2`,
    [blockerId, blockedId]).catch(() => {});
}

async function isBlocked(blockerId, blockedId) {
  if (!db.isReady()) return false;
  const { rows } = await db.query(
    `SELECT 1 FROM user_blocks WHERE blocker_id=$1 AND blocked_id=$2`, [blockerId, blockedId]
  ).catch(() => ({ rows: [] }));
  return rows.length > 0;
}

async function getBlockList(userId) {
  if (!db.isReady()) return [];
  const { rows } = await db.query(
    `SELECT u.id, u.username FROM user_blocks b JOIN users u ON u.id=b.blocked_id WHERE b.blocker_id=$1`,
    [userId]
  ).catch(() => ({ rows: [] }));
  return rows;
}

module.exports = { sendRequest, respondRequest, removeFriend, getFriends, getPendingRequests, blockUser, unblockUser, isBlocked, getBlockList };
