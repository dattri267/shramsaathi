const prisma = require('../config/db');

/**
 * POST /disputes/create
 * Body: { booking_id, reason }
 */
async function createDispute(req, res, next) {
  try {
    const raised_by = req.user.id;
    const { booking_id, reason } = req.body;

    if (!booking_id || !reason) {
      return res.status(400).json({ error: 'booking_id and reason are required' });
    }

    const booking = await prisma.bookings.findUnique({
      where: { id: booking_id }
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Check if dispute already exists for this booking
    const existingDispute = await prisma.disputes.findUnique({
      where: { booking_id }
    });

    if (existingDispute) {
      return res.status(400).json({ error: 'A dispute has already been raised for this booking' });
    }

    const dispute = await prisma.disputes.create({
      data: {
        booking_id,
        raised_by,
        reason,
        status: 'open'
      }
    });

    return res.status(201).json({
      message: 'Dispute submitted successfully',
      success: true,
      dispute
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /disputes/my
 * Fetch all disputes raised by or involving the user
 */
async function getMyDisputes(req, res, next) {
  try {
    const userId = req.user.id;

    const disputesList = await prisma.disputes.findMany({
      where: {
        OR: [
          { raised_by: userId },
          { bookings: { customer_id: userId } }
        ]
      },
      include: {
        bookings: true,
        profiles_disputes_raised_byToprofiles: {
          select: { id: true, full_name: true, role: true }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    return res.status(200).json({
      success: true,
      count: disputesList.length,
      disputes: disputesList
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /disputes/:id
 * Get specific dispute details
 */
async function getDisputeById(req, res, next) {
  try {
    const { id } = req.params;

    const dispute = await prisma.disputes.findUnique({
      where: { id },
      include: {
        bookings: true,
        profiles_disputes_raised_byToprofiles: {
          select: { id: true, full_name: true, phone: true, role: true }
        },
        profiles_disputes_resolved_byToprofiles: {
          select: { id: true, full_name: true }
        }
      }
    });

    if (!dispute) {
      return res.status(404).json({ error: 'Dispute not found' });
    }

    return res.status(200).json({
      success: true,
      dispute
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /admin/disputes/:id/resolve
 * Admin endpoint to update dispute status and resolution notes
 */
async function adminResolveDispute(req, res, next) {
  try {
    const { id } = req.params;
    const { status = 'resolved', resolution } = req.body;
    const adminId = req.user.id;

    if (!['open', 'under_review', 'resolved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid dispute status' });
    }

    const existingDispute = await prisma.disputes.findUnique({
      where: { id }
    });

    if (!existingDispute) {
      return res.status(404).json({ error: 'Dispute not found' });
    }

    const dispute = await prisma.disputes.update({
      where: { id },
      data: {
        status,
        resolution: resolution || null,
        resolved_by: adminId,
        resolved_at: new Date()
      }
    });

    return res.status(200).json({
      message: `Dispute status updated to ${status}`,
      success: true,
      dispute
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createDispute,
  getMyDisputes,
  getDisputeById,
  adminResolveDispute
};
