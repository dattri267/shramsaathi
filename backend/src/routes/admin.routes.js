const express = require('express');

const router = express.Router();

const {
  listWorkers,
  getWorker,
  verifyDocument,
  setWorkerStatus
} = require('../controllers/admin.controllers');

// --------------------------------------------------
// Federation Admin Dashboard routes.
//
// NOTE: intentionally NOT behind requireAuth yet, because
// the admin dashboard has no login/signup for this phase.
// Before this goes anywhere near production, put these
// behind requireAuth + an admin-role check, the same way
// worker/customer routes already work.
// --------------------------------------------------

router.get('/admin/workers', listWorkers);
router.get('/admin/workers/:workerId', getWorker);

router.patch('/admin/documents/:documentId/verify', verifyDocument);
router.patch('/admin/workers/:workerId/verification-status', setWorkerStatus);

module.exports = router;