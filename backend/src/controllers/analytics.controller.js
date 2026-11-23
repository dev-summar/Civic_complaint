const analyticsService = require('../services/analytics.service');
const { asyncHandler, sendSuccess } = require('../utils/response');

const departmentAnalytics = asyncHandler(async (req, res) => {
  const data = await analyticsService.getDepartmentAnalytics(req.query.department);
  sendSuccess(res, data, 'Department analytics fetched successfully');
});

const zoneAnalytics = asyncHandler(async (req, res) => {
  const data = await analyticsService.getZoneAnalytics(req.query.zone);
  sendSuccess(res, data, 'Zone analytics fetched successfully');
});

const complaintAnalytics = asyncHandler(async (req, res) => {
  const complaintService = require('../services/complaint.service');
  const data = await complaintService.getAnalytics(req.query);
  sendSuccess(res, data, 'Complaint analytics fetched successfully');
});

module.exports = {
  departmentAnalytics,
  zoneAnalytics,
  complaintAnalytics,
};
