const mongoose = require('mongoose');
const config = require('../config');
const logger = require('../utils/logger');
const AppError = require('../utils/AppError');

const handleCastError = (err) =>
  new AppError(`Invalid ${err.path}: ${err.value}`, 400);

const handleDuplicateKeyError = (err) => {
  const field = Object.keys(err.keyValue || {})[0] || 'field';
  const value = err.keyValue?.[field];
  return new AppError(`Duplicate value for ${field}: ${value}. Please use another value.`, 409);
};

const handleValidationError = (err) => {
  const errors = Object.values(err.errors || {}).map((e) => ({
    field: e.path,
    message: e.message,
  }));
  const message = errors.map((e) => e.message).join('. ') || 'Validation failed';
  return new AppError(message, 400, errors);
};

const handleJWTError = () =>
  new AppError('Invalid token. Please log in again.', 401);

const handleJWTExpiredError = () =>
  new AppError('Your token has expired. Please log in again.', 401);

const sendErrorDev = (err, res) => {
  res.status(err.statusCode || 500).json({
    success: false,
    status: err.status || 'error',
    message: err.message,
    errors: err.errors || undefined,
    stack: err.stack,
  });
};

const sendErrorProd = (err, res) => {
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      status: err.status,
      message: err.message,
      errors: err.errors || undefined,
    });
  }

  logger.error('Unexpected error', { message: err.message, stack: err.stack });

  return res.status(500).json({
    success: false,
    status: 'error',
    message: 'Something went wrong. Please try again later.',
  });
};

const errorHandler = (err, req, res, _next) => {
  let error = err;

  if (!(error instanceof AppError)) {
    if (error instanceof mongoose.Error.ValidationError) {
      error = handleValidationError(error);
    } else if (error instanceof mongoose.Error.CastError) {
      error = handleCastError(error);
    } else if (error.code === 11000) {
      error = handleDuplicateKeyError(error);
    } else if (error.name === 'JsonWebTokenError') {
      error = handleJWTError();
    } else if (error.name === 'TokenExpiredError') {
      error = handleJWTExpiredError();
    } else {
      error = new AppError(error.message || 'Internal server error', error.statusCode || 500);
      error.isOperational = false;
      error.stack = err.stack;
    }
  }

  if (config.env === 'development') {
    logger.debug('Error handled', { message: error.message, statusCode: error.statusCode });
    sendErrorDev(error, res);
  } else {
    sendErrorProd(error, res);
  }
};

const notFound = (req, _res, next) => {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
};

module.exports = { errorHandler, notFound };
