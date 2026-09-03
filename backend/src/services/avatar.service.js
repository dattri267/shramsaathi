const cloudinary = require('../config/cloudinary');
const prisma = require('../config/db');

function uploadToCloudinary(file) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'shramsaathi/avatars',
        resource_type: 'image'
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }
    );

    stream.end(file.buffer);
  });
}

function getPublicIdFromUrl(url) {
  if (!url) return null;

  try {
    const uploadPart = url.split('/upload/')[1];

    if (!uploadPart) return null;

    const parts = uploadPart.split('/');

    // Remove Cloudinary version such as v123456789
    if (parts[0]?.startsWith('v')) {
      parts.shift();
    }

    const publicIdWithExtension = parts.join('/');

    return publicIdWithExtension.replace(/\.[^/.]+$/, '');
  } catch (err) {
    return null;
  }
}

async function uploadAvatar(userId, file) {
  if (!file) {
    const err = new Error('Image file is required');
    err.statusCode = 400;
    throw err;
  }

  const existingProfile = await prisma.profiles.findUnique({
    where: { id: userId },
    select: {
      avatar_url: true
    }
  });

  if (!existingProfile) {
    const err = new Error('Profile not found');
    err.statusCode = 404;
    throw err;
  }

  const oldPublicId = getPublicIdFromUrl(existingProfile.avatar_url);

  const result = await uploadToCloudinary(file);

  if (oldPublicId) {
    try {
      await cloudinary.uploader.destroy(oldPublicId, {
        resource_type: 'image'
      });
    } catch (err) {
      console.error('Failed to delete old Cloudinary image:', err.message);
    }
  }

  const profile = await prisma.profiles.update({
    where: { id: userId },
    data: {
      avatar_url: result.secure_url
    },
    select: {
      id: true,
      avatar_url: true
    }
  });

  return {
    avatar_url: profile.avatar_url,
    public_id: result.public_id
  };
}

async function deleteAvatar(userId) {
  const profile = await prisma.profiles.findUnique({
    where: { id: userId },
    select: {
      avatar_url: true
    }
  });

  if (!profile) {
    const err = new Error('Profile not found');
    err.statusCode = 404;
    throw err;
  }

  if (profile.avatar_url) {
    const publicId = getPublicIdFromUrl(profile.avatar_url);

    if (publicId) {
      try {
        await cloudinary.uploader.destroy(publicId, {
          resource_type: 'image'
        });
      } catch (err) {
        console.error('Failed to delete Cloudinary image:', err.message);
      }
    }
  }

  await prisma.profiles.update({
    where: { id: userId },
    data: {
      avatar_url: null
    }
  });

  return {
    avatar_url: null
  };
}

module.exports = {
  uploadAvatar,
  deleteAvatar
};