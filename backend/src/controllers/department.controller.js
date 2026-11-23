const departmentService = require('../services/department.service');
const { asyncHandler, sendSuccess, sendPaginated } = require('../utils/response');

const list = asyncHandler(async (req, res) => {
  const result = await departmentService.list(req.query);
  sendPaginated(res, { ...result, message: 'Departments fetched successfully' });
});

const getById = asyncHandler(async (req, res) => {
  const department = await departmentService.getById(req.params.id);
  sendSuccess(res, department, 'Department fetched successfully');
});

const create = asyncHandler(async (req, res) => {
  const department = await departmentService.create(req.body);
  sendSuccess(res, department, 'Department created successfully', 201);
});

const update = asyncHandler(async (req, res) => {
  const department = await departmentService.update(req.params.id, req.body);
  sendSuccess(res, department, 'Department updated successfully');
});

const remove = asyncHandler(async (req, res) => {
  const department = await departmentService.remove(req.params.id);
  sendSuccess(res, department, 'Department deactivated successfully');
});

module.exports = {
  list,
  getById,
  create,
  update,
  remove,
};
