const notificationService = require('../services/notification.service');
const { asyncHandler, sendSuccess, sendPaginated } = require('../utils/response');

const list = asyncHandler(async (req, res) => {
  const result = await notificationService.listForUser(req.user._id, {
    page: req.query.page,
    limit: req.query.limit,
    unreadOnly: req.query.unreadOnly === 'true',
  });
  sendPaginated(res, { ...result, message: 'Notifications fetched successfully' });
});

const markRead = asyncHandler(async (req, res) => {
  const notification = await notificationService.markAsRead(req.params.id, req.user._id);
  sendSuccess(res, notification, 'Notification marked as read');
});

const markAllRead = asyncHandler(async (req, res) => {
  const result = await notificationService.markAllAsRead(req.user._id);
  sendSuccess(res, result, 'All notifications marked as read');
});

const unreadCount = asyncHandler(async (req, res) => {
  const count = await notificationService.getUnreadCount(req.user._id);
  sendSuccess(res, { count }, 'Unread count fetched successfully');
});

module.exports = {
  list,
  markRead,
  markAllRead,
  unreadCount,
};
