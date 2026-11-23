const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const config = require('../config');
const RefreshToken = require('../models/RefreshToken');
const AppError = require('../utils/AppError');

const parseExpiryToMs = (expiry) => {
  const match = /^(\d+)([smhd])$/.exec(expiry);
  if (!match) {
    return 7 * 24 * 60 * 60 * 1000;
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  const multipliers = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return value * multipliers[unit];
};

const hashToken = (token) =>
  crypto.createHash('sha256').update(token).digest('hex');

const generateAccessToken = (userId, role) =>
  jwt.sign(
    { sub: userId.toString(), role },
    config.jwt.accessSecret,
    { expiresIn: config.jwt.accessExpires }
  );

const generateRefreshToken = (userId) =>
  jwt.sign(
    { sub: userId.toString(), type: 'refresh' },
    config.jwt.refreshSecret,
    { expiresIn: config.jwt.refreshExpires }
  );

const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, config.jwt.accessSecret);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw new AppError('Access token has expired', 401);
    }
    throw new AppError('Invalid access token', 401);
  }
};

const verifyRefreshToken = async (token) => {
  let decoded;
  try {
    decoded = jwt.verify(token, config.jwt.refreshSecret);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw new AppError('Refresh token has expired. Please log in again.', 401);
    }
    throw new AppError('Invalid refresh token', 401);
  }

  const tokenHash = hashToken(token);
  const stored = await RefreshToken.findOne({
    userId: decoded.sub,
    token: tokenHash,
    revoked: false,
    expiresAt: { $gt: new Date() },
  }).select('+token');

  if (!stored) {
    throw new AppError('Refresh token is invalid or has been revoked', 401);
  }

  return { decoded, stored };
};

const storeRefreshToken = async (userId, token, deviceInfo = {}) => {
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + parseExpiryToMs(config.jwt.refreshExpires));

  await RefreshToken.create({
    userId,
    token: tokenHash,
    deviceInfo: deviceInfo || {},
    expiresAt,
    revoked: false,
  });

  return expiresAt;
};

const rotateRefreshToken = async (oldToken, deviceInfo = {}) => {
  const { decoded, stored } = await verifyRefreshToken(oldToken);

  stored.revoked = true;
  await stored.save();

  const newToken = generateRefreshToken(decoded.sub);
  const expiresAt = await storeRefreshToken(decoded.sub, newToken, deviceInfo);

  return {
    refreshToken: newToken,
    expiresAt,
    userId: decoded.sub,
  };
};

const revokeRefreshToken = async (token) => {
  const tokenHash = hashToken(token);

  const result = await RefreshToken.updateOne(
    { token: tokenHash, revoked: false },
    { $set: { revoked: true } }
  );

  return result.modifiedCount > 0;
};

const revokeAllUserTokens = async (userId) => {
  const result = await RefreshToken.updateMany(
    { userId, revoked: false },
    { $set: { revoked: true } }
  );

  return result.modifiedCount;
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  hashToken,
  verifyAccessToken,
  verifyRefreshToken,
  storeRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  revokeAllUserTokens,
};
