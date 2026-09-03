const express = require('express');
const multer = require('multer');

const {
  requireAuth
} = require('../middleware/auth');

const {
  uploadAvatar,
  deleteAvatar
} = require('../controllers/avatar.controller');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp'
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      return cb(
        new Error('Only JPG, PNG and WEBP images are allowed')
      );
    }

    cb(null, true);
  }
});

router.post(
  '/profile/avatar',
  requireAuth,
  upload.single('avatar'),
  uploadAvatar
);

router.delete(
  '/profile/avatar',
  requireAuth,
  deleteAvatar
);

module.exports = router;