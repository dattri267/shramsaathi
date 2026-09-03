const express = require('express');

const router = express.Router();

const {
  calculateBookingPrice
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

module.exports = router;