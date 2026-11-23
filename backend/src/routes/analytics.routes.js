const express = require('express');
const analyticsController = require('../controllers/analytics.controller');
const { protect, authorize } = require('../middleware/auth');
const { ROLES } = require('../utils/constants');

const router = express.Router();

router.use(protect);
router.use(authorize(ROLES.ADMIN, ROLES.OFFICER));

router.get('/departments', analyticsController.departmentAnalytics);
router.get('/zones', analyticsController.zoneAnalytics);
router.get('/complaints', analyticsController.complaintAnalytics);

module.exports = router;
