const prisma = require('../config/db');

function error(message, statusCode = 400) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

async function createBooking(customerId, data) {
  const {
    skill_id,
    service_address,
    customer_notes,
    booking_type,
    estimated_amount,
    latitude,
    longitude
  } = data;

  if (!service_address) {
    throw error('service_address is required');
  }

  if (latitude === undefined || longitude === undefined) {
    throw error('latitude and longitude are required');
  }

  const result = await prisma.$queryRaw`
    INSERT INTO bookings (
      customer_id,
      skill_id,
      booking_type,
      status,
      service_address,
      service_location,
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
      ${customer_notes || null},
      ${estimated_amount || null}
    )
    RETURNING *
  `;

  return result[0];
}

async function getCustomerBookings(customerId) {
  return prisma.bookings.findMany({
    where: {
      customer_id: customerId
    },
    orderBy: {
      created_at: 'desc'
    }
  });
}

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

async function cancelBooking(id, user) {
  const booking = await getBooking(id, user);

  if (
    !['requested', 'worker_assigned', 'accepted'].includes(booking.status)
  ) {
    throw error('Booking cannot be cancelled in its current state');
  }

  return prisma.bookings.update({
    where: { id },
    data: {
      status: 'cancelled'
    }
  });
}

async function getWorkerBookings() {
  return prisma.bookings.findMany({
    where: {
      status: 'requested',
      booking_type: 'normal'
    },
    orderBy: {
      created_at: 'asc'
    }
  });
}

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

async function startBooking(id, workerId) {
  const booking = await prisma.bookings.findUnique({
    where: { id }
  });

  if (!booking) {
    throw error('Booking not found', 404);
  }

  if (booking.worker_id !== workerId) {
    throw error('You are not assigned to this booking', 403);
  }

  if (booking.status !== 'accepted') {
    throw error('Booking must be accepted before starting');
  }

  return prisma.bookings.update({
    where: { id },
    data: {
      status: 'in_progress',
      started_at: new Date()
    }
  });
}

async function completeBooking(id, workerId) {
  const booking = await prisma.bookings.findUnique({
    where: { id }
  });

  if (!booking) {
    throw error('Booking not found', 404);
  }

  if (booking.worker_id !== workerId) {
    throw error('You are not assigned to this booking', 403);
  }

  if (booking.status !== 'in_progress') {
    throw error('Booking is not in progress');
  }

  return prisma.bookings.update({
    where: { id },
    data: {
      status: 'completed',
      completed_at: new Date()
    }
  });
}

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