// #7 Error Log Service
const db = require('./dbService');

async function log(errorType, message, { stack, context = {}, ip, userId } = {}) {
  if (!db || !db.isReady()) return;
  await db.query(
    `INSERT INTO error_logs (error_type, message, stack, context, ip_address, user_id)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [errorType, String(message).slice(0, 500), stack ? String(stack).slice(0, 2000) : null,
     JSON.stringify(context), ip || null, userId || null]
  ).catch(() => {}); // never throw
}

async function getRecent(limit = 100, errorType) {
  if (!db.isReady()) return [];
  const params = [limit];
  let where = '';
  if (errorType) { params.push(errorType); where = `WHERE error_type=$2`; }
  const { rows } = await db.query(
    `SELECT * FROM error_logs ${where} ORDER BY created_at DESC LIMIT $1`, params
  ).catch(() => ({ rows: [] }));
  return rows;
}

async function pruneOld(days = 30) {
  if (!db.isReady()) return;
  await db.query(
    `DELETE FROM error_logs WHERE created_at < NOW() - INTERVAL '${parseInt(days)} days'`
  ).catch(() => {});
}

module.exports = { log, getRecent, pruneOld };
