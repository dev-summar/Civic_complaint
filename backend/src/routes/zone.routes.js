const express = require('express');
const zoneController = require('../controllers/zone.controller');
const { protect, authorize } = require('../middleware/auth');
const { ROLES } = require('../utils/constants');

const router = express.Router();

router.get('/', zoneController.list);
router.get('/:id', zoneController.getById);

router.use(protect);
router.post('/', authorize(ROLES.ADMIN), zoneController.create);
router.patch('/:id', authorize(ROLES.ADMIN), zoneController.update);
router.delete('/:id', authorize(ROLES.ADMIN), zoneController.remove);

module.exports = router;
