const userService = require('../services/user.service');
const { asyncHandler, sendSuccess, sendPaginated } = require('../utils/response');

const list = asyncHandler(async (req, res) => {
  const result = await userService.list(req.query);
  sendPaginated(res, { ...result, message: 'Users fetched successfully' });
});

const getById = asyncHandler(async (req, res) => {
  const user = await userService.getById(req.params.id);
  sendSuccess(res, user, 'User fetched successfully');
});

const updateProfile = asyncHandler(async (req, res) => {
  const user = await userService.updateProfile(req.user._id, req.body);
  sendSuccess(res, user, 'Profile updated successfully');
});

const adminCreate = asyncHandler(async (req, res) => {
  const user = await userService.adminCreateUser(req.body, req.user._id, req);
  sendSuccess(res, user, 'User created successfully', 201);
});

const adminUpdate = asyncHandler(async (req, res) => {
  const user = await userService.adminUpdateUser(req.params.id, req.body, req.user._id, req);
  sendSuccess(res, user, 'User updated successfully');
});

const changeStatus = asyncHandler(async (req, res) => {
  const user = await userService.changeStatus(req.params.id, req.body, req.user._id, req);
  sendSuccess(res, user, 'User status updated successfully');
});

const remove = asyncHandler(async (req, res) => {
  const user = await userService.remove(req.params.id, req.user._id, req);
  sendSuccess(res, user, 'User deactivated successfully');
});

const listWorkers = asyncHandler(async (req, res) => {
  const result = await userService.listWorkers(req.query);
  sendPaginated(res, { ...result, message: 'Field workers fetched successfully' });
});

const listOfficers = asyncHandler(async (req, res) => {
  const result = await userService.listOfficers(req.query);
  sendPaginated(res, { ...result, message: 'Officers fetched successfully' });
});

const assignStaff = asyncHandler(async (req, res) => {
  const user = await userService.assignStaffToZone(req.params.id, req.body, req.user._id, req);
  sendSuccess(res, user, 'Staff assignment updated successfully');
});

module.exports = {
  list,
  getById,
  updateProfile,
  adminCreate,
  adminUpdate,
  changeStatus,
  remove,
  listWorkers,
  listOfficers,
  assignStaff,
};
