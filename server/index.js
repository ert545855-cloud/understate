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
const { router: electionRoutes, setIO: setElectionIO } = require('./routes/election');
const { init: initPush } = require('./services/pushService');

const app = express();
const server = http.createServer(app);

// --- Public URL / CORS origins (Madde 16) ---
const REPLIT_DEV_DOMAIN = process.env.REPLIT_DEV_DOMAIN
  ? `https://${process.env.REPLIT_DEV_DOMAIN}` : null;
const PUBLIC_URL = process.env.PUBLIC_URL
  || process.env.RENDER_EXTERNAL_URL
  || REPLIT_DEV_DOMAIN
  || null;
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

// --- Socket.IO (Madde 15: bağlantı limitleri) ---
const io = new Server(server, {
  cors: {
    origin: IS_PROD ? allowedOrigins : '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  maxHttpBufferSize: 1e6,
  connectTimeout: 10000,
  transports: ['websocket', 'polling'],
});

// IP başına bağlantı limiti (max 10 eş zamanlı soket/IP)
const ipConnections = new Map();
io.use((socket, next) => {
  const ip = socket.handshake.headers['x-forwarded-for']?.split(',')[0]?.trim()
    || socket.handshake.address || 'unknown';
  const count = ipConnections.get(ip) || 0;
  if (count >= 10) {
    return next(new Error('Çok fazla bağlantı'));
  }
  ipConnections.set(ip, count + 1);
  socket.on('disconnect', () => {
    const c = ipConnections.get(ip) || 1;
    if (c <= 1) ipConnections.delete(ip);
    else ipConnections.set(ip, c - 1);
  });
  next();
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
        'https://*.supabase.co',
        'https://*.supabase.in',
        'https://*.googleapis.com',
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
  frameguard: IS_PROD ? { action: 'sameorigin' } : false,
}));

// --- Core middleware ---
app.use(cors(corsOptions));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: false, limit: '2mb' }));
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
app.use(express.static(path.join(__dirname, '../public'), {
  maxAge: IS_PROD ? '1h' : 0,
  etag: true,
}));
app.use(express.static(path.join(__dirname, '../'), {
  maxAge: IS_PROD ? '1h' : 0,
  etag: true,
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
  },
}));

// --- Rate limiting for API routes only (not static assets) ---
app.use('/api', generalLimiter);

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

// --- Dynamic manifest.json (Madde 14: PWA domain güncel) ---
app.get('/manifest.json', (req, res) => {
  const host = PUBLIC_URL || `https://${req.headers.host}`;
  res.setHeader('Content-Type', 'application/manifest+json');
  res.json({
    name: 'UNDERSTATE',
    short_name: 'UNDERSTATE',
    description: 'Cok oyunculu sehir ve devlet simulasyon oyunu',
    display: 'standalone',
    orientation: 'portrait-primary',
    start_url: `${host}/`,
    scope: `${host}/`,
    background_color: '#0A1628',
    theme_color: '#0A1628',
    categories: ['games', 'strategy'],
    lang: 'tr',
    icons: [
      { src: '/icon-72.png',  sizes: '72x72',   type: 'image/png', purpose: 'any maskable' },
      { src: '/icon-96.png',  sizes: '96x96',   type: 'image/png', purpose: 'any maskable' },
      { src: '/icon-128.png', sizes: '128x128', type: 'image/png', purpose: 'any maskable' },
      { src: '/icon-144.png', sizes: '144x144', type: 'image/png', purpose: 'any maskable' },
      { src: '/icon-152.png', sizes: '152x152', type: 'image/png', purpose: 'any maskable' },
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
      { src: '/icon-384.png', sizes: '384x384', type: 'image/png', purpose: 'any maskable' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
    ],
    prefer_related_applications: false,
  });
});

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
app.use('/api/election', electionRoutes);

// --- Game state endpoints (used by Socket Bridge) ---
const db = require('./services/dbService');

app.get('/api/state', async (req, res) => {
  try {
    const { getEconomyState } = require('./services/gameEngine');
    const result = {};
    const economy = getEconomyState();
    if (economy) result.economy = economy;
    try {
      const { rows } = await db.query('SELECT key, value FROM game_state');
      rows.forEach(r => { result[r.key] = r.value; });
    } catch (_) {}
    res.json(result);
  } catch (err) {
    res.json({});
  }
});

app.get('/api/market', (req, res) => {
  try {
    const { getMarketSnapshot } = require('./services/gameEngine');
    const market = getMarketSnapshot();
    res.json(market || []);
  } catch (err) {
    res.json([]);
  }
});

app.get('/api/parties', async (req, res) => {
  try {
    const { rows } = await db.query("SELECT value FROM game_state WHERE key = 'parties' LIMIT 1");
    const parties = rows[0]?.value;
    if (parties && typeof parties === 'object') {
      return res.json(Object.values(parties));
    }
    res.json([]);
  } catch (err) {
    res.json([]);
  }
});

app.get('/api/gangs', async (req, res) => {
  try {
    const { rows } = await db.query("SELECT value FROM game_state WHERE key = 'gangs' LIMIT 1");
    const gangs = rows[0]?.value;
    if (gangs && typeof gangs === 'object') {
      return res.json(Object.values(gangs));
    }
    res.json([]);
  } catch (err) {
    res.json([]);
  }
});

app.get('/api/inventory/:userId', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT inventory FROM users WHERE id = $1 LIMIT 1', [req.params.userId]);
    res.json(rows[0]?.inventory || []);
  } catch (err) {
    res.json([]);
  }
});

app.get('/api/city-ownership', async (req, res) => {
  try {
    const { rows } = await db.query("SELECT value FROM game_state WHERE key = 'cityOwnership' LIMIT 1");
    res.json(rows[0]?.value || {});
  } catch (err) {
    res.json({});
  }
});

app.get('/api/vapid-public-key', (req, res) => {
  res.setHeader('Content-Type', 'text/plain');
  res.send(process.env.VAPID_PUBLIC_KEY || '');
});

app.post('/api/refresh-token', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const bodyToken = req.body?.refreshToken;
    const token = bodyToken || (authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null);
    if (!token) return res.status(401).json({ success: false });
    const { verifyRefreshToken, signToken, signRefreshToken } = require('./config/jwt');
    let decoded;
    try { decoded = verifyRefreshToken(token); } catch { return res.status(401).json({ success: false }); }
    const user = await db.findUserById(decoded.id);
    if (!user) return res.status(401).json({ success: false });
    const newToken = signToken({ id: user.id, username: user.username, role: user.role });
    const newRefresh = signRefreshToken({ id: user.id });
    await db.updateUser(user.id, { refresh_token: newRefresh });
    res.json({ success: true, token: newToken, refreshToken: newRefresh });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

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
setElectionIO(io);
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
