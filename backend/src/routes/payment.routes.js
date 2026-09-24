const express = require('express');

const router = express.Router();

const {
  createPayment,
  verifyRazorpayPayment
} = require('../controllers/payment.controller');

const {
  requireAuth,
  resolveRoleProfile
} = require('../middleware/auth');

router.post(
  '/customer/payment/create',
  requireAuth,
  resolveRoleProfile,
  createPayment
);

router.post(
  '/customer/payment/:paymentId/verify',
  requireAuth,
  resolveRoleProfile,
  verifyRazorpayPayment
);

module.exports = router;
