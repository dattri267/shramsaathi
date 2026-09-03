const prisma = require('../config/db');
const {
  findNextWorker,
  createEmergencyAttempt
} = require('./emergency.service');

async function processEmergencyTimeouts() {
  try {
    const now = new Date();

    const expiredAttempts =
      await prisma.emergency_match_attempts.findMany({
        where: {
          expires_at: {
            lte: now
          },
          accepted_at: null,
          rejected_at: null,
          timed_out_at: null
        }
      });

    for (const attempt of expiredAttempts) {

      // Mark current attempt as timed out
      await prisma.emergency_match_attempts.update({
        where: { id: attempt.id },
        data: {
          timed_out_at: now
        }
      });

      const booking =
        await prisma.bookings.findUnique({
          where: { id: attempt.booking_id }
        });

      if (!booking) {
        continue;
      }

      // Don't escalate an already completed/cancelled booking
      if (
        booking.status === 'completed' ||
        booking.status === 'cancelled' ||
        booking.status === 'expired'
      ) {
        continue;
      }

      if (!booking.skill_id) {
        continue;
      }

      // Find another worker
      const nextWorker = await findNextWorker(
        booking.id,
        booking.skill_id
      );

      // No worker available
      if (!nextWorker) {

        await prisma.bookings.update({
          where: { id: booking.id },
          data: {
            status: 'expired',
            worker_id: null,
            emergency_accept_deadline: null
          }
        });

        console.log(
          `Emergency booking ${booking.id} expired - no workers available`
        );

        continue;
      }

      // Create next 30-second attempt
      const nextAttempt =
        await createEmergencyAttempt(
          booking.id,
          nextWorker.id
        );

      // Assign next worker and reset deadline
      await prisma.bookings.update({
        where: { id: booking.id },
        data: {
          worker_id: nextWorker.id,
          emergency_accept_deadline:
            nextAttempt.expires_at
        }
      });

      console.log(
        `Emergency booking ${booking.id} escalated to worker ${nextWorker.id}`
      );
    }

  } catch (err) {
    console.error(
      'Emergency timeout processor error:',
      err
    );
  }
}

module.exports = {
  processEmergencyTimeouts
};