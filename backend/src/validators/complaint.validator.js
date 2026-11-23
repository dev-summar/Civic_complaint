const { z } = require('zod');
const {
  COMPLAINT_CATEGORIES,
  COMPLAINT_STATUS,
  PRIORITY,
} = require('../utils/constants');

const objectId = z
  .string()
  .trim()
  .regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID format');

const mediaImageSchema = z.object({
  url: z.string().url('Invalid image URL'),
  publicId: z.string().trim().optional().nullable(),
  width: z.number().min(0).optional().nullable(),
  height: z.number().min(0).optional().nullable(),
});

const mediaVideoSchema = z.object({
  url: z.string().url('Invalid video URL'),
  publicId: z.string().trim().optional().nullable(),
  duration: z.number().min(0).optional().nullable(),
});

const createSchema = {
  body: z.object({
    title: z.string().trim().min(3, 'Title must be at least 3 characters').max(200),
    description: z.string().trim().min(10, 'Description must be at least 10 characters').max(5000),
    category: z.enum(COMPLAINT_CATEGORIES).optional(),
    priority: z.enum(Object.values(PRIORITY)).optional(),
    latitude: z.coerce.number().min(-90).max(90),
    longitude: z.coerce.number().min(-180).max(180),
    address: z.string().trim().max(500).optional(),
    isAnonymous: z.boolean().optional(),
    images: z.array(mediaImageSchema).max(10).optional(),
    videos: z.array(mediaVideoSchema).max(3).optional(),
    submit: z.boolean().optional(),
  }),
};

const updateSchema = {
  params: z.object({ id: objectId }),
  body: z
    .object({
      title: z.string().trim().min(3).max(200).optional(),
      description: z.string().trim().min(10).max(5000).optional(),
      category: z.enum(COMPLAINT_CATEGORIES).optional(),
      priority: z.enum(Object.values(PRIORITY)).optional(),
      latitude: z.coerce.number().min(-90).max(90).optional(),
      longitude: z.coerce.number().min(-180).max(180).optional(),
      address: z.string().trim().max(500).optional(),
      isAnonymous: z.boolean().optional(),
      images: z.array(mediaImageSchema).max(10).optional(),
      videos: z.array(mediaVideoSchema).max(3).optional(),
      checklist: z
        .array(
          z.object({
            item: z.string().trim().min(1).max(300),
            done: z.boolean().optional(),
          })
        )
        .max(20)
        .optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: 'At least one field must be provided for update',
    }),
};

const assignSchema = {
  params: z.object({ id: objectId }),
  body: z.object({
    officerId: objectId.optional(),
    workerId: objectId.optional(),
    notes: z.string().trim().max(2000).optional(),
  }).refine((data) => data.officerId || data.workerId, {
    message: 'Either officerId or workerId must be provided',
  }),
};

const nearbySchema = {
  query: z.object({
    latitude: z.coerce.number().min(-90).max(90),
    longitude: z.coerce.number().min(-180).max(180),
    radiusKm: z.coerce.number().min(0.1).max(50).optional().default(5),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
    status: z.enum(Object.values(COMPLAINT_STATUS)).optional(),
    category: z.enum(COMPLAINT_CATEGORIES).optional(),
  }),
};

const statusEnum = z.enum(Object.values(COMPLAINT_STATUS));
const statusFilter = z.preprocess((val) => {
  if (val == null || val === '') return undefined;
  if (Array.isArray(val)) return val;
  if (typeof val === 'string' && val.includes(',')) {
    return val.split(',').map((s) => s.trim()).filter(Boolean);
  }
  return val;
}, z.union([statusEnum, z.array(statusEnum).min(1)]).optional());

const filterSchema = {
  query: z.object({
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
    status: statusFilter,
    category: z.enum(COMPLAINT_CATEGORIES).optional(),
    priority: z.enum(Object.values(PRIORITY)).optional(),
    department: objectId.optional(),
    zone: objectId.optional(),
    citizenId: objectId.optional(),
    assignedOfficer: objectId.optional(),
    assignedWorker: objectId.optional(),
    search: z.string().trim().max(200).optional(),
    sortBy: z.enum(['createdAt', 'priority', 'status', 'updatedAt']).optional().default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
    fromDate: z.string().datetime().optional(),
    toDate: z.string().datetime().optional(),
  }),
};

const resolveSchema = {
  params: z.object({ id: objectId }),
  body: z.object({
    resolutionNotes: z.string().trim().min(5, 'Resolution notes are required').max(3000),
    afterPhotos: z.array(mediaImageSchema).max(10).optional(),
    signatureUrl: z.string().url().optional().nullable(),
  }),
};

const rejectSchema = {
  params: z.object({ id: objectId }),
  body: z.object({
    rejectedReason: z.string().trim().min(5, 'Rejection reason is required').max(2000),
  }),
};

const commentSchema = {
  params: z.object({ id: objectId }),
  body: z.object({
    text: z.string().trim().min(1, 'Comment text is required').max(3000),
    isInternal: z.boolean().optional().default(false),
    attachments: z
      .array(
        z.object({
          url: z.string().url(),
          publicId: z.string().trim().optional().nullable(),
          mimeType: z.string().trim().optional().nullable(),
          fileName: z.string().trim().optional().nullable(),
        })
      )
      .max(5)
      .optional(),
  }),
};

const idParamSchema = {
  params: z.object({ id: objectId }),
};

module.exports = {
  createSchema,
  updateSchema,
  assignSchema,
  nearbySchema,
  filterSchema,
  resolveSchema,
  rejectSchema,
  commentSchema,
  idParamSchema,
};
