require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const { connectDB } = require('./database/connection');
const { initSocket } = require('./socket/index');
const { generalLimiter } = require('./middleware/rateLimiter');
const { sanitizeInput } = require('./middleware/sanitize');
const logger = require('./utils/logger');

const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const leaderboardRoutes = require('./routes/leaderboard');
const saveRoutes = require('./routes/save');
const gameRoutes = require('./routes/game');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingTimeout: 60000,
  pingInterval: 25000,
});

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(generalLimiter);
app.use(sanitizeInput);

app.use(express.static(path.join(__dirname, '../')));

app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/save', saveRoutes);
app.use('/api/game', gameRoutes);

app.get('/health', (req, res) => {
  const { getConnectionStatus } = require('./database/connection');
  const monitoring = require('./services/monitoringService');
  const roomManager = require('./rooms/roomManager');
  res.json({
    status: 'OK',
    timestamp: new Date(),
    db: getConnectionStatus() ? 'connected' : 'disconnected',
    ...monitoring.getStats(roomManager.getAllRooms().length),
  });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../index.html'));
});

app.use((err, req, res, next) => {
  logger.error('Express hatası:', err.message);
  res.status(500).json({ success: false, message: 'Sunucu hatası' });
});

initSocket(io);

const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0';

async function start() {
  await connectDB();
  server.listen(PORT, HOST, () => {
    logger.success(`Sunucu çalışıyor: http://${HOST}:${PORT}`);
    logger.info(`Ortam: ${process.env.NODE_ENV || 'development'}`);
  });
}

start();

module.exports = { app, server, io };
