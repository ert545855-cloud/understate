const { verifyToken } = require('../config/jwt');
const logger = require('../utils/logger');

const ADMIN_USERNAMES = (process.env.ADMIN_USERS || 'admin').split(',').map(s => s.trim());

function adminMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Token gerekli' });
  }
  try {
    const decoded = verifyToken(authHeader.slice(7));
    if (!ADMIN_USERNAMES.includes(decoded.username)) {
      logger.warn(`Admin erişim reddi: ${decoded.username}`);
      return res.status(403).json({ success: false, message: 'Admin yetkisi yok' });
    }
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Geçersiz token' });
  }
}

function isAdminUsername(username) {
  return ADMIN_USERNAMES.includes(username);
}

module.exports = { adminMiddleware, isAdminUsername };
