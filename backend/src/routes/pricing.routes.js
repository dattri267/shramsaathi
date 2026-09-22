const express = require('express');

const router = express.Router();

const {
  calculateBookingPrice,
  predictBookingPrice,
  estimateCustomerTaskPrice
} = require('../controllers/pricing.controller');

const {
  requireAuth,
  resolveRoleProfile
} = require('../middleware/auth');

router.post('/pricing/calculate', requireAuth, resolveRoleProfile, calculateBookingPrice);
router.post('/pricing/predict', requireAuth, resolveRoleProfile, predictBookingPrice);
router.post('/customer/pricing/estimate', requireAuth, resolveRoleProfile, estimateCustomerTaskPrice);
router.post('/v1/customer/pricing/estimate', requireAuth, resolveRoleProfile, estimateCustomerTaskPrice);
router.post('/api/customer/pricing/estimate', requireAuth, resolveRoleProfile, estimateCustomerTaskPrice);

module.exports = router;
