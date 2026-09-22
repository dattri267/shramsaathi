const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const prisma = require('../config/db');

/**
 * Generate the JWT used by OUR backend.
 *
 * The Expo application should send this token as:
 *
 * Authorization: Bearer <token>
 */
function generateToken(userId, email, role) {
  const jwtSecret = process.env.JWT_SECRET || 'dev-jwt-secret-shramsaathi-2026';

  if (!jwtSecret) {
    throw new Error('JWT_SECRET is not configured');
  }

  return jwt.sign(
    {
      sub: userId,
      email,
      role
    },
    jwtSecret,
    {
      expiresIn: '7d'
    }
  );
}


/**
 * POST /auth/login
 *
 * Body:
 * {
 *   email,
 *   password
 * }
 */
async function login(req, res, next) {
  try {
    const email = String(req.body.email || '')
      .trim()
      .toLowerCase();

    const password = String(req.body.password || '');

    if (!email || !password) {
      return res.status(400).json({
        error: 'Email and password are required'
      });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

    /*
     * ---------------------------------------------------------
     * 1. Try Supabase authentication if configured
     * ---------------------------------------------------------
     *
     * IMPORTANT:
     * We DO NOT return the Supabase access token directly.
     *
     * We use Supabase only to verify the credentials and then
     * issue our own backend JWT.
     */
    if (supabaseUrl && supabaseAnonKey) {
      try {
        const response = await fetch(
          `${supabaseUrl}/auth/v1/token?grant_type=password`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              apikey: supabaseAnonKey
            },
            body: JSON.stringify({
              email,
              password
            })
          }
        );

        let data = await response.json();

        /*
         * Development convenience:
         * auto-confirm an existing local Supabase user.
         */
        const errorMessage =
          data.error_description ||
          data.msg ||
          data.error ||
          '';

        if (
          errorMessage.includes('Email not confirmed') ||
          errorMessage.includes('email_not_confirmed')
        ) {
          try {
            const existingUser =
              await prisma.users.findFirst({
                where: {
                  email
                }
              });

            if (existingUser) {
              await prisma.users.update({
                where: {
                  id: existingUser.id
                },
                data: {
                  email_confirmed_at: new Date()
                }
              });

              const retryResponse = await fetch(
                `${supabaseUrl}/auth/v1/token?grant_type=password`,
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    apikey: supabaseAnonKey
                  },
                  body: JSON.stringify({
                    email,
                    password
                  })
                }
              );

              data = await retryResponse.json();
            }
          } catch (confirmError) {
            console.warn(
              'Could not auto-confirm email:',
              confirmError.message
            );
          }
        }


        if (data.user && data.access_token) {
          const userId = data.user.id;

          let profile =
            await prisma.profiles.findUnique({
              where: {
                id: userId
              }
            });


          /*
           * If the Auth user exists but profile does not,
           * create a customer profile by default.
           */
          if (!profile) {
            profile =
              await prisma.profiles.create({
                data: {
                  id: userId,
                  role: 'customer',
                  full_name:
                    data.user.user_metadata?.full_name ||
                    email.split('@')[0],
                  phone:
                    data.user.user_metadata?.phone ||
                    null
                }
              });

            await prisma.customer_profiles.create({
              data: {
                user_id: userId
              }
            });
          }


          const token = generateToken(
            userId,
            email,
            profile.role
          );

          return res.status(200).json({
            message: 'Login successful',

            access_token: token,
            token,

            expires_in: 60 * 60 * 24 * 7,

            user: {
              id: userId,
              email
            },

            profile
          });
        }
      } catch (supabaseError) {
        console.warn(
          'Supabase login failed. Falling back to database authentication:',
          supabaseError.message
        );
      }
    }


    /*
     * ---------------------------------------------------------
     * 2. Local database authentication
     * ---------------------------------------------------------
     */
    const user = await prisma.users.findFirst({
      where: {
        email
      }
    });

    if (!user) {
      return res.status(401).json({
        error: 'Invalid email or password'
      });
    }

    if (!user.encrypted_password) {
      return res.status(401).json({
        error:
          'This account does not have a local password. Please use the configured authentication provider.'
      });
    }

    const passwordMatches =
      await bcrypt.compare(
        password,
        user.encrypted_password
      );

    if (!passwordMatches) {
      return res.status(401).json({
        error: 'Invalid email or password'
      });
    }


    const profile =
      await prisma.profiles.findUnique({
        where: {
          id: user.id
        }
      });

    if (!profile) {
      return res.status(404).json({
        error:
          'Account exists but profile has not been created'
      });
    }


    const token = generateToken(
      user.id,
      email,
      profile.role
    );

    return res.status(200).json({
      message: 'Login successful',

      access_token: token,
      token,

      expires_in: 60 * 60 * 24 * 7,

      user: {
        id: user.id,
        email
      },

      profile
    });
  } catch (error) {
    next(error);
  }
}


/**
 * POST /auth/signup
 * POST /auth/register
 *
 * Body:
 * {
 *   email,
 *   password,
 *   phone,
 *   mobile_number,
 *   full_name,
 *   role
 * }
 */
async function signup(req, res, next) {
  try {
    const email = String(req.body.email || '')
      .trim()
      .toLowerCase();

    const password = String(req.body.password || '');

    const phone =
      req.body.phone ||
      req.body.mobile_number ||
      null;

    const fullName =
      req.body.full_name ||
      req.body.fullName ||
      null;

    const requestedRole =
      req.body.role || 'customer';

    const userRole =
      requestedRole === 'worker'
        ? 'worker'
        : 'customer';


    if (!email || !password) {
      return res.status(400).json({
        error:
          'Email and password are required'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error:
          'Password must contain at least 6 characters'
      });
    }


    /*
     * Check email.
     */
    const existingUser =
      await prisma.users.findFirst({
        where: {
          email
        }
      });

    if (existingUser) {
      return res.status(409).json({
        error:
          'User with this email already exists. Please log in.'
      });
    }


    /*
     * Check phone.
     */
    if (phone) {
      const existingPhone =
        await prisma.profiles.findFirst({
          where: {
            phone
          }
        });

      if (existingPhone) {
        return res.status(409).json({
          error:
            'Mobile number is already registered to another account.'
        });
      }
    }


    let userId = null;
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

    /*
     * ---------------------------------------------------------
     * Try Supabase Auth
     * ---------------------------------------------------------
     */
    if (supabaseUrl && supabaseAnonKey) {
      try {
        const response =
          await fetch(
            `${supabaseUrl}/auth/v1/signup`,
            {
              method: 'POST',

              headers: {
                'Content-Type':
                  'application/json',

                apikey:
                  supabaseAnonKey
              },

              body: JSON.stringify({
                email,
                password,

                data: {
                  phone,
                  role: userRole,
                  full_name: fullName
                }
              })
            }
          );

        const data =
          await response.json();

        if (response.ok) {
          userId =
            data.id ||
            data.user?.id ||
            null;
        } else {
          console.warn(
            'Supabase signup failed:',
            data.msg ||
              data.error_description ||
              data.error
          );
        }
      } catch (supabaseError) {
        console.warn(
          'Supabase signup error:',
          supabaseError.message
        );
      }
    }


    /*
     * ---------------------------------------------------------
     * Local fallback
     * ---------------------------------------------------------
     */
    if (!userId) {
      userId =
        crypto.randomUUID();

      const encryptedPassword =
        await bcrypt.hash(
          password,
          10
        );

      await prisma.users.create({
        data: {
          id: userId,

          email,

          encrypted_password:
            encryptedPassword,

          email_confirmed_at:
            new Date(),

          phone,

          role: 'authenticated'
        }
      });
    } else {
      /*
       * Keep Supabase user's local record in sync.
       */
      try {
        await prisma.users.update({
          where: {
            id: userId
          },

          data: {
            email_confirmed_at:
              new Date(),

            ...(phone
              ? { phone }
              : {})
          }
        });
      } catch (error) {
        /*
         * In some Supabase configurations the user row may not
         * be immediately available through the DB connection.
         * The profile creation below will expose any real FK
         * problem.
         */
        console.warn(
          'Could not update auth.users:',
          error.message
        );
      }
    }


    /*
     * ---------------------------------------------------------
     * Create application profile
     * ---------------------------------------------------------
     */
    const profile =
      await prisma.profiles.upsert({
        where: {
          id: userId
        },

        update: {
          ...(fullName
            ? {
                full_name:
                  fullName
              }
            : {}),

          ...(phone
            ? {
                phone
              }
            : {})
        },

        create: {
          id: userId,

          role: userRole,

          full_name:
            fullName ||
            email.split('@')[0],

          phone
        }
      });


    /*
     * ---------------------------------------------------------
     * Create role-specific profile
     * ---------------------------------------------------------
     */
    if (userRole === 'customer') {
      await prisma.customer_profiles.upsert({
        where: {
          user_id: userId
        },

        update: {},

        create: {
          user_id: userId
        }
      });
    } else {
      await prisma.worker_profiles.upsert({
        where: {
          user_id: userId
        },

        update: {},

        create: {
          user_id: userId
        }
      });
    }


    /*
     * ---------------------------------------------------------
     * Generate OUR JWT
     * ---------------------------------------------------------
     */
    const token =
      generateToken(
        userId,
        email,
        userRole
      );


    return res.status(201).json({
      message:
        'User registered successfully',

      access_token: token,
      token,

      expires_in:
        60 * 60 * 24 * 7,

      user: {
        id: userId,
        email
      },

      profile
    });
  } catch (error) {
    next(error);
  }
}

async function resolveRole(req, res, next) {
  try {
    const userObj = req.user || {};
    const userId = userObj.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const profile = await prisma.profiles.findUnique({ where: { id: userId } });
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    let roleProfile = null;
    if (profile.role === 'worker') {
      roleProfile = await prisma.worker_profiles.findUnique({ where: { user_id: userId } });
    } else if (profile.role === 'customer') {
      roleProfile = await prisma.customer_profiles.findUnique({ where: { user_id: userId } });
    }

    return res.status(200).json({
      role: profile.role,
      profile_exists: !!roleProfile,
      profile: roleProfile
    });
  } catch (err) {
    if (next) next(err);
    else return res.status(500).json({ error: 'Failed to resolve role' });
  }
}

module.exports = {
  login,
  signup,
  resolveRole,
  generateToken
};