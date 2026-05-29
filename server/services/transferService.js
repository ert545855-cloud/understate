// #16 Money Transfer
const db    = require('./dbService');
const logger = require('../utils/logger');
const notif  = require('./notificationService');

const MAX_TRANSFER = 1_000_000_000n;
const MIN_TRANSFER = 1n;

async function transfer({ senderId, receiverUsername, amount, message = '' }) {
  if (!db.isReady()) return { ok: false, message: 'DB bağlı değil' };

  const amt = BigInt(amount);
  if (amt < MIN_TRANSFER) return { ok: false, message: 'Minimum transfer 1₺' };
  if (amt > MAX_TRANSFER)  return { ok: false, message: 'Maksimum transfer 1B₺' };
  if (!message || message.length > 100) message = '';

  // Fetch sender
  const { rows: sRows } = await db.query(
    `SELECT id, username, money, is_frozen FROM users WHERE id = $1`, [senderId]
  ).catch(() => ({ rows: [] }));
  const sender = sRows[0];
  if (!sender) return { ok: false, message: 'Gönderen bulunamadı' };
  if (sender.is_frozen) return { ok: false, message: 'Hesabınız dondurulmuş' };
  if (BigInt(sender.money) < amt) return { ok: false, message: 'Yetersiz bakiye' };

  // Fetch receiver
  const { rows: rRows } = await db.query(
    `SELECT id, username, is_frozen FROM users WHERE LOWER(username) = LOWER($1)`, [receiverUsername]
  ).catch(() => ({ rows: [] }));
  const receiver = rRows[0];
  if (!receiver) return { ok: false, message: 'Alıcı bulunamadı' };
  if (receiver.id === senderId) return { ok: false, message: 'Kendinize transfer yapamazsınız' };
  if (receiver.is_frozen) return { ok: false, message: 'Alıcı hesabı dondurulmuş' };

  // Execute atomically
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`UPDATE users SET money = money - $1 WHERE id = $2`, [amt, senderId]);
    await client.query(`UPDATE users SET money = money + $1 WHERE id = $2`, [amt, receiver.id]);
    const { rows: tRows } = await client.query(
      `INSERT INTO money_transfers (sender_id, receiver_id, amount, message, transfer_type)
       VALUES ($1,$2,$3,$4,'player') RETURNING id`,
      [senderId, receiver.id, amt, message]
    );
    await client.query('COMMIT');
    logger.info(`[Transfer] ${sender.username} → ${receiver.username}: ${amt}₺ (txId=${tRows[0]?.id})`);
    // Notify receiver
    notif.notifyTransferReceived(receiver.id, sender.username, amt).catch(() => {});
    return { ok: true, txId: tRows[0]?.id, receiver: receiver.username, amount: Number(amt) };
  } catch (e) {
    await client.query('ROLLBACK');
    logger.error('[Transfer] TX failed:', e.message);
    return { ok: false, message: 'Transfer başarısız' };
  } finally { client.release(); }
}

async function getHistory(userId, limit = 50) {
  if (!db.isReady()) return [];
  const { rows } = await db.query(
    `SELECT t.*, s.username AS sender_username, r.username AS receiver_username
     FROM money_transfers t
     LEFT JOIN users s ON s.id = t.sender_id
     LEFT JOIN users r ON r.id = t.receiver_id
     WHERE t.sender_id = $1 OR t.receiver_id = $1
     ORDER BY t.created_at DESC LIMIT $2`,
    [userId, limit]
  ).catch(() => ({ rows: [] }));
  return rows;
}

module.exports = { transfer, getHistory };
