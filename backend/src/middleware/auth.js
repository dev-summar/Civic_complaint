const jwt = require('jsonwebtoken');
const config = require('../config');
const User = require('../models/User');
const AppError = require('../utils/AppError');

const extractBearerToken = (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.slice(7).trim();
};

const protect = async (req, res, next) => {
  try {
    const token = extractBearerToken(req);
    if (!token) {
      return next(new AppError('You are not logged in. Please log in to access this resource.', 401));
    }

    let decoded;
    try {
      decoded = jwt.verify(token, config.jwt.accessSecret);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return next(new AppError('Your session has expired. Please log in again.', 401));
      }
      return next(new AppError('Invalid access token. Please log in again.', 401));
    }

    const user = await User.findById(decoded.sub || decoded.id).select('-password -otp -otpExpires');
    if (!user) {
      return next(new AppError('The user belonging to this token no longer exists.', 401));
    }

    if (user.status !== 'active') {
      return next(new AppError('Your account is not active. Please contact support.', 403));
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!req.user) {
    return next(new AppError('You are not logged in. Please log in to access this resource.', 401));
  }

  if (!roles.includes(req.user.role)) {
    return next(new AppError('You do not have permission to perform this action.', 403));
  }

  next();
};

const optionalAuth = async (req, res, next) => {
  try {
    const token = extractBearerToken(req);
    if (!token) {
      return next();
    }

    let decoded;
    try {
      decoded = jwt.verify(token, config.jwt.accessSecret);
    } catch {
      return next();
    }

    const user = await User.findById(decoded.sub || decoded.id).select('-password -otp -otpExpires');
    if (user && user.status === 'active') {
      req.user = user;
    }

    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { protect, authorize, optionalAuth };
