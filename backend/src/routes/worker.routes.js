const express = require('express');

const router = express.Router();

const {
  requireAuth,
  resolveRoleProfile
} = require('../middleware/auth');

const {
  getProfile,
  updateProfile,
  updateAvailability,
  getJobs
} = require('../controllers/worker.controller');

router.get(
  '/worker/profile',
  requireAuth,
  resolveRoleProfile,
  getProfile
);

router.patch(
  '/worker/profile',
  requireAuth,
  resolveRoleProfile,
  updateProfile
);

router.patch(
  '/worker/availability',
  requireAuth,
  resolveRoleProfile,
  updateAvailability
);

router.get(
  '/worker/jobs',
  requireAuth,
  resolveRoleProfile,
  getJobs
);

module.exports = router;
