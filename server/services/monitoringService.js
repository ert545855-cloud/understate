const logger = require('../utils/logger');

let stats = {
  connectedSockets: 0,
  totalConnections: 0,
  totalDisconnections: 0,
  peakOnline: 0,
  startTime: Date.now(),
  errors: 0,
  chatMessages: 0,
  playerUpdates: 0,
  roomCount: 0,
};

function increment(key, amount = 1) {
  if (key in stats) stats[key] += amount;
  if (key === 'connectedSockets' && stats.connectedSockets > stats.peakOnline) {
    stats.peakOnline = stats.connectedSockets;
  }
}

function decrement(key, amount = 1) {
  if (key in stats) stats[key] = Math.max(0, stats[key] - amount);
}

function getStats(roomCount = 0) {
  return {
    ...stats,
    roomCount,
    uptime: Math.floor((Date.now() - stats.startTime) / 1000),
    uptimeFormatted: formatUptime(Date.now() - stats.startTime),
  };
}

function formatUptime(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}g ${h % 24}s`;
  if (h > 0) return `${h}s ${m % 60}d`;
  return `${m}d ${s % 60}s`;
}

function startMonitoringLog(io, getRoomCount) {
  setInterval(() => {
    const s = getStats(getRoomCount());
    logger.info(`[Monitor] Online:${s.connectedSockets} | Peak:${s.peakOnline} | Rooms:${s.roomCount} | Uptime:${s.uptimeFormatted}`);
    if (io) io.emit('serverStats', s);
  }, 60 * 1000);
}

module.exports = { increment, decrement, getStats, startMonitoringLog };
