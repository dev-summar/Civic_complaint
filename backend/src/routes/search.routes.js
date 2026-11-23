const express = require('express');
const { z } = require('zod');
const searchController = require('../controllers/search.controller');
const validate = require('../middleware/validate');
const { protect, authorize } = require('../middleware/auth');
const { ROLES } = require('../utils/constants');
const { filterSchema } = require('../validators/complaint.validator');
const { listUsersSchema } = require('../validators/user.validator');

const router = express.Router();

const globalSearchSchema = {
  query: z.object({
    q: z.string().trim().min(1, 'Search query is required').max(200),
    limit: z.coerce.number().int().min(1).max(50).optional().default(10),
  }),
};

router.use(protect);

router.get('/complaints', validate(filterSchema), searchController.searchComplaints);
router.get(
  '/users',
  authorize(ROLES.ADMIN, ROLES.OFFICER),
  validate(listUsersSchema),
  searchController.searchUsers
);
router.get('/global', validate(globalSearchSchema), searchController.globalSearch);

module.exports = router;
