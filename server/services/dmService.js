// #18 Direct Messages
const db    = require('./dbService');
const notif = require('./notificationService');
const { isBlocked } = require('./friendService');

async function sendDM(senderId, receiverUsername, message) {
  if (!db.isReady()) return { ok: false, message: 'DB bağlı değil' };
  const msg = String(message || '').trim().slice(0, 500);
  if (!msg) return { ok: false, message: 'Mesaj boş olamaz' };

  const { rows } = await db.query(
    `SELECT id FROM users WHERE LOWER(username)=LOWER($1)`, [receiverUsername]
  ).catch(() => ({ rows: [] }));
  const receiver = rows[0];
  if (!receiver) return { ok: false, message: 'Alıcı bulunamadı' };
  if (receiver.id === senderId) return { ok: false, message: 'Kendinize mesaj gönderemezsiniz' };

  const blocked = await isBlocked(receiver.id, senderId);
  if (blocked) return { ok: false, message: 'Bu kullanıcı mesajlarınızı engelliyor' };

  const { rows: ins } = await db.query(
    `INSERT INTO direct_messages (sender_id, receiver_id, message)
     VALUES ($1,$2,$3) RETURNING id, created_at`,
    [senderId, receiver.id, msg]
  ).catch(() => ({ rows: [] }));
  if (!ins[0]) return { ok: false, message: 'Mesaj gönderilemedi' };

  // Notify receiver (preview of message)
  const { rows: sr } = await db.query(`SELECT username FROM users WHERE id=$1`, [senderId]).catch(() => ({ rows: [] }));
  if (sr[0]) notif.notifyDM(receiver.id, sr[0].username, msg).catch(() => {});

  return { ok: true, id: ins[0].id, receiverId: receiver.id, timestamp: ins[0].created_at };
}

async function getConversation(userId, otherUserId, limit = 50) {
  if (!db.isReady()) return [];
  const { rows } = await db.query(
    `SELECT dm.*, s.username AS sender_username
     FROM direct_messages dm JOIN users s ON s.id=dm.sender_id
     WHERE (dm.sender_id=$1 AND dm.receiver_id=$2)
        OR (dm.sender_id=$2 AND dm.receiver_id=$1)
     ORDER BY dm.created_at DESC LIMIT $3`,
    [userId, otherUserId, limit]
  ).catch(() => ({ rows: [] }));
  return rows.reverse();
}

async function getInbox(userId) {
  if (!db.isReady()) return [];
  const { rows } = await db.query(
    `SELECT DISTINCT ON (partner_id)
       partner_id,
       partner_username,
       last_message,
       last_at,
       unread_count
     FROM (
       SELECT
         CASE WHEN dm.sender_id=$1 THEN dm.receiver_id ELSE dm.sender_id END AS partner_id,
         CASE WHEN dm.sender_id=$1 THEN r.username ELSE s.username END AS partner_username,
         dm.message AS last_message,
         dm.created_at AS last_at,
         COUNT(*) FILTER (WHERE dm.receiver_id=$1 AND NOT dm.is_read) OVER (
           PARTITION BY CASE WHEN dm.sender_id=$1 THEN dm.receiver_id ELSE dm.sender_id END
         ) AS unread_count
       FROM direct_messages dm
       JOIN users s ON s.id=dm.sender_id
       JOIN users r ON r.id=dm.receiver_id
       WHERE dm.sender_id=$1 OR dm.receiver_id=$1
       ORDER BY dm.created_at DESC
     ) sub
     ORDER BY partner_id, last_at DESC`,
    [userId]
  ).catch(() => ({ rows: [] }));
  return rows;
}

async function markRead(userId, otherUserId) {
  if (!db.isReady()) return;
  await db.query(
    `UPDATE direct_messages SET is_read=TRUE
     WHERE receiver_id=$1 AND sender_id=$2 AND NOT is_read`,
    [userId, otherUserId]
  ).catch(() => {});
}

module.exports = { sendDM, getConversation, getInbox, markRead };
