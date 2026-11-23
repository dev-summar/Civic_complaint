const express = require('express');
const exportController = require('../controllers/export.controller');
const { protect, authorize } = require('../middleware/auth');
const { ROLES } = require('../utils/constants');

const router = express.Router();

router.use(protect);
router.use(authorize(ROLES.ADMIN, ROLES.OFFICER));

router.get('/complaints/csv', exportController.exportComplaintsCsv);
router.get('/complaints/excel', exportController.exportComplaintsExcel);

module.exports = router;
