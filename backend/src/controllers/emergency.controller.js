const prisma = require('../config/db');

async function createMatchAttempt(req, res, next) {
  try {
    const { booking_id, worker_id, attempt_number, expires_at } = req.body;

    if (!booking_id || !worker_id || !attempt_number || !expires_at) {
      return res.status(400).json({
        error: 'booking_id, worker_id, attempt_number and expires_at are required'
      });
    }

    const attempt = await prisma.emergency_match_attempts.create({
      data: {
        booking_id,
        worker_id,
        attempt_number,
        offered_at: new Date(),
        expires_at
      }
    });

    res.status(201).json({
      message: 'Emergency match attempt created',
      attempt
    });
  } catch (err) {
    next(err);
  }
}

async function acceptEmergency(req, res, next) {
  try {
    const attempt = await prisma.emergency_match_attempts.findUnique({
      where: {
        id: req.params.id
      }
    });

    if (!attempt) {
      return res.status(404).json({ error: 'Match attempt not found' });
    }

    if (attempt.worker_id !== req.user.workerProfileId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (new Date() > attempt.expires_at) {
      return res.status(400).json({ error: 'Offer has expired' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const updatedAttempt =
        await tx.emergency_match_attempts.update({
          where: { id: attempt.id },
          data: {
            accepted_at: new Date()
          }
        });

      const booking = await tx.bookings.update({
        where: { id: attempt.booking_id },
        data: {
          worker_id: attempt.worker_id,
          status: 'accepted'
        }
      });

      return { updatedAttempt, booking };
    });

    res.json({
      message: 'Emergency booking accepted',
      ...result
    });
  } catch (err) {
    next(err);
  }
}

async function rejectEmergency(req, res, next) {
  try {
    const attempt = await prisma.emergency_match_attempts.findUnique({
      where: {
        id: req.params.id
      }
    });

    if (!attempt) {
      return res.status(404).json({
        error: 'Match attempt not found'
      });
    }

    if (attempt.worker_id !== req.user.workerProfileId) {
      return res.status(403).json({
        error: 'Access denied'
      });
    }

    const updated = await prisma.emergency_match_attempts.update({
      where: {
        id: attempt.id
      },
      data: {
        rejected_at: new Date()
      }
    });

    res.json({
      message: 'Emergency offer rejected',
      attempt: updated
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createMatchAttempt,
  acceptEmergency,
  rejectEmergency
};