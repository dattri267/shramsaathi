const workerService = require('../services/worker.service');

async function getProfile(req, res, next) {
  try {
    if (req.user.role !== 'worker') {
      return res.status(403).json({
        error: 'Only workers can access this'
      });
    }

    const profile = await workerService.getWorkerProfile(
      req.user.id
    );

    res.json({ profile });
  } catch (err) {
    next(err);
  }
}

async function updateProfile(req, res, next) {
  try {
    if (req.user.role !== 'worker') {
      return res.status(403).json({
        error: 'Only workers can update this'
      });
    }

    const profile = await workerService.updateWorkerProfile(
      req.user.id,
      req.body
    );

    res.json({
      message: 'Worker profile updated successfully',
      profile
    });
  } catch (err) {
    next(err);
  }
}

async function updateAvailability(req, res, next) {
  try {
    if (req.user.role !== 'worker') {
      return res.status(403).json({
        error: 'Only workers can change availability'
      });
    }

    const worker = await workerService.updateAvailability(
      req.user.id,
      req.body.availability
    );

    res.json({
      message: 'Availability updated',
      worker
    });
  } catch (err) {
    next(err);
  }
}

async function getJobs(req, res, next) {
  try {
    if (req.user.role !== 'worker') {
      return res.status(403).json({
        error: 'Only workers can access jobs'
      });
    }

    const jobs = await workerService.getWorkerJobs(
      req.user.workerProfileId
    );

    res.json({ jobs });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getProfile,
  updateProfile,
  updateAvailability,
  getJobs
};