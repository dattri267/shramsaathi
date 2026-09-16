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


/*
 * MVP service pricing.
 * Each booking slot in the mobile app is 2 hours, so these are
 * the customer-facing estimated prices for one selected slot.
 * Keep these values in one place until a dedicated service-pricing
 * table is introduced.
 */
const SERVICE_PRICING = {
    electrician: { standardPrice: 800, floorPrice: 600, ceilingPrice: 1200 },
    plumber: { standardPrice: 650, floorPrice: 500, ceilingPrice: 1000 },
    carpenter: { standardPrice: 900, floorPrice: 700, ceilingPrice: 1400 },
    painter: { standardPrice: 1000, floorPrice: 800, ceilingPrice: 1600 },
    'domestic-helper': { standardPrice: 600, floorPrice: 500, ceilingPrice: 900 },
    caregiver: { standardPrice: 800, floorPrice: 650, ceilingPrice: 1200 },
    technician: { standardPrice: 850, floorPrice: 650, ceilingPrice: 1300 }
};

function getServicePricing(slug) {
    if (!slug) return null;
    return SERVICE_PRICING[String(slug).trim().toLowerCase()] || null;
}

const MODEL_CATEGORIES = {
    electrician: 'Electrician',
    plumber: 'Plumber',
    carpenter: 'Carpenter',
    painter: 'Painter',
    'domestic-helper': 'Domestic Helper',
    caregiver: 'Caregiver',
    technician: 'Technician'
};

const MODEL_CITIES = ['Bengaluru', 'Mumbai', 'Delhi', 'Hyderabad'];

function normalizeModelCity(value) {
    const input = String(value || '').trim().toLowerCase();
    return MODEL_CITIES.find(city => city.toLowerCase() === input) || 'Bengaluru';
}

async function getEmergencyModelPrice(skillSlug, serviceAddress) {
    const slug = String(skillSlug || '').trim().toLowerCase();
    const category = MODEL_CATEGORIES[slug];

    if (!category) {
        throw error(`AI pricing does not support service: ${skillSlug}`, 502);
    }

    const currentPrice = SERVICE_PRICING[slug]?.standardPrice;
    if (currentPrice === undefined) {
        throw error(`No baseline price configured for service: ${skillSlug}`, 502);
    }

    const addressText =
        typeof serviceAddress === 'string'
            ? serviceAddress
            : JSON.stringify(serviceAddress || {});

    const cityMatch = MODEL_CITIES.find(city =>
        addressText.toLowerCase().includes(city.toLowerCase())
    );

    const city = normalizeModelCity(cityMatch || 'Bengaluru');

    const aiBaseUrl =
        process.env.AI_ENGINE_BASE_URL || 'http://127.0.0.1:8001';

    const response = await fetch(`${aiBaseUrl}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            city,
            category,
            date: new Date().toISOString().slice(0, 10),
            currentPrice,
            weather: 'Clear',
            events: 'Normal day'
        })
    });

    let data = null;
    try {
        data = await response.json();
    } catch {
        data = null;
    }

    if (!response.ok || !data) {
        throw error(
            data?.detail ||
            data?.error ||
            `AI pricing engine returned ${response.status}`,
            502
        );
    }

    const suggestedPrice = Number(data.suggestedPrice);

    if (!Number.isFinite(suggestedPrice) || suggestedPrice <= 0) {
        throw error('AI pricing engine returned an invalid price', 502);
    }

    return suggestedPrice;
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

        wp.user_id AS worker_user_id,
        wp_profile.full_name AS worker_name,
        wp_profile.phone AS worker_phone,
        wp_profile.avatar_url AS worker_avatar,
        wp.average_rating AS worker_rating,
        wp.completed_jobs AS worker_completed_jobs,
        wp.hourly_rate AS worker_hourly_rate,

        customer_rating.rating AS customer_rating,

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

      LEFT JOIN worker_profiles wp
        ON wp.id = b.worker_id

      LEFT JOIN profiles wp_profile
        ON wp_profile.id = wp.user_id

      LEFT JOIN ratings customer_rating
        ON customer_rating.booking_id = b.id
       AND customer_rating.rated_by = cp.user_id
       AND customer_rating.rated_user = wp.user_id

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

        worker: row.worker_user_id
            ? {
                id: row.worker_id,
                user_id: row.worker_user_id,
                name: row.worker_name || 'Assigned professional',
                phone: row.worker_phone,
                avatar_url: row.worker_avatar,
                rating: row.worker_rating !== null
                    ? Number(row.worker_rating)
                    : null,
                completed_jobs: row.worker_completed_jobs !== null
                    ? Number(row.worker_completed_jobs)
                    : 0,
                hourly_rate: row.worker_hourly_rate !== null
                    ? Number(row.worker_hourly_rate)
                    : null
            }
            : null,

        customer_rating: row.customer_rating !== null && row.customer_rating !== undefined
            ? Number(row.customer_rating)
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

            currency: 'INR',

            worker_share_percent:
                Number(
                    process.env.WORKER_SHARE_PERCENT || 80
                ),

            welfare_share_percent:
                Number(
                    process.env.WELFARE_SHARE_PERCENT || 10
                ),

            platform_share_percent:
                Number(
                    process.env.PLATFORM_SHARE_PERCENT || 10
                ),

            worker_amount: (() => {
                const amount =
                    row.final_amount !== null
                        ? Number(row.final_amount)
                        : row.estimated_amount !== null
                            ? Number(row.estimated_amount)
                            : null;

                return amount === null
                    ? null
                    : Number(
                        (
                            amount *
                            Number(
                                process.env.WORKER_SHARE_PERCENT || 80
                            ) /
                            100
                        ).toFixed(2)
                    );
            })(),

            welfare_amount: (() => {
                const amount =
                    row.final_amount !== null
                        ? Number(row.final_amount)
                        : row.estimated_amount !== null
                            ? Number(row.estimated_amount)
                            : null;

                return amount === null
                    ? null
                    : Number(
                        (
                            amount *
                            Number(
                                process.env.WELFARE_SHARE_PERCENT || 10
                            ) /
                            100
                        ).toFixed(2)
                    );
            })(),

            platform_amount: (() => {
                const amount =
                    row.final_amount !== null
                        ? Number(row.final_amount)
                        : row.estimated_amount !== null
                            ? Number(row.estimated_amount)
                            : null;

                return amount === null
                    ? null
                    : Number(
                        (
                            amount *
                            Number(
                                process.env.PLATFORM_SHARE_PERCENT || 10
                            ) /
                            100
                        ).toFixed(2)
                    );
            })()
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

    // Check UUID format in JavaScript first.
    // This prevents PostgreSQL from ever trying
    // to cast values like "painter" to UUID.
    const uuidRegex =
        /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;

    // UUID lookup
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

    let resolvedSkillSlug = skill_slug || service || null;

    if (!resolvedSkillSlug && resolvedSkillId) {
        const skillRows = await prisma.$queryRaw`
          SELECT slug
          FROM skills
          WHERE id = ${resolvedSkillId}::uuid
          LIMIT 1
        `;

        resolvedSkillSlug = skillRows[0]?.slug || null;
    }

    /*
     * Emergency bookings use the live admin AI pricing model.
     * The server is authoritative so the client cannot submit a
     * stale/static emergency price.
     */
    if (booking_type === 'emergency') {
        finalEstimatedAmount = await getEmergencyModelPrice(
            resolvedSkillSlug,
            service_address
        );
    }


    /*
     * Existing floor/ceiling pricing system.
     * If the mobile client does not provide pricing inputs, use the
     * server-side MVP service price so the amount is never silently
     * stored as NULL.
     */
    if (
        standardPrice !== undefined &&
        floorPrice !== undefined &&
        ceilingPrice !== undefined
    ) {
        const pricing =
            calculatePrice({
                standardPrice: Number(standardPrice),
                demandRatio:
                    demandRatio === undefined
                        ? 1
                        : Number(demandRatio),
                floorPrice:
                    Number(floorPrice),
                ceilingPrice:
                    Number(ceilingPrice)
            });

        finalEstimatedAmount =
            pricing.finalPrice;

    } else if (
        finalEstimatedAmount === null
    ) {

        let pricingKey =
            skill_slug ||
            service;

if (!pricingKey && resolvedSkillId) {
  const skillRows =
    await prisma.$queryRaw`
      SELECT slug
      FROM skills
      WHERE id =
        ${resolvedSkillId}::uuid
      LIMIT 1
    `;

  pricingKey =
    skillRows[0]?.slug ||
    null;
}

        const defaults =
            getServicePricing(
                pricingKey
            );

        if (defaults) {
            const pricing =
                calculatePrice({
                    standardPrice:
                        defaults.standardPrice,

                    demandRatio:
                        1,

                    floorPrice:
                        defaults.floorPrice,

                    ceilingPrice:
                        defaults.ceilingPrice
                });

            finalEstimatedAmount =
                pricing.finalPrice;
        }
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

        ${booking_type === 'emergency'
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

        ${customer_notes ||
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
/**
 * GET WORKER BOOKINGS
 *
 * Returns two categories of bookings for the logged-in worker:
 *
 * 1. Assigned bookings
 *    - worker_id belongs to this worker
 *    - includes accepted, in_progress, completed, etc.
 *
 * 2. Available requests
 *    - status is requested
 *    - worker_id is NULL
 *    - worker has the required skill
 *    - worker has not previously rejected the booking
 *
 * IMPORTANT:
 * An accepted booking must remain visible to the worker.
 * Once accepted, it moves from the "new requests" section
 * to the "active jobs" section on the frontend.
 */
async function getWorkerBookings(workerId) {
    if (!workerId) {
        throw error(
            'Worker profile ID is required',
            400
        );
    }

    /*
     * First get every booking that is either:
     *
     * - already assigned to this worker
     * OR
     * - still available and matches one of the worker's skills.
     *
     * Keeping these conditions explicit makes the lifecycle easier
     * to reason about and prevents an accepted booking from
     * accidentally disappearing from the worker's feed.
     */
    const bookings = await prisma.$queryRaw`
        SELECT
            b.id
        FROM bookings b
        WHERE
            (
                b.worker_id = ${workerId}::uuid
            )

            OR

            (
                b.status = 'requested'::booking_status
                AND b.worker_id IS NULL

                AND EXISTS (
                    SELECT 1
                    FROM worker_skills ws
                    WHERE
                        ws.worker_id = ${workerId}::uuid
                        AND ws.skill_id = b.skill_id
                )

                AND NOT EXISTS (
                    SELECT 1
                    FROM worker_booking_rejections r
                    WHERE
                        r.worker_id = ${workerId}::uuid
                        AND r.booking_id = b.id
                )
            )

        ORDER BY
            /*
             * Active/assigned jobs first.
             */
            CASE
                WHEN b.worker_id = ${workerId}::uuid
                    THEN 0
                WHEN b.booking_type = 'emergency'::booking_type
                    THEN 1
                ELSE 2
            END,

            /*
             * Within each group, newest activity first.
             */
            b.updated_at DESC,
            b.created_at DESC
    `;

    const result = [];

    for (const booking of bookings) {
        const formatted = await formatBooking(
            booking.id
        );

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
        booking.status !== 'requested' ||
        booking.worker_id !== null
    ) {
        throw error(
            'Booking is no longer available'
        );
    }

    const qualified =
        await prisma.$queryRaw`
      SELECT 1
      FROM worker_skills
      WHERE worker_id = ${workerId}::uuid
        AND skill_id = ${booking.skill_id}::uuid
      LIMIT 1
    `;

    if (qualified.length === 0) {
        throw error(
            'You are not qualified for this service',
            403
        );
    }

    await prisma.$executeRaw`
    INSERT INTO worker_booking_rejections (
      booking_id,
      worker_id
    )
    VALUES (
      ${id}::uuid,
      ${workerId}::uuid
    )
    ON CONFLICT (
      booking_id,
      worker_id
    )
    DO NOTHING
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
/**
 * ACCEPT BOOKING
 *
 * Only a qualified worker can accept a booking.
 *
 * The UPDATE is atomic:
 *
 * requested + unassigned
 *        ↓
 * assigned to this worker + accepted
 *
 * This prevents two workers from accepting the same request.
 */
async function acceptBooking(id, workerId) {
    if (!id) {
        throw error(
            'Booking ID is required',
            400
        );
    }

    if (!workerId) {
        throw error(
            'Worker profile ID is required',
            400
        );
    }

    /*
     * Check that the booking exists and determine
     * which skill it requires.
     */
    const booking = await prisma.bookings.findUnique({
        where: {
            id
        },
        select: {
            id: true,
            worker_id: true,
            skill_id: true,
            status: true
        }
    });

    if (!booking) {
        throw error(
            'Booking not found',
            404
        );
    }

    /*
     * A worker cannot accept an already assigned booking.
     */
    if (booking.worker_id !== null) {
        if (booking.worker_id === workerId) {
            /*
             * This makes the endpoint safely idempotent.
             *
             * If the mobile app accidentally sends the accept
             * request twice, don't turn that into an error.
             */
            return formatBooking(id);
        }

        throw error(
            'Booking is already assigned to another worker',
            409
        );
    }

    /*
     * Only requested bookings can be accepted.
     */
    if (booking.status !== 'requested') {
        throw error(
            'Booking is no longer available',
            409
        );
    }

    /*
     * A booking must have a service/skill.
     */
    if (!booking.skill_id) {
        throw error(
            'Booking does not have a service assigned',
            400
        );
    }

    /*
     * Verify that this worker has the required skill.
     */
    const qualified = await prisma.$queryRaw`
        SELECT 1
        FROM worker_skills ws
        WHERE
            ws.worker_id = ${workerId}::uuid
            AND ws.skill_id = ${booking.skill_id}::uuid
        LIMIT 1
    `;

    if (qualified.length === 0) {
        throw error(
            'You are not qualified for this service',
            403
        );
    }

    /*
     * ATOMIC ACCEPTANCE
     *
     * The database itself guarantees that only one worker
     * can transition this booking from requested/unassigned
     * to accepted/assigned.
     */
    const updated = await prisma.$executeRaw`
        UPDATE bookings
        SET
            worker_id = ${workerId}::uuid,
            status = 'accepted'::booking_status,
            updated_at = NOW()
        WHERE
            id = ${id}::uuid
            AND status = 'requested'::booking_status
            AND worker_id IS NULL
    `;

    /*
     * If no row was updated, another request won the race
     * or the booking changed state.
     */
    if (updated !== 1) {
        throw error(
            'Booking is no longer available',
            409
        );
    }

    /*
     * Read the booking back from the database.
     *
     * This is important because the mobile app should receive
     * the authoritative post-acceptance state.
     */
    const acceptedBooking = await formatBooking(id);

    if (!acceptedBooking) {
        throw error(
            'Booking was accepted but could not be loaded',
            500
        );
    }

    /*
     * Defensive verification.
     *
     * If the DB somehow returned an unexpected state, fail loudly
     * instead of telling the mobile app that acceptance succeeded.
     */
    if (
        acceptedBooking.worker_id !== workerId ||
        acceptedBooking.status !== 'accepted'
    ) {
        console.error(
            'BOOKING ACCEPTANCE STATE MISMATCH',
            {
                bookingId: id,
                expectedWorkerId: workerId,
                actualWorkerId: acceptedBooking.worker_id,
                actualStatus: acceptedBooking.status
            }
        );

        throw error(
            'Booking acceptance state could not be verified',
            500
        );
    }

    return acceptedBooking;
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
