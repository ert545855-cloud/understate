const jwt = require('jsonwebtoken');
const { JWT_EXPIRES_IN } = require('./constants');

const SECRET = process.env.JWT_SECRET || 'understate_dev_secret_change_in_production';

function signToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function verifyToken(token) {
  return jwt.verify(token, SECRET);
}

module.exports = { signToken, verifyToken, SECRET };
