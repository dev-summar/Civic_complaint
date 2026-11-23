const express = require('express');
const commentController = require('../controllers/comment.controller');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const { commentSchema, idParamSchema } = require('../validators/complaint.validator');

const router = express.Router();

router.use(protect);

router.get('/:id', validate(idParamSchema), commentController.getComments);
router.post('/:id', validate(commentSchema), commentController.addComment);

module.exports = router;
