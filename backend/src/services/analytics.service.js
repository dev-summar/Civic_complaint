const ExcelJS = require('exceljs');
const { Parser } = require('json2csv');
const {
  Complaint,
  User,
  Department,
  Zone,
  AUDIT_ACTIONS,
  AUDIT_RESOURCES,
} = require('../models');
const AppError = require('../utils/AppError');
const { ROLES, COMPLAINT_STATUS, PRIORITY } = require('../utils/constants');
const { logAudit } = require('../helpers/audit');

const statusCountsPipeline = (match = {}) => [
  { $match: match },
  { $group: { _id: '$status', count: { $sum: 1 } } },
];

const toCountMap = (results) =>
  results.reduce((acc, item) => {
    acc[item._id] = item.count;
    return acc;
  }, {});

const getCitizenDashboard = async (userId) => {
  const [statusBreakdown, recent, total] = await Promise.all([
    Complaint.aggregate(statusCountsPipeline({ citizenId: userId })),
    Complaint.find({ citizenId: userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('title status priority createdAt category'),
    Complaint.countDocuments({ citizenId: userId }),
  ]);

  return {
    total,
    byStatus: toCountMap(statusBreakdown),
    recent,
  };
};

const getOfficerDashboard = async (user) => {
  const match = {
    $or: [{ assignedOfficer: user._id }, { department: user.department }],
    status: { $nin: [COMPLAINT_STATUS.DRAFT, COMPLAINT_STATUS.CLOSED] },
  };

  const [statusBreakdown, pendingAssignment, inProgress, recent] = await Promise.all([
    Complaint.aggregate(statusCountsPipeline(match)),
    Complaint.countDocuments({ ...match, status: COMPLAINT_STATUS.SUBMITTED }),
    Complaint.countDocuments({ assignedOfficer: user._id, status: COMPLAINT_STATUS.IN_PROGRESS }),
    Complaint.find(match).sort({ priority: -1, createdAt: -1 }).limit(10)
      .select('title status priority category createdAt assignedWorker'),
  ]);

  return {
    byStatus: toCountMap(statusBreakdown),
    pendingAssignment,
    inProgress,
    recent,
  };
};

const getWorkerDashboard = async (userId) => {
  const match = { assignedWorker: userId, status: { $in: [COMPLAINT_STATUS.ASSIGNED, COMPLAINT_STATUS.IN_PROGRESS] } };

  const [active, completedToday, recent] = await Promise.all([
    Complaint.countDocuments(match),
    Complaint.countDocuments({
      assignedWorker: userId,
      status: COMPLAINT_STATUS.RESOLVED,
      resolvedAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
    }),
    Complaint.find(match).sort({ priority: -1, createdAt: -1 }).limit(10)
      .select('title status priority category address latitude longitude'),
  ]);

  return { active, completedToday, recent };
};

const getAdminDashboard = async () => {
  const [
    totalComplaints,
    totalUsers,
    statusBreakdown,
    priorityBreakdown,
    categoryBreakdown,
    recentComplaints,
  ] = await Promise.all([
    Complaint.countDocuments(),
    User.countDocuments(),
    Complaint.aggregate(statusCountsPipeline()),
    Complaint.aggregate([
      { $group: { _id: '$priority', count: { $sum: 1 } } },
    ]),
    Complaint.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),
    Complaint.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('citizenId', 'name')
      .select('title status priority category createdAt'),
  ]);

  const usersByRole = await User.aggregate([
    { $group: { _id: '$role', count: { $sum: 1 } } },
  ]);

  return {
    totalComplaints,
    totalUsers,
    byStatus: toCountMap(statusBreakdown),
    byPriority: toCountMap(priorityBreakdown),
    topCategories: categoryBreakdown,
    usersByRole: toCountMap(usersByRole),
    recentComplaints,
  };
};

const getDashboardByRole = async (user) => {
  switch (user.role) {
    case ROLES.CITIZEN:
      return getCitizenDashboard(user._id);
    case ROLES.OFFICER:
      return getOfficerDashboard(user);
    case ROLES.WORKER:
      return getWorkerDashboard(user._id);
    case ROLES.ADMIN:
      return getAdminDashboard();
    default:
      throw new AppError('Unsupported role for dashboard', 400);
  }
};

const getDepartmentAnalytics = async (departmentId = null) => {
  const match = departmentId ? { department: departmentId } : {};

  const [byStatus, byCategory, avgResolutionMs, departments] = await Promise.all([
    Complaint.aggregate([
      { $match: match },
      { $group: { _id: { department: '$department', status: '$status' }, count: { $sum: 1 } } },
    ]),
    Complaint.aggregate([
      { $match: match },
      { $group: { _id: { department: '$department', category: '$category' }, count: { $sum: 1 } } },
    ]),
    Complaint.aggregate([
      { $match: { ...match, status: COMPLAINT_STATUS.RESOLVED, resolvedAt: { $ne: null } } },
      {
        $group: {
          _id: '$department',
          avgMs: { $avg: { $subtract: ['$resolvedAt', '$createdAt'] } },
          count: { $sum: 1 },
        },
      },
    ]),
    Department.find(departmentId ? { _id: departmentId } : { isActive: true }).select('name code'),
  ]);

  const deptMap = departments.reduce((acc, d) => {
    acc[d._id.toString()] = { name: d.name, code: d.code };
    return acc;
  }, {});

  return {
    byStatus,
    byCategory,
    avgResolution: avgResolutionMs.map((row) => ({
      departmentId: row._id,
      department: deptMap[row._id?.toString()] || null,
      avgResolutionHours: row.avgMs ? Math.round(row.avgMs / (1000 * 60 * 60)) : null,
      resolvedCount: row.count,
    })),
  };
};

const getZoneAnalytics = async (zoneId = null) => {
  const match = zoneId ? { zone: zoneId } : {};

  const [byStatus, byCategory, zones] = await Promise.all([
    Complaint.aggregate([
      { $match: match },
      { $group: { _id: { zone: '$zone', status: '$status' }, count: { $sum: 1 } } },
    ]),
    Complaint.aggregate([
      { $match: match },
      { $group: { _id: { zone: '$zone', category: '$category' }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    Zone.find(zoneId ? { _id: zoneId } : { isActive: true }).select('name code district'),
  ]);

  const zoneMap = zones.reduce((acc, z) => {
    acc[z._id.toString()] = { name: z.name, code: z.code, district: z.district };
    return acc;
  }, {});

  return { byStatus, byCategory, zones: zoneMap };
};

const buildComplaintExportRows = async (filters = {}) => {
  const query = {};
  if (filters.status) query.status = filters.status;
  if (filters.category) query.category = filters.category;
  if (filters.department) query.department = filters.department;
  if (filters.zone) query.zone = filters.zone;
  if (filters.fromDate || filters.toDate) {
    query.createdAt = {};
    if (filters.fromDate) query.createdAt.$gte = new Date(filters.fromDate);
    if (filters.toDate) query.createdAt.$lte = new Date(filters.toDate);
  }

  const complaints = await Complaint.find(query)
    .populate('citizenId', 'name email phone')
    .populate('department', 'name code')
    .populate('zone', 'name code district')
    .populate('assignedOfficer', 'name')
    .populate('assignedWorker', 'name')
    .sort({ createdAt: -1 })
    .lean();

  return complaints.map((c) => ({
    id: c._id.toString(),
    title: c.title,
    category: c.category,
    status: c.status,
    priority: c.priority,
    citizen: c.citizenId?.name || 'Anonymous',
    department: c.department?.name || '',
    zone: c.zone?.name || '',
    officer: c.assignedOfficer?.name || '',
    worker: c.assignedWorker?.name || '',
    address: c.address,
    latitude: c.latitude,
    longitude: c.longitude,
    createdAt: c.createdAt?.toISOString(),
    resolvedAt: c.resolvedAt?.toISOString() || '',
  }));
};

const exportToCsv = async (filters = {}, actorId = null, req = null) => {
  const rows = await buildComplaintExportRows(filters);
  const fields = [
    'id', 'title', 'category', 'status', 'priority', 'citizen',
    'department', 'zone', 'officer', 'worker', 'address',
    'latitude', 'longitude', 'createdAt', 'resolvedAt',
  ];
  const parser = new Parser({ fields });
  const csv = parser.parse(rows);

  if (actorId) {
    await logAudit({
      actor: actorId,
      action: AUDIT_ACTIONS.EXPORT,
      resource: AUDIT_RESOURCES.COMPLAINT,
      meta: { format: 'csv', count: rows.length, filters },
      req,
    });
  }

  return { csv, count: rows.length, filename: `complaints-${Date.now()}.csv` };
};

const exportToExcel = async (filters = {}, actorId = null, req = null) => {
  const rows = await buildComplaintExportRows(filters);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Rabta JK';
  const sheet = workbook.addWorksheet('Complaints');

  sheet.columns = [
    { header: 'ID', key: 'id', width: 26 },
    { header: 'Title', key: 'title', width: 30 },
    { header: 'Category', key: 'category', width: 18 },
    { header: 'Status', key: 'status', width: 14 },
    { header: 'Priority', key: 'priority', width: 12 },
    { header: 'Citizen', key: 'citizen', width: 20 },
    { header: 'Department', key: 'department', width: 18 },
    { header: 'Zone', key: 'zone', width: 16 },
    { header: 'Officer', key: 'officer', width: 18 },
    { header: 'Worker', key: 'worker', width: 18 },
    { header: 'Address', key: 'address', width: 30 },
    { header: 'Latitude', key: 'latitude', width: 12 },
    { header: 'Longitude', key: 'longitude', width: 12 },
    { header: 'Created At', key: 'createdAt', width: 22 },
    { header: 'Resolved At', key: 'resolvedAt', width: 22 },
  ];

  sheet.addRows(rows);
  sheet.getRow(1).font = { bold: true };

  const buffer = await workbook.xlsx.writeBuffer();

  if (actorId) {
    await logAudit({
      actor: actorId,
      action: AUDIT_ACTIONS.EXPORT,
      resource: AUDIT_RESOURCES.COMPLAINT,
      meta: { format: 'xlsx', count: rows.length, filters },
      req,
    });
  }

  return {
    buffer,
    count: rows.length,
    filename: `complaints-${Date.now()}.xlsx`,
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  };
};

module.exports = {
  getDashboardByRole,
  getCitizenDashboard,
  getOfficerDashboard,
  getWorkerDashboard,
  getAdminDashboard,
  getDepartmentAnalytics,
  getZoneAnalytics,
  exportToCsv,
  exportToExcel,
};
