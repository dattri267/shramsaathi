const express = require('express');
const router = express.Router();

const {
  requireAuth
} = require('../middleware/auth');

const {
  getCustomerProfile,
  createCustomerProfile,
  updateCustomerProfile
} = require('../controllers/customer.controller');

router.get('/customer/profile', requireAuth, getCustomerProfile);
router.get('/v1/customer/profile', requireAuth, getCustomerProfile);
router.get('/api/customer/profile', requireAuth, getCustomerProfile);
router.get('/api/v1/customer/profile', requireAuth, getCustomerProfile);
router.get('/profile', requireAuth, getCustomerProfile);

router.post('/customer/profile', requireAuth, createCustomerProfile);
router.post('/v1/customer/profile', requireAuth, createCustomerProfile);
router.post('/api/customer/profile', requireAuth, createCustomerProfile);
router.post('/api/v1/customer/profile', requireAuth, createCustomerProfile);

router.patch('/customer/profile', requireAuth, updateCustomerProfile);
router.patch('/v1/customer/profile', requireAuth, updateCustomerProfile);
router.patch('/api/customer/profile', requireAuth, updateCustomerProfile);
router.patch('/api/v1/customer/profile', requireAuth, updateCustomerProfile);
router.put('/customer/profile', requireAuth, updateCustomerProfile);
router.put('/v1/customer/profile', requireAuth, updateCustomerProfile);
router.put('/api/customer/profile', requireAuth, updateCustomerProfile);
router.put('/api/v1/customer/profile', requireAuth, updateCustomerProfile);

module.exports = router;