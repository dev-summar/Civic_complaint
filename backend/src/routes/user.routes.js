const express = require('express');
const userController = require('../controllers/user.controller');
const validate = require('../middleware/validate');
const { protect, authorize } = require('../middleware/auth');
const { ROLES } = require('../utils/constants');
const {
  updateProfileSchema,
  adminCreateUserSchema,
  changeStatusSchema,
  listUsersSchema,
  updateUserSchema,
  idParamSchema,
} = require('../validators/user.validator');

const router = express.Router();

router.use(protect);

router.patch('/profile', validate(updateProfileSchema), userController.updateProfile);

router.get(
  '/workers',
  authorize(ROLES.ADMIN, ROLES.OFFICER),
  validate(listUsersSchema),
  userController.listWorkers
);

router.get(
  '/officers',
  authorize(ROLES.ADMIN),
  validate(listUsersSchema),
  userController.listOfficers
);

router.get(
  '/',
  authorize(ROLES.ADMIN, ROLES.OFFICER),
  validate(listUsersSchema),
  userController.list
);

router.post(
  '/',
  authorize(ROLES.ADMIN),
  validate(adminCreateUserSchema),
  userController.adminCreate
);

router.get(
  '/:id',
  authorize(ROLES.ADMIN, ROLES.OFFICER),
  validate(idParamSchema),
  userController.getById
);

router.patch(
  '/:id',
  authorize(ROLES.ADMIN),
  validate(updateUserSchema),
  userController.adminUpdate
);

router.patch(
  '/:id/status',
  authorize(ROLES.ADMIN),
  validate(changeStatusSchema),
  userController.changeStatus
);

router.patch(
  '/:id/assign-staff',
  authorize(ROLES.ADMIN),
  validate(idParamSchema),
  userController.assignStaff
);

router.delete(
  '/:id',
  authorize(ROLES.ADMIN),
  validate(idParamSchema),
  userController.remove
);

module.exports = router;
