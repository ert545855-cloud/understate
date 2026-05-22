const colors = {
  reset: '\x1b[0m',
  info: '\x1b[36m',
  warn: '\x1b[33m',
  error: '\x1b[31m',
  success: '\x1b[32m',
  debug: '\x1b[35m',
};

function timestamp() {
  return new Date().toISOString();
}

const logger = {
  info: (...args) => console.log(`${colors.info}[INFO]${colors.reset} ${timestamp()}`, ...args),
  warn: (...args) => console.warn(`${colors.warn}[WARN]${colors.reset} ${timestamp()}`, ...args),
  error: (...args) => console.error(`${colors.error}[ERROR]${colors.reset} ${timestamp()}`, ...args),
  success: (...args) => console.log(`${colors.success}[OK]${colors.reset} ${timestamp()}`, ...args),
  debug: (...args) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`${colors.debug}[DEBUG]${colors.reset} ${timestamp()}`, ...args);
    }
  },
  socket: (event, socketId, extra = '') =>
    console.log(`${colors.info}[SOCKET]${colors.reset} ${timestamp()} [${socketId}] ${event} ${extra}`),
};

module.exports = logger;
