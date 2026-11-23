const { User } = require('../models');
const AppError = require('../utils/AppError');
const { ROLES } = require('../utils/constants');
const { logAudit } = require('../helpers/audit');
const { AUDIT_ACTIONS, AUDIT_RESOURCES } = require('../models');

const STAFF_ROLES = [ROLES.OFFICER, ROLES.WORKER];

const buildUserFilter = ({ role, status, department, zone, search }) => {
  const filter = {};
  if (role) filter.role = role;
  if (status) filter.status = status;
  if (department) filter.department = department;
  if (zone) filter.zone = zone;
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
    ];
  }
  return filter;
};

const list = async (query = {}) => {
  const { page = 1, limit = 20, role, status, department, zone, search } = query;
  const filter = buildUserFilter({ role, status, department, zone, search });
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    User.find(filter)
      .populate('department', 'name code')
      .populate('zone', 'name code district')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    User.countDocuments(filter),
  ]);

  return { items, page, limit, total };
};

const getById = async (id) => {
  const user = await User.findById(id)
    .populate('department', 'name code')
    .populate('zone', 'name code district');

  if (!user) {
    throw new AppError('User not found', 404);
  }

  return user;
};

const updateProfile = async (userId, payload) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  if (payload.phone && payload.phone !== user.phone) {
    const phoneTaken = await User.findOne({ phone: payload.phone, _id: { $ne: userId } });
    if (phoneTaken) {
      throw new AppError('Phone number is already in use', 409);
    }
  }

  Object.assign(user, payload);
  await user.save();
  return user;
};

const adminCreateUser = async (payload, actorId, req = null) => {
  const existing = await User.findOne({
    $or: [{ email: payload.email }, { phone: payload.phone }],
  });

  if (existing) {
    throw new AppError('Email or phone already registered', 409);
  }

  if (STAFF_ROLES.includes(payload.role) && !payload.department) {
    throw new AppError('Department is required for officers and field workers', 400);
  }

  const user = await User.create({
    ...payload,
    isVerified: true,
  });

  await logAudit({
    actor: actorId,
    action: AUDIT_ACTIONS.CREATE,
    resource: AUDIT_RESOURCES.USER,
    resourceId: user._id,
    meta: { role: user.role },
    req,
  });

  return user;
};

const adminUpdateUser = async (id, payload, actorId, req = null) => {
  const user = await User.findById(id);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  if (payload.email && payload.email !== user.email) {
    const emailTaken = await User.findOne({ email: payload.email, _id: { $ne: id } });
    if (emailTaken) {
      throw new AppError('Email is already in use', 409);
    }
  }

  if (payload.phone && payload.phone !== user.phone) {
    const phoneTaken = await User.findOne({ phone: payload.phone, _id: { $ne: id } });
    if (phoneTaken) {
      throw new AppError('Phone number is already in use', 409);
    }
  }

  Object.assign(user, payload);
  await user.save();

  await logAudit({
    actor: actorId,
    action: AUDIT_ACTIONS.UPDATE,
    resource: AUDIT_RESOURCES.USER,
    resourceId: user._id,
    meta: payload,
    req,
  });

  return user;
};

const changeStatus = async (id, { status, reason }, actorId, req = null) => {
  const user = await User.findById(id);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  const previousStatus = user.status;
  user.status = status;
  await user.save();

  await logAudit({
    actor: actorId,
    action: AUDIT_ACTIONS.UPDATE,
    resource: AUDIT_RESOURCES.USER,
    resourceId: user._id,
    meta: { previousStatus, newStatus: status, reason },
    req,
  });

  return user;
};

const remove = async (id, actorId, req = null) => {
  const user = await User.findById(id);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  user.status = 'inactive';
  await user.save();

  await logAudit({
    actor: actorId,
    action: AUDIT_ACTIONS.DELETE,
    resource: AUDIT_RESOURCES.USER,
    resourceId: user._id,
    req,
  });

  return user;
};

const listWorkers = async (query = {}) => {
  return list({ ...query, role: ROLES.WORKER, status: query.status || 'active' });
};

const listOfficers = async (query = {}) => {
  return list({ ...query, role: ROLES.OFFICER, status: query.status || 'active' });
};

const assignStaffToZone = async (userId, { department, zone }, actorId, req = null) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  if (!STAFF_ROLES.includes(user.role)) {
    throw new AppError('Only officers and field workers can be assigned to departments/zones', 400);
  }

  if (department) user.department = department;
  if (zone) user.zone = zone;
  await user.save();

  await logAudit({
    actor: actorId,
    action: AUDIT_ACTIONS.UPDATE,
    resource: AUDIT_RESOURCES.USER,
    resourceId: user._id,
    meta: { department, zone, action: 'assign_staff' },
    req,
  });

  return user;
};

module.exports = {
  list,
  getById,
  updateProfile,
  adminCreateUser,
  adminUpdateUser,
  changeStatus,
  remove,
  listWorkers,
  listOfficers,
  assignStaffToZone,
};
