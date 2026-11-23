const express = require('express');
const departmentController = require('../controllers/department.controller');
const { protect, authorize } = require('../middleware/auth');
const { ROLES } = require('../utils/constants');

const router = express.Router();

router.get('/', departmentController.list);
router.get('/:id', departmentController.getById);

router.use(protect);
router.post('/', authorize(ROLES.ADMIN), departmentController.create);
router.patch('/:id', authorize(ROLES.ADMIN), departmentController.update);
router.delete('/:id', authorize(ROLES.ADMIN), departmentController.remove);

module.exports = router;
