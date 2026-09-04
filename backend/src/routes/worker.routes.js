const express = require('express');
const multer = require('multer');

const router = express.Router();

const {
  requireAuth,
  resolveRoleProfile
} = require('../middleware/auth');

const {
  getProfile,
  updateProfile,
  updateAvailability,
  getJobs,
  uploadDocument
} = require('../controllers/worker.controller');

// --------------------------------------------------
// Multer configuration
// --------------------------------------------------

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/pdf'
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      return cb(
        new Error(
          'Only JPG, PNG, WEBP and PDF files are allowed'
        )
      );
    }

    cb(null, true);
  }
});

// --------------------------------------------------
// Worker Profile
// --------------------------------------------------

router.get(
  '/worker/profile',
  requireAuth,
  resolveRoleProfile,
  getProfile
);

router.patch(
  '/worker/profile',
  requireAuth,
  resolveRoleProfile,
  updateProfile
);

// --------------------------------------------------
// Worker Availability
// --------------------------------------------------

router.patch(
  '/worker/availability',
  requireAuth,
  resolveRoleProfile,
  updateAvailability
);

// --------------------------------------------------
// Worker Jobs
// --------------------------------------------------

router.get(
  '/worker/jobs',
  requireAuth,
  resolveRoleProfile,
  getJobs
);

// --------------------------------------------------
// Worker Document Upload
// --------------------------------------------------

router.post(
  '/worker/documents',
  requireAuth,
  resolveRoleProfile,
  upload.single('file'),
  uploadDocument
);

module.exports = router;