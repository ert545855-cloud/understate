/**
 * Supabase Service — backend tarafı
 * MongoDB + Firebase yerine Supabase PostgreSQL + Realtime kullanır.
 * service_role key ile çalışır (RLS bypass).
 */
const { createClient } = require('@supabase/supabase-js');
const logger = require('../utils/logger');

const SUPABASE_URL          = process.env.SUPABASE_URL          || '';
const SUPABASE_SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '';
const SUPABASE_ANON_KEY     = process.env.SUPABASE_ANON_KEY     || '';

let _admin = null;  // service_role client
let _anon  = null;  // anon client (frontend ile aynı)

function getAdmin() {
  if (!_admin && SUPABASE_URL && SUPABASE_SERVICE_KEY) {
    _admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
    logger.success('Supabase admin client hazır ✓');
  }
  return _admin;
}

function getAnon() {
  if (!_anon && SUPABASE_URL && SUPABASE_ANON_KEY) {
    _anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return _anon;
}

function isReady() {
  return Boolean(SUPABASE_URL && SUPABASE_SERVICE_KEY);
}

// ── USER OPERATIONS ──────────────────────────────────────────────────────────

async function findUserByUsername(username) {
  const sb = getAdmin();
  if (!sb) return null;
  const { data, error } = await sb.from('users')
    .select('*')
    .eq('username', username)
    .single();
  if (error) return null;
  return data;
}

async function findUserByEmail(email) {
  const sb = getAdmin();
  if (!sb) return null;
  const { data, error } = await sb.from('users')
    .select('*')
    .eq('email', email.toLowerCase())
    .single();
  if (error) return null;
  return data;
}

async function findUserById(id) {
  const sb = getAdmin();
  if (!sb) return null;
  const { data, error } = await sb.from('users')
    .select('*')
    .eq('id', id)
    .single();
  if (error) return null;
  return data;
}

async function findUserByUsernameOrEmail(usernameOrEmail) {
  const sb = getAdmin();
  if (!sb) return null;
  const { data, error } = await sb.from('users')
    .select('*')
    .or(`username.eq.${usernameOrEmail},email.eq.${usernameOrEmail.toLowerCase()}`)
    .single();
  if (error) return null;
  return data;
}

async function createUser(fields) {
  const sb = getAdmin();
  if (!sb) return { ok: false, error: 'Supabase bağlı değil' };
  const { data, error } = await sb.from('users')
    .insert([fields])
    .select()
    .single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, user: data };
}

async function updateUser(id, fields) {
  const sb = getAdmin();
  if (!sb) return false;
  const { error } = await sb.from('users')
    .update(fields)
    .eq('id', id);
  if (error) { logger.warn('[SB] updateUser hata:', error.message); return false; }
  return true;
}

async function findUserByResetToken(hashedToken) {
  const sb = getAdmin();
  if (!sb) return null;
  const { data, error } = await sb.from('users')
    .select('*')
    .eq('reset_token', hashedToken)
    .gt('reset_token_expiry', new Date().toISOString())
    .single();
  if (error) return null;
  return data;
}

async function findUserByVerifyToken(hashedToken) {
  const sb = getAdmin();
  if (!sb) return null;
  const { data, error } = await sb.from('users')
    .select('*')
    .eq('email_verify_token', hashedToken)
    .gt('email_verify_expiry', new Date().toISOString())
    .single();
  if (error) return null;
  return data;
}

// ── LEADERBOARD ──────────────────────────────────────────────────────────────

async function getLeaderboardData(size = 100) {
  const sb = getAdmin();
  if (!sb) return null;

  const [levelRes, moneyRes, bankRes, scoreRes] = await Promise.all([
    sb.from('users').select('id,username,level,xp,city,is_online').order('level', { ascending: false }).order('xp', { ascending: false }).limit(size),
    sb.from('users').select('id,username,money,level,city,is_online').order('money', { ascending: false }).limit(size),
    sb.from('users').select('id,username,bank_money,money,level,city,is_online').order('bank_money', { ascending: false }).limit(size),
    sb.from('users').select('id,username,score,level,city,is_online').order('score', { ascending: false }).limit(size),
  ]);

  // Gang leaderboard: group by game_data->gang
  const { data: gangData } = await sb.rpc('gang_leaderboard', { limit_count: 50 }).catch(() => ({ data: [] }));

  return {
    level: (levelRes.data || []).map((u, i) => ({ rank: i+1, username: u.username, level: u.level, xp: u.xp, city: u.city||'', isOnline: u.is_online })),
    money: (moneyRes.data || []).map((u, i) => ({ rank: i+1, username: u.username, money: u.money, level: u.level, city: u.city||'', isOnline: u.is_online })),
    bank:  (bankRes.data  || []).map((u, i) => ({ rank: i+1, username: u.username, bankMoney: u.bank_money, totalWealth: (u.bank_money||0)+(u.money||0), level: u.level, city: u.city||'', isOnline: u.is_online })),
    score: (scoreRes.data || []).map((u, i) => ({ rank: i+1, username: u.username, score: u.score, level: u.level, city: u.city||'', isOnline: u.is_online })),
    gang:  (gangData || []).map((g, i) => ({ rank: i+1, gangName: g.gang_name, memberCount: g.member_count, gangPower: g.gang_power, totalMoney: g.total_money, leader: g.leader })),
  };
}

// ── CHAT MESSAGES ────────────────────────────────────────────────────────────

async function saveChatMessage({ channel, message, sender, userId, filtered, msgId }) {
  const sb = getAdmin();
  if (!sb) return false;
  const { error } = await sb.from('chat_messages').insert([{
    channel, message, sender,
    user_id: userId || null,
    filtered: filtered || false,
    msg_id: msgId || null,
  }]);
  if (error) { logger.warn('[SB] saveChatMessage hata:', error.message); return false; }
  return true;
}

async function getChannelHistory(channel, limit = 50) {
  const sb = getAdmin();
  if (!sb) return [];
  const { data, error } = await sb.from('chat_messages')
    .select('msg_id,channel,message,sender,user_id,created_at')
    .eq('channel', channel)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data || []).reverse().map(m => ({
    id: m.msg_id || m.id,
    channel: m.channel,
    message: m.message,
    sender: m.sender,
    userId: m.user_id,
    timestamp: new Date(m.created_at).getTime(),
  }));
}

// ── GAME STATE ───────────────────────────────────────────────────────────────

async function getGameState(key) {
  const sb = getAdmin();
  if (!sb) return null;
  const { data } = await sb.from('game_state').select('value').eq('key', key).single();
  return data?.value ?? null;
}

async function setGameState(key, value) {
  const sb = getAdmin();
  if (!sb) return false;
  const { error } = await sb.from('game_state')
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
  if (error) { logger.warn('[SB] setGameState hata:', error.message); return false; }
  return true;
}

// ── USER SAVE (game data) ────────────────────────────────────────────────────

const SAVEABLE = ['level','xp','money','bank_money','under_coin','hp','score',
  'credit_score','merit_points','loyalty_points','city','position_tag',
  'education_level','education_progress','inventory','equipped_items',
  'holdings','game_data'];

async function saveUserGameData(userId, data) {
  const sb = getAdmin();
  if (!sb || !userId) return false;
  const update = { last_login: new Date().toISOString() };
  // camelCase → snake_case mapping
  const map = { bankMoney:'bank_money', underCoin:'under_coin', creditScore:'credit_score',
    meritPoints:'merit_points', loyaltyPoints:'loyalty_points', positionTag:'position_tag',
    educationLevel:'education_level', educationProgress:'education_progress',
    equippedItems:'equipped_items', gameData:'game_data' };
  for (const [key, val] of Object.entries(data)) {
    const col = map[key] || key;
    if (SAVEABLE.includes(col)) update[col] = val;
  }
  const { error } = await sb.from('users').update(update).eq('id', userId);
  if (error) { logger.warn('[SB] saveUserGameData hata:', error.message); return false; }
  return true;
}

module.exports = {
  isReady, getAdmin, getAnon,
  findUserById, findUserByUsername, findUserByEmail, findUserByUsernameOrEmail,
  createUser, updateUser,
  findUserByResetToken, findUserByVerifyToken,
  getLeaderboardData,
  saveChatMessage, getChannelHistory,
  getGameState, setGameState,
  saveUserGameData,
  SUPABASE_URL, SUPABASE_ANON_KEY,
};
