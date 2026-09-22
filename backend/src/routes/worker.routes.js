// backend/src/routes/worker.routes.js
const express = require('express');
const router = express.Router();
const {
  createWorkerProfile,
  getWorkerProfile,
  updateWorkerProfile,
  updateWorkerAvailability
} = require('../controllers/worker.controller');
const { requireAuth } = require('../middleware/auth');

router.get('/worker/profile', requireAuth, getWorkerProfile);
router.get('/api/worker/profile', requireAuth, getWorkerProfile);
router.get('/profile', requireAuth, getWorkerProfile);

router.post('/worker/profile', requireAuth, createWorkerProfile);
router.post('/api/worker/profile', requireAuth, createWorkerProfile);

router.patch('/worker/profile', requireAuth, updateWorkerProfile);
router.patch('/api/worker/profile', requireAuth, updateWorkerProfile);
router.put('/worker/profile', requireAuth, updateWorkerProfile);
router.put('/api/worker/profile', requireAuth, updateWorkerProfile);

router.patch('/worker/availability', requireAuth, updateWorkerAvailability);
router.patch('/api/worker/availability', requireAuth, updateWorkerAvailability);

module.exports = router;