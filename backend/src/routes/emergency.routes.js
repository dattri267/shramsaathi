const express = require('express');
const router = express.Router();

const {
  requireAuth,
  resolveRoleProfile
} = require('../middleware/auth');

const {
  createMatchAttempt,
  acceptEmergency,
  rejectEmergency
} = require('../controllers/emergency.controller');

router.post(
  '/emergency/match-attempt',
  requireAuth,
  createMatchAttempt
);

router.patch(
  '/emergency/match-attempt/:id/accept',
  requireAuth,
  resolveRoleProfile,
  acceptEmergency
);

router.patch(
  '/emergency/match-attempt/:id/reject',
  requireAuth,
  resolveRoleProfile,
  rejectEmergency
);

module.exports = router;