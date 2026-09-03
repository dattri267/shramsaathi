const express = require('express');

const router = express.Router();

const {
  createPayment,
  completeMockPayment
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


router.patch(
  '/customer/payment/:paymentId/complete',
  requireAuth,
  resolveRoleProfile,
  completeMockPayment
);


module.exports = router;