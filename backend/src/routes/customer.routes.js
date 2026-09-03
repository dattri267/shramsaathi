const express = require('express');

const router = express.Router();

const {
  requireAuth,
  resolveRoleProfile
} = require('../middleware/auth');

const {
  getProfile,
  updateProfile
} = require('../controllers/customer.controller');

router.get(
  '/customer/profile',
  requireAuth,
  resolveRoleProfile,
  getProfile
);

router.patch(
  '/customer/profile',
  requireAuth,
  resolveRoleProfile,
  updateProfile
);

module.exports = router;