const express = require('express');
const uploadController = require('../controllers/upload.controller');
const { protect } = require('../middleware/auth');
const { uploadSingle, uploadFiles } = require('../middleware/upload');

const router = express.Router();

router.use(protect);

router.post('/single', uploadSingle, uploadController.uploadSingle);
router.post('/multiple', uploadFiles, uploadController.uploadMultiple);
router.delete('/asset', uploadController.deleteAsset);

module.exports = router;
