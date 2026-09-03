const prisma = require('../config/db');
const { calculatePrice } = require('./pricing.service');

function error(message, statusCode = 400) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

// =========================
// CREATE BOOKING
// =========================

async function createBooking(customerId, data) {
  const {
    skill_id,
    service_address,
    customer_notes,
    booking_type,
    estimated_amount,
    latitude,
    longitude,
    scheduled_start_at,
    standardPrice,
    demandRatio,
    floorPrice,
    ceilingPrice
  } = data;

  if (!service_address) {
    throw error('service_address is required');
  }

  if (latitude === undefined || longitude === undefined) {
    throw error('latitude and longitude are required');
  }

  if (!skill_id) {
  throw error('skill_id is required');
  }

  if (!scheduled_start_at) {
  throw error('scheduled_start_at is required');
  }

  const scheduledDate = new Date(scheduled_start_at);

  if (Number.isNaN(scheduledDate.getTime())) {
  throw error('Invalid scheduled_start_at');
  }

  let finalEstimatedAmount = estimated_amount ?? null;

  // Apply floor-ceiling pricing
  if (
    standardPrice !== undefined &&
    floorPrice !== undefined &&
    ceilingPrice !== undefined
  ) {
    const pricing = calculatePrice({
      standardPrice: Number(standardPrice),
      demandRatio:
        demandRatio === undefined
          ? 1
          : Number(demandRatio),
      floorPrice: Number(floorPrice),
      ceilingPrice: Number(ceilingPrice)
    });

    finalEstimatedAmount = pricing.finalPrice;
  }

  const booking = await prisma.$queryRaw`
    INSERT INTO bookings (
      customer_id,
      skill_id,
      booking_type,
      status,
      service_address,
      service_location,
      scheduled_start_at,
      customer_notes,
      estimated_amount
    )
    VALUES (
      ${customerId}::uuid,
      ${skill_id || null}::uuid,
      ${booking_type === 'emergency' ? 'emergency' : 'normal'}::booking_type,
      'requested'::booking_status,
      ${service_address},
      ST_SetSRID(
        ST_MakePoint(${longitude}, ${latitude}),
        4326
      )::geography,
      ${scheduledDate},

      ${customer_notes || null},
      ${finalEstimatedAmount}
    )
    RETURNING
      id,
      customer_id,
      worker_id,
      skill_id,
      booking_type,
      status,
      service_address,
      scheduled_start_at,
      customer_notes,
      estimated_amount,
      final_amount,
      created_at,
      updated_at
  `;

  return booking[0];
}

// =========================
// GET CUSTOMER BOOKINGS
// =========================

async function getCustomerBookings(customerId) {
  return prisma.bookings.findMany({
    where: {
      customer_id: customerId
    },
    include: {
      skills: true,
      worker_profiles: true
    },
    orderBy: {
      created_at: 'desc'
    }
  });
}

// =========================
// GET SINGLE BOOKING
// =========================

async function getBooking(id, user) {
  const booking = await prisma.bookings.findUnique({
    where: { id }
  });

  if (!booking) {
    throw error('Booking not found', 404);
  }

  if (
    user.role === 'customer' &&
    booking.customer_id !== user.customerProfileId
  ) {
    throw error('Access denied', 403);
  }

  if (
    user.role === 'worker' &&
    booking.worker_id !== user.workerProfileId
  ) {
    throw error('Access denied', 403);
  }

  return booking;
}

// =========================
// CANCEL BOOKING
// =========================

async function cancelBooking(id, user) {
  const booking = await getBooking(id, user);

  if (
    !['requested', 'worker_assigned', 'accepted'].includes(
      booking.status
    )
  ) {
    throw error(
      'Booking cannot be cancelled in its current state'
    );
  }

  return prisma.bookings.update({
    where: { id },
    data: {
      status: 'cancelled'
    }
  });
}

// =========================
// GET WORKER BOOKINGS
// =========================

async function getWorkerBookings() {
  return prisma.bookings.findMany({
    where: {
      status: 'requested',
      booking_type: 'normal'
    },
    include: {
      skills: true
    },
    orderBy: {
      created_at: 'asc'
    }
  });
}

// =========================
// ACCEPT BOOKING
// =========================

async function acceptBooking(id, workerId) {
  const booking = await prisma.bookings.findUnique({
    where: { id }
  });

  if (!booking) {
    throw error('Booking not found', 404);
  }

  if (booking.status !== 'requested') {
    throw error('Booking is no longer available');
  }

  return prisma.bookings.update({
    where: { id },
    data: {
      worker_id: workerId,
      status: 'accepted'
    }
  });
}

// =========================
// START BOOKING
// =========================

async function startBooking(id, workerId) {
  const booking = await prisma.bookings.findUnique({
    where: { id }
  });

  if (!booking) {
    throw error('Booking not found', 404);
  }

  if (booking.worker_id !== workerId) {
    throw error(
      'You are not assigned to this booking',
      403
    );
  }

  if (booking.status !== 'accepted') {
    throw error(
      'Booking must be accepted before starting'
    );
  }

  return prisma.bookings.update({
    where: { id },
    data: {
      status: 'in_progress',
      started_at: new Date()
    }
  });
}

// =========================
// COMPLETE BOOKING
// =========================

async function completeBooking(id, workerId) {
  const booking = await prisma.bookings.findUnique({
    where: { id }
  });

  if (!booking) {
    throw error('Booking not found', 404);
  }

  if (booking.worker_id !== workerId) {
    throw error(
      'You are not assigned to this booking',
      403
    );
  }

  if (booking.status !== 'in_progress') {
    throw error('Booking is not in progress');
  }

  return prisma.bookings.update({
    where: { id },
    data: {
      status: 'completed',
      completed_at: new Date(),

      // For MVP, final price = estimated price
      final_amount: booking.estimated_amount
    }
  });
}

// =========================
// EXPORT ALL FUNCTIONS
// =========================

module.exports = {
  createBooking,
  getCustomerBookings,
  getBooking,
  cancelBooking,
  getWorkerBookings,
  acceptBooking,
  startBooking,
  completeBooking
};