const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const {
  getSkills,
  getWorkerProfile,
  updateWorkerProfile,
  toggleAvailability,
  uploadDocument,
  getDocuments,
  deleteDocument,
  getPendingVerifications,
  verifyWorker
} = require('../controllers/worker.controller');

// Public catalog route
router.get('/skills', getSkills);

// Protected worker profile routes
router.get('/profile', requireAuth, getWorkerProfile);
router.put('/profile', requireAuth, updateWorkerProfile);
router.patch('/profile', requireAuth, updateWorkerProfile);
router.patch('/availability', requireAuth, toggleAvailability);

// Worker KYC & Document management routes
router.post('/documents/upload', requireAuth, uploadDocument);
router.get('/documents', requireAuth, getDocuments);
router.delete('/documents/:id', requireAuth, deleteDocument);

// Admin verification routes
router.get('/admin/verifications', requireAuth, getPendingVerifications);
router.patch('/admin/verify-worker/:id', requireAuth, verifyWorker);

module.exports = router;
