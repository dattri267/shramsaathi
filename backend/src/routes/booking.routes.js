const express = require('express');
const router = express.Router();

const {
  requireAuth,
  resolveRoleProfile
} = require('../middleware/auth');

const {
  createBooking,
  getMyBookings,
  getBooking,
  cancelBooking,
  getWorkerBookings,
  acceptBooking,
  rejectBooking,
  startBooking,
  completeBooking
} = require('../controllers/booking.controller');

// Customer
router.post(
  '/customer/booking/create',
  requireAuth,
  resolveRoleProfile,
  createBooking
);

router.get(
  '/customer/bookings',
  requireAuth,
  resolveRoleProfile,
  getMyBookings
);

router.get(
  '/booking/:id',
  requireAuth,
  resolveRoleProfile,
  getBooking
);

router.patch(
  '/customer/booking/:id/cancel',
  requireAuth,
  resolveRoleProfile,
  cancelBooking
);

// Worker
router.get(
  '/worker/bookings',
  requireAuth,
  resolveRoleProfile,
  getWorkerBookings
);

router.patch(
  '/worker/booking/:id/accept',
  requireAuth,
  resolveRoleProfile,
  acceptBooking
);

router.patch(
  '/worker/booking/:id/reject',
  requireAuth,
  resolveRoleProfile,
  rejectBooking
);

router.patch(
  '/worker/booking/:id/start',
  requireAuth,
  resolveRoleProfile,
  startBooking
);

router.patch(
  '/worker/booking/:id/complete',
  requireAuth,
  resolveRoleProfile,
  completeBooking
);

module.exports = router;