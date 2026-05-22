const mongoose = require('mongoose');
const logger = require('../utils/logger');

let isConnected = false;

async function connectDB() {
  if (isConnected) return;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    logger.warn('MONGODB_URI not set — running without MongoDB (game data will not persist to DB)');
    return;
  }

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    isConnected = true;
    logger.info('MongoDB bağlantısı başarılı');

    mongoose.connection.on('disconnected', () => {
      isConnected = false;
      logger.warn('MongoDB bağlantısı kesildi');
    });
    mongoose.connection.on('reconnected', () => {
      isConnected = true;
      logger.info('MongoDB yeniden bağlandı');
    });
  } catch (err) {
    logger.error('MongoDB bağlantı hatası:', err.message);
  }
}

function getConnectionStatus() {
  return isConnected;
}

module.exports = { connectDB, getConnectionStatus };
