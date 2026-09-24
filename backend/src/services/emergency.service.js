const prisma = require('../config/db');

const ATTEMPT_TIMEOUT_SECONDS = 30;


/*
 * Find the next available worker for an emergency booking.
 *
 * For now we use:
 * 1. verified worker
 * 2. online worker
 * 3. worker with required skill
 *
 * Later we will add the full equity-weighted score:
 * distance + rating + idle time + welfare contribution.
 */
async function findNextWorker(bookingId, skillId) {

  const booking = await prisma.bookings.findUnique({
    where: { id: bookingId },
    select: { subskill_id: true }
  });

  if (!booking || !booking.subskill_id) {
    return null;
  }

  // Get workers who already received an attempt
  const previousAttempts =
    await prisma.emergency_match_attempts.findMany({
      where: {
        booking_id: bookingId
      },
      select: {
        worker_id: true
      }
    });

  const excludedWorkerIds =
    previousAttempts.map(attempt => attempt.worker_id);


  const workers =
    await prisma.worker_profiles.findMany({
      where: {
        verification_status: 'verified',
        availability: 'online',

        ...(excludedWorkerIds.length > 0 && {
          id: {
            notIn: excludedWorkerIds
          }
        }),

        worker_skills: {
          some: {
            skill_id: skillId
          }
        },

        worker_subskills: {
          some: {
            subskill_id: booking.subskill_id
          }
        }
      },

      orderBy: [
        {
          average_rating: 'desc'
        },
        {
          completed_jobs: 'asc'
        }
      ]
    });

  return workers[0] || null;
}


/*
 * Create a 30-second emergency offer.
 */
async function createEmergencyAttempt(
  bookingId,
  workerId
) {

  const lastAttempt =
    await prisma.emergency_match_attempts.findFirst({
      where: {
        booking_id: bookingId
      },
      orderBy: {
        attempt_number: 'desc'
      }
    });

  const attemptNumber =
    lastAttempt
      ? lastAttempt.attempt_number + 1
      : 1;


  const now = new Date();

  const expiresAt =
    new Date(
      now.getTime() +
      ATTEMPT_TIMEOUT_SECONDS * 1000
    );


  return prisma.emergency_match_attempts.create({
    data: {
      booking_id: bookingId,
      worker_id: workerId,
      attempt_number: attemptNumber,
      offered_at: now,
      expires_at: expiresAt
    }
  });
}


module.exports = {
  findNextWorker,
  createEmergencyAttempt,
  ATTEMPT_TIMEOUT_SECONDS
};