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

// Customer profile
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

// Backward-compatible routes from main
router.get(
  '/profile',
  requireAuth,
  resolveRoleProfile,
  getProfile
);

router.put(
  '/profile',
  requireAuth,
  resolveRoleProfile,
  updateProfile
);

router.patch(
  '/profile',
  requireAuth,
  resolveRoleProfile,
  updateProfile
);

module.exports = router;
