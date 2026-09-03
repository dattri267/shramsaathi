const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
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

          // If profile doesn't exist yet, auto-create a default profile
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
        
        // If Supabase failed with explicit error
        if (sbData.error_description || sbData.msg || sbData.error) {
          if (!sbData.error_description?.includes('Invalid login credentials')) {
            return res.status(400).json({ 
              error: sbData.error_description || sbData.msg || sbData.error 
            });
          }
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

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Check if user already exists in database
    const existingDbUser = await prisma.users.findFirst({ where: { email } });
    if (existingDbUser) {
      return res.status(400).json({ error: 'User with this email already exists. Please log in.' });
    }

    if (SUPABASE_URL) {
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
            role: role === 'worker' ? 'worker' : 'customer'
          }
        })
      });

      const sbData = await sbResponse.json();

      if (!sbResponse.ok) {
        return res.status(400).json({ error: sbData.msg || sbData.error_description || 'Signup failed' });
      }

      let userId = sbData.id || (sbData.user && sbData.user.id);

      if (userId) {
        // Confirm email & update phone in database
        let userInDb = await prisma.users.findUnique({ where: { id: userId } });
        
        if (!userInDb) {
          // Fallback search by email if Supabase returned a different ID
          userInDb = await prisma.users.findFirst({ where: { email } });
          if (userInDb) userId = userInDb.id;
        }

        if (userInDb) {
          await prisma.users.update({
            where: { id: userId },
            data: {
              email_confirmed_at: new Date(),
              ...(phoneNumber ? { phone: phoneNumber } : {})
            }
          }).catch(() => {});
        }

        // Create profile only if user exists in users table
        let profile = null;
        if (userInDb) {
          profile = await prisma.profiles.upsert({
            where: { id: userId },
            update: {
              ...(phoneNumber ? { phone: phoneNumber } : {}),
              ...(full_name ? { full_name } : {})
            },
            create: {
              id: userId,
              role: role === 'worker' ? 'worker' : 'customer',
              full_name: full_name || email.split('@')[0],
              phone: phoneNumber || null
            }
          });

          // Create role profile
          if (role === 'customer') {
            await prisma.customer_profiles.upsert({
              where: { user_id: userId },
              update: {},
              create: { user_id: userId }
            });
          } else if (role === 'worker') {
            await prisma.worker_profiles.upsert({
              where: { user_id: userId },
              update: {},
              create: { user_id: userId }
            });
          }
        }

        // Generate instant token for immediate profile setup navigation
        const token = sbData.access_token || jwt.sign(
          { sub: userId, email },
          process.env.JWT_SECRET || 'secret',
          { expiresIn: '7d' }
        );

        return res.status(201).json({
          message: 'User registered successfully',
          access_token: token,
          token,
          user: sbData.user || { id: userId, email },
          profile
        });
      }

      return res.status(201).json({ message: 'Signup request submitted', data: sbData });
    }

    return res.status(400).json({ error: 'Supabase URL not configured' });
  } catch (error) {
    next(error);
  }
}

module.exports = { login, signup };
