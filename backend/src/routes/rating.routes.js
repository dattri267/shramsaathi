const express = require('express');
const router = express.Router();
const {
  requireAuth,
  resolveRoleProfile
} = require('../middleware/auth');
const {
  createRating,
  getUserRatings,
  getMyRatings
} = require('../controllers/rating.controller');

router.post('/create', requireAuth, resolveRoleProfile, createRating);
router.get('/my', requireAuth, getMyRatings);
router.get('/user/:id', getUserRatings);

module.exports = router;
