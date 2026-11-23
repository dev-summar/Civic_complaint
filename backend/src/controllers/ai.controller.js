const aiService = require('../services/ai.service');
const complaintService = require('../services/complaint.service');
const { asyncHandler, sendSuccess } = require('../utils/response');

const classify = asyncHandler(async (req, res) => {
  const { title, description, priority, latitude, longitude } = req.body;

  let nearbyComplaints = [];
  if (latitude != null && longitude != null) {
    nearbyComplaints = await complaintService.nearby({
      latitude,
      longitude,
      radiusKm: 2,
      limit: 50,
    });
  }

  const result = await aiService.analyzeComplaint({
    title,
    description,
    priority,
    latitude,
    longitude,
    nearbyComplaints,
  });

  sendSuccess(res, result, 'Complaint classified successfully');
});

const summarize = asyncHandler(async (req, res) => {
  const { title, description } = req.body;
  const summary = await aiService.generateSummary(title, description);
  sendSuccess(res, { summary }, 'Summary generated successfully');
});

const classifyCategory = asyncHandler(async (req, res) => {
  const { title, description } = req.body;
  const category = aiService.classifyCategory(title, description);
  sendSuccess(res, {
    category,
    labels: aiService.getCategoryLabels(category),
  }, 'Category classified successfully');
});

module.exports = {
  classify,
  summarize,
  classifyCategory,
};
