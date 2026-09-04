const prisma = require('../config/db');
const {
  calculatePrice
} = require('./pricing.service');


function error(
  message,
  statusCode = 400
) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}


/**
 * Convert a booking into the API response we want
 * the Expo app to consume.
 */
async function formatBooking(
  bookingId
) {
  const rows =
    await prisma.$queryRaw`
      SELECT
        b.id,

        b.customer_id,
        b.worker_id,
        b.skill_id,

        b.booking_type,
        b.status,

        b.service_address,

        b.scheduled_start_at,
        b.started_at,
        b.completed_at,

        b.customer_notes,

        b.estimated_amount,
        b.final_amount,

        b.emergency_accept_deadline,

        b.created_at,
        b.updated_at,

        CASE
          WHEN b.service_location IS NULL
          THEN NULL
          ELSE ST_Y(
            b.service_location::geometry
          )
        END AS latitude,

        CASE
          WHEN b.service_location IS NULL
          THEN NULL
          ELSE ST_X(
            b.service_location::geometry
          )
        END AS longitude,

        s.id AS skill_db_id,
        s.name AS skill_name,
        s.slug AS skill_slug,

        cp.user_id AS customer_user_id,
        p.full_name AS customer_name,
        p.phone AS customer_phone,
        p.avatar_url AS customer_avatar,

        pay.id AS payment_id,
        pay.amount AS payment_amount,
        pay.currency AS payment_currency,
        pay.status AS payment_status

      FROM bookings b

      LEFT JOIN skills s
        ON s.id = b.skill_id

      LEFT JOIN customer_profiles cp
        ON cp.id = b.customer_id

      LEFT JOIN profiles p
        ON p.id = cp.user_id

      LEFT JOIN payments pay
        ON pay.booking_id = b.id

      WHERE b.id =
        ${bookingId}::uuid

      LIMIT 1
    `;


  if (rows.length === 0) {
    return null;
  }


  const row = rows[0];


  return {
    id: row.id,

    service: row.skill_db_id
      ? {
          id:
            row.skill_db_id,

          name:
            row.skill_name,

          slug:
            row.skill_slug
        }
      : null,

    customer: row.customer_user_id
      ? {
          id:
            row.customer_user_id,

          name:
            row.customer_name,

          phone:
            row.customer_phone,

          avatar_url:
            row.customer_avatar
        }
      : null,

    worker_id:
      row.worker_id,

    service_address:
      row.service_address,

    location: {
      latitude:
        row.latitude !== null
          ? Number(row.latitude)
          : null,

      longitude:
        row.longitude !== null
          ? Number(row.longitude)
          : null
    },

    scheduled_start_at:
      row.scheduled_start_at,

    started_at:
      row.started_at,

    completed_at:
      row.completed_at,

    customer_notes:
      row.customer_notes,

    price: {
      estimated_amount:
        row.estimated_amount !== null
          ? Number(
              row.estimated_amount
            )
          : null,

      final_amount:
        row.final_amount !== null
          ? Number(
              row.final_amount
            )
          : null,

      currency: 'INR'
    },

    status:
      row.status,

    booking_type:
      row.booking_type,

    payment: row.payment_id
      ? {
          id:
            row.payment_id,

          amount:
            Number(
              row.payment_amount
            ),

          currency:
            row.payment_currency,

          status:
            row.payment_status
        }
      : {
          id: null,

          amount:
            row.estimated_amount !== null
              ? Number(
                  row.estimated_amount
                )
              : null,

          currency:
            'INR',

          status:
            'pending'
        },

    emergency_accept_deadline:
      row.emergency_accept_deadline,

    created_at:
      row.created_at,

    updated_at:
      row.updated_at
  };
}


/**
 * Resolve skill UUID from:
 *
 * UUID
 * slug
 * name
 */
async function resolveSkillId(value) {
  if (!value) {
    return null;
  }

  const input = String(value).trim();

  // UUID lookup
  const uuidRegex =
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;

  if (uuidRegex.test(input)) {
    const uuidRows = await prisma.$queryRaw`
      SELECT id
      FROM skills
      WHERE id = ${input}::uuid
      LIMIT 1
    `;

    if (uuidRows[0]?.id) {
      return uuidRows[0].id;
    }
  }

  // Slug or name lookup
  const rows = await prisma.$queryRaw`
    SELECT id
    FROM skills
    WHERE
      LOWER(slug) = LOWER(${input})
      OR LOWER(name) = LOWER(${input})
    LIMIT 1
  `;

  return rows[0]?.id || null;
}


/**
 * CREATE BOOKING
 */
async function createBooking(
  customerId,
  data
) {
  const {
    skill_id,
    skill_slug,
    service,
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
    throw error(
      'service_address is required'
    );
  }


  if (
    latitude === undefined ||
    longitude === undefined
  ) {
    throw error(
      'latitude and longitude are required'
    );
  }


  const lat =
    Number(latitude);

  const lng =
    Number(longitude);


  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng)
  ) {
    throw error(
      'latitude and longitude must be valid numbers'
    );
  }


  if (
    lat < -90 ||
    lat > 90
  ) {
    throw error(
      'latitude must be between -90 and 90'
    );
  }


  if (
    lng < -180 ||
    lng > 180
  ) {
    throw error(
      'longitude must be between -180 and 180'
    );
  }


  /*
   * Accept:
   *
   * skill_id
   * skill_slug
   * service
   */
  const skillInput =
    skill_id ||
    skill_slug ||
    service;


  if (!skillInput) {
    throw error(
      'skill_id or skill_slug is required'
    );
  }


  const resolvedSkillId =
    await resolveSkillId(
      skillInput
    );


  if (!resolvedSkillId) {
    throw error(
      `Skill not found: ${skillInput}`,
      404
    );
  }


  if (!scheduled_start_at) {
    throw error(
      'scheduled_start_at is required'
    );
  }


  const scheduledDate =
    new Date(
      scheduled_start_at
    );


  if (
    Number.isNaN(
      scheduledDate.getTime()
    )
  ) {
    throw error(
      'Invalid scheduled_start_at'
    );
  }


  let finalEstimatedAmount =
    estimated_amount ??
    null;


  /*
   * Existing floor/ceiling pricing system.
   */
  if (
    standardPrice !== undefined &&
    floorPrice !== undefined &&
    ceilingPrice !== undefined
  ) {
    const pricing =
      calculatePrice({
        standardPrice:
          Number(
            standardPrice
          ),

        demandRatio:
          demandRatio === undefined
            ? 1
            : Number(
                demandRatio
              ),

        floorPrice:
          Number(
            floorPrice
          ),

        ceilingPrice:
          Number(
            ceilingPrice
          )
      });


    finalEstimatedAmount =
      pricing.finalPrice;
  }


  const booking =
    await prisma.$queryRaw`
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

        ${resolvedSkillId}::uuid,

        ${
          booking_type === 'emergency'
            ? 'emergency'
            : 'normal'
        }::booking_type,

        'requested'::booking_status,

        ${service_address},

        ST_SetSRID(
          ST_MakePoint(
            ${lng},
            ${lat}
          ),
          4326
        )::geography,

        ${scheduledDate},

        ${
          customer_notes ||
          null
        },

        ${finalEstimatedAmount}
      )

      RETURNING id
    `;


  if (
    !booking[0]
  ) {
    throw error(
      'Booking could not be created',
      500
    );
  }


  return formatBooking(
    booking[0].id
  );
}


/**
 * GET CUSTOMER BOOKINGS
 */
async function getCustomerBookings(
  customerId
) {
  const bookings =
    await prisma.bookings.findMany({
      where: {
        customer_id:
          customerId
      },

      orderBy: {
        created_at:
          'desc'
      }
    });


  const result = [];

  for (
    const booking of bookings
  ) {
    const formatted =
      await formatBooking(
        booking.id
      );

    if (formatted) {
      result.push(
        formatted
      );
    }
  }


  return result;
}


/**
 * GET SINGLE BOOKING
 */
async function getBooking(
  id,
  user
) {
  const booking =
    await prisma.bookings.findUnique({
      where: {
        id
      }
    });


  if (!booking) {
    throw error(
      'Booking not found',
      404
    );
  }


  if (
    user.role === 'customer' &&
    booking.customer_id !==
      user.customerProfileId
  ) {
    throw error(
      'Access denied',
      403
    );
  }


  if (
    user.role === 'worker' &&
    booking.worker_id !==
      user.workerProfileId
  ) {
    throw error(
      'Access denied',
      403
    );
  }


  return formatBooking(
    id
  );
}


/**
 * CANCEL BOOKING
 */
async function cancelBooking(
  id,
  user
) {
  const booking =
    await prisma.bookings.findUnique({
      where: {
        id
      }
    });


  if (!booking) {
    throw error(
      'Booking not found',
      404
    );
  }


  if (
    user.role === 'customer' &&
    booking.customer_id !==
      user.customerProfileId
  ) {
    throw error(
      'Access denied',
      403
    );
  }


  if (
    user.role === 'worker' &&
    booking.worker_id !==
      user.workerProfileId
  ) {
    throw error(
      'Access denied',
      403
    );
  }


  if (
    ![
      'requested',
      'worker_assigned',
      'accepted'
    ].includes(
      booking.status
    )
  ) {
    throw error(
      'Booking cannot be cancelled in its current state'
    );
  }


  await prisma.bookings.update({
    where: {
      id
    },

    data: {
      status:
        'cancelled'
    }
  });


  return formatBooking(
    id
  );
}


/**
 * GET WORKER BOOKINGS
 *
 * Worker sees:
 * - their assigned jobs
 * - requested jobs matching their skills
 * - but not requests this worker has previously rejected
 */
async function getWorkerBookings(
  workerId
) {
  const bookings =
    await prisma.$queryRaw`
      SELECT b.id
      FROM bookings b
      WHERE
        b.worker_id = ${workerId}::uuid
        OR (
          b.status = 'requested'::booking_status
          AND b.worker_id IS NULL
          AND b.booking_type = 'normal'::booking_type
          AND EXISTS (
            SELECT 1
            FROM worker_skills ws
            WHERE ws.worker_id = ${workerId}::uuid
              AND ws.skill_id = b.skill_id
          )
          AND NOT EXISTS (
            SELECT 1
            FROM worker_booking_rejections r
            WHERE r.worker_id = ${workerId}::uuid
              AND r.booking_id = b.id
          )
        )
      ORDER BY b.created_at ASC
    `;

  const result = [];

  for (const booking of bookings) {
    const formatted = await formatBooking(booking.id);
    if (formatted) {
      result.push(formatted);
    }
  }

  return result;
}


/**
 * REJECT BOOKING
 *
 * Rejection is worker-specific. The customer booking remains requested
 * and can still be accepted by another qualified worker.
 */
async function rejectBooking(
  id,
  workerId
) {
  const booking = await prisma.bookings.findUnique({
    where: { id }
  });

  if (!booking) {
    throw error('Booking not found', 404);
  }

  if (booking.status !== 'requested' || booking.worker_id !== null) {
    throw error('Booking is no longer available');
  }

  const qualified = await prisma.$queryRaw`
    SELECT 1
    FROM worker_skills
    WHERE worker_id = ${workerId}::uuid
      AND skill_id = ${booking.skill_id}::uuid
    LIMIT 1
  `;

  if (qualified.length === 0) {
    throw error('You are not qualified for this service', 403);
  }

  await prisma.$executeRaw`
    INSERT INTO worker_booking_rejections (booking_id, worker_id)
    VALUES (${id}::uuid, ${workerId}::uuid)
    ON CONFLICT (booking_id, worker_id) DO NOTHING
  `;

  return true;
}


/**
 * ATOMIC BOOKING ACCEPTANCE
 *
 * This is the important race-condition fix.
 *
 * Two workers can request acceptance simultaneously,
 * but only one UPDATE can change the requested/unassigned
 * booking.
 */
async function acceptBooking(
  id,
  workerId
) {
  /*
   * Verify worker has this booking's skill.
   */
  const workerSkill =
    await prisma.$queryRaw`
      SELECT
        b.id

      FROM bookings b

      INNER JOIN worker_skills ws
        ON ws.skill_id =
           b.skill_id

      WHERE
        b.id =
          ${id}::uuid

        AND ws.worker_id =
          ${workerId}::uuid

      LIMIT 1
    `;


  if (
    workerSkill.length === 0
  ) {
    throw error(
      'You are not qualified for this service',
      403
    );
  }


  /*
   * Atomic update.
   */
  const updated =
    await prisma.$executeRaw`
      UPDATE bookings

      SET
        worker_id =
          ${workerId}::uuid,

        status =
          'accepted'::booking_status,

        updated_at =
          NOW()

      WHERE
        id =
          ${id}::uuid

        AND status =
          'requested'::booking_status

        AND worker_id IS NULL
    `;


  /*
   * Zero rows means another worker already accepted it,
   * or it was changed/cancelled.
   */
  if (
    updated !== 1
  ) {
    throw error(
      'Booking is no longer available',
      409
    );
  }


  return formatBooking(
    id
  );
}


/**
 * START BOOKING
 */
async function startBooking(
  id,
  workerId
) {
  const booking =
    await prisma.bookings.findUnique({
      where: {
        id
      }
    });


  if (!booking) {
    throw error(
      'Booking not found',
      404
    );
  }


  if (
    booking.worker_id !==
    workerId
  ) {
    throw error(
      'You are not assigned to this booking',
      403
    );
  }


  if (
    booking.status !==
    'accepted'
  ) {
    throw error(
      'Booking must be accepted before starting'
    );
  }


  await prisma.bookings.update({
    where: {
      id
    },

    data: {
      status:
        'in_progress',

      started_at:
        new Date()
    }
  });


  return formatBooking(
    id
  );
}


/**
 * COMPLETE BOOKING
 */
async function completeBooking(
  id,
  workerId
) {
  const booking =
    await prisma.bookings.findUnique({
      where: {
        id
      }
    });


  if (!booking) {
    throw error(
      'Booking not found',
      404
    );
  }


  if (
    booking.worker_id !==
    workerId
  ) {
    throw error(
      'You are not assigned to this booking',
      403
    );
  }


  if (
    booking.status !==
    'in_progress'
  ) {
    throw error(
      'Booking is not in progress'
    );
  }


  await prisma.bookings.update({
    where: {
      id
    },

    data: {
      status:
        'completed',

      completed_at:
        new Date(),

      /*
       * MVP:
       * final price = estimated price.
       */
      final_amount:
        booking.estimated_amount
    }
  });


  return formatBooking(
    id
  );
}


module.exports = {
  createBooking,

  getCustomerBookings,

  getBooking,

  cancelBooking,

  getWorkerBookings,

  rejectBooking,

  acceptBooking,

  startBooking,

  completeBooking
};