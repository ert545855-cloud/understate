require('dotenv').config();
const express  = require('express');
const http     = require('http');
const cors     = require('cors');
const helmet   = require('helmet');
const path     = require('path');
const socketIo = require('socket.io');

const { connectDB }      = require('./database/connection');
const { initSocket }     = require('./socket/index');
const { getPublicAdConfig } = require('./config/admob');
const logger             = require('./utils/logger');

const app  = express();
const PORT = process.env.PORT || 8080;
const root = path.join(__dirname, '..');

// ── Güvenlik & gövde parse ────────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));

const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim())
  : ['*'];

const REPLIT_DEV_DOMAIN = process.env.REPLIT_DEV_DOMAIN || '';

function isOriginAllowed(origin) {
  if (!origin) return true;
  if (ALLOWED_ORIGINS.includes('*')) return true;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  if (REPLIT_DEV_DOMAIN && origin.endsWith(REPLIT_DEV_DOMAIN)) return true;
  if (origin.endsWith('.replit.dev') || origin.endsWith('.repl.co') || origin.endsWith('.pike.replit.dev')) return true;
  if (origin === 'capacitor://localhost' || origin.startsWith('capacitor://')) return true;
  return false;
}

app.use(cors({
  origin: (origin, cb) => {
    if (isOriginAllowed(origin)) {
      cb(null, true);
    } else {
      cb(new Error('CORS: izin verilmeyen kaynak'));
    }
  },
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Statik dosyalar ───────────────────────────────────────────────────────────
app.use('/public',  express.static(path.join(root, 'public')));
app.use('/css',     express.static(path.join(root, 'css')));
app.use('/js',      express.static(path.join(root, 'js')));
app.use('/src',     express.static(path.join(root, 'src'), {
  setHeaders: (res, fp) => {
    if (fp.endsWith('.js') || fp.endsWith('.jsx'))
      res.setHeader('Content-Type', 'application/javascript');
  },
}));
app.use('/assets',  express.static(path.join(root, 'assets')));

// ── API rotaları ──────────────────────────────────────────────────────────────
const adminRoute    = require('./routes/admin');
const electionRoute = require('./routes/election');

app.use('/api/auth',          require('./routes/auth'));
app.use('/api/game',          require('./routes/game'));
app.use('/api/admin',         adminRoute.router    || adminRoute);
app.use('/api/profile',       require('./routes/profile'));
app.use('/api/leaderboard',   require('./routes/leaderboard'));
app.use('/api/marketplace',   require('./routes/marketplace'));
app.use('/api/save',          require('./routes/save'));
app.use('/api/push',          require('./routes/push'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/messages',      require('./routes/messages'));
app.use('/api/friends',       require('./routes/friends'));
app.use('/api/diplomacy',     require('./routes/diplomacy'));
app.use('/api/election',      electionRoute.router || electionRoute);
app.use('/api/events',        require('./routes/events'));
app.use('/api/loans',         require('./routes/loans'));
app.use('/api/parliament',    require('./routes/parliament'));
app.use('/api/portfolio',     require('./routes/portfolio'));
app.use('/api/security',      require('./routes/security'));
app.use('/api/sessions',      require('./routes/sessions'));
app.use('/api/streak',        require('./routes/streak'));
app.use('/api/tax',           require('./routes/tax'));
app.use('/api/tfa',           require('./routes/tfa'));
app.use('/api/transfer',      require('./routes/transfer'));
app.use('/api/tender',        require('./routes/tender'));
app.use('/api/factory',       require('./routes/factory'));
app.use('/api/jobs',          require('./routes/jobs'));
app.use('/api/store',         require('./routes/store'));
app.use('/api/gang-crime',    require('./routes/gangCrime'));
app.use('/api/bank',          require('./routes/bank'));
app.use('/api/chat',          require('./routes/chat'));

app.get('/health',            (_req, res) => res.json({ status: 'OK', ts: Date.now() }));
app.get('/api/admob-config',  (_req, res) => res.json(getPublicAdConfig(process.env.NODE_ENV !== 'production')));

// ── Alias route'lar: eksik endpoint'ler için yönlendirme ────────────────────
const _gameRouter = require('./routes/game');
app.use('/api/state',               _gameRouter); // /api/state → /api/game/...
app.use('/api/gangs',               _gameRouter);
app.use('/api/parties',             _gameRouter);
app.use('/api/alliances',           _gameRouter);
app.use('/api/elections',           _gameRouter);
app.use('/api/laws',                _gameRouter);
app.use('/api/announcements',       _gameRouter);

// /api/leaderboard/top → /api/leaderboard/all
const _lbRouter = require('./routes/leaderboard');
app.use('/api/leaderboard/top',     (req, res, next) => { req.url = '/all'; next(); }, _lbRouter);

// /api/parliament/parties → /api/game/parties
app.get('/api/parliament/parties',  (req, res, next) => { req.url = '/parties'; next(); }, _gameRouter);

// /api/game/session → JWT kontrol + session bilgisi döner
const { authMiddleware } = require('./middleware/authMiddleware');
app.get('/api/game/session', authMiddleware, (req, res) => {
  res.json({ success: true, user: req.user });
});

// /api/error-log → hata raporlama (auth gerektirmez)
app.post('/api/error-log', (req, res) => {
  const { message, stack, version } = req.body || {};
  if (message) require('./utils/logger').warn('[ClientError]', message?.slice?.(0,200));
  res.json({ ok: true });
});

// /api/giphy-trending + /api/giphy-search → Giphy API proxy
app.get('/api/giphy-trending', async (req, res) => {
  const key = process.env.GIPHY_API_KEY;
  if (!key) return res.json({ data: [] });
  const limit = Math.min(parseInt(req.query.limit) || 24, 50);
  try {
    const r = await fetch(`https://api.giphy.com/v1/gifs/trending?api_key=${key}&limit=${limit}&rating=pg-13`);
    const d = await r.json();
    res.json(d);
  } catch (e) { res.json({ data: [] }); }
});
app.get('/api/giphy-search', async (req, res) => {
  const key = process.env.GIPHY_API_KEY;
  if (!key) return res.json({ data: [] });
  const q     = String(req.query.q || '').slice(0, 100);
  const limit = Math.min(parseInt(req.query.limit) || 24, 50);
  if (!q) return res.json({ data: [] });
  try {
    const r = await fetch(`https://api.giphy.com/v1/gifs/search?api_key=${key}&q=${encodeURIComponent(q)}&limit=${limit}&rating=pg-13`);
    const d = await r.json();
    res.json(d);
  } catch (e) { res.json({ data: [] }); }
});

// ── SPA catch-all ─────────────────────────────────────────────────────────────
app.use(express.static(root, { index: false }));
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Not found' });
  res.sendFile(path.join(root, 'index.html'));
});

// ── HTTP sunucusu + Socket.IO ─────────────────────────────────────────────────
const server = http.createServer(app);
const io     = socketIo(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingTimeout:  60000,
  pingInterval: 25000,
});

app.set('io', io);
connectDB(io);
initSocket(io);

server.listen(PORT, '0.0.0.0', () => {
  logger.success(`UNDERSTATE sunucusu başlatıldı → port ${PORT}`);
});

process.on('uncaughtException',  (err) => logger.error('UncaughtException:', err.message));
process.on('unhandledRejection', (r)   => logger.error('UnhandledRejection:', String(r)));

module.exports = { app, server, io };
