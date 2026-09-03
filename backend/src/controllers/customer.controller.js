const prisma = require('../config/db');

/**
 * GET /customer/profile
 * Requires requireAuth
 */
async function getCustomerProfile(req, res, next) {
  try {
    const userId = req.user.id;

    const profile = await prisma.profiles.findUnique({
      where: { id: userId },
      include: {
        customer_profiles: true
      }
    });

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
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
 * PUT or PATCH /customer/profile
 * Body: {
 *   full_name,
 *   phone,
 *   avatar_url,
 *   house_flat_building,
 *   street_locality,
 *   city,
 *   state,
 *   pin_code,
 *   landmark,
 *   address,
 *   latitude,
 *   longitude
 * }
 */
async function updateCustomerProfile(req, res, next) {
  try {
    const userId = req.user.id;
    const {
      full_name,
      phone,
      avatar_url,
      house_flat_building,
      street_locality,
      city,
      state,
      pin_code,
      landmark,
      address,
      latitude,
      longitude
    } = req.body;

    // 1. Update basic profile info in profiles table
    const profileUpdateData = {};
    if (full_name !== undefined) profileUpdateData.full_name = full_name;
    if (phone !== undefined) profileUpdateData.phone = phone;
    if (avatar_url !== undefined) profileUpdateData.avatar_url = avatar_url;

    if (Object.keys(profileUpdateData).length > 0) {
      await prisma.profiles.update({
        where: { id: userId },
        data: profileUpdateData
      });
    }

    // 2. Format complete address string if components provided
    let finalAddress = address;
    if (!finalAddress && (house_flat_building || street_locality || city || state || pin_code)) {
      const parts = [
        house_flat_building,
        street_locality,
        landmark ? `Landmark: ${landmark}` : null,
        city,
        state,
        pin_code ? `PIN: ${pin_code}` : null
      ].filter(Boolean);
      finalAddress = parts.join(', ');
    }

    // 3. Upsert customer profile
    let customerProfile = await prisma.customer_profiles.findUnique({
      where: { user_id: userId }
    });

    if (customerProfile) {
      customerProfile = await prisma.customer_profiles.update({
        where: { user_id: userId },
        data: {
          ...(finalAddress ? { default_address: finalAddress } : {}),
          updated_at: new Date()
        }
      });
    } else {
      customerProfile = await prisma.customer_profiles.create({
        data: {
          user_id: userId,
          default_address: finalAddress || null
        }
      });
    }

    // 4. Update GIS coordinates if provided
    if (latitude && longitude) {
      try {
        await prisma.$executeRawUnsafe(
          `UPDATE public.customer_profiles 
           SET default_location = ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography 
           WHERE user_id = $3::uuid`,
          parseFloat(longitude),
          parseFloat(latitude),
          userId
        );
      } catch (geoErr) {
        console.warn('Could not update geography location:', geoErr.message);
      }
    }

    // Fetch full updated profile
    const updatedProfile = await prisma.profiles.findUnique({
      where: { id: userId },
      include: {
        customer_profiles: true
      }
    });

    return res.status(200).json({
      message: 'Profile updated successfully',
      success: true,
      profile: updatedProfile
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getCustomerProfile,
  updateCustomerProfile
};
