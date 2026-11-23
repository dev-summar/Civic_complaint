const analyticsService = require('../services/analytics.service');
const { asyncHandler, sendSuccess } = require('../utils/response');

const getDashboard = asyncHandler(async (req, res) => {
  const data = await analyticsService.getDashboardByRole(req.user);
  sendSuccess(res, data, 'Dashboard fetched successfully');
});

module.exports = {
  getDashboard,
};
