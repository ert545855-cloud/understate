// Sadece development'ta .env yükle; production'da Render env vars kullan
if (process.env.NODE_ENV !== 'production') require('dotenv').config();
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

// ── New feature routes ────────────────────────────────────────────────────────
const sessionsRoutes    = require('./routes/sessions');
const streakRoutes      = require('./routes/streak');
const transferRoutes    = require('./routes/transfer');
const friendsRoutes     = require('./routes/friends');
const messagesRoutes    = require('./routes/messages');
const marketplaceRoutes = require('./routes/marketplace');
const loansRoutes       = require('./routes/loans');
const portfolioRoutes   = require('./routes/portfolio');
const { router: parliamentRoutes, setIO: setParlIO } = (() => {
  const m = require('./routes/parliament'); return { router: m, setIO: m.setIO };
})();
const securityRoutes    = require('./routes/security');
const tfaRoutes         = require('./routes/tfa');
const { router: diplomacyRoutes, setIO: setDipIO } = (() => {
  const m = require('./routes/diplomacy'); return { router: m, setIO: m.setIO };
})();
const { router: eventsRoutes, setIO: setEventsIO } = (() => {
  const m = require('./routes/events'); return { router: m, setIO: m.setIO };
})();
const taxRoutes         = require('./routes/tax');

// ── Services for scheduled jobs ───────────────────────────────────────────────
const { processOverdueLoans } = require('./services/loanService');
const { snapshotAllActive, pruneOld: prunePortfolio } = require('./services/portfolioService');
const { settleBills } = require('./services/parliamentService');
const { expireOld: expireDiplomacy } = require('./services/diplomacyService');
const { seedDefaultEvents } = require('./services/eventService');
const { collectPropertyTax } = require('./services/taxService');
const { pruneOld: pruneErrors } = require('./services/errorLogService');
const errLog = require('./services/errorLogService');
const secSvc = require('./services/securityService');

const app = express();
app.set('trust proxy', 1);
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
        'https://understate.onrender.com',
        'wss://understate.onrender.com',
        'https://fonts.gstatic.com',
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
app.use('/src', express.static(path.join(__dirname, '../src'), {
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

// --- IP Ban middleware (runs before all API routes) ---
app.use('/api', async (req, res, next) => {
  const ip = req.ip || req.connection?.remoteAddress || 'unknown';
  const banned = await secSvc.isIPBanned(ip).catch(() => false);
  if (banned) return res.status(403).json({ success: false, message: 'Erişim engellendi' });
  next();
});

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
    firebase: {
      apiKey:            process.env.FIREBASE_API_KEY            || '',
      authDomain:        process.env.FIREBASE_AUTH_DOMAIN        || '',
      projectId:         process.env.FIREBASE_PROJECT_ID         || '',
      storageBucket:     process.env.FIREBASE_STORAGE_BUCKET     || '',
      messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '',
      appId:             process.env.FIREBASE_APP_ID             || '',
      databaseURL:       process.env.FIREBASE_DATABASE_URL       || '',
    },
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

// ── Feature routes (/api/v1 aliases + direct) ─────────────────────────────────
app.use('/api/sessions',    sessionsRoutes);
app.use('/api/streak',      streakRoutes);
app.use('/api/transfer',    transferRoutes);
app.use('/api/friends',     friendsRoutes);
app.use('/api/messages',    messagesRoutes);
app.use('/api/marketplace', marketplaceRoutes);
app.use('/api/loans',       loansRoutes);
app.use('/api/portfolio',   portfolioRoutes);
app.use('/api/parliament',  parliamentRoutes);
app.use('/api/security',    securityRoutes);
app.use('/api/2fa',         tfaRoutes);
app.use('/api/diplomacy',   diplomacyRoutes);
app.use('/api/events',      eventsRoutes);
app.use('/api/tax',         taxRoutes);

// #8 — API v1 aliases (future-proof versioning)
app.use('/api/v1/auth',        authRoutes);
app.use('/api/v1/profile',     profileRoutes);
app.use('/api/v1/leaderboard', leaderboardRoutes);
app.use('/api/v1/sessions',    sessionsRoutes);
app.use('/api/v1/streak',      streakRoutes);
app.use('/api/v1/transfer',    transferRoutes);
app.use('/api/v1/friends',     friendsRoutes);
app.use('/api/v1/messages',    messagesRoutes);
app.use('/api/v1/marketplace', marketplaceRoutes);
app.use('/api/v1/loans',       loansRoutes);
app.use('/api/v1/portfolio',   portfolioRoutes);
app.use('/api/v1/parliament',  parliamentRoutes);
app.use('/api/v1/diplomacy',   diplomacyRoutes);
app.use('/api/v1/events',      eventsRoutes);
app.use('/api/v1/tax',         taxRoutes);

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
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile(path.join(__dirname, '../index.html'));
});

// --- Global error handler (#7 error logging) ---
app.use((err, req, res, next) => {
  if (err.message && err.message.startsWith('CORS')) {
    return res.status(403).json({ success: false, message: 'CORS hatası' });
  }
  const ip = req.ip || 'unknown';
  errLog.log('express_error', err.message, { stack: err.stack, context: { url: req.url, method: req.method }, ip, userId: req.user?.id });
  logger.error('Express hatası:', err.message);
  res.status(500).json({ success: false, message: 'Sunucu hatası' });
});

// --- Init ---
initSocket(io);
setAdminIO(io);
setElectionIO(io);
setParlIO(io);
setDipIO(io);
setEventsIO(io);
startGameEngine(io);
initPush();

// ── Scheduled jobs (every hour) ───────────────────────────────────────────────
setInterval(async () => {
  try { await processOverdueLoans(); }   catch(e) { logger.warn('[Sched] loans:', e.message); }
  try { await settleBills(); }           catch(e) { logger.warn('[Sched] parliament:', e.message); }
  try { await expireDiplomacy(); }       catch(e) { logger.warn('[Sched] diplomacy:', e.message); }
}, 60 * 60 * 1000); // every hour

// Daily jobs (every 24h)
setInterval(async () => {
  try { await snapshotAllActive(); }     catch(e) { logger.warn('[Sched] portfolio:', e.message); }
  try { await collectPropertyTax(); }   catch(e) { logger.warn('[Sched] tax:', e.message); }
  try { await prunePortfolio(); }        catch(e) { logger.warn('[Sched] prune-portfolio:', e.message); }
  try { await pruneErrors(); }           catch(e) { logger.warn('[Sched] prune-errors:', e.message); }
  // #28 Economy report — broadcast to all connected clients
  try {
    const { getEconomyState } = require('./services/gameEngine');
    const economy = getEconomyState();
    if (economy) {
      io.emit('economyReport', {
        timestamp: new Date().toISOString(),
        inflation: economy.inflation,
        treasury: economy.treasury,
        taxRate: economy.taxRate,
        interestRate: economy.interestRate,
      });
    }
  } catch(e) { logger.warn('[Sched] economy-report:', e.message); }
}, 24 * 60 * 60 * 1000); // every 24h

// Seed on startup
setTimeout(async () => {
  try { await seedDefaultEvents(); } catch(e) { logger.warn('[Sched] seed-events:', e.message); }
}, 5000);

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

// --- Graceful shutdown ---
const { flushAllPending } = require('./services/saveService');

async function gracefulShutdown(signal) {
  logger.info(`[Shutdown] ${signal} alındı — kontrollü kapatma başlıyor...`);
  io.close();
  try {
    await flushAllPending();
    const { onlinePlayers } = require('./socket/onlineStore');
    const updates = [];
    for (const player of onlinePlayers.values()) {
      if (player.userId) {
        updates.push(db.updateUser(player.userId, { is_online: false, socket_id: null }).catch(() => {}));
      }
    }
    await Promise.all(updates);
    logger.info('[Shutdown] Online oyuncular çevrimdışı işaretlendi');
  } catch (e) {
    logger.warn('[Shutdown] Temizleme hatası:', e.message);
  }
  process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT',  () => gracefulShutdown('SIGINT'));

module.exports = { app, server, io };
