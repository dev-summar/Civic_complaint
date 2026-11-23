const complaintService = require('../services/complaint.service');
const userService = require('../services/user.service');
const departmentService = require('../services/department.service');
const zoneService = require('../services/zone.service');
const { asyncHandler, sendSuccess, sendPaginated } = require('../utils/response');

const searchComplaints = asyncHandler(async (req, res) => {
  const result = await complaintService.searchAndFilter(req.query, req.user);
  sendPaginated(res, { ...result, message: 'Search results fetched successfully' });
});

const searchUsers = asyncHandler(async (req, res) => {
  const result = await userService.list(req.query);
  sendPaginated(res, { ...result, message: 'User search results fetched successfully' });
});

const globalSearch = asyncHandler(async (req, res) => {
  const { q, limit = 10 } = req.query;

  const [complaints, users, departments, zones] = await Promise.all([
    complaintService.searchAndFilter({ search: q, limit: Number(limit), page: 1 }, req.user),
    userService.list({ search: q, limit: Number(limit), page: 1 }),
    departmentService.list({ search: q, limit: Number(limit), page: 1 }),
    zoneService.list({ search: q, limit: Number(limit), page: 1 }),
  ]);

  sendSuccess(res, {
    complaints: complaints.items,
    users: users.items,
    departments: departments.items,
    zones: zones.items,
  }, 'Global search completed');
});

module.exports = {
  searchComplaints,
  searchUsers,
  globalSearch,
};
