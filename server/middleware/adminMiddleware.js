const { verifyToken } = require('../config/jwt');
const User = require('../models/User');
const logger = require('../utils/logger');

const ADMIN_USERNAMES = (process.env.ADMIN_USERS || 'admin').split(',').map(s => s.trim());

async function adminMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Token gerekli' });
  }
  try {
    const decoded = verifyToken(authHeader.slice(7));

    // Check both ENV list and DB role field (belt-and-suspenders)
    const isEnvAdmin = ADMIN_USERNAMES.includes(decoded.username);
    const isDbAdmin = decoded.role === 'admin' || decoded.role === 'moderator';

    if (!isEnvAdmin && !isDbAdmin) {
      // One last DB check in case token role is stale
      const user = await User.findById(decoded.id).select('role banned');
      if (!user || !['admin', 'moderator'].includes(user.role)) {
        logger.warn(`Admin erişim reddi: ${decoded.username}`);
        return res.status(403).json({ success: false, message: 'Admin yetkisi yok' });
      }
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
