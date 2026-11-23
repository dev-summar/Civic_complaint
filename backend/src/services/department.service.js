const { Department } = require('../models');
const AppError = require('../utils/AppError');

const list = async ({ page = 1, limit = 20, isActive, search } = {}) => {
  const filter = {};
  if (isActive !== undefined) {
    filter.isActive = isActive === true || isActive === 'true';
  }
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { code: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    Department.find(filter)
      .populate('headOfficer', 'name email phone role')
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit),
    Department.countDocuments(filter),
  ]);

  return { items, page, limit, total };
};

const getById = async (id) => {
  const department = await Department.findById(id).populate(
    'headOfficer',
    'name email phone role profilePhoto'
  );

  if (!department) {
    throw new AppError('Department not found', 404);
  }

  return department;
};

const getByCode = async (code) => {
  const department = await Department.findOne({ code: code.toUpperCase(), isActive: true });
  return department;
};

const create = async (payload) => {
  const existing = await Department.findOne({ code: payload.code.toUpperCase() });
  if (existing) {
    throw new AppError('Department code already exists', 409);
  }

  return Department.create({
    ...payload,
    code: payload.code.toUpperCase(),
  });
};

const update = async (id, payload) => {
  const department = await Department.findById(id);
  if (!department) {
    throw new AppError('Department not found', 404);
  }

  if (payload.code && payload.code.toUpperCase() !== department.code) {
    const duplicate = await Department.findOne({ code: payload.code.toUpperCase() });
    if (duplicate) {
      throw new AppError('Department code already exists', 409);
    }
    payload.code = payload.code.toUpperCase();
  }

  Object.assign(department, payload);
  await department.save();
  return department;
};

const remove = async (id) => {
  const department = await Department.findById(id);
  if (!department) {
    throw new AppError('Department not found', 404);
  }

  department.isActive = false;
  await department.save();
  return department;
};

module.exports = {
  list,
  getById,
  getByCode,
  create,
  update,
  remove,
};
