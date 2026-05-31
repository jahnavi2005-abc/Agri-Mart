import express from 'express';
import pool from '../db/index.js';
import supabase from '../db/supabase.js';
import validate from '../middleware/validate.js';
import { z } from 'zod';

const router = express.Router();

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
  phone: z.string().optional(),
  role: z.enum(['farmer', 'buyer']),
  district: z.string().optional(),
  state: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const profileSchema = z.object({
  name: z.string().optional(),
  phone: z.string().optional(),
  district: z.string().optional(),
  state: z.string().optional(),
  address: z.string().optional(),
  avatar_url: z.string().optional(),
  language: z.string().optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6),
});

/**
 * verifyToken middleware
 * Validates Supabase JWT → looks up user in our `users` table by supabase_uid
 */
export const verifyToken = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return res.status(401).json({ error: 'Invalid or expired token' });

    // Look up our users table — match by supabase_uid OR email (fallback for migrated accounts)
    const result = await pool.query(
      `SELECT * FROM users WHERE supabase_uid = $1 OR email = $2 LIMIT 1`,
      [user.id, user.email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User profile not found' });
    }

    const profile = result.rows[0];

    // Block banned users
    if (profile.is_banned) {
      return res.status(403).json({ error: 'Your account has been suspended.' });
    }

    // Sync supabase_uid if not set yet
    if (!profile.supabase_uid) {
      await pool.query(`UPDATE users SET supabase_uid = $1 WHERE id = $2`, [user.id, profile.id]);
    }

    req.user = { id: profile.id, email: profile.email, role: profile.role, name: profile.name };
    next();
  } catch (err) {
    console.error('[auth] verifyToken error:', err.message);
    res.status(500).json({ error: 'Authentication error' });
  }
};

// POST /api/auth/signup
router.post('/signup', validate(signupSchema), async (req, res) => {
  const { email, password, name, phone, role, district, state } = req.body;
  const normalizedEmail = email.toLowerCase().trim();

  const client = await pool.connect();
  let supabaseUid = null;

  try {
    // 1. Check if user already exists in our DB
    const existingUser = await client.query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // 2. Create user in Supabase Auth
    const { data, error: authError } = await supabase.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
      user_metadata: { name, role, phone, district, state },
    });

    if (authError) {
      if (authError.message.includes('already registered') || authError.message.includes('already been registered')) {
        return res.status(400).json({ error: 'User with this email already exists' });
      }
      console.error('[auth] Supabase createUser error:', authError.message);
      return res.status(500).json({ error: 'Failed to create account. Please try again.' });
    }

    supabaseUid = data.user.id;

    // 3. Insert into our users table (within a transaction)
    await client.query('BEGIN');

    const formattedPhone = phone ? (phone.startsWith('+91') ? phone : `+91${phone}`) : null;

    const result = await client.query(
      `INSERT INTO users (name, email, password_hash, phone, role, district, state, is_verified, supabase_uid)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, email, role, name, phone, district, state, created_at`,
      [name, normalizedEmail, 'supabase-managed', formattedPhone, role, district || null, state || null, true, supabaseUid]
    );

    const user = result.rows[0];

    // 4. If farmer, create farmer_profiles row
    if (role === 'farmer') {
      await client.query(
        `INSERT INTO farmer_profiles (user_id, farm_name, kyc_status, rating, total_sales)
         VALUES ($1, $2, 'pending', 0, 0)`,
        [user.id, `${name}'s Farm`]
      );
    }

    await client.query('COMMIT');

    // 5. Sign in to get a session token for the new user
    const { data: session, error: signInError } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (signInError) {
      // User was created but sign-in failed — still return success so user can login manually
      console.error('[auth] Signup sign-in error:', signInError.message);
      return res.status(200).json({
        message: 'Account created. Please sign in manually.',
        user,
        session: { access_token: null, user },
      });
    }

    res.status(200).json({
      message: 'Account created successfully',
      user,
      session: { access_token: session.session.access_token, user },
    });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('[auth] Signup error:', error.message);

    // If we created a Supabase user but DB insert failed, try to clean up
    if (supabaseUid) {
      try {
        await supabase.auth.admin.deleteUser(supabaseUid);
        console.log('[auth] Cleaned up Supabase user after DB failure');
      } catch (cleanupErr) {
        console.error('[auth] Failed to cleanup Supabase user:', cleanupErr.message);
      }
    }

    res.status(500).json({ error: error.message || 'Failed to create account' });
  } finally {
    client.release();
  }
});

// POST /api/auth/login
router.post('/login', validate(loginSchema), async (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = email.toLowerCase().trim();

  try {
    // Check account lockout first
    const userCheck = await pool.query(
      `SELECT id, login_attempts, locked_until FROM users WHERE email = $1 LIMIT 1`,
      [normalizedEmail]
    );

    let dbUserId = null;
    if (userCheck.rows.length > 0) {
      const u = userCheck.rows[0];
      dbUserId = u.id;
      if (u.locked_until && new Date(u.locked_until) > new Date()) {
        return res.status(403).json({ error: `Account locked due to too many failed attempts. Try again later.` });
      }
    }

    // 1. Authenticate with Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (error) {
      if (dbUserId) {
        // Increment login_attempts
        await pool.query(
          `UPDATE users 
           SET login_attempts = login_attempts + 1,
               locked_until = CASE WHEN login_attempts + 1 >= 5 THEN NOW() + INTERVAL '15 minutes' ELSE locked_until END
           WHERE id = $1`,
          [dbUserId]
        );
      }
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    if (dbUserId) {
      // Reset login_attempts on success
      await pool.query(`UPDATE users SET login_attempts = 0, locked_until = NULL WHERE id = $1`, [dbUserId]);
    }

    // 2. Get full profile from our users table
    const result = await pool.query(
      `SELECT * FROM users WHERE supabase_uid = $1 OR email = $2 LIMIT 1`,
      [data.user.id, normalizedEmail]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'User profile not found. Please register again.' });
    }

    const user = result.rows[0];
    delete user.password_hash;

    // Check if user is banned
    if (user.is_banned) {
      return res.status(403).json({ error: 'Your account has been suspended. Contact support for help.' });
    }

    // Sync supabase_uid if not set
    if (!user.supabase_uid) {
      await pool.query(`UPDATE users SET supabase_uid = $1 WHERE id = $2`, [data.user.id, user.id]);
    }

    if (user.role === 'farmer') {
      const fResult = await pool.query('SELECT kyc_status, kyc_document_url FROM farmer_profiles WHERE user_id = $1', [user.id]);
      if (fResult.rows.length > 0) {
        user.kyc_status = fResult.rows[0].kyc_status;
        user.kyc_document_url = fResult.rows[0].kyc_document_url;
      } else {
        // Auto-create farmer_profiles row if missing (for old accounts)
        await pool.query(
          `INSERT INTO farmer_profiles (user_id, farm_name, kyc_status, rating, total_sales)
           VALUES ($1, $2, 'pending', 0, 0) ON CONFLICT (user_id) DO NOTHING`,
          [user.id, `${user.name}'s Farm`]
        );
        user.kyc_status = 'pending';
      }
    }

    res.status(200).json({
      session: { access_token: data.session.access_token, user },
    });
  } catch (error) {
    console.error('[auth] Login error:', error.message);
    res.status(500).json({ error: 'Failed to log in' });
  }
});

// GET /api/auth/me
router.get('/me', verifyToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    const user = result.rows[0];
    delete user.password_hash;
    
    if (user.role === 'farmer') {
      const fResult = await pool.query('SELECT kyc_status, kyc_document_url FROM farmer_profiles WHERE user_id = $1', [user.id]);
      if (fResult.rows.length > 0) {
        user.kyc_status = fResult.rows[0].kyc_status;
        user.kyc_document_url = fResult.rows[0].kyc_document_url;
      } else {
        // Auto-create farmer_profiles row if missing
        await pool.query(
          `INSERT INTO farmer_profiles (user_id, farm_name, kyc_status, rating, total_sales)
           VALUES ($1, $2, 'pending', 0, 0) ON CONFLICT (user_id) DO NOTHING`,
          [user.id, `${user.name}'s Farm`]
        );
        user.kyc_status = 'pending';
      }
    }
    
    res.status(200).json(user);
  } catch (error) {
    console.error('[auth] Me error:', error.message);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// PATCH /api/auth/profile
router.patch('/profile', verifyToken, validate(profileSchema), async (req, res) => {
  const { name, phone, district, state, address, avatar_url, language } = req.body;

  try {
    const fields = [];
    const values = [];
    let idx = 1;

    if (name !== undefined)       { fields.push(`name = $${idx++}`);       values.push(name); }
    if (phone !== undefined)      { fields.push(`phone = $${idx++}`);      values.push(phone); }
    if (district !== undefined)   { fields.push(`district = $${idx++}`);   values.push(district); }
    if (state !== undefined)      { fields.push(`state = $${idx++}`);      values.push(state); }
    if (address !== undefined)    { fields.push(`address = $${idx++}`);    values.push(address); }
    if (avatar_url !== undefined) { fields.push(`avatar_url = $${idx++}`); values.push(avatar_url); }
    if (language !== undefined)   { fields.push(`language = $${idx++}`);   values.push(language); }

    if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' });

    fields.push(`updated_at = NOW()`);
    values.push(req.user.id);

    const result = await pool.query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );

    const user = result.rows[0];
    delete user.password_hash;
    res.status(200).json(user);
  } catch (error) {
    console.error('[auth] Update profile error:', error.message);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// PATCH /api/auth/change-password
router.patch('/change-password', verifyToken, validate(changePasswordSchema), async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  try {
    // 1. Verify current password via Supabase
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: req.user.email,
      password: currentPassword,
    });

    if (signInError) {
      return res.status(400).json({ error: 'Incorrect current password' });
    }

    // 2. Fetch the user's supabase_uid from DB to ensure we update the correct Auth identity
    const dbRes = await pool.query('SELECT supabase_uid FROM users WHERE id = $1', [req.user.id]);
    const supabaseUid = dbRes.rows[0]?.supabase_uid;
    if (!supabaseUid) return res.status(500).json({ error: 'Account unlinked from auth provider' });

    // 3. Update password via Supabase Admin API
    const { error: updateError } = await supabase.auth.admin.updateUserById(supabaseUid, {
      password: newPassword,
    });

    if (updateError) throw updateError;

    res.status(200).json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('[auth] Change password error:', error.message);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

export default router;
