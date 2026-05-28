module.exports = {
  // Beta
  BETA_MODE: process.env.BETA_MODE === 'true',
  BETA_INVITE_CODES: (process.env.BETA_INVITE_CODES || '').split(',').map(s => s.trim().toUpperCase()).filter(Boolean),

  // Room
  MAX_PLAYERS_PER_ROOM: 20,
  ROOM_CLEANUP_INTERVAL: 5 * 60 * 1000,
  PLAYER_TIMEOUT: 30 * 1000,
  MAX_RECONNECT_WAIT: 30 * 1000,

  // Save
  AUTOSAVE_INTERVAL: 60 * 1000,

  // Chat
  MAX_CHAT_LENGTH: 300,
  MAX_CHAT_RATE: 5,
  CHAT_RATE_WINDOW: 10 * 1000,

  // Movement / anti-cheat
  MAX_MOVEMENT_SPEED: 600,
  MAX_TELEPORT_DISTANCE: 800,
  PACKET_RATE_LIMIT: 60,
  PACKET_RATE_WINDOW: 1000,

  // Socket global rate limit (fallback for unlisted events)
  SOCKET_EVENT_RATE_LIMIT: 30,
  SOCKET_EVENT_RATE_WINDOW: 1000,
  MAX_SOCKET_PAYLOAD_BYTES: 8192,

  // Per-event rate limits  { maxCount per windowMs }
  SOCKET_PER_EVENT_LIMITS: {
    chat:         { max: 5,  windowMs: 1000 },   // 5 msg/sn
    stateUpdate:  { max: 10, windowMs: 1000 },   // 10 update/sn
    syncGameData: { max: 5,  windowMs: 1000 },   // 5 sync/sn
    playerJoin:   { max: 3,  windowMs: 5000 },   // 3 join per 5sn
    roomCreate:   { max: 2,  windowMs: 10000 },  // 2 oda/10sn
    roomJoin:     { max: 5,  windowMs: 10000 },  // 5 join/10sn
  },

  // JWT
  ACCESS_TOKEN_EXPIRES_IN: '1h',
  REFRESH_TOKEN_EXPIRES_IN: '30d',
  JWT_EXPIRES_IN: '1h',
  BCRYPT_ROUNDS: 12,

  // Password reset
  RESET_TOKEN_EXPIRY_MS: 60 * 60 * 1000,

  // Leaderboard
  LEADERBOARD_SIZE: 100,

  // HTTP Rate limit — genel istekler
  RATE_LIMIT_WINDOW: 15 * 60 * 1000,   // 15 dakika
  RATE_LIMIT_MAX: 200,                   // 100 → 200 (genel endpoint)

  // Auth limitleri — kayıt ve login ayrı ayrı ayarlanıyor (rateLimiter.js)
  AUTH_RATE_LIMIT_MAX: 30,               // 20 → 30               // 10 → 20  (login, şifre sıfırlama)
  REGISTER_RATE_LIMIT_MAX: 20,            // 5 → 20            // YENİ: kayıt için pencere başına 5 (IP başına)
};
