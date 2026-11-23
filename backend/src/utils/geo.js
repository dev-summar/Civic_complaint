const EARTH_RADIUS_KM = 6371;

const toRadians = (degrees) => (degrees * Math.PI) / 180;

const haversineDistance = (lat1, lon1, lat2, lon2) => {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2
    + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_KM * c;
};

const buildGeoNearPipeline = ({
  longitude,
  latitude,
  maxDistanceMeters = 5000,
  query = {},
  limit = 50,
  distanceField = 'distanceMeters',
  spherical = true,
  includeLocs = 'location',
  sortByDistance = true,
  additionalStages = [],
}) => {
  if (longitude == null || latitude == null) {
    throw new Error('longitude and latitude are required for geoNear pipeline');
  }

  const pipeline = [
    {
      $geoNear: {
        near: {
          type: 'Point',
          coordinates: [longitude, latitude],
        },
        distanceField,
        maxDistance: maxDistanceMeters,
        query,
        spherical,
        ...(includeLocs ? { includeLocs } : {}),
        ...(sortByDistance ? { distanceMultiplier: 1 } : {}),
      },
    },
    ...additionalStages,
  ];

  if (limit != null) {
    pipeline.push({ $limit: limit });
  }

  return pipeline;
};

const buildGeoWithinCircleQuery = (longitude, latitude, radiusKm) => ({
  location: {
    $geoWithin: {
      $centerSphere: [[longitude, latitude], radiusKm / EARTH_RADIUS_KM],
    },
  },
});

module.exports = {
  EARTH_RADIUS_KM,
  haversineDistance,
  buildGeoNearPipeline,
  buildGeoWithinCircleQuery,
};
