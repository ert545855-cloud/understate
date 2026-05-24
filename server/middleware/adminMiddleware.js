const { verifyToken } = require('../config/jwt');
const sb = require('../services/supabaseService');
const logger = require('../utils/logger');

const ADMIN_USERNAMES = (process.env.ADMIN_USERS || 'admin').split(',').map(s => s.trim());

async function adminMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer '))
    return res.status(401).json({ success: false, message: 'Token gerekli' });
  try {
    const decoded = verifyToken(authHeader.slice(7));
    const isEnvAdmin = ADMIN_USERNAMES.includes(decoded.username);
    const isRoleAdmin = decoded.role === 'admin' || decoded.role === 'moderator';
    if (!isEnvAdmin && !isRoleAdmin) {
      if (sb.isReady()) {
        const user = await sb.findUserById(decoded.id);
        if (!user || !['admin', 'moderator'].includes(user.role)) {
          logger.warn(`Admin erişim reddi: ${decoded.username}`);
          return res.status(403).json({ success: false, message: 'Admin yetkisi yok' });
        }
      } else {
        return res.status(403).json({ success: false, message: 'Admin yetkisi yok' });
      }
    }
    req.user = { id: decoded.id, username: decoded.username, role: decoded.role };
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Geçersiz token' });
  }
}

function isAdminUsername(u) { return ADMIN_USERNAMES.includes(u); }
module.exports = { adminMiddleware, isAdminUsername };
