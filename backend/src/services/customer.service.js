const prisma = require('../config/db');

async function getCustomerProfile(userId) {
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

  const customerProfile = await prisma.customer_profiles.findUnique({
    where: {
      user_id: userId
    }
  });

  if (!customerProfile) {
    const err = new Error('Customer profile not found');
    err.statusCode = 404;
    throw err;
  }

  return {
    ...profile,
    customer_profile: customerProfile
  };
}

async function updateCustomerProfile(userId, data) {
  const {
    full_name,
    phone,
    avatar_url,
    preferred_language,
    default_address
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

  const customerProfile = await prisma.customer_profiles.update({
    where: {
      user_id: userId
    },
    data: {
      ...(default_address !== undefined && { default_address })
    }
  });

  return {
    ...profile,
    customer_profile: customerProfile
  };
}

module.exports = {
  getCustomerProfile,
  updateCustomerProfile
};