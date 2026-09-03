const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const {
  createDispute,
  getMyDisputes,
  getDisputeById,
  adminResolveDispute
} = require('../controllers/dispute.controller');

router.post('/create', requireAuth, createDispute);
router.get('/my', requireAuth, getMyDisputes);
router.get('/:id', requireAuth, getDisputeById);
router.patch('/admin/resolve/:id', requireAuth, adminResolveDispute);

module.exports = router;
