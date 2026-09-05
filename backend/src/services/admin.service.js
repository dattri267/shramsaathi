const prisma = require('../config/db');

function createError(message, statusCode = 400) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

function numberOrNull(value) {
  if (value === null || value === undefined) return null;
  return Number(value);
}

const VALID_STATUSES = [
  'pending_verification',
  'verified',
  'suspended',
  'rejected'
];

/**
 * Shape a worker_profiles row (with its includes) into the
 * summary object the admin worker list needs.
 */
function formatWorkerSummary(worker) {
  const documents = worker.worker_documents || [];

  return {
    workerId: worker.id,
    userId: worker.user_id,
    fullName: worker.profiles?.full_name || null,
    phone: worker.profiles?.phone || null,
    avatarUrl: worker.profiles?.avatar_url || null,
    isActive: worker.profiles?.is_active ?? null,
    verificationStatus: worker.verification_status,
    availability: worker.availability,
    hourlyRate: numberOrNull(worker.hourly_rate),
    completedJobs: worker.completed_jobs,
    averageRating: numberOrNull(worker.average_rating),
    certificationTier: worker.certification_tier,
    skills: (worker.worker_skills || []).map((s) => s.skills.name),
    documentsTotal: documents.length,
    documentsVerified: documents.filter((d) => d.verified_at).length,
    documentsPending: documents.filter((d) => !d.verified_at).length,
    createdAt: worker.created_at
  };
}

/**
 * List every worker profile, optionally filtered by
 * verification status and/or a name/phone search term.
 */
async function listWorkers({ status, search } = {}) {
  if (status && !VALID_STATUSES.includes(status)) {
    throw createError(
      `status must be one of: ${VALID_STATUSES.join(', ')}`,
      400
    );
  }

  const workers = await prisma.worker_profiles.findMany({
    where: {
      ...(status ? { verification_status: status } : {}),
      ...(search
        ? {
            profiles: {
              OR: [
                { full_name: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search, mode: 'insensitive' } }
              ]
            }
          }
        : {})
    },
    include: {
      profiles: true,
      worker_documents: true,
      worker_skills: { include: { skills: true } }
    },
    orderBy: { created_at: 'desc' }
  });

  return workers.map(formatWorkerSummary);
}

/**
 * Full detail for one worker: profile, skills and every
 * uploaded document (with Cloudinary URL + verification state).
 */
async function getWorkerDetail(workerId) {
  const worker = await prisma.worker_profiles.findUnique({
    where: { id: workerId },
    include: {
      profiles: true,
      worker_documents: { orderBy: { created_at: 'desc' } },
      worker_skills: { include: { skills: true } }
    }
  });

  if (!worker) {
    throw createError('Worker not found', 404);
  }

  return {
    workerId: worker.id,
    userId: worker.user_id,
    fullName: worker.profiles?.full_name || null,
    phone: worker.profiles?.phone || null,
    avatarUrl: worker.profiles?.avatar_url || null,
    preferredLanguage: worker.profiles?.preferred_language || null,
    isActive: worker.profiles?.is_active ?? null,
    bio: worker.bio,
    certificationTier: worker.certification_tier,
    verificationStatus: worker.verification_status,
    availability: worker.availability,
    hourlyRate: numberOrNull(worker.hourly_rate),
    serviceRadiusKm: numberOrNull(worker.service_radius_km),
    completedJobs: worker.completed_jobs,
    averageRating: numberOrNull(worker.average_rating),
    workingDays: worker.working_days || [],
    workingHours: worker.working_hours || [],
    skills: (worker.worker_skills || []).map((s) => ({
      name: s.skills.name,
      slug: s.skills.slug,
      yearsExperience: numberOrNull(s.years_experience),
      isPrimary: s.is_primary
    })),
    documents: (worker.worker_documents || []).map((d) => ({
      id: d.id,
      fileType: d.file_type,
      title: d.title,
      url: d.public_url,
      verified: !!d.verified_at,
      verifiedAt: d.verified_at,
      createdAt: d.created_at
    })),
    createdAt: worker.created_at
  };
}

/**
 * Mark (or unmark) a single document as verified.
 * verified_by is left null until an admin login/profile exists.
 */
async function setDocumentVerification(documentId, verified) {
  const document = await prisma.worker_documents.findUnique({
    where: { id: documentId }
  });

  if (!document) {
    throw createError('Document not found', 404);
  }

  const updated = await prisma.worker_documents.update({
    where: { id: documentId },
    data: {
      verified_at: verified ? new Date() : null,
      verified_by: null
    }
  });

  return {
    id: updated.id,
    verified: !!updated.verified_at,
    verifiedAt: updated.verified_at
  };
}

/**
 * Set the overall verification_status on worker_profiles
 * (pending_verification / verified / suspended / rejected).
 */
async function setWorkerVerificationStatus(workerId, status) {
  if (!VALID_STATUSES.includes(status)) {
    throw createError(
      `status must be one of: ${VALID_STATUSES.join(', ')}`,
      400
    );
  }

  const worker = await prisma.worker_profiles.findUnique({
    where: { id: workerId }
  });

  if (!worker) {
    throw createError('Worker not found', 404);
  }

  const updated = await prisma.worker_profiles.update({
    where: { id: workerId },
    data: { verification_status: status }
  });

  return {
    workerId: updated.id,
    verificationStatus: updated.verification_status
  };
}

module.exports = {
  listWorkers,
  getWorkerDetail,
  setDocumentVerification,
  setWorkerVerificationStatus
};