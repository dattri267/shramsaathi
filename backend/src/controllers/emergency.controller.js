const prisma = require('../config/db');
const {
  findNextWorker,
  createEmergencyAttempt
} = require('../services/emergency.service');

async function createEmergencyMatch(req, res) {
  try {
    const { bookingId } = req.body;

    if (!bookingId) {
      return res.status(400).json({
        error: 'bookingId is required'
      });
    }

    const booking = await prisma.bookings.findUnique({
      where: { id: bookingId }
    });

    if (!booking) {
      return res.status(404).json({
        error: 'Booking not found'
      });
    }

    if (booking.customer_id !== req.user.customerProfileId) {
      return res.status(403).json({
        error: 'You do not own this booking'
      });
    }

    if (booking.booking_type !== 'emergency') {
      return res.status(400).json({
        error: 'This is not an emergency booking'
      });
    }

    if (!booking.skill_id) {
      return res.status(400).json({
        error: 'Emergency booking has no skill'
      });
    }

    const worker = await findNextWorker(
      booking.id,
      booking.skill_id
    );

    if (!worker) {
      await prisma.bookings.update({
        where: { id: booking.id },
        data: {
          status: 'expired'
        }
      });

      return res.status(404).json({
        error: 'No available worker found'
      });
    }

    const attempt = await createEmergencyAttempt(
      booking.id,
      worker.id
    );

    await prisma.bookings.update({
      where: { id: booking.id },
      data: {
        worker_id: worker.id,
        emergency_accept_deadline: attempt.expires_at
      }
    });

    res.status(201).json({
      message: 'Emergency worker matched',
      attempt
    });

  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: 'Failed to create emergency match'
    });
  }
}


async function acceptEmergencyMatch(req, res) {
  try {
    const { id } = req.params;

    const attempt =
      await prisma.emergency_match_attempts.findUnique({
        where: { id }
      });

    if (!attempt) {
      return res.status(404).json({
        error: 'Match attempt not found'
      });
    }

    if (attempt.worker_id !== req.user.workerProfileId) {
      return res.status(403).json({
        error: 'This match is not assigned to you'
      });
    }

    if (
      attempt.accepted_at ||
      attempt.rejected_at ||
      attempt.timed_out_at
    ) {
      return res.status(400).json({
        error: 'This match attempt is already closed'
      });
    }

    if (new Date() > attempt.expires_at) {
      return res.status(400).json({
        error: 'This match attempt has expired'
      });
    }

    const now = new Date();

    const result = await prisma.$transaction([
      prisma.emergency_match_attempts.update({
        where: { id },
        data: {
          accepted_at: now
        }
      }),

      prisma.bookings.update({
        where: { id: attempt.booking_id },
        data: {
          worker_id: attempt.worker_id,
          status: 'accepted',
          emergency_accept_deadline: null
        }
      }),

      prisma.worker_profiles.update({
        where: { id: attempt.worker_id },
        data: {
          availability: 'busy'
        }
      })
    ]);

    res.json({
      message: 'Emergency booking accepted',
      attempt: result[0],
      booking: result[1]
    });

  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: 'Failed to accept emergency booking'
    });
  }
}


async function rejectEmergencyMatch(req, res) {
  try {
    const { id } = req.params;

    const attempt =
      await prisma.emergency_match_attempts.findUnique({
        where: { id }
      });

    if (!attempt) {
      return res.status(404).json({
        error: 'Match attempt not found'
      });
    }

    if (attempt.worker_id !== req.user.workerProfileId) {
      return res.status(403).json({
        error: 'This match is not assigned to you'
      });
    }

    if (
      attempt.accepted_at ||
      attempt.rejected_at ||
      attempt.timed_out_at
    ) {
      return res.status(400).json({
        error: 'This match attempt is already closed'
      });
    }

    await prisma.emergency_match_attempts.update({
      where: { id },
      data: {
        rejected_at: new Date()
      }
    });

    const nextWorker = await findNextWorker(
      attempt.booking_id,
      (
        await prisma.bookings.findUnique({
          where: { id: attempt.booking_id },
          select: { skill_id: true }
        })
      ).skill_id
    );

    if (!nextWorker) {
      await prisma.bookings.update({
        where: { id: attempt.booking_id },
        data: {
          status: 'expired',
          worker_id: null,
          emergency_accept_deadline: null
        }
      });

      return res.json({
        message: 'Worker rejected. No other worker available.',
        bookingStatus: 'expired'
      });
    }

    const nextAttempt = await createEmergencyAttempt(
      attempt.booking_id,
      nextWorker.id
    );

    await prisma.bookings.update({
      where: { id: attempt.booking_id },
      data: {
        worker_id: nextWorker.id,
        emergency_accept_deadline: nextAttempt.expires_at
      }
    });

    res.json({
      message: 'Worker rejected. Escalated to next worker.',
      attempt: nextAttempt
    });

  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: 'Failed to reject emergency booking'
    });
  }
}


module.exports = {
  createEmergencyMatch,
  acceptEmergencyMatch,
  rejectEmergencyMatch
};