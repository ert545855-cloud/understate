const { verifyToken } = require('../config/jwt');
const logger = require('../utils/logger');

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Token gerekli' });
  }

  const token = authHeader.slice(7);
  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    logger.warn('Invalid token attempt');
    return res.status(401).json({ success: false, message: 'Geçersiz token' });
  }
}

function socketAuthMiddleware(socket, next) {
  const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
  if (!token) {
    socket.userId = null;
    socket.username = 'Misafir_' + socket.id.slice(0, 5);
    return next();
  }

  try {
    const decoded = verifyToken(token);
    socket.userId = decoded.id;
    socket.username = decoded.username;
    next();
  } catch (err) {
    socket.userId = null;
    socket.username = 'Misafir_' + socket.id.slice(0, 5);
    next();
  }
}

module.exports = { authMiddleware, socketAuthMiddleware };
