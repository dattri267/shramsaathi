const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const {
  getCustomerProfile,
  updateCustomerProfile
} = require('../controllers/customer.controller');

router.get('/profile', requireAuth, getCustomerProfile);
router.put('/profile', requireAuth, updateCustomerProfile);
router.patch('/profile', requireAuth, updateCustomerProfile);

module.exports = router;
