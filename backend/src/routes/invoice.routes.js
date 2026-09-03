const express = require('express');
const router = express.Router();

const {
  createInvoice,
  getInvoice
} = require('../controllers/invoice.controller');

const {
  requireAuth,
  resolveRoleProfile
} = require('../middleware/auth');

router.post(
  '/customer/invoice/create',
  requireAuth,
  resolveRoleProfile,
  createInvoice
);

router.get(
  '/customer/invoice/:bookingId',
  requireAuth,
  resolveRoleProfile,
  getInvoice
);

module.exports = router;