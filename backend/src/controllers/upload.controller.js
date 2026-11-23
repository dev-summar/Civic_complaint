const cloudinaryService = require('../services/cloudinary.service');
const { asyncHandler, sendSuccess } = require('../utils/response');
const AppError = require('../utils/AppError');

const uploadSingle = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new AppError('No file uploaded', 400);
  }

  const folder = req.body.folder || 'rabta-jk/uploads';
  const resourceType = req.file.mimetype.startsWith('video/') ? 'video' : 'image';
  const result = await cloudinaryService.uploadBuffer(req.file.buffer, folder, resourceType);

  sendSuccess(res, result, 'File uploaded successfully', 201);
});

const uploadMultiple = asyncHandler(async (req, res) => {
  if (!req.files?.length) {
    throw new AppError('No files uploaded', 400);
  }

  const folder = req.body.folder || 'rabta-jk/uploads';
  const results = await Promise.all(
    req.files.map((file) => {
      const resourceType = file.mimetype.startsWith('video/') ? 'video' : 'image';
      return cloudinaryService.uploadBuffer(file.buffer, folder, resourceType);
    })
  );

  sendSuccess(res, results, 'Files uploaded successfully', 201);
});

const deleteAsset = asyncHandler(async (req, res) => {
  const { publicId, resourceType = 'image' } = req.body;
  if (!publicId) {
    throw new AppError('publicId is required', 400);
  }

  const result = await cloudinaryService.deleteAsset(publicId, resourceType);
  sendSuccess(res, result, 'Asset deleted successfully');
});

module.exports = {
  uploadSingle,
  uploadMultiple,
  deleteAsset,
};
