const { Notification, NOTIFICATION_TYPES } = require('../models');
const firebaseService = require('./firebase.service');
const logger = require('../utils/logger');

const createAndPush = async ({
  userId,
  title,
  body,
  type = NOTIFICATION_TYPES.SYSTEM,
  data = {},
  deviceToken = null,
}) => {
  const notification = await Notification.create({
    userId,
    title,
    body,
    type,
    data,
    isRead: false,
  });

  let pushResult = null;
  const token = deviceToken;

  if (token) {
    pushResult = await firebaseService.sendToDevice(
      token,
      { title, body },
      {
        ...data,
        notificationId: notification._id.toString(),
        type,
      }
    );
  }

  if (!pushResult?.success && !pushResult?.skipped) {
    logger.warn('Push notification delivery issue', {
      userId,
      notificationId: notification._id,
      pushResult,
    });
  }

  return { notification, pushResult };
};

const listForUser = async (userId, { page = 1, limit = 20, unreadOnly = false } = {}) => {
  const filter = { userId };
  if (unreadOnly) {
    filter.isRead = false;
  }

  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Notification.countDocuments(filter),
  ]);

  return { items, page, limit, total };
};

const markAsRead = async (notificationId, userId) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, userId },
    { isRead: true },
    { new: true }
  );

  if (!notification) {
    return null;
  }

  return notification;
};

const markAllAsRead = async (userId) => {
  const result = await Notification.updateMany({ userId, isRead: false }, { isRead: true });
  return { modifiedCount: result.modifiedCount };
};

const getUnreadCount = async (userId) =>
  Notification.countDocuments({ userId, isRead: false });

module.exports = {
  createAndPush,
  listForUser,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
};
