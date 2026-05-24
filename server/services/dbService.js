/**
 * DB Service — Replit PostgreSQL versiyonu
 * Supabase yerine Replit'in dahili PostgreSQL veritabanı kullanılır.
 * Aynı arayüz korunur (isReady, findUserById, vb.)
 */
const { Pool } = require('pg');
const logger = require('../utils/logger');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  logger.error('[DB] Beklenmeyen pool hatası:', err.message);
});

function isReady() {
  return Boolean(process.env.DATABASE_URL);
}

async function query(text, params) {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result;
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

async function updateUser(id, fields) {
  try {
    if (!fields || Object.keys(fields).length === 0) return true;
    const entries = Object.entries(fields);
    const sets = entries.map(([col], i) => `${col} = $${i + 2}`).join(', ');
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

// ── CHAT MESSAGES ────────────────────────────────────────────────────────────

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

// ── GAME STATE ───────────────────────────────────────────────────────────────

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

// ── USER SAVE (game data) ────────────────────────────────────────────────────

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
  } catch (err) { return 0; }
}

module.exports = {
  isReady, query, pool,
  findUserById, findUserByUsername, findUserByEmail, findUserByUsernameOrEmail,
  createUser, updateUser,
  findUserByResetToken, findUserByVerifyToken,
  getLeaderboardData,
  saveChatMessage, getChannelHistory,
  getGameState, setGameState,
  saveUserGameData,
  getAllUsers, getUserCount,
  SUPABASE_URL: '',
  SUPABASE_ANON_KEY: '',
};
