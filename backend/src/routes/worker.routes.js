// backend/src/routes/worker.routes.js
const express = require('express');
const multer = require('multer');
const router = express.Router();
const {
  createWorkerProfile,
  getWorkerProfile,
  updateWorkerProfile,
  updateWorkerAvailability,
  uploadWorkerDocument
} = require('../controllers/worker.controller');
const { requireAuth } = require('../middleware/auth');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024
  }
});

router.get('/worker/profile', requireAuth, getWorkerProfile);
router.get('/api/worker/profile', requireAuth, getWorkerProfile);
router.get('/profile', requireAuth, getWorkerProfile);

router.post('/worker/profile', requireAuth, createWorkerProfile);
router.post('/api/worker/profile', requireAuth, createWorkerProfile);

router.patch('/worker/profile', requireAuth, updateWorkerProfile);
router.patch('/api/worker/profile', requireAuth, updateWorkerProfile);
router.put('/worker/profile', requireAuth, updateWorkerProfile);
router.put('/api/worker/profile', requireAuth, updateWorkerProfile);

router.post(
  '/worker/documents',
  requireAuth,
  upload.single('file'),
  uploadWorkerDocument
);

router.patch('/worker/availability', requireAuth, updateWorkerAvailability);
router.patch('/api/worker/availability', requireAuth, updateWorkerAvailability);

module.exports = router;