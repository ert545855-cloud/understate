require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
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
const pushRoutes = require('./routes/push');
const { router: adminRoutes, setIO: setAdminIO } = require('./routes/admin');
const { init: initPush } = require('./services/pushService');

const app = express();
const server = http.createServer(app);

// --- Public URL / CORS origins ---
const PUBLIC_URL = process.env.PUBLIC_URL || process.env.RENDER_EXTERNAL_URL || null;
const IS_PROD = process.env.NODE_ENV === 'production';

const allowedOrigins = ['http://localhost:5000', 'http://localhost:3000'];
if (PUBLIC_URL) allowedOrigins.push(PUBLIC_URL.replace(/\/$/, ''));
if (process.env.EXTRA_ORIGINS) {
  process.env.EXTRA_ORIGINS.split(',').forEach(o => allowedOrigins.push(o.trim()));
}

const corsOptions = {
  origin: (origin, cb) => {
    if (!origin || !IS_PROD || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('CORS: ' + origin + ' not allowed'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

// --- Socket.IO ---
const io = new Server(server, {
  cors: {
    origin: IS_PROD ? allowedOrigins : '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  maxHttpBufferSize: 2e6,
});

// --- Security headers via helmet ---
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'", "'unsafe-inline'", "'unsafe-eval'",
        'blob:',
        'https://cdn.jsdelivr.net',
        'https://cdnjs.cloudflare.com',
        'https://unpkg.com',
        'https://www.gstatic.com',
        'https://cdn.socket.io',
        'https://cdn.babylonjs.com',
        'https://www.google.com',
        'https://pagead2.googlesyndication.com',
        'https://www.googletagservices.com',
        'https://partner.googleadservices.com',
      ],
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: [
        "'self'", "'unsafe-inline'",
        'https://fonts.googleapis.com',
        'https://cdn.jsdelivr.net',
        'https://cdnjs.cloudflare.com',
      ],
      fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
      imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
      connectSrc: [
        "'self'", 'wss:', 'ws:',
        'https://*.firebaseio.com',
        'https://*.googleapis.com',
        'https://*.mongo.com',
      ],
      mediaSrc: ["'self'", 'blob:'],
      workerSrc: ["'self'", 'blob:'],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: IS_PROD ? [] : null,
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  hsts: IS_PROD ? { maxAge: 31536000, includeSubDomains: true } : false,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xssFilter: true,
  noSniff: true,
  frameguard: { action: 'deny' },
}));

// --- Core middleware ---
app.use(cors(corsOptions));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: false, limit: '2mb' }));
app.use(generalLimiter);
app.use(sanitizeInput);

// HTTPS redirect in production
if (IS_PROD) {
  app.use((req, res, next) => {
    if (req.headers['x-forwarded-proto'] === 'http') {
      return res.redirect(301, 'https://' + req.headers.host + req.url);
    }
    next();
  });
}

// --- Static files ---
app.use(express.static(path.join(__dirname, '../'), {
  maxAge: IS_PROD ? '1h' : 0,
  etag: true,
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
  },
}));

// --- Public config endpoint (safe to expose) ---
app.get('/api/config', (req, res) => {
  res.json({
    socketUrl:       PUBLIC_URL || '',
    env:             process.env.NODE_ENV || 'development',
    version:         process.env.npm_package_version || '1.0.0',
    supabaseUrl:     process.env.SUPABASE_URL     || '',
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',
  });
});

// --- .well-known (TWA / Apple App Site Association) ---
app.use('/.well-known', express.static(path.join(__dirname, '../.well-known'), {
  setHeaders: (res) => { res.setHeader('Content-Type', 'application/json'); }
}));

// --- AdMob public config ---
app.get('/api/admob-config', (req, res) => {
  const { getPublicAdConfig } = require('./config/admob');
  res.json(getPublicAdConfig(!IS_PROD));
});

// --- API routes ---
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/save', saveRoutes);
app.use('/api/game', gameRoutes);
app.use('/api/push', pushRoutes);
app.use('/api/admin', adminRoutes);

// --- Health check ---
app.get('/health', (req, res) => {
  const { getConnectionStatus, getConnectionDetails } = require('./database/connection');
  const monitoring = require('./services/monitoringService');
  const roomManager = require('./rooms/roomManager');
  const { getOnlineGamePlayers } = require('./socket/gameHandler');
  const online = getOnlineGamePlayers();
  res.json({
    status: 'OK',
    timestamp: new Date(),
    db: getConnectionStatus() ? 'connected' : 'disconnected',
    dbDetails: getConnectionDetails(),
    online: online.length,
    publicUrl: PUBLIC_URL || 'auto',
    ...monitoring.getStats(roomManager.getAllRooms().length),
  });
});

// --- SPA fallback ---
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../index.html'));
});

// --- Global error handler ---
app.use((err, req, res, next) => {
  if (err.message && err.message.startsWith('CORS')) {
    return res.status(403).json({ success: false, message: 'CORS hatası' });
  }
  logger.error('Express hatası:', err.message);
  res.status(500).json({ success: false, message: 'Sunucu hatası' });
});

// --- Init ---
initSocket(io);
setAdminIO(io);
startGameEngine(io);
initPush();

const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0';

async function start() {
  await connectDB(io);
  server.listen(PORT, HOST, () => {
    logger.success(`Sunucu çalışıyor: http://${HOST}:${PORT}`);
    logger.info(`Ortam: ${IS_PROD ? 'production' : 'development'}`);
    logger.info(`Helmet: aktif | CORS: ${IS_PROD ? 'kısıtlı' : 'geliştirme'} | HTTPS: ${IS_PROD ? 'zorla' : 'kapalı'}`);
    if (PUBLIC_URL) logger.info(`Public URL: ${PUBLIC_URL}`);
  });
}

start();

module.exports = { app, server, io };
