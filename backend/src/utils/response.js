const AppError = require('./AppError');

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

const sendSuccess = (res, data = null, message = 'Success', statusCode = 200) => {
  res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

const sendPaginated = (res, { items, page, limit, total, message = 'Success' }) => {
  res.status(200).json({
    success: true,
    message,
    data: items,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit) || 1,
      hasMore: page * limit < total,
    },
  });
};

module.exports = { asyncHandler, sendSuccess, sendPaginated, AppError };
