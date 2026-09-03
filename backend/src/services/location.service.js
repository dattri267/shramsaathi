const { redis } = require('../config/redis');

async function updateWorkerLocation(workerId, latitude, longitude) {
  if (latitude === undefined || longitude === undefined) {
    throw new Error('latitude and longitude are required');
  }

  const location = {
    workerId,
    latitude: Number(latitude),
    longitude: Number(longitude),
    updatedAt: new Date().toISOString()
  };

  await redis.set(
    `worker:location:${workerId}`,
    JSON.stringify(location),
    {
      EX: 300
    }
  );

  return location;
}

async function getWorkerLocation(workerId) {
  const data = await redis.get(`worker:location:${workerId}`);

  if (!data) {
    return null;
  }

  return JSON.parse(data);
}

module.exports = {
  updateWorkerLocation,
  getWorkerLocation
};