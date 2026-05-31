import express from 'express';
import pool from '../db/index.js';
import { verifyToken } from './auth.js';
import { z } from 'zod';

const router = express.Router();

// POST /api/kyc/upload - Farmer uploads KYC document
const KYCUploadSchema = z.object({
  aadhaar_last4: z.string().length(4),
  kyc_document_url: z.string().url()
});

router.post('/upload', verifyToken, async (req, res) => {
  if (req.user.role !== 'farmer') return res.status(403).json({ error: 'Only farmers can submit KYC' });

  const parsed = KYCUploadSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid KYC data' });

  try {
    const query = `
      UPDATE farmer_profiles 
      SET aadhaar_last4 = $1, kyc_document_url = $2, kyc_status = 'pending'
      WHERE user_id = $3
      RETURNING *
    `;
    const result = await pool.query(query, [parsed.data.aadhaar_last4, parsed.data.kyc_document_url, req.user.id]);
    res.json({ success: true, profile: result.rows[0] });
  } catch (error) {
    console.error('KYC upload error:', error);
    res.status(500).json({ error: 'Failed to submit KYC' });
  }
});

// GET /api/kyc/admin - Admin list pending KYC
router.get('/admin', verifyToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });

  try {
    const result = await pool.query(`
      SELECT f.*, u.name, u.email, u.phone 
      FROM farmer_profiles f
      JOIN users u ON f.user_id = u.id
      WHERE f.kyc_status = 'pending' AND f.kyc_document_url IS NOT NULL
      ORDER BY f.created_at ASC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Admin KYC list error:', error);
    res.status(500).json({ error: 'Failed to list KYC applications' });
  }
});

// PATCH /api/kyc/admin/:userId - Admin approve/reject KYC
const KYCResolveSchema = z.object({
  status: z.enum(['approved', 'rejected'])
});

router.patch('/admin/:userId', verifyToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });

  const parsed = KYCResolveSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid status' });

  try {
    await pool.query('BEGIN');

    const query = `
      UPDATE farmer_profiles 
      SET kyc_status = $1
      WHERE user_id = $2
      RETURNING *
    `;
    const result = await pool.query(query, [parsed.data.status, req.params.userId]);
    
    // If approved, update user seller_trust_level
    if (parsed.data.status === 'approved') {
      await pool.query(`UPDATE users SET seller_trust_level = 100 WHERE id = $1`, [req.params.userId]);
    }

    await pool.query('COMMIT');
    res.json({ success: true, profile: result.rows[0] });
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Admin KYC resolve error:', error);
    res.status(500).json({ error: 'Failed to resolve KYC' });
  }
});

export default router;
