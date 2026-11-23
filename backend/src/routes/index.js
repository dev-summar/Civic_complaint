const express = require('express');
const authRoutes = require('./auth.routes');
const complaintRoutes = require('./complaint.routes');
const userRoutes = require('./user.routes');
const notificationRoutes = require('./notification.routes');
const departmentRoutes = require('./department.routes');
const zoneRoutes = require('./zone.routes');
const assignmentRoutes = require('./assignment.routes');
const analyticsRoutes = require('./analytics.routes');
const dashboardRoutes = require('./dashboard.routes');
const uploadRoutes = require('./upload.routes');
const exportRoutes = require('./export.routes');
const searchRoutes = require('./search.routes');
const commentRoutes = require('./comment.routes');
const aiRoutes = require('./ai.routes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/complaints', complaintRoutes);
router.use('/users', userRoutes);
router.use('/notifications', notificationRoutes);
router.use('/departments', departmentRoutes);
router.use('/zones', zoneRoutes);
router.use('/assignments', assignmentRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/uploads', uploadRoutes);
router.use('/export', exportRoutes);
router.use('/search', searchRoutes);
router.use('/comments', commentRoutes);
router.use('/ai', aiRoutes);

module.exports = router;
