const customerService = require('../services/customer.service');

async function getProfile(req, res, next) {
  try {
    if (req.user.role !== 'customer') {
      return res.status(403).json({
        error: 'Only customers can access this'
      });
    }

    const profile = await customerService.getCustomerProfile(
      req.user.id
    );

    res.json({
      profile
    });
  } catch (err) {
    next(err);
  }
}

async function updateProfile(req, res, next) {
  try {
    if (req.user.role !== 'customer') {
      return res.status(403).json({
        error: 'Only customers can update this'
      });
    }

    const profile = await customerService.updateCustomerProfile(
      req.user.id,
      req.body
    );

    res.json({
      message: 'Customer profile updated successfully',
      profile
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getProfile,
  updateProfile
};
