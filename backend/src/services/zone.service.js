const { Zone } = require('../models');
const AppError = require('../utils/AppError');

const list = async ({ page = 1, limit = 20, isActive, district, search } = {}) => {
  const filter = {};
  if (isActive !== undefined) {
    filter.isActive = isActive === true || isActive === 'true';
  }
  if (district) {
    filter.district = { $regex: district, $options: 'i' };
  }
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { code: { $regex: search, $options: 'i' } },
      { district: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    Zone.find(filter).sort({ district: 1, name: 1 }).skip(skip).limit(limit),
    Zone.countDocuments(filter),
  ]);

  return { items, page, limit, total };
};

const getById = async (id) => {
  const zone = await Zone.findById(id);
  if (!zone) {
    throw new AppError('Zone not found', 404);
  }
  return zone;
};

const findZoneForPoint = async (longitude, latitude) => {
  const point = { type: 'Point', coordinates: [longitude, latitude] };

  let zone = await Zone.findOne({
    isActive: true,
    polygon: { $geoIntersects: { $geometry: point } },
  });

  if (!zone) {
    zone = await Zone.findOne({
      isActive: true,
      center: {
        $near: {
          $geometry: point,
          $maxDistance: 15000,
        },
      },
    });
  }

  return zone;
};

const create = async (payload) => {
  const existing = await Zone.findOne({ code: payload.code.toUpperCase() });
  if (existing) {
    throw new AppError('Zone code already exists', 409);
  }

  const data = { ...payload, code: payload.code.toUpperCase() };

  if (payload.centerLat != null && payload.centerLng != null) {
    data.center = {
      type: 'Point',
      coordinates: [payload.centerLng, payload.centerLat],
    };
    delete data.centerLat;
    delete data.centerLng;
  }

  return Zone.create(data);
};

const update = async (id, payload) => {
  const zone = await Zone.findById(id);
  if (!zone) {
    throw new AppError('Zone not found', 404);
  }

  if (payload.code && payload.code.toUpperCase() !== zone.code) {
    const duplicate = await Zone.findOne({ code: payload.code.toUpperCase() });
    if (duplicate) {
      throw new AppError('Zone code already exists', 409);
    }
    payload.code = payload.code.toUpperCase();
  }

  if (payload.centerLat != null && payload.centerLng != null) {
    payload.center = {
      type: 'Point',
      coordinates: [payload.centerLng, payload.centerLat],
    };
    delete payload.centerLat;
    delete payload.centerLng;
  }

  Object.assign(zone, payload);
  await zone.save();
  return zone;
};

const remove = async (id) => {
  const zone = await Zone.findById(id);
  if (!zone) {
    throw new AppError('Zone not found', 404);
  }

  zone.isActive = false;
  await zone.save();
  return zone;
};

module.exports = {
  list,
  getById,
  findZoneForPoint,
  create,
  update,
  remove,
};
