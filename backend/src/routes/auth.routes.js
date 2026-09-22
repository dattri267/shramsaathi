// backend/src/routes/auth.routes.js
const express = require('express');
const router = express.Router();
const { signup, login, resolveRole } = require('../controllers/auth.controller');
const { requireAuth } = require('../middleware/auth');

router.post('/auth/signup', signup);
router.post('/signup', signup);

router.post('/auth/login', login);
router.post('/login', login);

router.post('/auth/resolve-role', requireAuth, resolveRole);
router.post('/resolve-role', requireAuth, resolveRole);

module.exports = router;