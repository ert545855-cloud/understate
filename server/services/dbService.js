/**
 * DB Service — Replit PostgreSQL
 * Tüm oyun entity'leri için tam CRUD + real-time multiplayer desteği
 */
const { Pool } = require('pg');
const logger = require('../utils/logger');

// DATABASE_URL veya AWS EB RDS_* env var'larından bağlantı konfigürasyonu oluştur
function buildPoolConfig() {
  let url = process.env.DATABASE_URL || '';

  // AWS Elastic Beanstalk RDS_* env var'larını destekle
  if (!url) {
    const { RDS_HOSTNAME, RDS_PORT, RDS_DB_NAME, RDS_USERNAME, RDS_PASSWORD } = process.env;
    if (RDS_HOSTNAME && RDS_USERNAME && RDS_PASSWORD) {
      const port = RDS_PORT || 5432;
      const db   = RDS_DB_NAME || 'understate';
      url = `postgres://${RDS_USERNAME}:${encodeURIComponent(RDS_PASSWORD)}@${RDS_HOSTNAME}:${port}/${db}`;
    }
  }

  if (!url) return {};

  const isLocal = /localhost|127\.0\.0\.1|helium|\.internal/.test(url);

  return {
    connectionString: url,
    ssl: isLocal ? false : { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  };
}

const pool = new Pool(buildPoolConfig());

let _connected = false;

pool.on('connect', () => {
  _connected = true;
});

// NOT: Burada erken pool.connect() çağrısı KASITLI OLARAK kaldırıldı.
// connection.js içindeki connectDB() zaten sunucu başladıktan sonra
// bağlantıyı test eder. Buradaki erken çağrı Render'da deploy
// timeout'una yol açıyordu (DB yanıt vermezse 10s bekliyordu).

pool.on('error', (err) => {
  logger.error('[DB] Pool bağlantı hatası:', err.message);
  // Don't set _connected=false on individual client errors — pool auto-reconnects
});

function isReady() {
  return Boolean(process.env.DATABASE_URL);
}

// Called by connection.js after the first successful query to guarantee the flag is set
function markConnected() {
  _connected = true;
}

async function query(text, params) {
  const client = await pool.connect();
  try {
    return await client.query(text, params);
  } finally {
    client.release();
  }
}

// ── USER OPERATIONS ──────────────────────────────────────────────────────────

async function findUserByUsername(username) {
  try {
    const { rows } = await query('SELECT * FROM users WHERE username = $1 LIMIT 1', [username]);
    return rows[0] || null;
  } catch (err) { logger.warn('[DB] findUserByUsername:', err.message); return null; }
}

async function findUserByEmail(email) {
  try {
    const { rows } = await query('SELECT * FROM users WHERE email = $1 LIMIT 1', [email.toLowerCase()]);
    return rows[0] || null;
  } catch (err) { logger.warn('[DB] findUserByEmail:', err.message); return null; }
}

async function findUserById(id) {
  try {
    const { rows } = await query('SELECT * FROM users WHERE id = $1 LIMIT 1', [id]);
    return rows[0] || null;
  } catch (err) { logger.warn('[DB] findUserById:', err.message); return null; }
}

async function findUserByUsernameOrEmail(usernameOrEmail) {
  try {
    const { rows } = await query(
      'SELECT * FROM users WHERE username = $1 OR email = $2 LIMIT 1',
      [usernameOrEmail, usernameOrEmail.toLowerCase()]
    );
    return rows[0] || null;
  } catch (err) { logger.warn('[DB] findUserByUsernameOrEmail:', err.message); return null; }
}

async function createUser(fields) {
  try {
    const cols = Object.keys(fields);
    const vals = Object.values(fields);
    const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
    const { rows } = await query(
      `INSERT INTO users (${cols.join(', ')}) VALUES (${placeholders}) RETURNING *`,
      vals
    );
    return { ok: true, user: rows[0] };
  } catch (err) {
    logger.warn('[DB] createUser:', err.message);
    return { ok: false, error: err.message };
  }
}

const ALLOWED_UPDATE_COLUMNS = new Set([
  'username', 'email', 'password_hash', 'ban_reason',
  'level', 'xp', 'money', 'bank_money', 'under_coin', 'hp', 'score',
  'credit_score', 'merit_points', 'loyalty_points', 'city', 'position_tag',
  'education_level', 'education_progress', 'inventory', 'equipped_items',
  'holdings', 'game_data', 'push_subscriptions', 'email_verified',
  'email_verify_token', 'email_verify_expiry', 'refresh_token',
  'reset_token', 'reset_token_expiry', 'is_online', 'socket_id', 'last_login',
]);

async function updateUser(id, fields) {
  try {
    if (!fields || Object.keys(fields).length === 0) return true;
    const entries = Object.entries(fields).filter(([col]) => {
      if (!ALLOWED_UPDATE_COLUMNS.has(col)) {
        logger.warn(`[DB] updateUser: izinsiz sütun reddedildi: ${col}`);
        return false;
      }
      return true;
    });
    if (entries.length === 0) return true;
    const sets = entries.map(([col], i) => `"${col}" = $${i + 2}`).join(', ');
    const vals = [id, ...entries.map(([, v]) => v)];
    await query(`UPDATE users SET ${sets}, updated_at = NOW() WHERE id = $1`, vals);
    return true;
  } catch (err) { logger.warn('[DB] updateUser:', err.message); return false; }
}

async function findUserByResetToken(hashedToken) {
  try {
    const { rows } = await query(
      'SELECT * FROM users WHERE reset_token = $1 AND reset_token_expiry > NOW() LIMIT 1',
      [hashedToken]
    );
    return rows[0] || null;
  } catch (err) { logger.warn('[DB] findUserByResetToken:', err.message); return null; }
}

async function findUserByVerifyToken(hashedToken) {
  try {
    const { rows } = await query(
      'SELECT * FROM users WHERE email_verify_token = $1 AND email_verify_expiry > NOW() LIMIT 1',
      [hashedToken]
    );
    return rows[0] || null;
  } catch (err) { logger.warn('[DB] findUserByVerifyToken:', err.message); return null; }
}

// ── LEADERBOARD ──────────────────────────────────────────────────────────────

async function getLeaderboardData(size = 100) {
  try {
    const [levelRes, moneyRes, bankRes, scoreRes] = await Promise.all([
      query('SELECT id, username, level, xp, city, is_online FROM users ORDER BY level DESC, xp DESC LIMIT $1', [size]),
      query('SELECT id, username, money, level, city, is_online FROM users ORDER BY money DESC LIMIT $1', [size]),
      query('SELECT id, username, bank_money, money, level, city, is_online FROM users ORDER BY bank_money DESC LIMIT $1', [size]),
      query('SELECT id, username, score, level, city, is_online FROM users ORDER BY score DESC LIMIT $1', [size]),
    ]);

    const gangRes = await query(`
      SELECT
        game_data->>'gang' AS gang_name,
        COUNT(*) AS member_count,
        SUM((game_data->>'gangPower')::int) AS gang_power,
        SUM(money) AS total_money,
        MIN(username) AS leader
      FROM users
      WHERE game_data->>'gang' IS NOT NULL AND game_data->>'gang' != ''
      GROUP BY game_data->>'gang'
      ORDER BY member_count DESC, total_money DESC
      LIMIT 50
    `).catch(() => ({ rows: [] }));

    return {
      level: levelRes.rows.map((u, i) => ({ rank: i+1, username: u.username, level: u.level, xp: u.xp, city: u.city||'', isOnline: u.is_online })),
      money: moneyRes.rows.map((u, i) => ({ rank: i+1, username: u.username, money: u.money, level: u.level, city: u.city||'', isOnline: u.is_online })),
      bank:  bankRes.rows.map((u, i) => ({ rank: i+1, username: u.username, bankMoney: u.bank_money, totalWealth: (Number(u.bank_money)||0)+(Number(u.money)||0), level: u.level, city: u.city||'', isOnline: u.is_online })),
      score: scoreRes.rows.map((u, i) => ({ rank: i+1, username: u.username, score: u.score, level: u.level, city: u.city||'', isOnline: u.is_online })),
      gang:  gangRes.rows.map((g, i) => ({ rank: i+1, gangName: g.gang_name, memberCount: Number(g.member_count), gangPower: Number(g.gang_power)||0, totalMoney: Number(g.total_money)||0, leader: g.leader })),
    };
  } catch (err) {
    logger.error('[DB] getLeaderboardData:', err.message);
    return null;
  }
}

// ── CHAT MESSAGES ─────────────────────────────────────────────────────────────

async function saveChatMessage({ channel, message, sender, userId, filtered, msgId }) {
  try {
    await query(
      'INSERT INTO chat_messages (channel, message, sender, user_id, filtered, msg_id) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (msg_id) DO NOTHING',
      [channel, message, sender, userId || null, filtered || false, msgId || null]
    );
    return true;
  } catch (err) { logger.warn('[DB] saveChatMessage:', err.message); return false; }
}

async function getChannelHistory(channel, limit = 50) {
  try {
    const { rows } = await query(
      'SELECT msg_id, channel, message, sender, user_id, created_at FROM chat_messages WHERE channel = $1 ORDER BY created_at DESC LIMIT $2',
      [channel, limit]
    );
    return rows.reverse().map(m => ({
      id: m.msg_id || m.id,
      channel: m.channel,
      message: m.message,
      sender: m.sender,
      userId: m.user_id,
      timestamp: new Date(m.created_at).getTime(),
    }));
  } catch (err) { logger.warn('[DB] getChannelHistory:', err.message); return []; }
}

// ── GAME STATE (KV Store) ─────────────────────────────────────────────────────

async function getGameState(key) {
  try {
    const { rows } = await query('SELECT value FROM game_state WHERE key = $1', [key]);
    return rows[0]?.value ?? null;
  } catch (err) { logger.warn('[DB] getGameState:', err.message); return null; }
}

async function setGameState(key, value) {
  try {
    await query(
      'INSERT INTO game_state (key, value, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()',
      [key, JSON.stringify(value)]
    );
    return true;
  } catch (err) { logger.warn('[DB] setGameState:', err.message); return false; }
}

// Toplu game state okuma (performans optimizasyonu)
async function getFullGameState(keys) {
  try {
    const wantedKeys = keys || ['elections','elections_multi','laws','announcements','cabinet','gangTerritories'];
    const placeholders = wantedKeys.map((_, i) => `$${i + 1}`).join(', ');
    const { rows } = await query(
      `SELECT key, value FROM game_state WHERE key IN (${placeholders})`,
      wantedKeys
    );
    const result = {};
    for (const row of rows) result[row.key] = row.value;
    return result;
  } catch (err) { logger.warn('[DB] getFullGameState:', err.message); return {}; }
}

// ── GANGS ─────────────────────────────────────────────────────────────────────
// Proper SQL table — visible in Supabase dashboard

async function getGangs() {
  try {
    const { rows } = await query('SELECT * FROM gangs ORDER BY power DESC, created_at ASC');
    return rows.map(r => ({
      id: r.id, name: r.name,
      type: r.type || 'gang',
      leader: r.leader_id, leaderId: r.leader_id,
      leaderName: r.leader_name || r.leader || r.leader_id || '',
      members: r.members || [], color: r.color || '#DC2626',
      territory: r.territories || r.territory || {}, power: r.power || 0,
      treasury: Number(r.treasury) || 0, rank: r.rank || 0,
      logo: r.logo || null, weapons: r.weapons || 0,
      allianceId: r.alliance_id || null,
      createdAt: r.created_at ? new Date(r.created_at).getTime() : Date.now(),
      updatedAt: r.updated_at ? new Date(r.updated_at).getTime() : Date.now(),
    }));
  } catch (err) { logger.warn('[DB] getGangs:', err.message); return []; }
}

async function setGangs(gangs) {
  if (!Array.isArray(gangs)) return false;
  try {
    for (const gang of gangs) await upsertGang(gang);
    return true;
  } catch (err) { logger.warn('[DB] setGangs:', err.message); return false; }
}

async function upsertGang(gang) {
  if (!gang?.id) return false;
  const { id, name, type, leader, leaderId, leaderName, members, color, territory, territories, power, treasury, weapons, logo, rank, allianceId } = gang;
  try {
    await query(
      `INSERT INTO gangs (id, name, type, leader_id, leader_name, members, color, territory, territories, power, treasury, weapons, logo, rank, alliance_id, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,NOW())
       ON CONFLICT (id) DO UPDATE SET
         name=EXCLUDED.name, type=EXCLUDED.type,
         leader_id=EXCLUDED.leader_id, leader_name=EXCLUDED.leader_name,
         members=EXCLUDED.members, color=EXCLUDED.color,
         territory=EXCLUDED.territory, territories=EXCLUDED.territories,
         power=EXCLUDED.power, treasury=EXCLUDED.treasury,
         weapons=EXCLUDED.weapons, logo=EXCLUDED.logo, rank=EXCLUDED.rank,
         alliance_id=EXCLUDED.alliance_id, updated_at=NOW()`,
      [id, name||'', type||'gang', leaderId||leader||null, leaderName||'',
       JSON.stringify(members||[]), color||'#DC2626',
       typeof territory === 'string' ? territory : (territory ? JSON.stringify(territory) : ''),
       JSON.stringify(territories||territory||{}),
       power||0, treasury||0, weapons||0, logo||null, rank||0, allianceId||null]
    );
    return true;
  } catch (err) { logger.warn('[DB] upsertGang:', err.message); return false; }
}

async function deleteGang(gangId) {
  try {
    await query('DELETE FROM gangs WHERE id = $1', [gangId]);
    return true;
  } catch (err) { logger.warn('[DB] deleteGang:', err.message); return false; }
}

// ── PARTIES ───────────────────────────────────────────────────────────────────
// Proper SQL table — visible in Supabase dashboard

async function getParties() {
  try {
    const { rows } = await query('SELECT * FROM parties ORDER BY influence_points DESC, created_at ASC');
    return rows.map(r => ({
      id: r.id, name: r.name, ideology: r.ideology,
      leader: r.leader_id, leaderId: r.leader_id, leaderName: r.leader_name,
      members: r.members || [], color: r.color,
      influencePoints: Number(r.influence_points) || 0,
      treasury: Number(r.treasury) || 0,
      ...(r.data || {}),
      createdAt: r.created_at ? new Date(r.created_at).getTime() : Date.now(),
      updatedAt: r.updated_at ? new Date(r.updated_at).getTime() : Date.now(),
    }));
  } catch (err) { logger.warn('[DB] getParties:', err.message); return []; }
}

async function setParties(parties) {
  if (!Array.isArray(parties)) return false;
  try {
    for (const party of parties) await upsertParty(party);
    return true;
  } catch (err) { logger.warn('[DB] setParties:', err.message); return false; }
}

async function upsertParty(party) {
  if (!party?.id) return false;
  const { id, name, ideology, leader, leaderId, leaderName, members, color, influencePoints, treasury } = party;
  try {
    await query(
      `INSERT INTO parties (id, name, ideology, leader_id, leader_name, members, color, influence_points, treasury, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())
       ON CONFLICT (id) DO UPDATE SET
         name=EXCLUDED.name, ideology=EXCLUDED.ideology, leader_id=EXCLUDED.leader_id,
         leader_name=EXCLUDED.leader_name, members=EXCLUDED.members, color=EXCLUDED.color,
         influence_points=EXCLUDED.influence_points, treasury=EXCLUDED.treasury,
         updated_at=NOW()`,
      [id, name||'', ideology||'merkez', leaderId||leader||null, leaderName||null,
       JSON.stringify(members||[]), color||'#8B5CF6',
       influencePoints||0, treasury||0]
    );
    return true;
  } catch (err) { logger.warn('[DB] upsertParty:', err.message); return false; }
}

async function deleteParty(partyId) {
  try {
    await query('DELETE FROM parties WHERE id = $1', [partyId]);
    return true;
  } catch (err) { logger.warn('[DB] deleteParty:', err.message); return false; }
}

// ── ALLIANCES ─────────────────────────────────────────────────────────────────
// Stored in game_state KV (no dedicated table)

async function getAlliances() {
  const data = await getGameState('alliances');
  return Array.isArray(data) ? data : [];
}

async function setAlliances(alliances) {
  if (!Array.isArray(alliances)) return false;
  return setGameState('alliances', alliances);
}

// ── ELECTIONS ────────────────────────────────────────────────────────────────

async function getElections() {
  const data = await getGameState('elections');
  return data || { phase: 'idle', candidates: [], votes: {}, results: null };
}

async function setElections(elections) {
  return setGameState('elections', elections);
}

async function getElectionsMulti() {
  const data = await getGameState('elections_multi');
  return data || {};
}

async function setElectionsMulti(data) {
  return setGameState('elections_multi', data);
}

// ── LAWS ─────────────────────────────────────────────────────────────────────

async function getLaws() {
  const data = await getGameState('laws');
  return Array.isArray(data) ? data : [];
}

async function setLaws(laws) {
  return setGameState('laws', Array.isArray(laws) ? laws : []);
}

// ── ANNOUNCEMENTS ─────────────────────────────────────────────────────────────

async function getAnnouncements() {
  const data = await getGameState('announcements');
  return Array.isArray(data) ? data : [];
}

async function setAnnouncements(anns) {
  return setGameState('announcements', Array.isArray(anns) ? anns : []);
}

// ── NOTIFICATIONS ─────────────────────────────────────────────────────────────

async function saveNotification(notif) {
  try {
    const uid = notif.userId || notif.user_id || null;
    if (!uid) return false;
    await query(
      `INSERT INTO notifications (user_id, type, title, message, icon, ts)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        uid,
        notif.type  || 'info',
        (notif.title || '').slice(0, 200),
        (notif.msg   || notif.body || notif.message || '').slice(0, 500),
        notif.icon  || '🔔',
        notif.ts    || Date.now(),
      ]
    );
    return true;
  } catch (err) { logger.warn('[DB] saveNotification:', err.message); return false; }
}

async function getNotifications(userId, limit = 50) {
  try {
    const { rows } = await query(
      `SELECT id, type, title, message AS msg, icon, is_read AS read, ts, created_at
       FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC LIMIT $2`,
      [userId, limit]
    );
    return rows;
  } catch { return []; }
}

async function getUnreadCount(userId) {
  try {
    const { rows } = await query(
      `SELECT COUNT(*) AS c FROM notifications WHERE user_id = $1 AND NOT is_read`,
      [userId]
    );
    return parseInt(rows[0]?.c || 0);
  } catch { return 0; }
}

async function markNotificationRead(userId, notifId) {
  try {
    await query(
      'UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2',
      [notifId, userId]
    );
    return true;
  } catch { return false; }
}

async function markNotificationsRead(userId) {
  try {
    await query('UPDATE notifications SET is_read = true WHERE user_id = $1', [userId]);
    return true;
  } catch { return false; }
}

async function deleteNotification(userId, notifId) {
  try {
    await query('DELETE FROM notifications WHERE id = $1 AND user_id = $2', [notifId, userId]);
    return true;
  } catch { return false; }
}

// ── CABINET ───────────────────────────────────────────────────────────────────

async function getCabinet() {
  const data = await getGameState('cabinet');
  return data || {};
}

async function setCabinet(cabinet) {
  return setGameState('cabinet', cabinet);
}

// ── GANG TERRITORIES ─────────────────────────────────────────────────────────

async function getGangTerritories() {
  const data = await getGameState('gangTerritories');
  return data || {};
}

async function setGangTerritories(territories) {
  return setGameState('gangTerritories', territories);
}

// ── USER SAVE (game data) ─────────────────────────────────────────────────────

const SAVEABLE = ['level','xp','money','bank_money','under_coin','hp','score',
  'credit_score','merit_points','loyalty_points','city','position_tag',
  'education_level','education_progress','inventory','equipped_items',
  'holdings','game_data'];

async function saveUserGameData(userId, data) {
  try {
    if (!userId) return false;
    const update = { last_login: new Date().toISOString() };
    const map = {
      bankMoney:'bank_money', underCoin:'under_coin', creditScore:'credit_score',
      meritPoints:'merit_points', loyaltyPoints:'loyalty_points', positionTag:'position_tag',
      educationLevel:'education_level', educationProgress:'education_progress',
      equippedItems:'equipped_items', gameData:'game_data',
      bank:'bank_money', health:'hp', position:'position_tag',
      socket_id:'socket_id', is_online:'is_online',
    };
    for (const [key, val] of Object.entries(data)) {
      const col = map[key] || key;
      if (SAVEABLE.includes(col)) update[col] = val;
    }
    if (Object.keys(update).length <= 1) return true;
    return updateUser(userId, update);
  } catch (err) { logger.warn('[DB] saveUserGameData:', err.message); return false; }
}

// ── ADMIN ────────────────────────────────────────────────────────────────────

async function getAllUsers(limit = 100, offset = 0) {
  try {
    const { rows } = await query(
      'SELECT id, username, email, role, banned, ban_reason, level, xp, money, city, is_online, created_at, last_login FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );
    return rows;
  } catch (err) { logger.warn('[DB] getAllUsers:', err.message); return []; }
}

async function getUserCount() {
  try {
    const { rows } = await query('SELECT COUNT(*) as count FROM users');
    return Number(rows[0]?.count || 0);
  } catch { return 0; }
}

module.exports = {
  isReady, markConnected, query, pool,
  // Users
  findUserById, findUserByUsername, findUserByEmail, findUserByUsernameOrEmail,
  createUser, updateUser,
  findUserByResetToken, findUserByVerifyToken,
  // Leaderboard
  getLeaderboardData,
  // Chat
  saveChatMessage, getChannelHistory,
  // Game State (KV)
  getGameState, setGameState, getFullGameState,
  // Gangs
  getGangs, setGangs, upsertGang, deleteGang,
  // Parties
  getParties, setParties, upsertParty, deleteParty,
  // Alliances
  getAlliances, setAlliances,
  // Elections
  getElections, setElections, getElectionsMulti, setElectionsMulti,
  // Laws
  getLaws, setLaws,
  // Announcements
  getAnnouncements, setAnnouncements,
  // Notifications
  saveNotification, getNotifications, getUnreadCount,
  markNotificationRead, markNotificationsRead, deleteNotification,
  // Cabinet
  getCabinet, setCabinet,
  // Territories
  getGangTerritories, setGangTerritories,
  // User game data
  saveUserGameData,
  // Admin
  getAllUsers, getUserCount,
  SUPABASE_URL: '',
  SUPABASE_ANON_KEY: '',
};
