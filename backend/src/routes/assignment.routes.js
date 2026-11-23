const express = require('express');
const { z } = require('zod');
const assignmentController = require('../controllers/assignment.controller');
const validate = require('../middleware/validate');
const { protect, authorize } = require('../middleware/auth');
const { ROLES } = require('../utils/constants');

const router = express.Router();

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/);

const updateStatusSchema = {
  params: z.object({ id: objectId }),
  body: z.object({
    status: z.enum(['pending', 'active', 'completed', 'cancelled', 'reassigned']),
    notes: z.string().trim().max(2000).optional(),
  }),
};

router.use(protect);
router.use(authorize(ROLES.ADMIN, ROLES.OFFICER, ROLES.WORKER));

router.get('/', assignmentController.list);
router.get('/:id', assignmentController.getById);
router.patch('/:id/status', validate(updateStatusSchema), assignmentController.updateStatus);

module.exports = router;
