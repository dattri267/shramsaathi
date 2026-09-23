// backend/src/controllers/customer.controller.js
const prisma = require('../config/db');
const { devUserStore } = require('./auth.controller');
const customerService = require('../services/customer.service');

const inMemoryCustomerProfiles = new Map();

async function createCustomerProfile(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const { full_name, address, phone } = req.body;

    if (prisma && prisma.customer_profiles) {
      try {
        const existing = await prisma.customer_profiles.findUnique({ where: { user_id: userId } });
        if (existing) {
          return res.status(409).json({ error: 'Customer profile already exists for this user' });
        }

        const profile = await prisma.customer_profiles.create({
          data: {
            user_id: userId,
            address_details: address || {},
            default_address: typeof address === 'string' ? address : (address?.formatted_address || '')
          },
        });

        return res.status(201).json(profile);
      } catch (e) {
        console.warn('Prisma createCustomerProfile warning:', e.message);
      }
    }

    let matchedUser = null;
    if (devUserStore && devUserStore.has(userId)) {
      matchedUser = devUserStore.get(userId);
    }

    const saved = {
      id: 'cust-prof-' + userId,
      user_id: userId,
      full_name: full_name || matchedUser?.full_name || null,
      phone: phone || matchedUser?.phone || null,
      address,
      address_details: address || {}
    };
    inMemoryCustomerProfiles.set(userId, saved);

    return res.status(201).json({
      message: 'Customer profile created',
      profile: saved
    });
  } catch (err) {
    console.error('createCustomerProfile error:', err);
    return res.status(500).json({ error: 'Failed to create customer profile' });
  }
}

async function getCustomerProfile(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (prisma && prisma.customer_profiles) {
      try {
        const profile = await prisma.customer_profiles.findUnique({ where: { user_id: userId } });
        if (profile) return res.status(200).json({ profile });
      } catch (e) {}
    }

    if (inMemoryCustomerProfiles.has(userId)) {
      return res.status(200).json({ profile: inMemoryCustomerProfiles.get(userId) });
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
      const derivedProfile = {
        id: 'cust-prof-' + userId,
        user_id: userId,
        role: matchedUser.role || 'customer',
        full_name: matchedUser.full_name || matchedUser.email || 'Customer',
        phone: matchedUser.phone || null,
        address_details: {}
      };
      return res.status(200).json({ profile: derivedProfile });
    }

    if (req.user) {
      const derivedProfile = {
        id: 'cust-prof-' + userId,
        user_id: userId,
        role: req.user.role || 'customer',
        full_name: req.user.full_name || req.user.user_metadata?.full_name || req.user.email || 'Customer',
        phone: req.user.phone || req.user.user_metadata?.phone || null,
        address_details: {}
      };
      return res.status(200).json({ profile: derivedProfile });
    }

    return res.status(404).json({ error: 'Customer profile not found' });
  } catch (err) {
    console.error('getCustomerProfile error:', err);
    return res.status(500).json({ error: 'Failed to fetch customer profile' });
  }
}

async function updateCustomerProfile(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Use the customer service as the single source of truth for profile
    // updates. It updates both the shared `profiles` row (name, phone,
    // avatar, language) and the customer-specific address/location data.
    // The previous controller updated only `customer_profiles`, which meant
    // full_name/phone changes were lost after logout/login because login
    // reads the `profiles` table.
    const updatedProfile = await customerService.updateCustomerProfile(
      userId,
      req.body || {}
    );

    return res.status(200).json({
      message: 'Profile updated successfully',
      profile: updatedProfile
    });
  } catch (err) {
    console.error('updateCustomerProfile error:', err);
    const status = err.statusCode || 500;
    return res.status(status).json({
      error: err.message || 'Failed to update customer profile'
    });
  }
}

module.exports = { createCustomerProfile, getCustomerProfile, updateCustomerProfile };