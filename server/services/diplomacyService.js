// #20 Alliance Diplomacy
const db = require('./dbService');
const logger = require('../utils/logger');

const VALID_ACTIONS = ['war_declaration', 'ceasefire', 'trade_treaty', 'territory_deal', 'non_aggression'];

async function propose(initiatorId, { allianceA, allianceB, actionType, metadata = {}, expiresHours = 72 }) {
  if (!db.isReady()) return { ok: false, message: 'DB bağlı değil' };
  if (!VALID_ACTIONS.includes(actionType)) return { ok: false, message: 'Geçersiz diplomatik aksiyon' };
  const expires = new Date(Date.now() + expiresHours * 3600000);
  const { rows } = await db.query(
    `INSERT INTO alliance_diplomacy (alliance_a, alliance_b, action_type, initiator_id, expires_at, metadata)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
    [allianceA, allianceB || null, actionType, initiatorId, expires, JSON.stringify(metadata)]
  ).catch(() => ({ rows: [] }));
  if (!rows[0]) return { ok: false, message: 'Öneri oluşturulamadı' };
  logger.info(`[Diplomacy] ${actionType}: ${allianceA} → ${allianceB || 'herkese'}`);
  return { ok: true, id: rows[0].id };
}

async function respond(id, responderId, accept) {
  if (!db.isReady()) return { ok: false };
  const { rows: d } = await db.query(
    `SELECT * FROM alliance_diplomacy WHERE id=$1 AND status='pending' AND expires_at > NOW()`, [id]
  ).catch(() => ({ rows: [] }));
  if (!d[0]) return { ok: false, message: 'Aktif öneri bulunamadı' };
  const newStatus = accept ? 'active' : 'rejected';
  await db.query(
    `UPDATE alliance_diplomacy SET status=$2 WHERE id=$1`, [id, newStatus]
  ).catch(() => {});
  logger.info(`[Diplomacy] ${id}: ${accept ? 'KABUL' : 'RED'} by ${responderId}`);
  return { ok: true, status: newStatus };
}

async function getActive(allianceName) {
  if (!db.isReady()) return [];
  const { rows } = await db.query(
    `SELECT d.*, u.username AS initiator_username
     FROM alliance_diplomacy d LEFT JOIN users u ON u.id=d.initiator_id
     WHERE (d.alliance_a=$1 OR d.alliance_b=$1)
       AND d.status='active' AND (d.expires_at IS NULL OR d.expires_at > NOW())
     ORDER BY d.created_at DESC`,
    [allianceName]
  ).catch(() => ({ rows: [] }));
  return rows;
}

async function getAll({ status, page = 1, limit = 20 } = {}) {
  if (!db.isReady()) return [];
  const params = [limit, (page - 1) * limit];
  let where = '';
  if (status) { params.unshift(status); where = `WHERE d.status=$1`; }
  const { rows } = await db.query(
    `SELECT d.*, u.username AS initiator_username
     FROM alliance_diplomacy d LEFT JOIN users u ON u.id=d.initiator_id
     ${where} ORDER BY d.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  ).catch(() => ({ rows: [] }));
  return rows;
}

async function expireOld() {
  if (!db.isReady()) return;
  await db.query(
    `UPDATE alliance_diplomacy SET status='expired'
     WHERE status IN ('pending','active') AND expires_at < NOW()`
  ).catch(() => {});
}

module.exports = { propose, respond, getActive, getAll, expireOld, VALID_ACTIONS };
