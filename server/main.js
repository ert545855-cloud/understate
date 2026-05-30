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
const PORT = process.env.PORT || 5000;
const root = path.join(__dirname, '..');

// ── Güvenlik & gövde parse ────────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(cors({ origin: '*', credentials: true }));
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

app.get('/health',            (_req, res) => res.json({ status: 'OK', ts: Date.now() }));
app.get('/api/admob-config',  (_req, res) => res.json(getPublicAdConfig(process.env.NODE_ENV !== 'production')));

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

connectDB(io);
initSocket(io);

server.listen(PORT, '0.0.0.0', () => {
  logger.success(`UNDERSTATE sunucusu başlatıldı → port ${PORT}`);
});

process.on('uncaughtException',  (err) => logger.error('UncaughtException:', err.message));
process.on('unhandledRejection', (r)   => logger.error('UnhandledRejection:', String(r)));

module.exports = { app, server, io };
