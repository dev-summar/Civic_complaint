const analyticsService = require('../services/analytics.service');
const { asyncHandler } = require('../utils/response');

const exportComplaintsCsv = asyncHandler(async (req, res) => {
  const { csv, filename, count } = await analyticsService.exportToCsv(
    req.query,
    req.user._id,
    req
  );

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('X-Export-Count', count);
  res.status(200).send(csv);
});

const exportComplaintsExcel = asyncHandler(async (req, res) => {
  const { buffer, filename, contentType, count } = await analyticsService.exportToExcel(
    req.query,
    req.user._id,
    req
  );

  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('X-Export-Count', count);
  res.status(200).send(buffer);
});

module.exports = {
  exportComplaintsCsv,
  exportComplaintsExcel,
};
