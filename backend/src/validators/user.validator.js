const { z } = require('zod');
const { ROLES } = require('../utils/constants');

const objectId = z
  .string()
  .trim()
  .regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID format');

const phoneSchema = z
  .string()
  .trim()
  .regex(/^[6-9]\d{9}$/, 'Please provide a valid 10-digit Indian mobile number');

const savedLocationSchema = z.object({
  name: z.string().trim().min(1).max(120),
  address: z.string().trim().min(1).max(500),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
});

const updateProfileSchema = {
  body: z
    .object({
      name: z.string().trim().min(2).max(120).optional(),
      phone: phoneSchema.optional(),
      profilePhoto: z.string().url().optional().nullable(),
      deviceToken: z.string().trim().max(512).optional().nullable(),
      language: z.enum(['en', 'hi', 'ur']).optional(),
      darkMode: z.boolean().optional(),
      savedLocations: z.array(savedLocationSchema).max(10).optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: 'At least one field must be provided for update',
    }),
};

const adminCreateUserSchema = {
  body: z.object({
    name: z.string().trim().min(2).max(120),
    email: z.string().trim().email().toLowerCase(),
    phone: phoneSchema,
    password: z.string().min(8).max(128),
    role: z.enum(Object.values(ROLES)),
    department: objectId.optional().nullable(),
    zone: objectId.optional().nullable(),
    status: z.enum(['active', 'inactive', 'suspended']).optional(),
  }),
};

const changeStatusSchema = {
  params: z.object({ id: objectId }),
  body: z.object({
    status: z.enum(['active', 'inactive', 'suspended'], {
      errorMap: () => ({ message: 'Status must be active, inactive, or suspended' }),
    }),
    reason: z.string().trim().max(500).optional(),
  }),
};

const listUsersSchema = {
  query: z.object({
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
    role: z.enum(Object.values(ROLES)).optional(),
    status: z.enum(['active', 'inactive', 'suspended']).optional(),
    department: objectId.optional(),
    zone: objectId.optional(),
    search: z.string().trim().max(200).optional(),
  }),
};

const updateUserSchema = {
  params: z.object({ id: objectId }),
  body: z
    .object({
      name: z.string().trim().min(2).max(120).optional(),
      email: z.string().trim().email().toLowerCase().optional(),
      phone: phoneSchema.optional(),
      role: z.enum(Object.values(ROLES)).optional(),
      department: objectId.optional().nullable(),
      zone: objectId.optional().nullable(),
      profilePhoto: z.string().url().optional().nullable(),
      status: z.enum(['active', 'inactive', 'suspended']).optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: 'At least one field must be provided for update',
    }),
};

const idParamSchema = {
  params: z.object({ id: objectId }),
};

module.exports = {
  updateProfileSchema,
  adminCreateUserSchema,
  changeStatusSchema,
  listUsersSchema,
  updateUserSchema,
  idParamSchema,
};
