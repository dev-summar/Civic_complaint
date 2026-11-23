/**
 * Wipe all complaints + related records so E2E testing starts clean.
 * Keeps users, departments, and zones.
 *
 * Usage: npm run clear:complaints
 */
require('dotenv').config();

const connectDB = require('../config/db');
const logger = require('../utils/logger');
const {
  Complaint,
  Comment,
  Assignment,
  Notification,
  AuditLog,
} = require('../models');

const clear = async () => {
  await connectDB();

  const [complaints, comments, assignments, notifications, audits] =
    await Promise.all([
      Complaint.deleteMany({}),
      Comment.deleteMany({}),
      Assignment.deleteMany({}),
      Notification.deleteMany({}),
      AuditLog.deleteMany({ resource: 'complaint' }),
    ]);

  logger.info('Cleared complaint data for E2E testing');
  logger.info(
    `Deleted — complaints: ${complaints.deletedCount}, comments: ${comments.deletedCount}, assignments: ${assignments.deletedCount}, notifications: ${notifications.deletedCount}, complaint audits: ${audits.deletedCount}`,
  );

  process.exit(0);
};

clear().catch((err) => {
  logger.error('Clear failed', { message: err.message, stack: err.stack });
  process.exit(1);
});
