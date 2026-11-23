const authService = require('../services/auth.service');
const { asyncHandler, sendSuccess } = require('../utils/response');

const signup = asyncHandler(async (req, res) => {
  const result = await authService.register(req.body, req);
  sendSuccess(res, result, 'Account created successfully', 201);
});

const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body, req);
  sendSuccess(res, result, 'Logged in successfully');
});

const phoneLogin = asyncHandler(async (req, res) => {
  const result = await authService.phoneLoginSendOtp(req.body);
  sendSuccess(res, result, result.message);
});

const verifyOtp = asyncHandler(async (req, res) => {
  const result = await authService.verifyOtpAndLogin(req.body, req);
  sendSuccess(res, result, 'OTP verified successfully');
});

const forgotPassword = asyncHandler(async (req, res) => {
  const result = await authService.forgotPassword(req.body);
  sendSuccess(res, result, result.message);
});

const resetPassword = asyncHandler(async (req, res) => {
  const result = await authService.resetPassword(req.body);
  sendSuccess(res, result, result.message);
});

const refreshToken = asyncHandler(async (req, res) => {
  const result = await authService.refreshTokens(req.body, req);
  sendSuccess(res, result, 'Token refreshed successfully');
});

const logout = asyncHandler(async (req, res) => {
  const result = await authService.logout(req.body.refreshToken, req.user?._id, req);
  sendSuccess(res, result, result.message);
});

const me = asyncHandler(async (req, res) => {
  const user = await authService.me(req.user._id);
  sendSuccess(res, user, 'Profile fetched successfully');
});

module.exports = {
  signup,
  login,
  phoneLogin,
  verifyOtp,
  forgotPassword,
  resetPassword,
  refreshToken,
  logout,
  me,
};
