const multer = require('multer');
const config = require('../config');
const AppError = require('../utils/AppError');

const IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);

const VIDEO_MIME_TYPES = new Set([
  'video/mp4',
  'video/quicktime',
]);

const ALLOWED_MIME_TYPES = new Set([...IMAGE_MIME_TYPES, ...VIDEO_MIME_TYPES]);

const fileFilter = (_req, file, cb) => {
  if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
    cb(null, true);
    return;
  }

  cb(
    new AppError(
      `Unsupported file type: ${file.mimetype}. Allowed: JPEG, PNG, WebP, HEIC images and MP4/MOV videos.`,
      400
    ),
    false
  );
};

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.maxFileSizeMb * 1024 * 1024,
    files: 10,
  },
});

const uploadFiles = upload.array('files', 10);
const uploadSingle = upload.single('file');
const uploadBeforeAfter = upload.fields([
  { name: 'beforePhotos', maxCount: 10 },
  { name: 'afterPhotos', maxCount: 10 },
]);

module.exports = {
  upload,
  uploadFiles,
  uploadSingle,
  uploadBeforeAfter,
};
