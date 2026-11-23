const config = require('../config');
const {
  User,
  Session,
  AuditLog,
  AUDIT_ACTIONS,
  AUDIT_RESOURCES,
} = require('../models');
const AppError = require('../utils/AppError');
const { ROLES } = require('../utils/constants');
const { generateOTP, hashOtp, verifyOtp, getOtpExpiryDate } = require('../helpers/otp');
const {
  generateAccessToken,
  generateRefreshToken,
  storeRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  revokeAllUserTokens,
} = require('../helpers/tokens');
const { logAudit } = require('../helpers/audit');
const logger = require('../utils/logger');

const parseExpiryToMs = (expiry) => {
  const match = /^(\d+)([smhd])$/.exec(expiry);
  if (!match) return 7 * 24 * 60 * 60 * 1000;
  const value = parseInt(match[1], 10);
  const multipliers = { s: 1000, m: 60 * 1000, h: 60 * 60 * 1000, d: 24 * 60 * 60 * 1000 };
  return value * multipliers[match[2]];
};

const buildAuthResponse = async (user, deviceInfo = {}, req = null) => {
  const accessToken = generateAccessToken(user._id, user.role);
  const refreshToken = generateRefreshToken(user._id);
  const refreshExpiresAt = await storeRefreshToken(user._id, refreshToken, deviceInfo);

  const sessionExpiresAt = new Date(Date.now() + parseExpiryToMs(config.jwt.refreshExpires));
  await Session.create({
    userId: user._id,
    deviceInfo: deviceInfo || {},
    ip: req?.ip || null,
    lastActive: new Date(),
    expiresAt: sessionExpiresAt,
  });

  return {
    user,
    accessToken,
    refreshToken,
    refreshExpiresAt,
    tokens: {
      accessToken,
      refreshToken,
      refreshExpiresAt,
    },
  };
};

const register = async (payload, req = null) => {
  const existing = await User.findOne({
    $or: [{ email: payload.email }, { phone: payload.phone }],
  });

  if (existing) {
    if (existing.email === payload.email) {
      throw new AppError('Email is already registered', 409);
    }
    throw new AppError('Phone number is already registered', 409);
  }

  const user = await User.create({
    name: payload.name,
    email: payload.email,
    phone: payload.phone,
    password: payload.password,
    role: ROLES.CITIZEN,
    deviceToken: payload.deviceToken || null,
    language: payload.language || 'en',
    isVerified: false,
  });

  const auth = await buildAuthResponse(user, {}, req);

  await logAudit({
    actor: user._id,
    action: AUDIT_ACTIONS.CREATE,
    resource: AUDIT_RESOURCES.USER,
    resourceId: user._id,
    meta: { action: 'register' },
    req,
  });

  return auth;
};

const login = async ({ email, password, rememberMe, deviceToken, deviceInfo }, req = null) => {
  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.comparePassword(password))) {
    throw new AppError('Invalid email or password', 401);
  }

  if (user.status !== 'active') {
    throw new AppError('Your account is not active. Please contact support.', 403);
  }

  if (deviceToken) {
    user.deviceToken = deviceToken;
  }
  if (rememberMe !== undefined) {
    user.rememberMe = rememberMe;
  }
  await user.save();

  user.password = undefined;
  const auth = await buildAuthResponse(user, deviceInfo, req);

  await logAudit({
    actor: user._id,
    action: AUDIT_ACTIONS.LOGIN,
    resource: AUDIT_RESOURCES.SESSION,
    meta: { method: 'email' },
    req,
  });

  return auth;
};

const phoneLoginSendOtp = async ({ phone }) => {
  const user = await User.findOne({ phone }).select('+otp +otpExpires');

  if (!user) {
    throw new AppError('No account found with this phone number', 404);
  }

  if (user.status !== 'active') {
    throw new AppError('Your account is not active. Please contact support.', 403);
  }

  const otp = generateOTP();
  user.otp = await hashOtp(otp);
  user.otpExpires = getOtpExpiryDate();
  await user.save();

  logger.info('OTP generated for phone login', { phone: phone.slice(0, 4) + '******' });
  if (config.env === 'development') {
    logger.debug('Dev OTP', { phone, otp });
  }

  return {
    message: 'OTP sent successfully',
    expiresInMinutes: config.otpExpiryMinutes,
    ...(config.env === 'development' ? { devOtp: otp } : {}),
  };
};

const verifyOtpAndLogin = async ({ phone, otp, deviceToken, deviceInfo }, req = null) => {
  const user = await User.findOne({ phone }).select('+otp +otpExpires');

  if (!user) {
    throw new AppError('No account found with this phone number', 404);
  }

  if (!user.otpExpires || user.otpExpires < new Date()) {
    throw new AppError('OTP has expired. Please request a new one.', 400);
  }

  const isValid = await verifyOtp(otp, user.otp);
  if (!isValid) {
    throw new AppError('Invalid OTP', 401);
  }

  user.clearOtp();
  user.isVerified = true;
  if (deviceToken) {
    user.deviceToken = deviceToken;
  }
  await user.save();

  const auth = await buildAuthResponse(user, deviceInfo, req);

  await logAudit({
    actor: user._id,
    action: AUDIT_ACTIONS.LOGIN,
    resource: AUDIT_RESOURCES.SESSION,
    meta: { method: 'phone_otp' },
    req,
  });

  return auth;
};

const forgotPassword = async ({ email }) => {
  const user = await User.findOne({ email }).select('+otp +otpExpires');

  if (!user) {
    return { message: 'If an account exists, an OTP has been sent to the registered phone' };
  }

  const otp = generateOTP();
  user.otp = await hashOtp(otp);
  user.otpExpires = getOtpExpiryDate();
  await user.save();

  logger.info('Password reset OTP generated', { email });
  if (config.env === 'development') {
    logger.debug('Dev reset OTP', { email, otp });
  }

  return {
    message: 'If an account exists, an OTP has been sent to the registered phone',
    expiresInMinutes: config.otpExpiryMinutes,
    ...(config.env === 'development' ? { devOtp: otp } : {}),
  };
};

const resetPassword = async ({ email, otp, newPassword }) => {
  const user = await User.findOne({ email }).select('+password +otp +otpExpires');

  if (!user) {
    throw new AppError('Invalid reset request', 400);
  }

  if (!user.otpExpires || user.otpExpires < new Date()) {
    throw new AppError('OTP has expired. Please request a new one.', 400);
  }

  const isValid = await verifyOtp(otp, user.otp);
  if (!isValid) {
    throw new AppError('Invalid OTP', 401);
  }

  user.password = newPassword;
  user.clearOtp();
  await user.save();

  await revokeAllUserTokens(user._id);

  return { message: 'Password reset successfully' };
};

const refreshTokens = async ({ refreshToken, deviceInfo }, req = null) => {
  const { refreshToken: newRefreshToken, userId } = await rotateRefreshToken(
    refreshToken,
    deviceInfo
  );

  const user = await User.findById(userId);
  if (!user || user.status !== 'active') {
    throw new AppError('User not found or inactive', 401);
  }

  const accessToken = generateAccessToken(user._id, user.role);

  return {
    accessToken,
    refreshToken: newRefreshToken,
    user,
  };
};

const logout = async (refreshToken, userId, req = null) => {
  if (refreshToken) {
    await revokeRefreshToken(refreshToken);
  }

  if (userId) {
    await logAudit({
      actor: userId,
      action: AUDIT_ACTIONS.LOGOUT,
      resource: AUDIT_RESOURCES.SESSION,
      req,
    });
  }

  return { message: 'Logged out successfully' };
};

const me = async (userId) => {
  const user = await User.findById(userId)
    .populate('department', 'name code')
    .populate('zone', 'name code district');

  if (!user) {
    throw new AppError('User not found', 404);
  }

  return user;
};

module.exports = {
  register,
  login,
  phoneLoginSendOtp,
  verifyOtpAndLogin,
  forgotPassword,
  resetPassword,
  refreshTokens,
  logout,
  me,
};
