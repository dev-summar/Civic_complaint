const express = require('express');
const { z } = require('zod');
const aiController = require('../controllers/ai.controller');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const { PRIORITY } = require('../utils/constants');

const router = express.Router();

const classifySchema = {
  body: z.object({
    title: z.string().trim().min(3).max(200),
    description: z.string().trim().min(10).max(5000),
    priority: z.enum(Object.values(PRIORITY)).optional(),
    latitude: z.coerce.number().min(-90).max(90).optional(),
    longitude: z.coerce.number().min(-180).max(180).optional(),
  }),
};

const summarizeSchema = {
  body: z.object({
    title: z.string().trim().min(3).max(200),
    description: z.string().trim().min(10).max(5000),
  }),
};

router.use(protect);

router.post('/classify', validate(classifySchema), aiController.classify);
router.post('/classify-category', validate(summarizeSchema), aiController.classifyCategory);
router.post('/summarize', validate(summarizeSchema), aiController.summarize);

module.exports = router;
