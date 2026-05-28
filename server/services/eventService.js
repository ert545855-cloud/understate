// #13 Time-Limited Events
const db = require('./dbService');
const logger = require('../utils/logger');

async function createEvent({ eventType, title, description, startsAt, endsAt, rewards = {} }) {
  if (!db.isReady()) return { ok: false };
  const { rows } = await db.query(
    `INSERT INTO timed_events (event_type, title, description, starts_at, ends_at, rewards)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
    [eventType, title, description || '', startsAt, endsAt, JSON.stringify(rewards)]
  ).catch(() => ({ rows: [] }));
  if (!rows[0]) return { ok: false };
  logger.info(`[Event] Yeni etkinlik: "${title}" (${eventType}) ${startsAt} → ${endsAt}`);
  return { ok: true, eventId: rows[0].id };
}

async function getActive() {
  if (!db.isReady()) return [];
  const { rows } = await db.query(
    `SELECT * FROM timed_events
     WHERE is_active=TRUE AND starts_at <= NOW() AND ends_at > NOW()
     ORDER BY ends_at ASC`
  ).catch(() => ({ rows: [] }));
  return rows;
}

async function getAll(includePast = false) {
  if (!db.isReady()) return [];
  const { rows } = await db.query(
    `SELECT e.*,
       (SELECT COUNT(*) FROM event_participations WHERE event_id=e.id) AS participant_count
     FROM timed_events e
     WHERE e.is_active=TRUE ${includePast ? '' : 'AND e.ends_at > NOW()'}
     ORDER BY e.ends_at ASC`
  ).catch(() => ({ rows: [] }));
  return rows;
}

async function join(userId, eventId) {
  if (!db.isReady()) return { ok: false };
  const { rows: e } = await db.query(
    `SELECT * FROM timed_events WHERE id=$1 AND is_active=TRUE AND starts_at<=NOW() AND ends_at>NOW()`,
    [eventId]
  ).catch(() => ({ rows: [] }));
  if (!e[0]) return { ok: false, message: 'Aktif etkinlik bulunamadı' };

  try {
    await db.query(
      `INSERT INTO event_participations (event_id, user_id) VALUES ($1,$2)
       ON CONFLICT DO NOTHING`,
      [eventId, userId]
    );
    return { ok: true, event: e[0] };
  } catch(err) { return { ok: false, message: err.message }; }
}

async function claimEventReward(userId, eventId) {
  if (!db.isReady()) return { ok: false };
  const { rows: p } = await db.query(
    `SELECT ep.*, te.rewards, te.title FROM event_participations ep
     JOIN timed_events te ON te.id=ep.event_id
     WHERE ep.user_id=$1 AND ep.event_id=$2`,
    [userId, eventId]
  ).catch(() => ({ rows: [] }));
  if (!p[0]) return { ok: false, message: 'Katılım bulunamadı' };

  const rewards = p[0].rewards || {};
  const updates = [];
  const params  = [userId];
  if (rewards.money)  { params.push(rewards.money);  updates.push(`money=money+$${params.length}`); }
  if (rewards.xp)     { params.push(rewards.xp);     updates.push(`xp=xp+$${params.length}`); }
  if (rewards.coin)   { params.push(rewards.coin);   updates.push(`under_coin=under_coin+$${params.length}`); }
  if (updates.length) {
    await db.query(`UPDATE users SET ${updates.join(',')} WHERE id=$1`, params).catch(() => {});
  }
  return { ok: true, rewards };
}

// Seed default weekly events if none exist
async function seedDefaultEvents() {
  if (!db.isReady()) return;
  const { rows } = await db.query(`SELECT COUNT(*) AS c FROM timed_events`).catch(() => ({ rows: [{ c: 1 }] }));
  if (parseInt(rows[0].c) > 0) return;

  const now  = new Date();
  const week = new Date(now.getTime() + 7 * 86400000);
  await createEvent({ eventType: 'economic', title: 'Ekonomi Haftası', description: 'Bu hafta tüm ticaret işlemlerinde 2x XP kazanın!', startsAt: now, endsAt: week, rewards: { xp: 5000, money: 10000 } });
  await createEvent({ eventType: 'political', title: 'Seçim Sezonu', description: 'Siyasi etkinliklerde bonus oy desteği!', startsAt: now, endsAt: week, rewards: { xp: 3000 } });
}

module.exports = { createEvent, getActive, getAll, join, claimEventReward, seedDefaultEvents };
