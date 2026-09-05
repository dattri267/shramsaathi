const express = require('express');

const router = express.Router();

const {
  calculateBookingPrice,
  predictBookingPrice
} = require('../controllers/pricing.controller');

const {
  requireAuth,
  resolveRoleProfile
} = require('../middleware/auth');

router.post(
  '/pricing/calculate',
  requireAuth,
  resolveRoleProfile,
  calculateBookingPrice
);

router.post(
  '/pricing/predict',
  requireAuth,
  resolveRoleProfile,
  predictBookingPrice
);

module.exports = router;
