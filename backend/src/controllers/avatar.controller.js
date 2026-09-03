const avatarService = require('../services/avatar.service');

async function uploadAvatar(req, res, next) {
  try {
    const result = await avatarService.uploadAvatar(
      req.user.id,
      req.file
    );

    res.status(200).json({
      message: 'Avatar uploaded successfully',
      avatar: result
    });
  } catch (err) {
    next(err);
  }
}

async function deleteAvatar(req, res, next) {
  try {
    const result = await avatarService.deleteAvatar(
      req.user.id
    );

    res.status(200).json({
      message: 'Avatar deleted successfully',
      avatar: result
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  uploadAvatar,
  deleteAvatar
};