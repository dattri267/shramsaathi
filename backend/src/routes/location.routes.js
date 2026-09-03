const express = require('express');
const router = express.Router();

const {
  updateLocation,
  getLocation
} = require('../controllers/location.controller');

const {
  requireAuth,
  resolveRoleProfile
} = require('../middleware/auth');

router.patch(
  '/worker/location',
  requireAuth,
  resolveRoleProfile,
  updateLocation
);

router.get(
  '/worker/:workerId/location',
  requireAuth,
  resolveRoleProfile,
  getLocation
);

module.exports = router;