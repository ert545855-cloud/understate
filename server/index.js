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
const { startGameEngine } = require('./services/gameEngine');
const logger = require('./utils/logger');

const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const leaderboardRoutes = require('./routes/leaderboard');
const saveRoutes = require('./routes/save');
const gameRoutes = require('./routes/game');
const { router: adminRoutes, setIO: setAdminIO } = require('./routes/admin');

const app = express();
const server = http.createServer(app);

// --- CORS / Public URL ---
// Render sets RENDER_EXTERNAL_URL automatically; you can also set PUBLIC_URL manually
const PUBLIC_URL = process.env.PUBLIC_URL || process.env.RENDER_EXTERNAL_URL || null;
const allowedOrigins = ['http://localhost:5000', 'http://localhost:3000'];
if (PUBLIC_URL) allowedOrigins.push(PUBLIC_URL.replace(/\/$/, ''));

const corsOptions = {
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
      cb(null, true);
    } else {
      cb(new Error('CORS: ' + origin + ' izin verilmiyor'));
    }
  },
  credentials: true,
};

const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingTimeout: 60000,
  pingInterval: 25000,
  maxHttpBufferSize: 2e6,
});

app.use(cors(corsOptions));
app.use(express.json({ limit: '2mb' }));
app.use(generalLimiter);
app.use(sanitizeInput);

// Serve frontend
app.use(express.static(path.join(__dirname, '../'), {
  maxAge: process.env.NODE_ENV === 'production' ? '1h' : 0,
}));

// Config endpoint — frontend uses this to know the socket URL
app.get('/api/config', (req, res) => {
  res.json({
    socketUrl: PUBLIC_URL || '',
    env: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/save', saveRoutes);
app.use('/api/game', gameRoutes);
app.use('/api/admin', adminRoutes);

app.get('/health', (req, res) => {
  const { getConnectionStatus } = require('./database/connection');
  const monitoring = require('./services/monitoringService');
  const roomManager = require('./rooms/roomManager');
  const { getOnlineGamePlayers } = require('./socket/gameHandler');
  const online = getOnlineGamePlayers();
  res.json({
    status: 'OK',
    timestamp: new Date(),
    db: getConnectionStatus() ? 'connected' : 'disconnected',
    online: online.length,
    publicUrl: PUBLIC_URL || 'auto',
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
setAdminIO(io);
startGameEngine(io);

const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0';

async function start() {
  await connectDB();
  server.listen(PORT, HOST, () => {
    logger.success(`Sunucu çalışıyor: http://${HOST}:${PORT}`);
    logger.info(`Ortam: ${process.env.NODE_ENV || 'development'}`);
    if (PUBLIC_URL) logger.info(`Public URL: ${PUBLIC_URL}`);
  });
}

start();

module.exports = { app, server, io };
