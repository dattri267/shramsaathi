// backend/src/middleware/auth.js
const jwt = require('jsonwebtoken');
const prisma = require('../config/db');

async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing token' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.sub; // Supabase JWT stores user id in `sub`

    const profile = await prisma.profiles.findUnique({ where: { id: userId } });
    if (!profile) return res.status(401).json({ error: 'Profile not found' });

    req.user = { id: userId, role: profile.role, profile };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Attaches the role-specific profile id (needed as FK for bookings, etc.)
async function resolveRoleProfile(req, res, next) {
  try {
    if (req.user.role === 'customer') {
      const cp = await prisma.customer_profiles.findUnique({ where: { user_id: req.user.id } });
      if (!cp) return res.status(404).json({ error: 'Customer profile not found — complete profile first' });
      req.user.customerProfileId = cp.id;
    } else if (req.user.role === 'worker') {
      const wp = await prisma.worker_profiles.findUnique({ where: { user_id: req.user.id } });
      if (!wp) return res.status(404).json({ error: 'Worker profile not found — complete profile first' });
      req.user.workerProfileId = wp.id;
    }
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { requireAuth, resolveRoleProfile };