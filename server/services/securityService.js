// #33 IP Ban + #34 Suspicious Transaction Freeze
const db = require('./dbService');
const logger = require('../utils/logger');

// ── IP Bans ──────────────────────────────────────────────────────────────────
async function banIP(ip, { reason = 'Manuel ban', bannedBy = null, hours = null } = {}) {
  if (!db.isReady()) return false;
  const expires = hours ? new Date(Date.now() + hours * 3600000) : null;
  await db.query(
    `INSERT INTO ip_bans (ip_address, reason, banned_by, expires_at)
     VALUES ($1,$2,$3,$4)
     ON CONFLICT (ip_address) DO UPDATE
     SET reason=$2, banned_by=$3, expires_at=$4, created_at=NOW()`,
    [ip, reason, bannedBy, expires]
  ).catch(() => {});
  logger.warn(`[Security] IP banlı: ${ip} | sebep: ${reason}`);
  return true;
}

async function unbanIP(ip) {
  if (!db.isReady()) return;
  await db.query(`DELETE FROM ip_bans WHERE ip_address=$1`, [ip]).catch(() => {});
}

async function isIPBanned(ip) {
  if (!db.isReady()) return false;
  const { rows } = await db.query(
    `SELECT 1 FROM ip_bans
     WHERE ip_address=$1 AND (expires_at IS NULL OR expires_at > NOW())`,
    [ip]
  ).catch(() => ({ rows: [] }));
  return rows.length > 0;
}

async function listIPBans() {
  if (!db.isReady()) return [];
  const { rows } = await db.query(
    `SELECT b.*, u.username AS banned_by_username
     FROM ip_bans b LEFT JOIN users u ON u.id=b.banned_by
     ORDER BY b.created_at DESC`
  ).catch(() => ({ rows: [] }));
  return rows;
}

// ── Security Flags & Auto-Freeze ─────────────────────────────────────────────
async function flagUser(userId, flagType, details = {}) {
  if (!db.isReady()) return;
  await db.query(
    `INSERT INTO security_flags (user_id, flag_type, details)
     VALUES ($1,$2,$3)`,
    [userId, flagType, JSON.stringify(details)]
  ).catch(() => {});
}

async function autoFreeze(userId, reason, details = {}) {
  if (!db.isReady()) return;
  await db.query(
    `UPDATE users SET is_frozen=TRUE, freeze_reason=$2 WHERE id=$1 AND is_frozen=FALSE`,
    [userId, reason]
  ).catch(() => {});
  await db.query(
    `INSERT INTO security_flags (user_id, flag_type, details, auto_frozen)
     VALUES ($1,'auto_freeze',$2,TRUE)`,
    [userId, JSON.stringify({ reason, ...details })]
  ).catch(() => {});
  logger.warn(`[Security] Kullanıcı donduruldu: ${userId} | ${reason}`);
}

async function unfreezeUser(userId) {
  if (!db.isReady()) return;
  await db.query(
    `UPDATE users SET is_frozen=FALSE, freeze_reason=NULL WHERE id=$1`, [userId]
  ).catch(() => {});
  await db.query(
    `UPDATE security_flags SET is_resolved=TRUE WHERE user_id=$1 AND NOT is_resolved`, [userId]
  ).catch(() => {});
}

async function getFlags(userId) {
  if (!db.isReady()) return [];
  const { rows } = await db.query(
    `SELECT * FROM security_flags WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100`, [userId]
  ).catch(() => ({ rows: [] }));
  return rows;
}

async function getAllUnresolved() {
  if (!db.isReady()) return [];
  const { rows } = await db.query(
    `SELECT sf.*, u.username, u.money, u.level
     FROM security_flags sf JOIN users u ON u.id=sf.user_id
     WHERE NOT sf.is_resolved ORDER BY sf.created_at DESC LIMIT 200`
  ).catch(() => ({ rows: [] }));
  return rows;
}

// ── Delta-based anomaly detection ────────────────────────────────────────────
const THRESHOLDS = {
  money:      { maxGainPerMinute: 1_000_000 },
  xp:         { maxGainPerMinute: 10_000    },
  level:      { maxGainPerHour:   5         },
};
const _snapshots = new Map(); // userId → { money, xp, level, ts }

async function checkAnomaly(userId, newValues) {
  const prev = _snapshots.get(userId);
  const now  = Date.now();
  if (prev) {
    const minElapsed = (now - prev.ts) / 60000;
    if (minElapsed > 0) {
      const moneyGain = (newValues.money || 0) - prev.money;
      const xpGain    = (newValues.xp    || 0) - prev.xp;
      const lvlGain   = (newValues.level || 0) - prev.level;

      if (moneyGain / minElapsed > THRESHOLDS.money.maxGainPerMinute) {
        await flagUser(userId, 'suspicious_money', { moneyGain, minElapsed });
        if (moneyGain / minElapsed > THRESHOLDS.money.maxGainPerMinute * 10)
          await autoFreeze(userId, 'Anormal para artışı', { moneyGain });
      }
      if (xpGain / minElapsed > THRESHOLDS.xp.maxGainPerMinute) {
        await flagUser(userId, 'suspicious_xp', { xpGain, minElapsed });
      }
      if (lvlGain > THRESHOLDS.level.maxGainPerHour && minElapsed < 60) {
        await flagUser(userId, 'suspicious_level', { lvlGain, minElapsed });
      }
    }
  }
  _snapshots.set(userId, { money: newValues.money || 0, xp: newValues.xp || 0, level: newValues.level || 0, ts: now });
}

module.exports = { banIP, unbanIP, isIPBanned, listIPBans, flagUser, autoFreeze, unfreezeUser, getFlags, getAllUnresolved, checkAnomaly };
