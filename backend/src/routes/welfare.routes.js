const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const {
  submitClaim,
  getMyClaims,
  getFundBalance,
  adminReviewClaim
} = require('../controllers/welfare.controller');

router.post('/claim', requireAuth, submitClaim);
router.get('/my-claims', requireAuth, getMyClaims);
router.get('/fund-balance', getFundBalance);
router.patch('/admin/review/:id', requireAuth, adminReviewClaim);

module.exports = router;
