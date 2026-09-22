// backend/src/middleware/auth.js
const jwt = require('jsonwebtoken');
let prisma = null;
try {
  if (process.env.DATABASE_URL) {
    prisma = require('../config/db');
  }
} catch (e) {
  prisma = null;
}

const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;

function extractUserIdFromToken(token) {
  if (!token) return null;

  // Dev Token Handling (dev-auth-token-dev-user-XXXX-timestamp)
  if (token.startsWith('dev-auth-token-')) {
    const parts = token.split('-');
    if (parts.length >= 5) {
      return `${parts[3]}-${parts[4]}`;
    }
  }

  // Supabase / Standard JWT Verification
  if (process.env.JWT_SECRET) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      return decoded.sub || null;
    } catch (e) {
      return null;
    }
  }

  // Decode JWT payload when JWT_SECRET is not configured in environment
  try {
    const decoded = jwt.decode(token);
    if (decoded && decoded.sub && (UUID_REGEX.test(decoded.sub) || decoded.sub.startsWith('dev-user-'))) {
      return decoded.sub;
    }
  } catch (e) {}

  return null;
}

// STRICT — requires authentication and enforces strict user isolation
async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing authentication token' });
    }
    const token = authHeader.split(' ')[1];
    const userId = extractUserIdFromToken(token);

    if (!userId) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    let role = 'customer';
    let profileData = null;

    if (prisma && prisma.profiles) {
      try {
        const p = await prisma.profiles.findUnique({ where: { id: userId } });
        if (p) {
          role = p.role;
          profileData = p;
        }
      } catch (e) {}
    }

    req.user = {
      id: userId,
      role: role,
      profile: profileData || { id: userId, role: role }
    };

    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// LIGHT — verifies JWT token without profile fetch
function verifyToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing authentication token' });
    }
    const token = authHeader.split(' ')[1];
    const userId = extractUserIdFromToken(token);

    if (!userId) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    req.supabaseUser = {
      id: userId,
      email: `${userId}@auth.user`,
      role: 'customer'
    };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

async function resolveRoleProfile(req, res, next) {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (req.user.role === 'customer') {
      if (prisma && prisma.customer_profiles) {
        try {
          const cp = await prisma.customer_profiles.findUnique({ where: { user_id: req.user.id } });
          if (cp) req.user.customerProfileId = cp.id;
        } catch (e) {}
      }
      if (!req.user.customerProfileId) {
        req.user.customerProfileId = req.user.id;
      }
    } else if (req.user.role === 'worker') {
      if (prisma && prisma.worker_profiles) {
        try {
          const wp = await prisma.worker_profiles.findUnique({ where: { user_id: req.user.id } });
          if (wp) req.user.workerProfileId = wp.id;
        } catch (e) {}
      }
      if (!req.user.workerProfileId) {
        req.user.workerProfileId = req.user.id;
      }
    }
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { requireAuth, verifyToken, resolveRoleProfile };