const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const prisma = require('../config/db');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZlbnFlb3d2b2VsYmVscWtzZ3dhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzNzMwMjUsImV4cCI6MjEwMzk0OTAyNX0.OZAw3_gTSCkoK4H_IKE5XAxwgh7SifulLotmgn5kmVk';

/**
 * POST /auth/login
 * Body: { email, password }
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // 1. Try Supabase Auth API if configured
    if (SUPABASE_URL) {
      try {
        let sbResponse = await fetch(
          `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': SUPABASE_ANON_KEY
            },
            body: JSON.stringify({ email, password })
          }
        );

        let sbData = await sbResponse.json();

        // Handle unconfirmed email automatically for dev testing
        const errMsg = sbData.error_description || sbData.msg || sbData.error;
        if (errMsg && (errMsg.includes('Email not confirmed') || errMsg.includes('email_not_confirmed'))) {
          console.log(`Auto-confirming email for ${email} in dev...`);
          const existingUser = await prisma.users.findFirst({ where: { email } });
          if (existingUser) {
            await prisma.users.update({
              where: { id: existingUser.id },
              data: { email_confirmed_at: new Date() }
            });
            // Retry Supabase login after confirmation
            sbResponse = await fetch(
              `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'apikey': SUPABASE_ANON_KEY
                },
                body: JSON.stringify({ email, password })
              }
            );
            sbData = await sbResponse.json();
          }
        }

        if (sbResponse.ok && sbData.access_token) {
          // Fetch profile from Prisma database
          let profile = await prisma.profiles.findUnique({
            where: { id: sbData.user.id }
          });

          // If profile doesn't exist yet, auto-create default profile
          if (!profile) {
            profile = await prisma.profiles.create({
              data: {
                id: sbData.user.id,
                role: 'customer',
                full_name: email.split('@')[0]
              }
            });
            await prisma.customer_profiles.create({
              data: { user_id: sbData.user.id }
            }).catch(() => {});
          }

          return res.status(200).json({
            message: 'Login successful',
            access_token: sbData.access_token,
            token: sbData.access_token,
            expires_in: sbData.expires_in,
            user: sbData.user,
            profile
          });
        }
      } catch (sbErr) {
        console.warn('Supabase auth attempt failed, falling back to database check:', sbErr.message);
      }
    }

    // 2. Fallback: Direct Prisma Database Check
    const user = await prisma.users.findFirst({
      where: { email }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (user.encrypted_password) {
      const isMatch = await bcrypt.compare(password, user.encrypted_password);
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }
    }

    const token = jwt.sign(
      { sub: user.id, email: user.email },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' }
    );

    const profile = await prisma.profiles.findUnique({
      where: { id: user.id }
    });

    return res.status(200).json({
      message: 'Login successful',
      access_token: token,
      token,
      user: { id: user.id, email: user.email },
      profile: profile || null
    });

  } catch (error) {
    next(error);
  }
}

/**
 * POST /auth/signup or /auth/register
 * Body: { email, password, phone / mobile_number, role, full_name }
 */
async function signup(req, res, next) {
  try {
    const { email, password, phone, mobile_number, full_name, role = 'customer' } = req.body;
    const phoneNumber = phone || mobile_number;
    const userRole = role === 'worker' ? 'worker' : 'customer';

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // 1. Check if user with this email already exists
    const existingDbUser = await prisma.users.findFirst({ where: { email } });
    if (existingDbUser) {
      return res.status(400).json({ error: 'User with this email already exists. Please log in.' });
    }

    // 2. Check if phone number is already registered
    if (phoneNumber) {
      const existingPhone = await prisma.profiles.findFirst({
        where: { phone: phoneNumber }
      });
      if (existingPhone) {
        return res.status(400).json({ error: 'Mobile number is already registered to another account.' });
      }
    }

    let userId = null;
    let sbData = null;

    // 3. Try Supabase Auth API
    if (SUPABASE_URL) {
      try {
        const sbResponse = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY
          },
          body: JSON.stringify({
            email,
            password,
            data: {
              phone: phoneNumber,
              role: userRole
            }
          })
        });

        sbData = await sbResponse.json();

        if (sbResponse.ok) {
          userId = sbData.id || (sbData.user && sbData.user.id);
        } else {
          console.warn('Supabase signup returned notice/limit:', sbData.msg || sbData.error_description || sbData.error);
        }
      } catch (err) {
        console.warn('Supabase fetch error, using local fallback:', err.message);
      }
    }

    // 4. Fallback: Direct Database Creation if Supabase rate limited or omitted
    if (!userId) {
      const generatedId = crypto.randomUUID();
      const hashedPassword = await bcrypt.hash(password, 10);

      const createdUser = await prisma.users.create({
        data: {
          id: generatedId,
          email,
          encrypted_password: hashedPassword,
          email_confirmed_at: new Date(),
          phone: phoneNumber || null,
          role: 'authenticated'
        }
      });
      userId = createdUser.id;
    } else {
      // Auto confirm email for dev convenience
      await prisma.users.update({
        where: { id: userId },
        data: {
          email_confirmed_at: new Date(),
          ...(phoneNumber ? { phone: phoneNumber } : {})
        }
      }).catch(() => {});
    }

    // 5. Create Profile Record
    const profile = await prisma.profiles.upsert({
      where: { id: userId },
      update: {
        ...(phoneNumber ? { phone: phoneNumber } : {}),
        ...(full_name ? { full_name } : {})
      },
      create: {
        id: userId,
        role: userRole,
        full_name: full_name || email.split('@')[0],
        phone: phoneNumber || null
      }
    });

    // 6. Create Role Specific Profile
    if (userRole === 'customer') {
      await prisma.customer_profiles.upsert({
        where: { user_id: userId },
        update: {},
        create: { user_id: userId }
      });
    } else if (userRole === 'worker') {
      await prisma.worker_profiles.upsert({
        where: { user_id: userId },
        update: {},
        create: { user_id: userId }
      });
    }

    // 7. Generate JWT Token
    const token = jwt.sign(
      { sub: userId, email },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      message: 'User registered successfully',
      access_token: token,
      token,
      user: { id: userId, email },
      profile
    });

  } catch (error) {
    next(error);
  }
}

module.exports = { login, signup };
