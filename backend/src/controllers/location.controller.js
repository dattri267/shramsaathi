const locationService = require('../services/location.service');

async function updateLocation(req, res) {
  try {
    if (req.user.role !== 'worker') {
      return res.status(403).json({
        error: 'Only workers can update location'
      });
    }

    const { latitude, longitude } = req.body;

    const location = await locationService.updateWorkerLocation(
      req.user.workerProfileId,
      latitude,
      longitude
    );

    res.json({
      message: 'Location updated successfully',
      location
    });
  } catch (err) {
    console.error(err);

    res.status(400).json({
      error: err.message
    });
  }
}

async function getLocation(req, res) {
  try {
    const location = await locationService.getWorkerLocation(
      req.params.workerId
    );

    if (!location) {
      return res.status(404).json({
        error: 'Worker location not available'
      });
    }

    res.json({ location });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: 'Failed to get worker location'
    });
  }
}

module.exports = {
  updateLocation,
  getLocation
};