const complaintService = require('../services/complaint.service');
const { asyncHandler, sendSuccess } = require('../utils/response');

const addComment = asyncHandler(async (req, res) => {
  const comment = await complaintService.addComment(req.params.id, req.body, req.user);
  sendSuccess(res, comment, 'Comment added successfully', 201);
});

const getComments = asyncHandler(async (req, res) => {
  const comments = await complaintService.getComments(req.params.id, req.user, {
    includeInternal: req.query.includeInternal === 'true',
  });
  sendSuccess(res, comments, 'Comments fetched successfully');
});

module.exports = {
  addComment,
  getComments,
};
