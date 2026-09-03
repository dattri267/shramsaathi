const prisma = require('../config/db');

/**
 * POST /welfare/claim
 * Worker submits a welfare/insurance claim
 * Body: { amount, reason }
 */
async function submitClaim(req, res, next) {
  try {
    const userId = req.user.id;
    const { amount, reason } = req.body;

    if (!amount || !reason) {
      return res.status(400).json({ error: 'amount and reason are required' });
    }

    const workerProfile = await prisma.worker_profiles.findUnique({
      where: { user_id: userId }
    });

    if (!workerProfile) {
      return res.status(404).json({ error: 'Worker profile not found' });
    }

    const claim = await prisma.welfare_claims.create({
      data: {
        worker_id: workerProfile.id,
        amount: parseFloat(amount),
        reason,
        status: 'submitted'
      }
    });

    return res.status(201).json({
      message: 'Welfare claim submitted successfully',
      success: true,
      claim
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /welfare/my-claims
 * Worker checks status of their submitted claims
 */
async function getMyClaims(req, res, next) {
  try {
    const userId = req.user.id;

    const workerProfile = await prisma.worker_profiles.findUnique({
      where: { user_id: userId }
    });

    if (!workerProfile) {
      return res.status(404).json({ error: 'Worker profile not found' });
    }

    const claims = await prisma.welfare_claims.findMany({
      where: { worker_id: workerProfile.id },
      orderBy: { created_at: 'desc' }
    });

    return res.status(200).json({
      success: true,
      count: claims.length,
      claims
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /welfare/fund-balance
 * Public/Transparent cooperative fund pool balance and recent transactions
 */
async function getFundBalance(req, res, next) {
  try {
    const transactions = await prisma.welfare_fund_transactions.findMany({
      take: 20,
      orderBy: { created_at: 'desc' }
    });

    const totalContributions = await prisma.welfare_fund_transactions.aggregate({
      _sum: { amount: true }
    });

    const totalClaimsPaid = await prisma.welfare_claims.aggregate({
      where: { status: 'paid' },
      _sum: { amount: true }
    });

    const poolContributions = totalContributions._sum.amount ? parseFloat(totalContributions._sum.amount) : 50000;
    const poolPaidOut = totalClaimsPaid._sum.amount ? parseFloat(totalClaimsPaid._sum.amount) : 0;
    const currentBalance = poolContributions - poolPaidOut;

    return res.status(200).json({
      success: true,
      fund_balance: currentBalance,
      total_contributions: poolContributions,
      total_claims_paid: poolPaidOut,
      transactions
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /admin/welfare/review/:id
 * Admin approves, rejects, or marks claim as paid
 */
async function adminReviewClaim(req, res, next) {
  try {
    const { id } = req.params;
    const { status = 'approved' } = req.body;
    const adminId = req.user.id;

    if (!['submitted', 'under_review', 'approved', 'rejected', 'paid'].includes(status)) {
      return res.status(400).json({ error: 'Invalid claim status' });
    }

    const existingClaim = await prisma.welfare_claims.findUnique({
      where: { id }
    });

    if (!existingClaim) {
      return res.status(404).json({ error: 'Welfare claim not found' });
    }

    const updateData = {
      status,
      reviewed_by: adminId,
      reviewed_at: new Date(),
      updated_at: new Date()
    };

    if (status === 'paid') {
      updateData.paid_at = new Date();
    }

    const claim = await prisma.welfare_claims.update({
      where: { id },
      data: updateData
    });

    return res.status(200).json({
      message: `Welfare claim status updated to ${status}`,
      success: true,
      claim
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  submitClaim,
  getMyClaims,
  getFundBalance,
  adminReviewClaim
};
