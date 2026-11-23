const { z } = require('zod');

const phoneSchema = z
  .string()
  .trim()
  .regex(/^[6-9]\d{9}$/, 'Please provide a valid 10-digit Indian mobile number');

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be at most 128 characters');

const deviceInfoSchema = z
  .object({
    platform: z.string().trim().max(50).optional(),
    os: z.string().trim().max(50).optional(),
    browser: z.string().trim().max(80).optional(),
    appVersion: z.string().trim().max(20).optional(),
    deviceId: z.string().trim().max(120).optional(),
    model: z.string().trim().max(80).optional(),
  })
  .optional();

const signupSchema = {
  body: z.object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters').max(120),
    email: z.string().trim().email('Please provide a valid email address').toLowerCase(),
    phone: phoneSchema,
    password: passwordSchema,
    deviceToken: z.string().trim().max(512).optional().nullable(),
    language: z.enum(['en', 'hi', 'ur']).optional(),
  }),
};

const loginSchema = {
  body: z.object({
    email: z.string().trim().email('Please provide a valid email address').toLowerCase(),
    password: z.string().min(1, 'Password is required'),
    rememberMe: z.boolean().optional(),
    deviceToken: z.string().trim().max(512).optional().nullable(),
    deviceInfo: deviceInfoSchema,
  }),
};

const phoneLoginSchema = {
  body: z.object({
    phone: phoneSchema,
  }),
};

const verifyOtpSchema = {
  body: z.object({
    phone: phoneSchema,
    otp: z.string().trim().regex(/^\d{6}$/, 'OTP must be a 6-digit code'),
    deviceToken: z.string().trim().max(512).optional().nullable(),
    deviceInfo: deviceInfoSchema,
  }),
};

const forgotPasswordSchema = {
  body: z.object({
    email: z.string().trim().email('Please provide a valid email address').toLowerCase(),
  }),
};

const resetPasswordSchema = {
  body: z.object({
    email: z.string().trim().email('Please provide a valid email address').toLowerCase(),
    otp: z.string().trim().regex(/^\d{6}$/, 'OTP must be a 6-digit code'),
    newPassword: passwordSchema,
  }),
};

const refreshTokenSchema = {
  body: z.object({
    refreshToken: z.string().trim().min(1, 'Refresh token is required'),
    deviceInfo: deviceInfoSchema,
  }),
};

module.exports = {
  signupSchema,
  loginSchema,
  phoneLoginSchema,
  verifyOtpSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  refreshTokenSchema,
};
