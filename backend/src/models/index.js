const User = require('./User');
const Complaint = require('./Complaint');
const Comment = require('./Comment');
const Assignment = require('./Assignment');
const Department = require('./Department');
const Zone = require('./Zone');
const Notification = require('./Notification');
const AuditLog = require('./AuditLog');
const Session = require('./Session');
const RefreshToken = require('./RefreshToken');

module.exports = {
  User,
  Complaint,
  Comment,
  Assignment,
  Department,
  Zone,
  Notification,
  AuditLog,
  Session,
  RefreshToken,
  ASSIGNMENT_STATUS: Assignment.ASSIGNMENT_STATUS,
  NOTIFICATION_TYPES: Notification.NOTIFICATION_TYPES,
  AUDIT_ACTIONS: AuditLog.AUDIT_ACTIONS,
  AUDIT_RESOURCES: AuditLog.AUDIT_RESOURCES,
};
