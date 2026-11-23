const mongoose = require('mongoose');
const {
  Complaint,
  Comment,
  Assignment,
  User,
  ASSIGNMENT_STATUS,
  AUDIT_ACTIONS,
  AUDIT_RESOURCES,
  NOTIFICATION_TYPES,
} = require('../models');
const AppError = require('../utils/AppError');
const { ROLES, COMPLAINT_STATUS, PRIORITY } = require('../utils/constants');
const { buildGeoNearPipeline, buildGeoWithinCircleQuery } = require('../utils/geo');
const aiService = require('./ai.service');
const departmentService = require('./department.service');
const zoneService = require('./zone.service');
const notificationService = require('./notification.service');
const { logAudit } = require('../helpers/audit');

const POPULATE_FIELDS = [
  { path: 'citizenId', select: 'name email phone profilePhoto' },
  { path: 'assignedOfficer', select: 'name email phone profilePhoto role' },
  { path: 'assignedWorker', select: 'name email phone profilePhoto role' },
  { path: 'department', select: 'name code' },
  { path: 'zone', select: 'name code district' },
  { path: 'timeline.by', select: 'name role' },
  { path: 'signature.signedBy', select: 'name role' },
];

const canAccessComplaint = (complaint, user) => {
  if (user.role === ROLES.ADMIN) return true;
  if (user.role === ROLES.CITIZEN) {
    return complaint.citizenId?.toString() === user._id.toString();
  }
  if (user.role === ROLES.OFFICER) {
    return (
      complaint.assignedOfficer?.toString() === user._id.toString()
      || complaint.department?.toString() === user.department?.toString()
    );
  }
  if (user.role === ROLES.WORKER) {
    return complaint.assignedWorker?.toString() === user._id.toString();
  }
  return false;
};

const findNearbyForDuplicateCheck = async (longitude, latitude, radiusKm = 2) => {
  return Complaint.find({
    ...buildGeoWithinCircleQuery(longitude, latitude, radiusKm),
    status: { $nin: [COMPLAINT_STATUS.REJECTED, COMPLAINT_STATUS.DRAFT] },
  })
    .select('title description category latitude longitude location status createdAt')
    .limit(50)
    .lean();
};

const resolveDepartmentAndZone = async (departmentCode, longitude, latitude) => {
  let department = null;
  if (departmentCode) {
    department = await departmentService.getByCode(departmentCode);
  }

  const zone = await zoneService.findZoneForPoint(longitude, latitude);

  return {
    department: department?._id || null,
    zone: zone?._id || null,
  };
};

const create = async (payload, user, req = null) => {
  const { latitude, longitude } = payload;

  const nearbyComplaints = await findNearbyForDuplicateCheck(longitude, latitude);

  const analysis = await aiService.analyzeComplaint({
    title: payload.title,
    description: payload.description,
    priority: payload.priority || PRIORITY.MEDIUM,
    latitude,
    longitude,
    nearbyComplaints,
  });

  const { department, zone } = await resolveDepartmentAndZone(
    analysis.department,
    longitude,
    latitude
  );

  const initialStatus = payload.submit === false
    ? COMPLAINT_STATUS.DRAFT
    : COMPLAINT_STATUS.SUBMITTED;

  const complaint = await Complaint.create({
    title: payload.title,
    description: payload.description,
    category: payload.category || analysis.category,
    priority: analysis.suggestedPriority || payload.priority || PRIORITY.MEDIUM,
    status: initialStatus,
    citizenId: user._id,
    department,
    zone,
    latitude,
    longitude,
    location: { type: 'Point', coordinates: [longitude, latitude] },
    address: payload.address || '',
    isAnonymous: payload.isAnonymous || false,
    images: payload.images || [],
    videos: payload.videos || [],
    aiClassification: analysis.category,
    aiSeverity: analysis.severity,
    aiSummary: analysis.summary,
    aiEstimatedDays: analysis.estimatedDays,
    aiDuplicates: analysis.duplicates.map((d) => ({
      complaintId: d.complaintId,
      score: d.score,
    })),
    timeline: [{
      status: initialStatus,
      note: 'Complaint created',
      by: user._id,
      at: new Date(),
    }],
  });

  const populated = await Complaint.findById(complaint._id).populate(POPULATE_FIELDS);

  if (initialStatus === COMPLAINT_STATUS.SUBMITTED) {
    await notificationService.createAndPush({
      userId: user._id,
      title: 'Complaint Submitted',
      body: `Your complaint "${payload.title}" has been submitted successfully.`,
      type: NOTIFICATION_TYPES.COMPLAINT_UPDATE,
      data: { complaintId: complaint._id.toString() },
      deviceToken: user.deviceToken,
    });
  }

  return populated;
};

const update = async (id, payload, user) => {
  const complaint = await Complaint.findById(id);
  if (!complaint) {
    throw new AppError('Complaint not found', 404);
  }

  const isOwner = complaint.citizenId.toString() === user._id.toString();
  const isStaff = [ROLES.ADMIN, ROLES.OFFICER].includes(user.role);

  if (!isOwner && !isStaff) {
    throw new AppError('You do not have permission to update this complaint', 403);
  }

  if (isOwner && ![COMPLAINT_STATUS.DRAFT, COMPLAINT_STATUS.SUBMITTED].includes(complaint.status)) {
    throw new AppError('Complaint can no longer be edited', 400);
  }

  const allowedFields = isStaff
    ? ['title', 'description', 'category', 'priority', 'latitude', 'longitude', 'address', 'isAnonymous', 'images', 'videos', 'checklist']
    : ['title', 'description', 'category', 'latitude', 'longitude', 'address', 'isAnonymous', 'images', 'videos'];

  allowedFields.forEach((field) => {
    if (payload[field] !== undefined) {
      complaint[field] = payload[field];
    }
  });

  if (payload.latitude != null && payload.longitude != null) {
    complaint.location = {
      type: 'Point',
      coordinates: [payload.longitude, payload.latitude],
    };
  }

  await complaint.save();
  return Complaint.findById(id).populate(POPULATE_FIELDS);
};

const softDelete = async (id, user, req = null) => {
  const complaint = await Complaint.findById(id);
  if (!complaint) {
    throw new AppError('Complaint not found', 404);
  }

  if (user.role !== ROLES.ADMIN && complaint.citizenId.toString() !== user._id.toString()) {
    throw new AppError('You do not have permission to delete this complaint', 403);
  }

  complaint.status = COMPLAINT_STATUS.REJECTED;
  complaint.rejectedReason = 'Deleted by user';
  complaint.addTimelineEntry(COMPLAINT_STATUS.REJECTED, 'Complaint deleted', user._id);
  await complaint.save();

  await logAudit({
    actor: user._id,
    action: AUDIT_ACTIONS.DELETE,
    resource: AUDIT_RESOURCES.COMPLAINT,
    resourceId: complaint._id,
    req,
  });

  return complaint;
};

const assign = async (id, { officerId, workerId, notes }, actor, req = null) => {
  const complaint = await Complaint.findById(id);
  if (!complaint) {
    throw new AppError('Complaint not found', 404);
  }

  if (![ROLES.ADMIN, ROLES.OFFICER].includes(actor.role)) {
    throw new AppError('You do not have permission to assign complaints', 403);
  }

  // Officers assigning workers become the owning officer by default
  if (actor.role === ROLES.OFFICER && !officerId) {
    complaint.assignedOfficer = actor._id;
    complaint.department = actor.department || complaint.department;
    complaint.zone = actor.zone || complaint.zone;
  }

  if (officerId) {
    const officer = await User.findById(officerId);
    if (!officer || officer.role !== ROLES.OFFICER) {
      throw new AppError('Invalid officer', 400);
    }
    complaint.assignedOfficer = officerId;
    complaint.department = officer.department || complaint.department;
    complaint.zone = officer.zone || complaint.zone;
  }

  if (workerId) {
    const worker = await User.findById(workerId);
    if (!worker || worker.role !== ROLES.WORKER) {
      throw new AppError('Invalid field worker', 400);
    }
    complaint.assignedWorker = workerId;
  }

  const effectiveOfficerId = complaint.assignedOfficer;
  if (!effectiveOfficerId) {
    throw new AppError('An officer must be set before creating an assignment', 400);
  }

  complaint.addTimelineEntry(
    COMPLAINT_STATUS.ASSIGNED,
    notes || 'Complaint assigned',
    actor._id
  );
  await complaint.save();

  await Assignment.updateMany(
    {
      complaintId: complaint._id,
      status: { $in: [ASSIGNMENT_STATUS.PENDING, ASSIGNMENT_STATUS.ACTIVE] },
    },
    { status: ASSIGNMENT_STATUS.REASSIGNED }
  );

  const assignment = await Assignment.create({
    complaintId: complaint._id,
    officerId: effectiveOfficerId,
    workerId: complaint.assignedWorker || null,
    assignedBy: actor._id,
    status: ASSIGNMENT_STATUS.PENDING,
    notes: notes || '',
  });

  const notifyTargets = [complaint.assignedOfficer, complaint.assignedWorker].filter(Boolean);
  await Promise.all(
    notifyTargets.map(async (targetId) => {
      const targetUser = await User.findById(targetId);
      if (targetUser) {
        await notificationService.createAndPush({
          userId: targetId,
          title: 'New Assignment',
          body: `Complaint "${complaint.title}" has been assigned to you.`,
          type: NOTIFICATION_TYPES.ASSIGNMENT,
          data: { complaintId: complaint._id.toString(), assignmentId: assignment._id.toString() },
          deviceToken: targetUser.deviceToken,
        });
      }
    })
  );

  await logAudit({
    actor: actor._id,
    action: AUDIT_ACTIONS.ASSIGN,
    resource: AUDIT_RESOURCES.COMPLAINT,
    resourceId: complaint._id,
    meta: { officerId, workerId, assignmentId: assignment._id },
    req,
  });

  return Complaint.findById(id).populate(POPULATE_FIELDS);
};

const nearby = async ({ latitude, longitude, radiusKm = 5, limit = 20, status, category }) => {
  const query = {};
  if (status) query.status = status;
  if (category) query.category = category;

  const pipeline = buildGeoNearPipeline({
    longitude,
    latitude,
    maxDistanceMeters: radiusKm * 1000,
    query,
    limit,
  });

  return Complaint.aggregate(pipeline);
};

const myComplaints = async (userId, { page = 1, limit = 20, status } = {}) => {
  const filter = { citizenId: userId };
  if (status) filter.status = status;

  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    Complaint.find(filter).populate(POPULATE_FIELDS).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Complaint.countDocuments(filter),
  ]);

  return { items, page, limit, total };
};

const getById = async (id, user) => {
  const complaint = await Complaint.findById(id).populate(POPULATE_FIELDS);
  if (!complaint) {
    throw new AppError('Complaint not found', 404);
  }

  if (!canAccessComplaint(complaint, user)) {
    throw new AppError('You do not have permission to view this complaint', 403);
  }

  if (complaint.isAnonymous && user.role !== ROLES.ADMIN && user.role !== ROLES.OFFICER) {
    if (user.role === ROLES.CITIZEN && complaint.citizenId?._id?.toString() !== user._id.toString()) {
      complaint.citizenId = undefined;
    }
  }

  return complaint;
};

const getTimeline = async (id, user) => {
  const complaint = await getById(id, user);
  return complaint.timeline;
};

const resolve = async (id, payload, user, req = null) => {
  const complaint = await Complaint.findById(id);
  if (!complaint) {
    throw new AppError('Complaint not found', 404);
  }

  const canResolve =
    user.role === ROLES.ADMIN
    || complaint.assignedOfficer?.toString() === user._id.toString()
    || complaint.assignedWorker?.toString() === user._id.toString();

  if (!canResolve) {
    throw new AppError('You do not have permission to resolve this complaint', 403);
  }

  complaint.resolutionNotes = payload.resolutionNotes;
  if (payload.afterPhotos?.length) {
    complaint.afterPhotos.push(...payload.afterPhotos);
  }
  if (payload.signatureUrl) {
    complaint.signature = {
      url: payload.signatureUrl,
      signedAt: new Date(),
      signedBy: user._id,
    };
  }

  complaint.resolvedAt = new Date();
  complaint.addTimelineEntry(
    COMPLAINT_STATUS.RESOLVED,
    payload.resolutionNotes,
    user._id
  );
  await complaint.save();

  await Assignment.updateMany(
    { complaintId: complaint._id, status: { $in: [ASSIGNMENT_STATUS.PENDING, ASSIGNMENT_STATUS.ACTIVE] } },
    { status: ASSIGNMENT_STATUS.COMPLETED, completedAt: new Date() }
  );

  const citizen = await User.findById(complaint.citizenId);
  if (citizen) {
    await notificationService.createAndPush({
      userId: citizen._id,
      title: 'Complaint Resolved',
      body: `Your complaint "${complaint.title}" has been resolved.`,
      type: NOTIFICATION_TYPES.STATUS_CHANGE,
      data: { complaintId: complaint._id.toString(), status: COMPLAINT_STATUS.RESOLVED },
      deviceToken: citizen.deviceToken,
    });
  }

  await logAudit({
    actor: user._id,
    action: AUDIT_ACTIONS.RESOLVE,
    resource: AUDIT_RESOURCES.COMPLAINT,
    resourceId: complaint._id,
    meta: { resolutionNotes: payload.resolutionNotes },
    req,
  });

  return Complaint.findById(id).populate(POPULATE_FIELDS);
};

const reject = async (id, { rejectedReason }, user, req = null) => {
  const complaint = await Complaint.findById(id);
  if (!complaint) {
    throw new AppError('Complaint not found', 404);
  }

  if (![ROLES.ADMIN, ROLES.OFFICER].includes(user.role)) {
    throw new AppError('You do not have permission to reject complaints', 403);
  }

  complaint.rejectedReason = rejectedReason;
  complaint.addTimelineEntry(COMPLAINT_STATUS.REJECTED, rejectedReason, user._id);
  await complaint.save();

  const citizen = await User.findById(complaint.citizenId);
  if (citizen) {
    await notificationService.createAndPush({
      userId: citizen._id,
      title: 'Complaint Rejected',
      body: `Your complaint "${complaint.title}" was rejected: ${rejectedReason}`,
      type: NOTIFICATION_TYPES.STATUS_CHANGE,
      data: { complaintId: complaint._id.toString(), status: COMPLAINT_STATUS.REJECTED },
      deviceToken: citizen.deviceToken,
    });
  }

  await logAudit({
    actor: user._id,
    action: AUDIT_ACTIONS.REJECT,
    resource: AUDIT_RESOURCES.COMPLAINT,
    resourceId: complaint._id,
    meta: { rejectedReason },
    req,
  });

  return Complaint.findById(id).populate(POPULATE_FIELDS);
};

const escalate = async (id, { note }, user, req = null) => {
  const complaint = await Complaint.findById(id);
  if (!complaint) {
    throw new AppError('Complaint not found', 404);
  }

  if (![ROLES.ADMIN, ROLES.OFFICER, ROLES.CITIZEN].includes(user.role)) {
    throw new AppError('You do not have permission to escalate complaints', 403);
  }

  if (user.role === ROLES.CITIZEN && complaint.citizenId.toString() !== user._id.toString()) {
    throw new AppError('You can only escalate your own complaints', 403);
  }

  complaint.priority = PRIORITY.CRITICAL;
  complaint.addTimelineEntry(COMPLAINT_STATUS.ESCALATED, note || 'Complaint escalated', user._id);
  await complaint.save();

  await logAudit({
    actor: user._id,
    action: AUDIT_ACTIONS.ESCALATE,
    resource: AUDIT_RESOURCES.COMPLAINT,
    resourceId: complaint._id,
    meta: { note },
    req,
  });

  return Complaint.findById(id).populate(POPULATE_FIELDS);
};

const buildFilterQuery = (filters, user) => {
  const query = {};

  if (filters.status) {
    const statuses = Array.isArray(filters.status)
      ? filters.status
      : String(filters.status)
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
    query.status = statuses.length > 1 ? { $in: statuses } : statuses[0];
  }
  if (filters.category) query.category = filters.category;
  if (filters.priority) query.priority = filters.priority;
  if (filters.department) query.department = filters.department;
  if (filters.zone) query.zone = filters.zone;
  if (filters.citizenId) query.citizenId = filters.citizenId;
  if (filters.assignedOfficer) query.assignedOfficer = filters.assignedOfficer;
  if (filters.assignedWorker) query.assignedWorker = filters.assignedWorker;

  if (filters.fromDate || filters.toDate) {
    query.createdAt = {};
    if (filters.fromDate) query.createdAt.$gte = new Date(filters.fromDate);
    if (filters.toDate) query.createdAt.$lte = new Date(filters.toDate);
  }

  const andClauses = [];

  if (filters.search) {
    andClauses.push({
      $or: [
        { title: { $regex: filters.search, $options: 'i' } },
        { description: { $regex: filters.search, $options: 'i' } },
        { address: { $regex: filters.search, $options: 'i' } },
      ],
    });
  }

  if (user.role === ROLES.CITIZEN) {
    query.citizenId = user._id;
  } else if (user.role === ROLES.OFFICER) {
    andClauses.push({
      $or: [
        { assignedOfficer: user._id },
        ...(user.department ? [{ department: user.department }] : []),
        { assignedOfficer: null },
        { assignedOfficer: { $exists: false } },
      ],
    });
  } else if (user.role === ROLES.WORKER) {
    query.assignedWorker = user._id;
  }

  if (andClauses.length === 1) {
    Object.assign(query, andClauses[0]);
  } else if (andClauses.length > 1) {
    query.$and = andClauses;
  }

  return query;
};

const searchAndFilter = async (filters, user) => {
  const {
    page = 1,
    limit = 20,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = filters;

  const query = buildFilterQuery(filters, user);
  const skip = (page - 1) * limit;
  const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

  const [items, total] = await Promise.all([
    Complaint.find(query).populate(POPULATE_FIELDS).sort(sort).skip(skip).limit(limit),
    Complaint.countDocuments(query),
  ]);

  return { items, page, limit, total };
};

const getAnalytics = async (filters = {}) => {
  const match = {};
  if (filters.department) match.department = new mongoose.Types.ObjectId(filters.department);
  if (filters.zone) match.zone = new mongoose.Types.ObjectId(filters.zone);
  if (filters.fromDate || filters.toDate) {
    match.createdAt = {};
    if (filters.fromDate) match.createdAt.$gte = new Date(filters.fromDate);
    if (filters.toDate) match.createdAt.$lte = new Date(filters.toDate);
  }

  const [byStatus, byCategory, byPriority, avgResolution] = await Promise.all([
    Complaint.aggregate([{ $match: match }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    Complaint.aggregate([
      { $match: match },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    Complaint.aggregate([{ $match: match }, { $group: { _id: '$priority', count: { $sum: 1 } } }]),
    Complaint.aggregate([
      {
        $match: {
          ...match,
          status: COMPLAINT_STATUS.RESOLVED,
          resolvedAt: { $ne: null },
        },
      },
      {
        $group: {
          _id: null,
          avgMs: { $avg: { $subtract: ['$resolvedAt', '$createdAt'] } },
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  return {
    byStatus: byStatus.reduce((acc, r) => ({ ...acc, [r._id]: r.count }), {}),
    byCategory,
    byPriority: byPriority.reduce((acc, r) => ({ ...acc, [r._id]: r.count }), {}),
    avgResolutionHours: avgResolution[0]?.avgMs
      ? Math.round(avgResolution[0].avgMs / (1000 * 60 * 60))
      : null,
    resolvedCount: avgResolution[0]?.count || 0,
  };
};

const addComment = async (complaintId, payload, user) => {
  await getById(complaintId, user);

  if (payload.isInternal && ![ROLES.ADMIN, ROLES.OFFICER, ROLES.WORKER].includes(user.role)) {
    throw new AppError('Only staff can post internal comments', 403);
  }

  const comment = await Comment.create({
    complaintId,
    userId: user._id,
    text: payload.text,
    attachments: payload.attachments || [],
    isInternal: payload.isInternal || false,
  });

  return Comment.findById(comment._id).populate('userId', 'name role profilePhoto');
};

const getComments = async (complaintId, user, { includeInternal = false } = {}) => {
  await getById(complaintId, user);

  const filter = { complaintId };
  const isStaff = [ROLES.ADMIN, ROLES.OFFICER, ROLES.WORKER].includes(user.role);

  if (!isStaff || !includeInternal) {
    filter.isInternal = false;
  }

  return Comment.find(filter)
    .populate('userId', 'name role profilePhoto')
    .sort({ createdAt: 1 });
};

module.exports = {
  create,
  update,
  softDelete,
  assign,
  nearby,
  myComplaints,
  getById,
  getTimeline,
  resolve,
  reject,
  escalate,
  searchAndFilter,
  getAnalytics,
  addComment,
  getComments,
  canAccessComplaint,
};
