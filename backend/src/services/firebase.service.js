const admin = require('firebase-admin');
const config = require('../config');
const logger = require('../utils/logger');

let messaging = null;
let initialized = false;

const hasCredentials = Boolean(
  config.firebase.projectId
  && config.firebase.clientEmail
  && config.firebase.privateKey
);

if (hasCredentials) {
  try {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: config.firebase.projectId,
          clientEmail: config.firebase.clientEmail,
          privateKey: config.firebase.privateKey,
        }),
      });
    }
    messaging = admin.messaging();
    initialized = true;
    logger.info('Firebase Admin initialized');
  } catch (error) {
    logger.warn('Firebase Admin initialization failed', { message: error.message });
  }
} else {
  logger.warn('Firebase credentials not configured — push notifications disabled');
}

const isConfigured = () => initialized && messaging !== null;

const sendToDevice = async (token, notification = {}, data = {}) => {
  if (!isConfigured()) {
    logger.debug('Firebase not configured — skipping push to device');
    return { success: false, skipped: true, reason: 'not_configured' };
  }

  if (!token) {
    return { success: false, skipped: true, reason: 'missing_token' };
  }

  try {
    const messageId = await messaging.send({
      token,
      notification: {
        title: notification.title || 'Rabta JK',
        body: notification.body || '',
        ...(notification.imageUrl ? { imageUrl: notification.imageUrl } : {}),
      },
      data: Object.fromEntries(
        Object.entries(data).map(([key, value]) => [key, String(value)])
      ),
      android: {
        priority: 'high',
        notification: {
          channelId: 'rabta_jk',
          sound: 'default',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
    });

    return { success: true, messageId };
  } catch (error) {
    logger.error('Firebase push to device failed', { message: error.message });
    return { success: false, error: error.message };
  }
};

const sendToMany = async (tokens, notification = {}, data = {}) => {
  if (!isConfigured()) {
    logger.debug('Firebase not configured — skipping push to many');
    return { success: false, skipped: true, reason: 'not_configured' };
  }

  const validTokens = (tokens || []).filter(Boolean);
  if (validTokens.length === 0) {
    return { success: false, skipped: true, reason: 'no_tokens' };
  }

  try {
    const response = await messaging.sendEachForMulticast({
      tokens: validTokens,
      notification: {
        title: notification.title || 'Rabta JK',
        body: notification.body || '',
        ...(notification.imageUrl ? { imageUrl: notification.imageUrl } : {}),
      },
      data: Object.fromEntries(
        Object.entries(data).map(([key, value]) => [key, String(value)])
      ),
      android: {
        priority: 'high',
        notification: {
          channelId: 'rabta_jk',
          sound: 'default',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
    });

    return {
      success: response.failureCount === 0,
      successCount: response.successCount,
      failureCount: response.failureCount,
      responses: response.responses,
    };
  } catch (error) {
    logger.error('Firebase multicast push failed', { message: error.message });
    return { success: false, error: error.message };
  }
};

module.exports = {
  admin,
  isConfigured,
  sendToDevice,
  sendToMany,
};
