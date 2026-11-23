const express = require('express');
const complaintController = require('../controllers/complaint.controller');
const validate = require('../middleware/validate');
const { protect, authorize } = require('../middleware/auth');
const { uploadFiles, uploadBeforeAfter } = require('../middleware/upload');
const { ROLES } = require('../utils/constants');
const {
  createSchema,
  updateSchema,
  assignSchema,
  nearbySchema,
  filterSchema,
  resolveSchema,
  rejectSchema,
  idParamSchema,
} = require('../validators/complaint.validator');

const router = express.Router();

router.use(protect);

router.get('/nearby', validate(nearbySchema), complaintController.nearby);
router.get('/mine', complaintController.myComplaints);
router.get('/analytics', authorize(ROLES.ADMIN, ROLES.OFFICER), complaintController.analytics);
router.get('/', validate(filterSchema), complaintController.list);

function normalizeComplaintBody(req, _res, next) {
  const body = req.body || {};
  let location = body.location;
  if (typeof location === 'string') {
    try {
      location = JSON.parse(location);
    } catch {
      location = null;
    }
  }
  if (location && typeof location === 'object') {
    if (body.latitude == null && location.latitude != null) body.latitude = location.latitude;
    if (body.longitude == null && location.longitude != null) body.longitude = location.longitude;
    if (!body.address && location.address) body.address = location.address;
  }
  next();
}

router.post('/', uploadFiles, normalizeComplaintBody, validate(createSchema), complaintController.create);
router.get('/:id', validate(idParamSchema), complaintController.getById);
router.patch('/:id', uploadFiles, validate(updateSchema), complaintController.update);
router.delete('/:id', validate(idParamSchema), complaintController.remove);

router.post(
  '/:id/assign',
  authorize(ROLES.ADMIN, ROLES.OFFICER),
  validate(assignSchema),
  complaintController.assign
);

router.get('/:id/timeline', validate(idParamSchema), complaintController.getTimeline);

router.post(
  '/:id/resolve',
  authorize(ROLES.ADMIN, ROLES.OFFICER, ROLES.WORKER),
  uploadBeforeAfter,
  validate(resolveSchema),
  complaintController.resolve
);

router.post(
  '/:id/reject',
  authorize(ROLES.ADMIN, ROLES.OFFICER),
  validate(rejectSchema),
  complaintController.reject
);

router.post('/:id/escalate', validate(idParamSchema), complaintController.escalate);

module.exports = router;
