const mongoose = require('mongoose');

const AUDIT_ACTIONS = {
  CREATE: 'create',
  READ: 'read',
  UPDATE: 'update',
  DELETE: 'delete',
  LOGIN: 'login',
  LOGOUT: 'logout',
  ASSIGN: 'assign',
  RESOLVE: 'resolve',
  REJECT: 'reject',
  ESCALATE: 'escalate',
  EXPORT: 'export',
};

const AUDIT_RESOURCES = {
  USER: 'user',
  COMPLAINT: 'complaint',
  COMMENT: 'comment',
  ASSIGNMENT: 'assignment',
  DEPARTMENT: 'department',
  ZONE: 'zone',
  NOTIFICATION: 'notification',
  SESSION: 'session',
  SYSTEM: 'system',
};

const auditLogSchema = new mongoose.Schema(
  {
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Actor reference is required'],
      index: true,
    },
    action: {
      type: String,
      enum: {
        values: Object.values(AUDIT_ACTIONS),
        message: '{VALUE} is not a valid audit action',
      },
      required: [true, 'Audit action is required'],
      index: true,
    },
    resource: {
      type: String,
      enum: {
        values: Object.values(AUDIT_RESOURCES),
        message: '{VALUE} is not a valid audit resource',
      },
      required: [true, 'Audit resource is required'],
      index: true,
    },
    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      index: true,
    },
    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    ip: {
      type: String,
      trim: true,
      default: null,
    },
    userAgent: {
      type: String,
      trim: true,
      maxlength: 500,
      default: null,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

auditLogSchema.index({ actor: 1, createdAt: -1 });
auditLogSchema.index({ resource: 1, resourceId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 365 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

module.exports = AuditLog;
module.exports.AUDIT_ACTIONS = AUDIT_ACTIONS;
module.exports.AUDIT_RESOURCES = AUDIT_RESOURCES;
