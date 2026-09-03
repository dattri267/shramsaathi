const express = require('express');
const router = express.Router();

const {
  createEmergencyMatch,
  acceptEmergencyMatch,
  rejectEmergencyMatch
} = require('../controllers/emergency.controller');

const {
  requireAuth,
  resolveRoleProfile
} = require('../middleware/auth');

router.post(
  '/emergency/match',
  requireAuth,
  resolveRoleProfile,
  createEmergencyMatch
);

router.patch(
  '/emergency/match/:id/accept',
  requireAuth,
  resolveRoleProfile,
  acceptEmergencyMatch
);

router.patch(
  '/emergency/match/:id/reject',
  requireAuth,
  resolveRoleProfile,
  rejectEmergencyMatch
);

module.exports = router;