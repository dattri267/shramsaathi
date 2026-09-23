const prisma = require('../config/db');
const cloudinary = require('../config/cloudinary');
function createError(
  message,
  statusCode = 400
) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}


/**
 * Convert Prisma Decimal values to normal numbers
 * when returning API responses.
 */
function numberOrNull(value) {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  return Number(value);
}


/**
 * Resolve a skill using:
 *
 * UUID
 * OR slug
 * OR name
 */
async function resolveSkill(skillValue) {
  if (!skillValue) {
    return null;
  }

  const value = String(skillValue).trim();

  if (!value) {
    return null;
  }

  /*
   * Try slug or name first.
   *
   * This is the normal path for frontend values such as:
   * "ac-technician"
   * "electrician"
   * "plumber"
   */
  const slugOrNameResult = await prisma.$queryRaw`
    SELECT
      id,
      name,
      slug
    FROM skills
    WHERE LOWER(slug) = LOWER(${value})
       OR LOWER(name) = LOWER(${value})
    LIMIT 1
  `;

  if (slugOrNameResult.length > 0) {
    return slugOrNameResult[0];
  }

  /*
   * Only attempt UUID lookup if the value actually
   * looks like a UUID.
   *
   * This prevents PostgreSQL from trying to cast
   * values such as "ac-technician" to UUID.
   */
  const uuidRegex =
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;

  if (uuidRegex.test(value)) {
    const uuidResult = await prisma.$queryRaw`
      SELECT
        id,
        name,
        slug
      FROM skills
      WHERE id = ${value}::uuid
      LIMIT 1
    `;

    if (uuidResult.length > 0) {
      return uuidResult[0];
    }
  }

  return null;
}


/**
 * Get complete worker profile.
 */
async function getWorkerProfile(userId) {
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


  const workerProfile =
    await prisma.worker_profiles.findUnique({
      where: {
        user_id: userId
      },

      include: {
        worker_skills: {
          include: {
            skills: true
          }
        },

        worker_documents: true
      }
    });


  if (!workerProfile) {
    throw createError(
      'Worker profile not found',
      404
    );
  }


  /*
   * Fetch additive fields that Prisma's generated client
   * doesn't know about yet.
   */
  const extraRows =
    await prisma.$queryRaw`
      SELECT
        service_address,
        working_days,
        working_hours,

        CASE
          WHEN current_location IS NULL
          THEN NULL
          ELSE ST_Y(
            current_location::geometry
          )
        END AS latitude,

        CASE
          WHEN current_location IS NULL
          THEN NULL
          ELSE ST_X(
            current_location::geometry
          )
        END AS longitude

      FROM worker_profiles

      WHERE user_id =
        ${userId}::uuid

      LIMIT 1
    `;


  const extra =
    extraRows[0] || {};

  const workerSubskillRows = await prisma.$queryRaw`
    SELECT
      ws.subskill_id AS id,
      ws.is_primary,
      ws.years_experience,
      s.skill_id,
      s.name,
      s.description
    FROM worker_subskills ws
    INNER JOIN subskills s
      ON s.id = ws.subskill_id
    WHERE ws.worker_id = ${workerProfile.id}::uuid
    ORDER BY ws.is_primary DESC, s.name ASC
  `;


  return {
    ...profile,

    worker_profile: {
      ...workerProfile,

      service_radius_km:
        numberOrNull(
          workerProfile.service_radius_km
        ),

      hourly_rate:
        numberOrNull(
          workerProfile.hourly_rate
        ),

      average_rating:
        numberOrNull(
          workerProfile.average_rating
        ),

      service_address:
        extra.service_address || {},

      working_days:
        extra.working_days || [],

      working_hours:
        extra.working_hours || [],

      location: {
        latitude:
          extra.latitude !== null &&
          extra.latitude !== undefined
            ? Number(extra.latitude)
            : null,

        longitude:
          extra.longitude !== null &&
          extra.longitude !== undefined
            ? Number(extra.longitude)
            : null
      },

      skills:
        workerProfile.worker_skills.map(
          (item) => ({
            id: item.skills.id,
            name: item.skills.name,
            slug: item.skills.slug,
            years_experience:
              numberOrNull(
                item.years_experience
              ),
            is_primary:
              item.is_primary
          })
        ),

      subskills:
        workerSubskillRows.map(
          (item) => ({
            id: item.id,
            skill_id: item.skill_id,
            name: item.name,
            description: item.description || null,
            years_experience:
              numberOrNull(item.years_experience),
            is_primary: Boolean(item.is_primary)
          })
        )
    }
  };
}


/**
 * Update worker profile.
 *
 * Supports:
 *
 * full_name
 * phone
 * avatar_url
 * bio
 * service_radius_km
 * hourly_rate
 *
 * primary_skill
 * additional_skills
 * skills
 *
 * years_experience
 *
 * working_days
 * working_hours
 *
 * service_address
 * latitude
 * longitude
 */
async function updateWorkerProfile(
  userId,
  data
) {
  const {
    full_name,
    phone,
    avatar_url,
    preferred_language,

    bio,
    service_radius_km,
    hourly_rate,

    primary_skill,
    primary_skill_id,
    primary_subskill_id,
    additional_skills,
    skills,

    years_experience,

    working_days,
    working_hours,

    service_address,
    latitude,
    longitude,

    documents
  } = data;


  /*
   * ---------------------------------------------------------
   * Validate basic registration fields
   * ---------------------------------------------------------
   */
  if (full_name !== undefined && String(full_name).trim().length < 2) {
    throw createError('full_name must contain at least 2 characters');
  }

  if (phone !== undefined && phone !== null) {
    const normalizedPhone = String(phone).trim();
    if (!/^\d{10}$/.test(normalizedPhone)) {
      throw createError('phone must be a valid 10-digit mobile number');
    }
  }

  if (years_experience !== undefined) {
    const experienceNumber = Number(years_experience);
    if (
      !Number.isFinite(experienceNumber) ||
      experienceNumber < 0 ||
      experienceNumber > 60
    ) {
      throw createError('years_experience must be between 0 and 60');
    }
  }

  if (working_days !== undefined && !Array.isArray(working_days)) {
    throw createError('working_days must be an array');
  }

  if (working_hours !== undefined && !Array.isArray(working_hours)) {
    throw createError('working_hours must be an array');
  }

  /*
   * ---------------------------------------------------------
   * Validate coordinates
   * ---------------------------------------------------------
   */
  const hasLatitude =
    latitude !== undefined &&
    latitude !== null;

  const hasLongitude =
    longitude !== undefined &&
    longitude !== null;

  if (
    hasLatitude !==
    hasLongitude
  ) {
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
   * ---------------------------------------------------------
   * Validate radius/rate
   * ---------------------------------------------------------
   */
  if (
    service_radius_km !== undefined
  ) {
    const radius =
      Number(service_radius_km);

    if (
      !Number.isFinite(radius) ||
      radius <= 0
    ) {
      throw createError(
        'service_radius_km must be greater than 0'
      );
    }
  }


  if (
    hourly_rate !== undefined
  ) {
    const rate =
      Number(hourly_rate);

    if (
      !Number.isFinite(rate) ||
      rate < 0
    ) {
      throw createError(
        'hourly_rate cannot be negative'
      );
    }
  }


  /*
   * ---------------------------------------------------------
   * Update common profile
   * ---------------------------------------------------------
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
   * ---------------------------------------------------------
   * Update worker profile
   * ---------------------------------------------------------
   */
  await prisma.worker_profiles.update({
    where: {
      user_id: userId
    },

    data: {
      ...(bio !== undefined
        ? {
            bio
          }
        : {}),

      ...(service_radius_km !== undefined
        ? {
            service_radius_km:
              Number(
                service_radius_km
              )
          }
        : {}),

      ...(hourly_rate !== undefined
        ? {
            hourly_rate:
              Number(
                hourly_rate
              )
          }
        : {})
    }
  });


  /*
   * ---------------------------------------------------------
   * Update address/location/schedule
   * ---------------------------------------------------------
   */
  if (
    service_address !== undefined ||
    working_days !== undefined ||
    working_hours !== undefined ||
    hasLatitude
  ) {
    const addressJson =
      service_address !== undefined
        ? JSON.stringify(
            service_address || {}
          )
        : null;

    const days =
      working_days !== undefined
        ? Array.isArray(
            working_days
          )
          ? working_days
          : []
        : null;

    const hours =
      working_hours !== undefined
        ? Array.isArray(
            working_hours
          )
          ? working_hours
          : []
        : null;


    /*
     * Build a dynamic update using separate statements.
     * This avoids replacing fields that were not supplied.
     */
    if (
      service_address !== undefined
    ) {
      await prisma.$executeRaw`
        UPDATE worker_profiles

        SET
          service_address =
            ${addressJson}::jsonb,

          updated_at = NOW()

        WHERE user_id =
          ${userId}::uuid
      `;
    }


    if (
      working_days !== undefined
    ) {
      await prisma.$executeRaw`
        UPDATE worker_profiles

        SET
          working_days =
            ${days}::text[],

          updated_at = NOW()

        WHERE user_id =
          ${userId}::uuid
      `;
    }


    if (
      working_hours !== undefined
    ) {
      await prisma.$executeRaw`
        UPDATE worker_profiles

        SET
          working_hours =
            ${hours}::text[],

          updated_at = NOW()

        WHERE user_id =
          ${userId}::uuid
      `;
    }


    if (hasLatitude) {
      await prisma.$executeRaw`
        UPDATE worker_profiles

        SET
          current_location =
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
  }


  /*
   * ---------------------------------------------------------
   * Skills
   * ---------------------------------------------------------
   *
   * We support either:
   *
   * skills: [
   *   {
   *     skill: "electrician",
   *     years_experience: 5,
   *     is_primary: true
   *   }
   * ]
   *
   * OR:
   *
   * primary_skill: "electrician"
   * additional_skills: ["plumber"]
   */
  let normalizedSkills = null;


  if (Array.isArray(skills)) {
    normalizedSkills =
      skills;
  } else if (
    primary_skill ||
    Array.isArray(
      additional_skills
    )
  ) {
    normalizedSkills = [];

    if (primary_skill) {
      normalizedSkills.push({
        skill:
          primary_skill,

        years_experience:
          years_experience !== undefined
            ? Number(
                years_experience
              )
            : 0,

        is_primary: true
      });
    }

    for (
      const skill of
      additional_skills || []
    ) {
      normalizedSkills.push({
        skill,

        years_experience: 0,

        is_primary: false
      });
    }
  }


  if (
    normalizedSkills !== null
  ) {
    const workerProfile =
      await prisma.worker_profiles.findUnique({
        where: {
          user_id: userId
        }
      });


    if (!workerProfile) {
      throw createError(
        'Worker profile not found',
        404
      );
    }


    const resolvedSkills = [];


    for (
      const item of
      normalizedSkills
    ) {
      let skillValue = item;

      let experience = 0;
      let isPrimary = false;


      if (
        item &&
        typeof item === 'object'
      ) {
        skillValue =
          item.skill ||
          item.skill_id ||
          item.slug ||
          item.name;

        experience =
          item.years_experience !==
          undefined
            ? Number(
                item.years_experience
              )
            : 0;

        isPrimary =
          Boolean(
            item.is_primary
          );
      }


      if (!skillValue) {
        continue;
      }


      if (
        !Number.isFinite(
          experience
        ) ||
        experience < 0
      ) {
        throw createError(
          'years_experience must be a non-negative number'
        );
      }


      const skill =
        await resolveSkill(
          skillValue
        );


      if (!skill) {
        throw createError(
          `Skill not found: ${skillValue}`,
          404
        );
      }


      resolvedSkills.push({
        skillId: skill.id,

        yearsExperience:
          experience,

        isPrimary
      });
    }


    /*
     * Make sure exactly one primary skill exists
     * when skills were supplied.
     */
    if (
      resolvedSkills.length > 0 &&
      !resolvedSkills.some(
        (item) =>
          item.isPrimary
      )
    ) {
      resolvedSkills[0].isPrimary =
        true;
    }


    /*
     * Remove old mappings and replace them
     * with the submitted skill list.
     */
    await prisma.$transaction(
      async (tx) => {
        await tx.worker_skills.deleteMany({
          where: {
            worker_id:
              workerProfile.id
          }
        });


        if (
          resolvedSkills.length > 0
        ) {
          await tx.worker_skills.createMany({
            data:
              resolvedSkills.map(
                (item) => ({
                  worker_id:
                    workerProfile.id,

                  skill_id:
                    item.skillId,

                  years_experience:
                    item.yearsExperience,

                  is_primary:
                    item.isPrimary
                })
              )
          });
        }
      }
    );
  }


  /*
   * ---------------------------------------------------------
   * Primary subskill
   * ---------------------------------------------------------
   *
   * The selected subskill must belong to the selected primary
   * service. The database relationship is skills.id ->
   * subskills.skill_id, so IDs are used here instead of slugs.
   */
  if (primary_subskill_id !== undefined && primary_subskill_id !== null) {
    const workerProfile = await prisma.worker_profiles.findUnique({
      where: { user_id: userId }
    });

    if (!workerProfile) {
      throw createError('Worker profile not found', 404);
    }

    if (!primary_skill_id) {
      throw createError('primary_skill_id is required when primary_subskill_id is provided');
    }

    const skillRows = await prisma.$queryRaw`
      SELECT id
      FROM skills
      WHERE id = ${String(primary_skill_id)}::uuid
      LIMIT 1
    `;

    if (skillRows.length === 0) {
      throw createError('Primary skill not found', 404);
    }

    const subskillRows = await prisma.$queryRaw`
      SELECT id, skill_id
      FROM subskills
      WHERE id = ${String(primary_subskill_id)}::uuid
        AND skill_id = ${String(primary_skill_id)}::uuid
      LIMIT 1
    `;

    if (subskillRows.length === 0) {
      throw createError(
        'Selected subskill does not belong to the selected primary service'
      );
    }

    const experience =
      years_experience !== undefined
        ? Number(years_experience)
        : 0;

    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        DELETE FROM worker_subskills
        WHERE worker_id = ${workerProfile.id}::uuid
      `;

      await tx.$executeRaw`
        INSERT INTO worker_subskills (
          worker_id,
          subskill_id,
          years_experience,
          is_primary
        )
        VALUES (
          ${workerProfile.id}::uuid,
          ${String(primary_subskill_id)}::uuid,
          ${experience},
          true
        )
      `;
    });
  }


  /*
   * ---------------------------------------------------------
   * Documents
   * ---------------------------------------------------------
   *
   * Documents are normally uploaded through the existing
   * document/upload system.
   *
   * If the caller already has storage_path/public_url,
   * we can create the metadata records here.
   */
  if (
    Array.isArray(documents)
  ) {
    const workerProfile =
      await prisma.worker_profiles.findUnique({
        where: {
          user_id: userId
        }
      });


    for (
      const document of
      documents
    ) {
      if (
        !document ||
        !document.storage_path
      ) {
        continue;
      }


      const allowedTypes = [
        'certificate',
        'work_evidence',
        'invoice',
        'identity_proof',
        'address_proof'
      ];


      const fileType =
        allowedTypes.includes(
          document.file_type
        )
          ? document.file_type
          : 'work_evidence';


      await prisma.$executeRaw`
        INSERT INTO worker_documents (
          worker_id,
          file_type,
          title,
          storage_path,
          public_url
        )

        VALUES (
          ${workerProfile.id}::uuid,

          ${fileType}::storage_file_type,

          ${String(
            document.title ||
            fileType
          )},

          ${String(
            document.storage_path
          )},

          ${document.public_url || null}
        )
      `;
    }
  }


  return getWorkerProfile(
    userId
  );
}


/**
 * Update worker availability.
 */
async function updateAvailability(
  userId,
  availability
) {
  const validStatuses = [
    'offline',
    'online',
    'busy'
  ];

  if (
    !validStatuses.includes(
      availability
    )
  ) {
    throw createError(
      'Availability must be offline, online or busy'
    );
  }

  return prisma.worker_profiles.update({
    where: {
      user_id: userId
    },

    data: {
      availability
    }
  });
}


/**
 * Get jobs available to this worker.
 *
 * A worker gets:
 *
 * 1. Their already-assigned jobs
 *
 * OR
 *
 * 2. Requested normal bookings whose skill matches
 *    one of their worker_skills.
 */
async function getWorkerJobs(
  workerProfileId
) {
  const workerSkills =
    await prisma.worker_skills.findMany({
      where: {
        worker_id:
          workerProfileId
      },

      select: {
        skill_id: true
      }
    });


  const skillIds =
    workerSkills.map(
      (item) =>
        item.skill_id
    );


  return prisma.bookings.findMany({
    where: {
      OR: [
        {
          worker_id:
            workerProfileId
        },

        {
          status: 'requested',

          booking_type: 'normal',

          worker_id: null,

          ...(skillIds.length > 0
            ? {
                skill_id: {
                  in: skillIds
                }
              }
            : {
                skill_id: {
                  in: []
                }
              })
        }
      ]
    },

    include: {
      skills: true,

      customer_profiles: {
        include: {
          profiles: true
        }
      },

      payments: true
    },

    orderBy: {
      created_at: 'desc'
    }
  });
}
/**
 * Upload worker document.
 *
 * Supported document types:
 * - identity_proof
 * - address_proof
 * - work_evidence
 * - certificate
 * - invoice
 */
async function uploadWorkerDocument(
  userId,
  file,
  metadata = {}
) {
  if (!file) {
    throw createError(
      'Document file is required',
      400
    );
  }

  const allowedTypes = [
    'identity_proof',
    'address_proof',
    'work_evidence',
    'certificate',
    'invoice'
  ];

  const fileType = allowedTypes.includes(
    metadata.file_type
  )
    ? metadata.file_type
    : 'work_evidence';

  const workerProfile =
    await prisma.worker_profiles.findUnique({
      where: {
        user_id: userId
      },
      select: {
        id: true
      }
    });

  if (!workerProfile) {
    throw createError(
      'Worker profile not found',
      404
    );
  }

  const result = await new Promise(
    (resolve, reject) => {
      const uploadStream =
        cloudinary.uploader.upload_stream(
          {
            folder: 'shramsaathi/worker-documents',
            resource_type: 'auto'
          },
          (error, uploaded) => {
            if (error) {
              reject(error);
            } else {
              resolve(uploaded);
            }
          }
        );

      uploadStream.end(file.buffer);
    }
  );

  const document =
    await prisma.$executeRaw`
      INSERT INTO worker_documents (
        worker_id,
        file_type,
        title,
        storage_path,
        public_url
      )
      VALUES (
        ${workerProfile.id}::uuid,
        ${fileType}::storage_file_type,
        ${String(
          metadata.title || fileType
        )},
        ${String(result.public_id)},
        ${String(result.secure_url)}
      )
    `;

  return {
    file_type: fileType,
    title: String(
      metadata.title || fileType
    ),
    storage_path: result.public_id,
    public_url: result.secure_url
  };
}

module.exports = {
  getWorkerProfile,
  updateWorkerProfile,
  updateAvailability,
  getWorkerJobs,
  uploadWorkerDocument
};