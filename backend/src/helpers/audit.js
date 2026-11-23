const { AuditLog } = require('../models');

const logAudit = async ({ actor, action, resource, resourceId = null, meta = {}, req = null }) => {
  await AuditLog.create({
    actor,
    action,
    resource,
    resourceId,
    meta,
    ip: req?.ip || req?.headers?.['x-forwarded-for']?.split(',')[0]?.trim() || null,
    userAgent: req?.headers?.['user-agent']?.slice(0, 500) || null,
  });
};

module.exports = { logAudit };
