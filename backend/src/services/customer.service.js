const prisma = require('../config/db');

function createError(message, statusCode = 400) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}


/**
 * Get customer profile.
 *
 * Coordinates are extracted from PostGIS using ST_X/ST_Y.
 */
async function getCustomerProfile(userId) {
  const profile =
    await prisma.profiles.findUnique({
      where: {
        id: userId
      }
    });

  if (!profile) {
    throw createError(
      'Profile not found',
      404
    );
  }

  const customerProfile =
    await prisma.customer_profiles.findUnique({
      where: {
        user_id: userId
      }
    });

  if (!customerProfile) {
    throw createError(
      'Customer profile not found',
      404
    );
  }


  /*
   * PostGIS is an unsupported Prisma type,
   * therefore coordinates are extracted using raw SQL.
   */
  const locationRows =
    await prisma.$queryRaw`
      SELECT
        CASE
          WHEN default_location IS NULL
          THEN NULL
          ELSE ST_Y(default_location::geometry)
        END AS latitude,

        CASE
          WHEN default_location IS NULL
          THEN NULL
          ELSE ST_X(default_location::geometry)
        END AS longitude,

        COALESCE(address_details, '{}'::jsonb)
          AS address_details

      FROM customer_profiles

      WHERE user_id = ${userId}::uuid

      LIMIT 1
    `;


  const location =
    locationRows[0] || {};


  return {
    ...profile,

    customer_profile: {
      ...customerProfile,

      address:
        location.address_details || {},

      location: {
        latitude:
          location.latitude !== null &&
          location.latitude !== undefined
            ? Number(location.latitude)
            : null,

        longitude:
          location.longitude !== null &&
          location.longitude !== undefined
            ? Number(location.longitude)
            : null
      }
    }
  };
}


/**
 * Update customer profile.
 *
 * Supported body:
 *
 * {
 *   full_name,
 *   phone,
 *   avatar_url,
 *   preferred_language,
 *
 *   default_address,
 *
 *   address: {
 *     house,
 *     locality,
 *     city,
 *     state,
 *     pincode,
 *     landmark
 *   },
 *
 *   latitude,
 *   longitude
 * }
 */
async function updateCustomerProfile(
  userId,
  data
) {
  const {
    full_name,
    phone,
    avatar_url,
    preferred_language,
    default_address,

    address,

    latitude,
    longitude
  } = data;


  /*
   * Validate coordinates.
   *
   * Both must be provided together.
   */
  const hasLatitude =
    latitude !== undefined &&
    latitude !== null;

  const hasLongitude =
    longitude !== undefined &&
    longitude !== null;

  if (hasLatitude !== hasLongitude) {
    throw createError(
      'latitude and longitude must be provided together'
    );
  }


  if (hasLatitude) {
    const lat =
      Number(latitude);

    const lng =
      Number(longitude);

    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng)
    ) {
      throw createError(
        'latitude and longitude must be valid numbers'
      );
    }

    if (
      lat < -90 ||
      lat > 90
    ) {
      throw createError(
        'latitude must be between -90 and 90'
      );
    }

    if (
      lng < -180 ||
      lng > 180
    ) {
      throw createError(
        'longitude must be between -180 and 180'
      );
    }
  }


  /*
   * Update the common profile.
   */
  const profile =
    await prisma.profiles.update({
      where: {
        id: userId
      },

      data: {
        ...(full_name !== undefined
          ? {
              full_name:
                String(full_name).trim()
            }
          : {}),

        ...(phone !== undefined
          ? {
              phone:
                phone === null
                  ? null
                  : String(phone).trim()
            }
          : {}),

        ...(avatar_url !== undefined
          ? {
              avatar_url
            }
          : {}),

        ...(preferred_language !== undefined
          ? {
              preferred_language
            }
          : {})
      }
    });


  /*
   * Structured address.
   *
   * We store it as JSONB because the existing database has only
   * one default_address text field and the Expo form has multiple
   * address components.
   */
  let addressUpdate = null;

  if (
    address !== undefined
  ) {
    if (
      address !== null &&
      typeof address !== 'object'
    ) {
      throw createError(
        'address must be an object'
      );
    }

    addressUpdate =
      address || {};
  }


  /*
   * Build/update customer profile using raw SQL because:
   *
   * - default_location is PostGIS
   * - address_details is an additive JSONB column
   */
  if (
    addressUpdate !== null ||
    hasLatitude
  ) {
    if (
      addressUpdate !== null &&
      hasLatitude
    ) {
      await prisma.$executeRaw`
        UPDATE customer_profiles

        SET
          default_address =
            CASE
              WHEN ${default_address ?? null}::text IS NOT NULL
              THEN ${default_address ?? null}::text
              ELSE default_address
            END,

          address_details =
            ${JSON.stringify(addressUpdate)}::jsonb,

          default_location =
            ST_SetSRID(
              ST_MakePoint(
                ${Number(longitude)},
                ${Number(latitude)}
              ),
              4326
            )::geography,

          updated_at = NOW()

        WHERE user_id =
          ${userId}::uuid
      `;
    } else if (
      addressUpdate !== null
    ) {
      await prisma.$executeRaw`
        UPDATE customer_profiles

        SET
          default_address =
            CASE
              WHEN ${default_address ?? null}::text IS NOT NULL
              THEN ${default_address ?? null}::text
              ELSE default_address
            END,

          address_details =
            ${JSON.stringify(addressUpdate)}::jsonb,

          updated_at = NOW()

        WHERE user_id =
          ${userId}::uuid
      `;
    } else {
      await prisma.$executeRaw`
        UPDATE customer_profiles

        SET
          default_address =
            ${default_address ?? null}::text,

          default_location =
            ST_SetSRID(
              ST_MakePoint(
                ${Number(longitude)},
                ${Number(latitude)}
              ),
              4326
            )::geography,

          updated_at = NOW()

        WHERE user_id =
          ${userId}::uuid
      `;
    }
  } else if (
    default_address !== undefined
  ) {
    await prisma.$executeRaw`
      UPDATE customer_profiles

      SET
        default_address =
          ${default_address}::text,

        updated_at = NOW()

      WHERE user_id =
        ${userId}::uuid
    `;
  }


  return getCustomerProfile(
    userId
  );
}


module.exports = {
  getCustomerProfile,
  updateCustomerProfile
};