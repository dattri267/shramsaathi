const prisma = require('../config/db');

/**
 * POST /ratings/create
 * Body: { booking_id, rating, feedback }
 *
 * A customer can rate only the worker actually assigned to their
 * completed booking. The worker is resolved from the booking on the
 * server so the client cannot submit a rating for another user.
 */
async function createRating(req, res, next) {
  try {
    if (req.user.role !== 'customer') {
      return res.status(403).json({
        error: 'Only customers can rate workers'
      });
    }

    const rated_by = req.user.id;
    const customerProfileId = req.user.customerProfileId;
    const { booking_id, rating, feedback } = req.body;

    if (!booking_id || rating === undefined || rating === null) {
      return res.status(400).json({
        error: 'booking_id and rating (1-5) are required'
      });
    }

    const numericRating = Number(rating);

    if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({
        error: 'Rating must be an integer between 1 and 5'
      });
    }

    if (!customerProfileId) {
      return res.status(404).json({
        error: 'Customer profile not found'
      });
    }

    // The booking determines which worker can be rated.
    const booking = await prisma.bookings.findUnique({
      where: { id: booking_id },
      select: {
        id: true,
        customer_id: true,
        worker_id: true,
        status: true
      }
    });

    if (!booking) {
      return res.status(404).json({
        error: 'Booking not found'
      });
    }

    if (booking.customer_id !== customerProfileId && booking.customer_id !== req.user.id) {
      return res.status(403).json({
        error: 'You can only rate your own bookings'
      });
    }

    if (booking.status !== 'completed') {
      return res.status(400).json({
        error: 'You can rate a worker only after the booking is completed'
      });
    }

    if (!booking.worker_id) {
      return res.status(400).json({
        error: 'This booking does not have an assigned worker'
      });
    }

    const workerProfile = await prisma.worker_profiles.findUnique({
      where: { id: booking.worker_id },
      select: {
        id: true,
        user_id: true
      }
    });

    if (!workerProfile) {
      return res.status(404).json({
        error: 'Assigned worker profile not found'
      });
    }

    // One customer rating per completed booking.
    const existingRating = await prisma.ratings.findFirst({
      where: {
        booking_id: booking.id,
        rated_by,
        rated_user: workerProfile.user_id
      },
      select: { id: true }
    });

    if (existingRating) {
      return res.status(409).json({
        error: 'You have already rated this booking'
      });
    }

    const ratingRecord = await prisma.ratings.create({
      data: {
        booking_id: booking.id,
        rated_by,
        rated_user: workerProfile.user_id,
        rating: numericRating,
        feedback: typeof feedback === 'string' && feedback.trim()
          ? feedback.trim()
          : null
      }
    });

    // Recalculate from all ratings received by this worker.
    // The worker profile stores the current average so existing
    // profile/booking responses can display it without a second query.
    const aggregate = await prisma.ratings.aggregate({
      where: {
        rated_user: workerProfile.user_id
      },
      _avg: {
        rating: true
      }
    });

    const averageRating = Number((aggregate._avg.rating || 0).toFixed(2));

    await prisma.worker_profiles.update({
      where: { id: workerProfile.id },
      data: {
        average_rating: averageRating
      }
    });

    return res.status(201).json({
      message: 'Rating submitted successfully',
      success: true,
      rating: ratingRecord,
      worker: {
        id: workerProfile.id,
        average_rating: averageRating
      }
    });
  } catch (error) {
    // Protect the API from a race where two requests attempt to create
    // the same booking rating at the same time.
    if (error?.code === 'P2002') {
      return res.status(409).json({
        error: 'You have already rated this booking'
      });
    }

    next(error);
  }
}

/**
 * GET /ratings/user/:id
 * Get ratings received by a specific user (worker or customer)
 */
async function getUserRatings(req, res, next) {
  try {
    const { id } = req.params;

    const ratings = await prisma.ratings.findMany({
      where: { rated_user: id },
      include: {
        profiles_ratings_rated_byToprofiles: {
          select: { id: true, full_name: true, avatar_url: true, role: true }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    const totalRatings = ratings.length;
    const avgRating = totalRatings > 0
      ? (ratings.reduce((acc, r) => acc + r.rating, 0) / totalRatings).toFixed(2)
      : '0.00';

    return res.status(200).json({
      success: true,
      average_rating: parseFloat(avgRating),
      total_reviews: totalRatings,
      ratings
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /ratings/my
 * Get ratings received by the logged in user
 */
async function getMyRatings(req, res, next) {
  try {
    const userId = req.user.id;

    const ratings = await prisma.ratings.findMany({
      where: { rated_user: userId },
      include: {
        profiles_ratings_rated_byToprofiles: {
          select: { id: true, full_name: true, avatar_url: true, role: true }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    return res.status(200).json({
      success: true,
      ratings
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createRating,
  getUserRatings,
  getMyRatings
};
