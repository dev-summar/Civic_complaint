const complaintService = require('../services/complaint.service');
const cloudinaryService = require('../services/cloudinary.service');
const { asyncHandler, sendSuccess, sendPaginated } = require('../utils/response');

const uploadMediaFiles = async (files = []) => {
  if (!files.length) return { images: [], videos: [] };

  const uploads = await Promise.all(
    files.map((file) => {
      const resourceType = file.mimetype.startsWith('video/') ? 'video' : 'image';
      return cloudinaryService.uploadBuffer(file.buffer, 'rabta-jk/complaints', resourceType);
    })
  );

  const images = [];
  const videos = [];

  uploads.forEach((result, index) => {
    const file = files[index];
    if (file.mimetype.startsWith('video/')) {
      videos.push({
        url: result.url,
        publicId: result.publicId,
        duration: result.duration,
      });
    } else {
      images.push({
        url: result.url,
        publicId: result.publicId,
        width: result.width,
        height: result.height,
      });
    }
  });

  return { images, videos };
};

const create = asyncHandler(async (req, res) => {
  let images = req.body.images || [];
  let videos = req.body.videos || [];

  if (req.files?.length) {
    const uploaded = await uploadMediaFiles(req.files);
    images = [...images, ...uploaded.images];
    videos = [...videos, ...uploaded.videos];
  }

  const complaint = await complaintService.create(
    { ...req.body, images, videos },
    req.user,
    req
  );

  sendSuccess(res, complaint, 'Complaint created successfully', 201);
});

const update = asyncHandler(async (req, res) => {
  let payload = { ...req.body };

  if (req.files?.length) {
    const uploaded = await uploadMediaFiles(req.files);
    payload = {
      ...payload,
      images: [...(payload.images || []), ...uploaded.images],
      videos: [...(payload.videos || []), ...uploaded.videos],
    };
  }

  const complaint = await complaintService.update(req.params.id, payload, req.user);
  sendSuccess(res, complaint, 'Complaint updated successfully');
});

const remove = asyncHandler(async (req, res) => {
  const complaint = await complaintService.softDelete(req.params.id, req.user, req);
  sendSuccess(res, complaint, 'Complaint deleted successfully');
});

const assign = asyncHandler(async (req, res) => {
  const complaint = await complaintService.assign(req.params.id, req.body, req.user, req);
  sendSuccess(res, complaint, 'Complaint assigned successfully');
});

const nearby = asyncHandler(async (req, res) => {
  const complaints = await complaintService.nearby(req.query);
  sendSuccess(res, complaints, 'Nearby complaints fetched successfully');
});

const myComplaints = asyncHandler(async (req, res) => {
  const result = await complaintService.myComplaints(req.user._id, req.query);
  sendPaginated(res, { ...result, message: 'Your complaints fetched successfully' });
});

const getById = asyncHandler(async (req, res) => {
  const complaint = await complaintService.getById(req.params.id, req.user);
  sendSuccess(res, complaint, 'Complaint fetched successfully');
});

const getTimeline = asyncHandler(async (req, res) => {
  const timeline = await complaintService.getTimeline(req.params.id, req.user);
  sendSuccess(res, timeline, 'Timeline fetched successfully');
});

const resolve = asyncHandler(async (req, res) => {
  let afterPhotos = req.body.afterPhotos || [];

  if (req.files?.length) {
    const uploaded = await uploadMediaFiles(req.files);
    afterPhotos = [...afterPhotos, ...uploaded.images];
  }

  const complaint = await complaintService.resolve(
    req.params.id,
    { ...req.body, afterPhotos },
    req.user,
    req
  );
  sendSuccess(res, complaint, 'Complaint resolved successfully');
});

const reject = asyncHandler(async (req, res) => {
  const complaint = await complaintService.reject(req.params.id, req.body, req.user, req);
  sendSuccess(res, complaint, 'Complaint rejected successfully');
});

const escalate = asyncHandler(async (req, res) => {
  const complaint = await complaintService.escalate(
    req.params.id,
    req.body,
    req.user,
    req
  );
  sendSuccess(res, complaint, 'Complaint escalated successfully');
});

const list = asyncHandler(async (req, res) => {
  const result = await complaintService.searchAndFilter(req.query, req.user);
  sendPaginated(res, { ...result, message: 'Complaints fetched successfully' });
});

const analytics = asyncHandler(async (req, res) => {
  const stats = await complaintService.getAnalytics(req.query);
  sendSuccess(res, stats, 'Complaint analytics fetched successfully');
});

module.exports = {
  create,
  update,
  remove,
  assign,
  nearby,
  myComplaints,
  getById,
  getTimeline,
  resolve,
  reject,
  escalate,
  list,
  analytics,
};
