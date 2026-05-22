const User = require('../models/User');
const logger = require('../utils/logger');
const { getConnectionStatus } = require('../database/connection');
const { AUTOSAVE_INTERVAL } = require('../config/constants');

const pendingSaves = new Map();

async function saveUser(userId, gameData) {
  if (!getConnectionStatus() || !userId) return false;
  try {
    await User.findByIdAndUpdate(userId, {
      gameData,
      lastLogin: new Date(),
    });
    logger.debug(`Kaydedildi: ${userId}`);
    return true;
  } catch (err) {
    logger.error('Save hatası:', err.message);
    return false;
  }
}

async function saveUserFull(userId, data) {
  if (!getConnectionStatus() || !userId) return false;
  try {
    const updateFields = {};
    if (data.level !== undefined) updateFields.level = data.level;
    if (data.xp !== undefined) updateFields.xp = data.xp;
    if (data.money !== undefined) updateFields.money = data.money;
    if (data.inventory !== undefined) updateFields.inventory = data.inventory;
    if (data.equippedItems !== undefined) updateFields.equippedItems = data.equippedItems;
    if (data.gameData !== undefined) updateFields.gameData = data.gameData;
    updateFields.lastLogin = new Date();

    await User.findByIdAndUpdate(userId, updateFields);
    return true;
  } catch (err) {
    logger.error('Full save hatası:', err.message);
    return false;
  }
}

function scheduleSave(userId, data) {
  if (pendingSaves.has(userId)) {
    clearTimeout(pendingSaves.get(userId).timer);
  }
  const timer = setTimeout(async () => {
    await saveUserFull(userId, data);
    pendingSaves.delete(userId);
  }, 5000);
  pendingSaves.set(userId, { timer, data });
}

function startAutosave(io, getUserData) {
  setInterval(async () => {
    const onlinePlayers = getUserData();
    for (const [userId, data] of Object.entries(onlinePlayers)) {
      await saveUser(userId, data);
    }
    if (Object.keys(onlinePlayers).length > 0) {
      logger.debug(`Autosave: ${Object.keys(onlinePlayers).length} oyuncu`);
    }
  }, AUTOSAVE_INTERVAL);
}

module.exports = { saveUser, saveUserFull, scheduleSave, startAutosave };
