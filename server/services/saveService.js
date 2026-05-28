/**
 * Save Service — Supabase versiyonu
 * MongoDB kaldırıldı, tüm game data saves supabaseService üzerinden.
 */
const sb = require('./supabaseService');
const logger = require('../utils/logger');
const { AUTOSAVE_INTERVAL } = require('../config/constants');

const pendingSaves = new Map();

async function saveUserGameData(userId, data) {
  if (!sb.isReady() || !userId) return false;
  return sb.saveUserGameData(userId, data);
}

// Hafif save (sadece lastSeen / isOnline)
async function saveUser(userId, meta = {}) {
  if (!sb.isReady() || !userId) return false;
  const update = {};
  if (meta.lastSeen !== undefined) update.last_login = new Date(meta.lastSeen).toISOString();
  if (meta.isOnline  !== undefined) update.is_online  = meta.isOnline;
  if (Object.keys(update).length === 0) return true;
  return sb.updateUser(userId, update);
}

// Tam oyun verisi kaydet
async function saveUserFull(userId, data) {
  return saveUserGameData(userId, data);
}

// 3 saniye debounce ile tasarruflu kayıt
function scheduleSave(userId, data) {
  if (pendingSaves.has(userId)) clearTimeout(pendingSaves.get(userId).timer);
  const timer = setTimeout(async () => {
    await saveUserFull(userId, data);
    pendingSaves.delete(userId);
  }, 3000);
  pendingSaves.set(userId, { timer, data });
}

// Otomatik kayıt — her AUTOSAVE_INTERVAL ms'de online oyuncuları kaydeder
function startAutosave(io, getUserData) {
  setInterval(async () => {
    const players = getUserData();
    const entries = Object.entries(players);
    for (const [userId, data] of entries) {
      await saveUserFull(userId, data);
    }
    if (entries.length > 0) logger.debug(`Autosave: ${entries.length} oyuncu (Supabase)`);
  }, AUTOSAVE_INTERVAL);
}

async function flushAllPending() {
  const promises = [];
  for (const [userId, { timer, data }] of pendingSaves.entries()) {
    clearTimeout(timer);
    promises.push(saveUserFull(userId, data).catch(() => {}));
  }
  pendingSaves.clear();
  await Promise.all(promises);
  logger.info('[SaveService] Bekleyen tüm kayıtlar temizlendi');
}

module.exports = { saveUser, saveUserFull, scheduleSave, startAutosave, flushAllPending };
