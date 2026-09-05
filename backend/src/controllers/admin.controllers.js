const adminService = require('../services/admin.service');

async function listWorkers(req, res, next) {
  try {
    const { status, search } = req.query;
    const workers = await adminService.listWorkers({ status, search });
    res.json({ workers });
  } catch (err) {
    next(err);
  }
}

async function getWorker(req, res, next) {
  try {
    const worker = await adminService.getWorkerDetail(req.params.workerId);
    res.json({ worker });
  } catch (err) {
    next(err);
  }
}

async function verifyDocument(req, res, next) {
  try {
    const verified = req.body.verified !== false;
    const document = await adminService.setDocumentVerification(
      req.params.documentId,
      verified
    );

    res.json({
      message: verified
        ? 'Document marked verified'
        : 'Document marked unverified',
      document
    });
  } catch (err) {
    next(err);
  }
}

async function setWorkerStatus(req, res, next) {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'status is required' });
    }

    const worker = await adminService.setWorkerVerificationStatus(
      req.params.workerId,
      status
    );

    res.json({ message: 'Worker verification status updated', worker });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listWorkers,
  getWorker,
  verifyDocument,
  setWorkerStatus
};