const { v2: cloudinary } = require('cloudinary');
const config = require('../config');
const logger = require('../utils/logger');
const AppError = require('../utils/AppError');

const isConfigured = Boolean(
  config.cloudinary.cloudName
  && config.cloudinary.apiKey
  && config.cloudinary.apiSecret
);

if (isConfigured) {
  cloudinary.config({
    cloud_name: config.cloudinary.cloudName,
    api_key: config.cloudinary.apiKey,
    api_secret: config.cloudinary.apiSecret,
    secure: true,
  });
} else {
  logger.warn('Cloudinary credentials not configured — upload operations will fail');
}

const IMAGE_COMPRESSION = {
  quality: 'auto',
  fetch_format: 'auto',
};

const uploadBuffer = (buffer, folder = 'rabta-jk', resourceType = 'auto') =>
  new Promise((resolve, reject) => {
    if (!isConfigured) {
      reject(new AppError('Cloudinary is not configured', 503));
      return;
    }

    const options = {
      folder,
      resource_type: resourceType,
    };

    if (resourceType === 'image' || resourceType === 'auto') {
      options.quality = IMAGE_COMPRESSION.quality;
      options.fetch_format = IMAGE_COMPRESSION.fetch_format;
    }

    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) {
        logger.error('Cloudinary upload failed', { message: error.message });
        reject(new AppError('Failed to upload file to cloud storage', 500));
        return;
      }

      resolve({
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width || null,
        height: result.height || null,
        duration: result.duration || null,
        format: result.format,
        resourceType: result.resource_type,
        bytes: result.bytes,
      });
    });

    stream.end(buffer);
  });

const uploadMultiple = async (buffers, folder = 'rabta-jk', resourceType = 'auto') => {
  const uploads = buffers.map((buffer) => uploadBuffer(buffer, folder, resourceType));
  return Promise.all(uploads);
};

const deleteAsset = async (publicId, resourceType = 'image') => {
  if (!isConfigured) {
    throw new AppError('Cloudinary is not configured', 503);
  }

  if (!publicId) {
    return null;
  }

  try {
    const result = await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    return result;
  } catch (error) {
    logger.error('Cloudinary delete failed', { publicId, message: error.message });
    throw new AppError('Failed to delete file from cloud storage', 500);
  }
};

module.exports = {
  cloudinary,
  isConfigured,
  uploadBuffer,
  uploadMultiple,
  deleteAsset,
  IMAGE_COMPRESSION,
};
