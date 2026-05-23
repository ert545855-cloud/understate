const jwt = require('jsonwebtoken');
const { ACCESS_TOKEN_EXPIRES_IN, REFRESH_TOKEN_EXPIRES_IN } = require('./constants');

const SECRET = process.env.JWT_SECRET || 'understate_dev_secret_change_in_production';
const REFRESH_SECRET = (process.env.JWT_SECRET || 'understate_dev_secret') + '_refresh';

function signToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: ACCESS_TOKEN_EXPIRES_IN });
}

function verifyToken(token) {
  return jwt.verify(token, SECRET);
}

function signRefreshToken(payload) {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRES_IN });
}

function verifyRefreshToken(token) {
  return jwt.verify(token, REFRESH_SECRET);
}

module.exports = { signToken, verifyToken, signRefreshToken, verifyRefreshToken, SECRET };
