const jwt = require('jsonwebtoken');
const prisma = require('../config/db');

async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Missing authentication token'
      });
    }

    const token = authHeader.substring(7).trim();

    if (!token) {
      return res.status(401).json({
        error: 'Missing authentication token'
      });
    }

    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      console.error('JWT_SECRET is not configured');

      return res.status(500).json({
        error: 'Server authentication configuration is missing'
      });
    }

    const decoded = jwt.verify(token, jwtSecret);

    if (!decoded.sub) {
      return res.status(401).json({
        error: 'Invalid authentication token'
      });
    }

    const profile = await prisma.profiles.findUnique({
      where: {
        id: decoded.sub
      }
    });

    if (!profile) {
      return res.status(401).json({
        error: 'Profile not found'
      });
    }

    if (!profile.is_active) {
      return res.status(403).json({
        error: 'Account is inactive'
      });
    }

    req.user = {
      id: decoded.sub,
      email: decoded.email || null,
      role: profile.role,
      profile
    };

    next();
  } catch (err) {
    console.error('Authentication error:', err.message);

    return res.status(401).json({
      error: 'Invalid or expired token'
    });
  }
}


/**
 * Resolves the role-specific profile ID.
 *
 * Customer:
 * req.user.customerProfileId
 *
 * Worker:
 * req.user.workerProfileId
 */
async function resolveRoleProfile(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required'
      });
    }

    if (req.user.role === 'customer') {
      const customerProfile =
        await prisma.customer_profiles.findUnique({
          where: {
            user_id: req.user.id
          }
        });

      if (!customerProfile) {
        return res.status(404).json({
          error:
            'Customer profile not found — complete your profile first'
        });
      }

      req.user.customerProfileId = customerProfile.id;
    }

    if (req.user.role === 'worker') {
      const workerProfile =
        await prisma.worker_profiles.findUnique({
          where: {
            user_id: req.user.id
          }
        });

      if (!workerProfile) {
        return res.status(404).json({
          error:
            'Worker profile not found — complete your profile first'
        });
      }

      req.user.workerProfileId = workerProfile.id;
    }

    next();
  } catch (err) {
    next(err);
  }
}


module.exports = {
  requireAuth,
  resolveRoleProfile
};