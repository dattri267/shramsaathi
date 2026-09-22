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

router.post('/ratings/create', requireAuth, resolveRoleProfile, createRating);
router.post('/api/ratings/create', requireAuth, resolveRoleProfile, createRating);
router.post('/rating/create', requireAuth, resolveRoleProfile, createRating);
router.post('/api/rating/create', requireAuth, resolveRoleProfile, createRating);
router.post('/create', requireAuth, resolveRoleProfile, createRating);
router.post('/ratings', requireAuth, resolveRoleProfile, createRating);

router.get('/ratings/my', requireAuth, getMyRatings);
router.get('/api/ratings/my', requireAuth, getMyRatings);
router.get('/my', requireAuth, getMyRatings);

router.get('/ratings/user/:id', getUserRatings);
router.get('/api/ratings/user/:id', getUserRatings);
router.get('/user/:id', getUserRatings);

module.exports = router;
