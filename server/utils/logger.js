// #6 Logger with log archiving
const fs   = require('fs');
const path = require('path');

const colors = {
  reset:   '\x1b[0m',
  info:    '\x1b[36m',
  warn:    '\x1b[33m',
  error:   '\x1b[31m',
  success: '\x1b[32m',
  debug:   '\x1b[35m',
};

function timestamp() {
  return new Date().toISOString();
}

// ── File archiving ────────────────────────────────────────────────────────────
const LOG_DIR      = path.join(__dirname, '../../logs');
const MAX_LOG_SIZE = 5 * 1024 * 1024; // 5 MB before rotating
const MAX_ARCHIVES = 7;               // keep 7 rotated files

let _currentLogFile = null;
let _currentStream  = null;

function getLogPath() {
  const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return path.join(LOG_DIR, `app-${date}.log`);
}

function ensureStream() {
  try {
    if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
    const logPath = getLogPath();

    // Rotate if date changed or file too large
    if (_currentLogFile !== logPath || (_currentStream && fileSize(logPath) > MAX_LOG_SIZE)) {
      if (_currentStream) { try { _currentStream.end(); } catch(_) {} }
      _currentLogFile = logPath;
      _currentStream  = fs.createWriteStream(logPath, { flags: 'a', encoding: 'utf8' });
    }
    if (!_currentStream) {
      _currentLogFile = logPath;
      _currentStream  = fs.createWriteStream(logPath, { flags: 'a', encoding: 'utf8' });
    }
  } catch (_) {}
}

function fileSize(fp) {
  try { return fs.statSync(fp).size; } catch { return 0; }
}

function writeToFile(level, ...args) {
  try {
    ensureStream();
    if (_currentStream) {
      const line = `[${level}] ${timestamp()} ${args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')}\n`;
      _currentStream.write(line);
    }
  } catch (_) {}
}

// Prune old archives (keep MAX_ARCHIVES most recent)
function pruneArchives() {
  try {
    if (!fs.existsSync(LOG_DIR)) return;
    const files = fs.readdirSync(LOG_DIR)
      .filter(f => f.startsWith('app-') && f.endsWith('.log'))
      .map(f => ({ f, t: fs.statSync(path.join(LOG_DIR, f)).mtimeMs }))
      .sort((a, b) => b.t - a.t);
    for (const { f } of files.slice(MAX_ARCHIVES)) {
      fs.unlinkSync(path.join(LOG_DIR, f));
    }
  } catch (_) {}
}

// Prune daily (lazy: prune when a new day's stream is opened)
let _lastPruneDay = '';
function maybePrune() {
  const today = new Date().toISOString().slice(0, 10);
  if (_lastPruneDay !== today) { _lastPruneDay = today; pruneArchives(); }
}

// ── Logger interface ──────────────────────────────────────────────────────────
const logger = {
  info: (...args) => {
    console.log(`${colors.info}[INFO]${colors.reset} ${timestamp()}`, ...args);
    writeToFile('INFO', ...args);
    maybePrune();
  },
  warn: (...args) => {
    console.warn(`${colors.warn}[WARN]${colors.reset} ${timestamp()}`, ...args);
    writeToFile('WARN', ...args);
  },
  error: (...args) => {
    console.error(`${colors.error}[ERROR]${colors.reset} ${timestamp()}`, ...args);
    writeToFile('ERROR', ...args);
  },
  success: (...args) => {
    console.log(`${colors.success}[OK]${colors.reset} ${timestamp()}`, ...args);
    writeToFile('OK', ...args);
  },
  debug: (...args) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`${colors.debug}[DEBUG]${colors.reset} ${timestamp()}`, ...args);
    }
    writeToFile('DEBUG', ...args);
  },
  socket: (event, socketId, extra = '') => {
    const msg = `[${socketId}] ${event} ${extra}`;
    console.log(`${colors.info}[SOCKET]${colors.reset} ${timestamp()} ${msg}`);
    writeToFile('SOCKET', msg);
  },
  // Expose for admin route
  getLogDir: () => LOG_DIR,
  pruneArchives,
};

module.exports = logger;
