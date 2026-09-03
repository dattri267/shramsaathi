const prisma = require('../config/db');

/**
 * GET /skills
 * Fetch all available skills / services catalog
 */
async function getSkills(req, res, next) {
  try {
    let skills = await prisma.skills.findMany({
      orderBy: { name: 'asc' }
    });

    // If database skills table is empty, seed common default skills
    if (skills.length === 0) {
      const defaultSkills = [
        'Electrician',
        'Plumber',
        'Carpenter',
        'Painter',
        'Cleaner',
        'AC Repair',
        'Appliance Repair',
        'Mason',
        'Mechanic',
        'Wiring',
        'Fan Installation',
        'Switch & Socket Repair',
        'Pipe Repair',
        'Furniture Assembly',
        'Wall Painting',
        'Tile Work',
        'Appliance Installation'
      ];

      for (const name of defaultSkills) {
        await prisma.skills.upsert({
          where: { name },
          update: {},
          create: { name }
        }).catch(() => {});
      }

      skills = await prisma.skills.findMany({
        orderBy: { name: 'asc' }
      });
    }

    return res.status(200).json({
      success: true,
      skills
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /worker/profile
 * Requires requireAuth
 */
async function getWorkerProfile(req, res, next) {
  try {
    const userId = req.user.id;

    const profile = await prisma.profiles.findUnique({
      where: { id: userId },
      include: {
        worker_profiles: {
          include: {
            worker_skills: {
              include: {
                skills: true
              }
            },
            worker_documents: true
          }
        }
      }
    });

    if (!profile) {
      return res.status(404).json({ error: 'Worker profile not found' });
    }

    return res.status(200).json({
      success: true,
      profile
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT or PATCH /worker/profile
 * Updates personal details, professional service, experience, skills, service radius, location, and availability
 */
async function updateWorkerProfile(req, res, next) {
  try {
    const userId = req.user.id;
    const {
      full_name,
      phone,
      mobile,
      avatar_url,
      profile_photo,
      bio,
      years_of_experience,
      experience_years,
      primary_service,
      additional_skills = [],
      skills = [],
      hourly_rate,
      service_radius_km,
      service_radius,
      availability = 'online',
      house_flat_building,
      street_locality,
      city,
      state,
      pin_code,
      landmark,
      latitude,
      longitude
    } = req.body;

    const userPhone = phone || mobile;
    const photoUrl = avatar_url || profile_photo;
    const yearsExp = parseFloat(years_of_experience || experience_years || 0);
    const radius = parseFloat(service_radius_km || service_radius || 10);

    // 1. Update basic info in profiles table
    const profileUpdateData = {};
    if (full_name !== undefined) profileUpdateData.full_name = full_name;
    if (userPhone !== undefined) profileUpdateData.phone = userPhone;
    if (photoUrl !== undefined) profileUpdateData.avatar_url = photoUrl;

    if (Object.keys(profileUpdateData).length > 0) {
      await prisma.profiles.update({
        where: { id: userId },
        data: profileUpdateData
      });
    }

    // 2. Find or create worker_profiles record
    let workerProfile = await prisma.worker_profiles.findUnique({
      where: { user_id: userId }
    });

    const workerUpdateData = {
      ...(bio !== undefined ? { bio } : {}),
      ...(radius ? { service_radius_km: radius } : {}),
      ...(hourly_rate !== undefined ? { hourly_rate: parseFloat(hourly_rate) } : {}),
      ...(availability ? { availability } : {}),
      updated_at: new Date()
    };

    if (workerProfile) {
      workerProfile = await prisma.worker_profiles.update({
        where: { user_id: userId },
        data: workerUpdateData
      });
    } else {
      workerProfile = await prisma.worker_profiles.create({
        data: {
          user_id: userId,
          bio: bio || null,
          service_radius_km: radius,
          hourly_rate: hourly_rate ? parseFloat(hourly_rate) : null,
          availability
        }
      });
    }

    // 3. Process primary & additional skills
    const allSkillNames = [];
    if (primary_service) allSkillNames.push({ name: primary_service, is_primary: true });

    const extraSkillsList = Array.isArray(additional_skills) && additional_skills.length > 0 
      ? additional_skills 
      : (Array.isArray(skills) ? skills : []);

    extraSkillsList.forEach(sName => {
      if (typeof sName === 'string' && sName.trim() && sName !== primary_service) {
        allSkillNames.push({ name: sName.trim(), is_primary: false });
      }
    });

    if (allSkillNames.length > 0) {
      // Clear existing worker skills before linking new ones
      await prisma.worker_skills.deleteMany({
        where: { worker_id: workerProfile.id }
      });

      for (const skillObj of allSkillNames) {
        // Ensure skill exists in catalog
        let skillRecord = await prisma.skills.findUnique({
          where: { name: skillObj.name }
        });

        if (!skillRecord) {
          skillRecord = await prisma.skills.create({
            data: { name: skillObj.name }
          });
        }

        // Link skill to worker
        await prisma.worker_skills.create({
          data: {
            worker_id: workerProfile.id,
            skill_id: skillRecord.id,
            years_experience: yearsExp || null,
            is_primary: skillObj.is_primary
          }
        }).catch(() => {});
      }
    }

    // 4. Update PostGIS location if latitude & longitude provided
    if (latitude && longitude) {
      try {
        await prisma.$executeRawUnsafe(
          `UPDATE public.worker_profiles 
           SET current_location = ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography 
           WHERE id = $3::uuid`,
          parseFloat(longitude),
          parseFloat(latitude),
          workerProfile.id
        );
      } catch (geoErr) {
        console.warn('Could not update worker geography location:', geoErr.message);
      }
    }

    // 5. Fetch updated profile with complete associations
    const updatedProfile = await prisma.profiles.findUnique({
      where: { id: userId },
      include: {
        worker_profiles: {
          include: {
            worker_skills: {
              include: {
                skills: true
              }
            },
            worker_documents: true
          }
        }
      }
    });

    return res.status(200).json({
      message: 'Worker profile updated successfully',
      success: true,
      profile: updatedProfile
    });

  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /worker/availability
 * Quick toggle for worker status (online, offline, busy)
 */
async function toggleAvailability(req, res, next) {
  try {
    const userId = req.user.id;
    const { availability } = req.body;

    if (!['online', 'offline', 'busy'].includes(availability)) {
      return res.status(400).json({ error: 'Invalid availability status' });
    }

    const workerProfile = await prisma.worker_profiles.update({
      where: { user_id: userId },
      data: { availability }
    });

    return res.status(200).json({
      message: `Availability updated to ${availability}`,
      success: true,
      availability: workerProfile.availability
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /worker/documents/upload
 * Upload verification document (Aadhaar, PAN, Skill Certificate, etc.)
 */
async function uploadDocument(req, res, next) {
  try {
    const userId = req.user.id;
    const { title, file_type = 'certificate', storage_path, public_url, document_url } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Document title is required' });
    }

    const workerProfile = await prisma.worker_profiles.findUnique({
      where: { user_id: userId }
    });

    if (!workerProfile) {
      return res.status(404).json({ error: 'Worker profile not found. Please complete profile first.' });
    }

    const docUrl = public_url || document_url || storage_path || '';
    const path = storage_path || docUrl;

    const document = await prisma.worker_documents.create({
      data: {
        worker_id: workerProfile.id,
        title,
        file_type: ['certificate', 'work_evidence', 'invoice'].includes(file_type) ? file_type : 'certificate',
        storage_path: path,
        public_url: docUrl
      }
    });

    // Update worker verification status to pending_verification if not yet verified
    if (workerProfile.verification_status !== 'verified') {
      await prisma.worker_profiles.update({
        where: { id: workerProfile.id },
        data: { verification_status: 'pending_verification' }
      });
    }

    return res.status(201).json({
      message: 'Document uploaded successfully',
      success: true,
      document
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /worker/documents
 * List all documents uploaded by the worker
 */
async function getDocuments(req, res, next) {
  try {
    const userId = req.user.id;

    const workerProfile = await prisma.worker_profiles.findUnique({
      where: { user_id: userId }
    });

    if (!workerProfile) {
      return res.status(404).json({ error: 'Worker profile not found' });
    }

    const documents = await prisma.worker_documents.findMany({
      where: { worker_id: workerProfile.id },
      orderBy: { created_at: 'desc' }
    });

    return res.status(200).json({
      success: true,
      verification_status: workerProfile.verification_status,
      documents
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /worker/documents/:id
 * Remove a document uploaded by the worker
 */
async function deleteDocument(req, res, next) {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const workerProfile = await prisma.worker_profiles.findUnique({
      where: { user_id: userId }
    });

    if (!workerProfile) {
      return res.status(404).json({ error: 'Worker profile not found' });
    }

    const doc = await prisma.worker_documents.findFirst({
      where: { id, worker_id: workerProfile.id }
    });

    if (!doc) {
      return res.status(404).json({ error: 'Document not found or unauthorized' });
    }

    await prisma.worker_documents.delete({
      where: { id }
    });

    return res.status(200).json({
      message: 'Document deleted successfully',
      success: true
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /admin/verifications
 * List pending or filtered worker verification applications
 */
async function getPendingVerifications(req, res, next) {
  try {
    const { status = 'pending_verification' } = req.query;

    const workers = await prisma.worker_profiles.findMany({
      where: status ? { verification_status: status } : {},
      include: {
        profiles: true,
        worker_documents: true,
        worker_skills: {
          include: { skills: true }
        }
      },
      orderBy: { updated_at: 'desc' }
    });

    return res.status(200).json({
      success: true,
      count: workers.length,
      workers
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /admin/verify-worker/:id
 * Admin endpoint to verify, reject, or suspend a worker
 */
async function verifyWorker(req, res, next) {
  try {
    const { id } = req.params;
    const { status = 'verified' } = req.body;
    const adminId = req.user.id;

    if (!['verified', 'rejected', 'suspended', 'pending_verification'].includes(status)) {
      return res.status(400).json({ error: 'Invalid verification status' });
    }

    let workerProfile = await prisma.worker_profiles.findFirst({
      where: {
        OR: [
          { id },
          { user_id: id }
        ]
      }
    });

    if (!workerProfile) {
      return res.status(404).json({ error: 'Worker profile not found' });
    }

    const updatedWorker = await prisma.worker_profiles.update({
      where: { id: workerProfile.id },
      data: { verification_status: status }
    });

    if (status === 'verified') {
      await prisma.worker_documents.updateMany({
        where: { worker_id: workerProfile.id },
        data: {
          verified_at: new Date(),
          verified_by: adminId
        }
      });
    }

    return res.status(200).json({
      message: `Worker verification status updated to ${status}`,
      success: true,
      worker: updatedWorker
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getSkills,
  getWorkerProfile,
  updateWorkerProfile,
  toggleAvailability,
  uploadDocument,
  getDocuments,
  deleteDocument,
  getPendingVerifications,
  verifyWorker
};
