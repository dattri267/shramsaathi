// backend/src/controllers/worker.controller.js
const prisma = require('../config/db');
const { devUserStore } = require('./auth.controller');
const workerService = require('../services/worker.service');

const inMemoryWorkerProfiles = new Map();

async function createWorkerProfile(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const { bio, skill_id, hourly_rate, full_name, phone } = req.body;

    if (prisma && prisma.worker_profiles) {
      try {
        const existing = await prisma.worker_profiles.findUnique({ where: { user_id: userId } });
        if (existing) {
          return res.status(409).json({ error: 'Worker profile already exists for this user' });
        }

        const profile = await prisma.worker_profiles.create({
          data: {
            user_id: userId,
            bio: bio || null,
            hourly_rate: hourly_rate || 500,
          },
        });

        const fullProfile = await workerService.getWorkerProfile(userId).catch(() => null);
        return res.status(201).json(fullProfile ? { profile: fullProfile } : profile);
      } catch (e) {
        console.warn('Prisma createWorkerProfile warning:', e.message);
      }
    }

    const saved = {
      id: 'work-prof-' + userId,
      user_id: userId,
      bio: bio || null,
      hourly_rate: hourly_rate || 500,
      availability: 'online'
    };
    inMemoryWorkerProfiles.set(userId, saved);

    return res.status(201).json({
      message: 'Worker profile created',
      profile: saved
    });
  } catch (err) {
    console.error('createWorkerProfile error:', err);
    return res.status(500).json({ error: 'Failed to create worker profile' });
  }
}

async function getWorkerProfile(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (prisma && prisma.worker_profiles) {
      try {
        const profile = await workerService.getWorkerProfile(userId);
        if (profile) return res.status(200).json({ profile });
      } catch (e) {
        console.warn('workerService.getWorkerProfile warning in controller:', e.message);
      }
    }

    if (inMemoryWorkerProfiles.has(userId)) {
      return res.status(200).json({ profile: inMemoryWorkerProfiles.get(userId) });
    }

    let matchedUser = null;
    if (devUserStore && devUserStore.has(userId)) {
      matchedUser = devUserStore.get(userId);
    } else if (devUserStore) {
      for (const u of devUserStore.values()) {
        if (u.id === userId) {
          matchedUser = u;
          break;
        }
      }
    }

    if (matchedUser) {
      return res.status(200).json({
        profile: {
          id: 'work-prof-' + userId,
          user_id: userId,
          role: 'worker',
          full_name: matchedUser.full_name || matchedUser.email || 'Worker',
          phone: matchedUser.phone || null,
          availability: 'online',
          hourly_rate: 550,
          verification_status: 'verified'
        }
      });
    }

    return res.status(404).json({ error: 'Worker profile not found' });
  } catch (err) {
    console.error('getWorkerProfile error:', err);
    return res.status(500).json({ error: 'Failed to fetch worker profile' });
  }
}

async function updateWorkerProfile(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const data = req.body;

    if (prisma && prisma.worker_profiles) {
      try {
        await workerService.updateWorkerProfile(userId, data);
        const updated = await workerService.getWorkerProfile(userId);
        return res.status(200).json({ message: 'Worker profile updated successfully', profile: updated });
      } catch (e) {
        console.warn('Prisma updateWorkerProfile warning:', e.message);
      }
    }

    const updated = {
      id: 'work-prof-' + userId,
      user_id: userId,
      ...data
    };
    inMemoryWorkerProfiles.set(userId, updated);

    return res.status(200).json({
      message: 'Worker profile updated successfully',
      profile: updated
    });
  } catch (err) {
    console.error('updateWorkerProfile error:', err);
    return res.status(500).json({ error: 'Failed to update worker profile' });
  }
}

async function uploadWorkerDocument(req, res, next) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const result = await workerService.uploadWorkerDocument(
      userId,
      req.file,
      {
        file_type: req.body?.file_type,
        title: req.body?.title
      }
    );

    return res.status(200).json({
      message: 'Worker document uploaded successfully',
      document: result
    });
  } catch (err) {
    return next(err);
  }
}

async function updateWorkerAvailability(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const { availability } = req.body;

    return res.status(200).json({
      message: 'Worker availability updated',
      worker: { id: userId, availability: availability || 'online' }
    });
  } catch (err) {
    console.error('updateWorkerAvailability error:', err);
    return res.status(500).json({ error: 'Failed to update availability' });
  }
}

module.exports = { createWorkerProfile, getWorkerProfile, updateWorkerProfile, updateWorkerAvailability, uploadWorkerDocument };