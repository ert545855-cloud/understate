// #4 Session Management
const db = require('./dbService');
const crypto = require('crypto');
const logger = require('../utils/logger');

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function createSession(userId, refreshToken, { ip, device } = {}) {
  if (!db.isReady()) return null;
  const hash = hashToken(refreshToken);
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30d
  try {
    const { rows } = await db.query(
      `INSERT INTO user_sessions (user_id, token_hash, ip_address, device_info, expires_at)
       VALUES ($1,$2,$3,$4,$5) RETURNING id`,
      [userId, hash, ip || null, device || null, expires]
    );
    return rows[0]?.id;
  } catch (e) { logger.warn('[Session] createSession:', e.message); return null; }
}

async function touchSession(refreshToken) {
  if (!db.isReady()) return;
  const hash = hashToken(refreshToken);
  await db.query(
    `UPDATE user_sessions SET last_used_at = NOW()
     WHERE token_hash = $1 AND is_active = TRUE`,
    [hash]
  ).catch(() => {});
}

async function revokeSession(sessionId, userId) {
  if (!db.isReady()) return;
  await db.query(
    `UPDATE user_sessions SET is_active = FALSE
     WHERE id = $1 AND user_id = $2`,
    [sessionId, userId]
  ).catch(() => {});
}

async function revokeAllSessions(userId, exceptToken) {
  if (!db.isReady()) return;
  if (exceptToken) {
    const hash = hashToken(exceptToken);
    await db.query(
      `UPDATE user_sessions SET is_active = FALSE
       WHERE user_id = $1 AND token_hash != $2`,
      [userId, hash]
    ).catch(() => {});
  } else {
    await db.query(
      `UPDATE user_sessions SET is_active = FALSE WHERE user_id = $1`,
      [userId]
    ).catch(() => {});
  }
}

async function listSessions(userId) {
  if (!db.isReady()) return [];
  const { rows } = await db.query(
    `SELECT id, ip_address, device_info, created_at, last_used_at, expires_at
     FROM user_sessions WHERE user_id = $1 AND is_active = TRUE
     ORDER BY last_used_at DESC`,
    [userId]
  ).catch(() => ({ rows: [] }));
  return rows;
}

async function cleanExpired() {
  if (!db.isReady()) return;
  await db.query(
    `UPDATE user_sessions SET is_active = FALSE
     WHERE expires_at < NOW() AND is_active = TRUE`
  ).catch(() => {});
}

module.exports = { createSession, touchSession, revokeSession, revokeAllSessions, listSessions, cleanExpired, hashToken };
