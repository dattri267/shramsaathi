const prisma = require('../config/db');

async function getWorkerProfile(userId) {
  const profile = await prisma.profiles.findUnique({
    where: {
      id: userId
    }
  });

  if (!profile) {
    const err = new Error('Profile not found');
    err.statusCode = 404;
    throw err;
  }

  const workerProfile = await prisma.worker_profiles.findUnique({
    where: {
      user_id: userId
    },
    include: {
      worker_skills: {
        include: {
          skills: true
        }
      }
    }
  });

  if (!workerProfile) {
    const err = new Error('Worker profile not found');
    err.statusCode = 404;
    throw err;
  }

  return {
    ...profile,
    worker_profile: workerProfile
  };
}

async function updateWorkerProfile(userId, data) {
  const {
    full_name,
    phone,
    avatar_url,
    preferred_language,
    bio,
    service_radius_km,
    hourly_rate
  } = data;

  const profile = await prisma.profiles.update({
    where: {
      id: userId
    },
    data: {
      ...(full_name !== undefined && { full_name }),
      ...(phone !== undefined && { phone }),
      ...(avatar_url !== undefined && { avatar_url }),
      ...(preferred_language !== undefined && { preferred_language })
    }
  });

  const workerProfile = await prisma.worker_profiles.update({
    where: {
      user_id: userId
    },
    data: {
      ...(bio !== undefined && { bio }),
      ...(service_radius_km !== undefined && {
        service_radius_km: Number(service_radius_km)
      }),
      ...(hourly_rate !== undefined && {
        hourly_rate: Number(hourly_rate)
      })
    }
  });

  return {
    ...profile,
    worker_profile: workerProfile
  };
}

async function updateAvailability(userId, availability) {
  const validStatuses = ['offline', 'online', 'busy'];

  if (!validStatuses.includes(availability)) {
    const err = new Error(
      'Availability must be offline, online or busy'
    );
    err.statusCode = 400;
    throw err;
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

async function getWorkerJobs(workerProfileId) {
  return prisma.bookings.findMany({
    where: {
      worker_id: workerProfileId
    },
    include: {
      skills: true
    },
    orderBy: {
      created_at: 'desc'
    }
  });
}

module.exports = {
  getWorkerProfile,
  updateWorkerProfile,
  updateAvailability,
  getWorkerJobs
};