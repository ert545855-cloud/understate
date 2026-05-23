const mongoose = require('mongoose');
const User = require('../models/User');
const logger = require('../utils/logger');
const { getConnectionStatus } = require('../database/connection');
const { AUTOSAVE_INTERVAL } = require('../config/constants');

const pendingSaves = new Map();

const TOP_LEVEL_FIELDS = [
  'level', 'xp', 'money', 'bankMoney', 'underCoin', 'hp',
  'score', 'creditScore', 'meritPoints', 'loyaltyPoints',
  'city', 'position', 'educationLevel', 'educationProgress',
  'inventory', 'equippedItems', 'holdings', 'gameData',
];

async function saveUserFull(userId, data) {
  if (!getConnectionStatus() || !userId) return false;
  if (!mongoose.isValidObjectId(userId)) return false; // skip non-MongoDB IDs (e.g. guest/admin_001)
  try {
    const updateFields = { lastLogin: new Date() };
    for (const field of TOP_LEVEL_FIELDS) {
      if (data[field] !== undefined) updateFields[field] = data[field];
    }
    await User.findByIdAndUpdate(userId, updateFields);
    return true;
  } catch (err) {
    logger.error('Full save hatası:', err.message);
    return false;
  }
}

async function saveUser(userId, gameData) {
  if (!getConnectionStatus() || !userId) return false;
  if (!mongoose.isValidObjectId(userId)) return false;
  try {
    await User.findByIdAndUpdate(userId, { gameData, lastLogin: new Date() });
    return true;
  } catch (err) {
    logger.error('Save hatası:', err.message);
    return false;
  }
}

function scheduleSave(userId, data) {
  if (pendingSaves.has(userId)) clearTimeout(pendingSaves.get(userId).timer);
  const timer = setTimeout(async () => {
    await saveUserFull(userId, data);
    pendingSaves.delete(userId);
  }, 3000);
  pendingSaves.set(userId, { timer, data });
}

function startAutosave(io, getUserData) {
  setInterval(async () => {
    const onlinePlayers = getUserData();
    const entries = Object.entries(onlinePlayers);
    for (const [userId, data] of entries) {
      await saveUserFull(userId, data);
    }
    if (entries.length > 0) logger.debug(`Autosave: ${entries.length} oyuncu`);
  }, AUTOSAVE_INTERVAL);
}

module.exports = { saveUser, saveUserFull, scheduleSave, startAutosave };
