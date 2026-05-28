// #27 Portfolio History
const db = require('./dbService');
const logger = require('../utils/logger');

async function recordSnapshot(userId) {
  if (!db.isReady()) return;
  const { rows } = await db.query(
    `SELECT money, bank_money, holdings FROM users WHERE id=$1`, [userId]
  ).catch(() => ({ rows: [] }));
  const u = rows[0];
  if (!u) return;

  let holdingsValue = 0;
  try {
    const holdings = Array.isArray(u.holdings) ? u.holdings : [];
    for (const h of holdings) {
      holdingsValue += (h.qty || 0) * (h.avgPrice || h.price || 0);
    }
  } catch(_) {}

  const total = BigInt(u.money) + BigInt(u.bank_money) + BigInt(Math.round(holdingsValue));
  await db.query(
    `INSERT INTO portfolio_history (user_id, total_value, money, bank_money)
     VALUES ($1,$2,$3,$4)`,
    [userId, total, u.money, u.bank_money]
  ).catch(() => {});
}

async function getHistory(userId, days = 30) {
  if (!db.isReady()) return [];
  const { rows } = await db.query(
    `SELECT total_value, money, bank_money, recorded_at
     FROM portfolio_history
     WHERE user_id=$1 AND recorded_at > NOW() - INTERVAL '${parseInt(days)} days'
     ORDER BY recorded_at ASC`,
    [userId]
  ).catch(() => ({ rows: [] }));
  return rows;
}

// Run daily for all online-recently users
async function snapshotAllActive() {
  if (!db.isReady()) return;
  const { rows } = await db.query(
    `SELECT id FROM users WHERE is_online=TRUE OR last_login > NOW() - INTERVAL '7 days'`
  ).catch(() => ({ rows: [] }));
  for (const u of rows) {
    await recordSnapshot(u.id);
  }
  if (rows.length) logger.info(`[Portfolio] ${rows.length} kullanıcı snapshot alındı`);
}

// Cleanup old records (keep 90 days)
async function pruneOld() {
  if (!db.isReady()) return;
  await db.query(
    `DELETE FROM portfolio_history WHERE recorded_at < NOW() - INTERVAL '90 days'`
  ).catch(() => {});
}

module.exports = { recordSnapshot, getHistory, snapshotAllActive, pruneOld };
