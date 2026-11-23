const zoneService = require('../services/zone.service');
const { asyncHandler, sendSuccess, sendPaginated } = require('../utils/response');

const list = asyncHandler(async (req, res) => {
  const result = await zoneService.list(req.query);
  sendPaginated(res, { ...result, message: 'Zones fetched successfully' });
});

const getById = asyncHandler(async (req, res) => {
  const zone = await zoneService.getById(req.params.id);
  sendSuccess(res, zone, 'Zone fetched successfully');
});

const create = asyncHandler(async (req, res) => {
  const zone = await zoneService.create(req.body);
  sendSuccess(res, zone, 'Zone created successfully', 201);
});

const update = asyncHandler(async (req, res) => {
  const zone = await zoneService.update(req.params.id, req.body);
  sendSuccess(res, zone, 'Zone updated successfully');
});

const remove = asyncHandler(async (req, res) => {
  const zone = await zoneService.remove(req.params.id);
  sendSuccess(res, zone, 'Zone deactivated successfully');
});

module.exports = {
  list,
  getById,
  create,
  update,
  remove,
};
