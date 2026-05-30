
const { verifyToken } = require('../config/jwt');
const logger = require('../utils/logger');

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer '))
    return res.status(401).json({ success: false, message: 'Token gerekli' });

  try {
    const decoded = verifyToken(authHeader.slice(7));
    req.user = { id: decoded.id, username: decoded.username, role: decoded.role };
    next();
  } catch {
    logger.warn('Invalid token attempt');
    return res.status(401).json({ success: false, message: 'Geçersiz token' });
  }
}

function adminMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer '))
    return res.status(401).json({ success: false, message: 'Token gerekli' });
  try {
    const decoded = verifyToken(authHeader.slice(7));
    if (decoded.role !== 'admin' && decoded.role !== 'moderator')
      return res.status(403).json({ success: false, message: 'Yetkisiz' });
    req.user = { id: decoded.id, username: decoded.username, role: decoded.role };
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Geçersiz token' });
  }
}

function socketAuthMiddleware(socket, next) {
  const token = socket.handshake.auth?.token
    || socket.handshake.query?.token
    || socket.handshake.headers?.authorization?.replace('Bearer ', '');

  if (!token) {
    socket.userId   = null;
    socket.username = `Misafir_${socket.id.slice(0, 5)}`;
    socket.role     = 'guest';
    return next();
  }
  try {
    const decoded   = verifyToken(token);
    socket.userId   = decoded.id;
    socket.username = decoded.username;
    socket.role     = decoded.role || 'user';
    next();
  } catch {
    socket.userId   = null;
    socket.username = `Misafir_${socket.id.slice(0, 5)}`;
    socket.role     = 'guest';
    next();
  }
}

module.exports = { authMiddleware, adminMiddleware, socketAuthMiddleware };
