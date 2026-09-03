const prisma = require('../config/db');

/**
 * POST /ratings/create
 * Body: { booking_id, rated_user, rating, feedback }
 */
async function createRating(req, res, next) {
  try {
    const rated_by = req.user.id;
    const { booking_id, rated_user, rating, feedback } = req.body;

    if (!booking_id || !rated_user || !rating) {
      return res.status(400).json({ error: 'booking_id, rated_user, and rating (1-5) are required' });
    }

    const numericRating = parseInt(rating);
    if (isNaN(numericRating) || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({ error: 'Rating must be an integer between 1 and 5' });
    }

    // Check if booking exists
    const booking = await prisma.bookings.findUnique({
      where: { id: booking_id }
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Create or update rating
    const ratingRecord = await prisma.ratings.upsert({
      where: {
        booking_id_rated_by_rated_user: {
          booking_id,
          rated_by,
          rated_user
        }
      },
      update: {
        rating: numericRating,
        feedback: feedback || null
      },
      create: {
        booking_id,
        rated_by,
        rated_user,
        rating: numericRating,
        feedback: feedback || null
      }
    });

    // Automatically recalculate worker's average_rating if rated_user is a worker
    const workerProfile = await prisma.worker_profiles.findFirst({
      where: {
        OR: [
          { user_id: rated_user },
          { id: rated_user }
        ]
      }
    });

    if (workerProfile) {
      const allRatings = await prisma.ratings.findMany({
        where: { rated_user: workerProfile.user_id }
      });

      if (allRatings.length > 0) {
        const sum = allRatings.reduce((acc, r) => acc + r.rating, 0);
        const avg = (sum / allRatings.length).toFixed(2);

        await prisma.worker_profiles.update({
          where: { id: workerProfile.id },
          data: {
            average_rating: parseFloat(avg),
            completed_jobs: { increment: 1 }
          }
        });
      }
    }

    return res.status(201).json({
      message: 'Rating submitted successfully',
      success: true,
      rating: ratingRecord
    });
  } catch (error) {
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
      : "0.00";

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
