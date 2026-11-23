const { Assignment, Complaint } = require('../models');
const AppError = require('../utils/AppError');
const { asyncHandler, sendSuccess, sendPaginated } = require('../utils/response');
const { ROLES } = require('../utils/constants');

const list = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, officerId, workerId } = req.query;
  const filter = {};

  if (status) filter.status = status;

  if (req.user.role === ROLES.OFFICER) {
    filter.officerId = req.user._id;
  } else if (req.user.role === ROLES.WORKER) {
    filter.workerId = req.user._id;
  } else if (req.user.role === ROLES.ADMIN) {
    if (officerId) filter.officerId = officerId;
    if (workerId) filter.workerId = workerId;
  } else {
    throw new AppError('You do not have permission to view assignments', 403);
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    Assignment.find(filter)
      .populate('complaintId', 'title status priority category address latitude longitude')
      .populate('officerId', 'name email phone')
      .populate('workerId', 'name email phone')
      .populate('assignedBy', 'name role')
      .sort({ assignedAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    Assignment.countDocuments(filter),
  ]);

  sendPaginated(res, {
    items,
    page: Number(page),
    limit: Number(limit),
    total,
    message: 'Assignments fetched successfully',
  });
});

const getById = asyncHandler(async (req, res) => {
  const assignment = await Assignment.findById(req.params.id)
    .populate('complaintId')
    .populate('officerId', 'name email phone role')
    .populate('workerId', 'name email phone role')
    .populate('assignedBy', 'name role');

  if (!assignment) {
    throw new AppError('Assignment not found', 404);
  }

  const isAuthorized =
    req.user.role === ROLES.ADMIN
    || assignment.officerId?._id?.toString() === req.user._id.toString()
    || assignment.workerId?._id?.toString() === req.user._id.toString();

  if (!isAuthorized) {
    throw new AppError('You do not have permission to view this assignment', 403);
  }

  sendSuccess(res, assignment, 'Assignment fetched successfully');
});

const updateStatus = asyncHandler(async (req, res) => {
  const { status, notes } = req.body;
  const assignment = await Assignment.findById(req.params.id);

  if (!assignment) {
    throw new AppError('Assignment not found', 404);
  }

  const isAuthorized =
    req.user.role === ROLES.ADMIN
    || assignment.officerId?.toString() === req.user._id.toString()
    || assignment.workerId?.toString() === req.user._id.toString();

  if (!isAuthorized) {
    throw new AppError('You do not have permission to update this assignment', 403);
  }

  assignment.status = status;
  if (notes) assignment.notes = notes;
  await assignment.save();

  if (status === 'active') {
    const complaint = await Complaint.findById(assignment.complaintId);
    if (complaint && !['resolved', 'closed', 'rejected'].includes(complaint.status)) {
      complaint.addTimelineEntry('in_progress', notes || 'Work started', req.user._id);
      await complaint.save();
    }
  }

  const populated = await Assignment.findById(assignment._id)
    .populate('complaintId', 'title status priority')
    .populate('officerId', 'name')
    .populate('workerId', 'name');

  sendSuccess(res, populated, 'Assignment updated successfully');
});

module.exports = {
  list,
  getById,
  updateStatus,
};
