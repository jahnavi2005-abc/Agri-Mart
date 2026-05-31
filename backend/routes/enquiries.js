import express from 'express';
import pool from '../db/index.js';
import { verifyToken } from './auth.js';
import { z } from 'zod';

const router = express.Router();

const CreateEnquirySchema = z.object({
  product_id: z.string().uuid(),
  quantity_kg: z.number().positive(),
  offered_price: z.number().positive().optional(),
  message: z.string().max(500).optional(),
});

// POST /api/enquiries — buyer submits a bulk enquiry
router.post('/', verifyToken, async (req, res) => {
  if (req.user.role !== 'buyer') return res.status(403).json({ error: 'Only buyers can submit enquiries' });

  const parsed = CreateEnquirySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid enquiry data', details: parsed.error.format() });

  const { product_id, quantity_kg, offered_price, message } = parsed.data;

  try {
    // Get farmer_id from product
    const productRes = await pool.query('SELECT farmer_id, crop_name FROM products WHERE id = $1', [product_id]);
    if (!productRes.rows.length) return res.status(404).json({ error: 'Product not found' });
    const { farmer_id, crop_name } = productRes.rows[0];

    const result = await pool.query(`
      INSERT INTO enquiries (product_id, buyer_id, farmer_id, quantity_kg, offered_price, message)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [product_id, req.user.id, farmer_id, quantity_kg, offered_price, message]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create enquiry error:', error);
    res.status(500).json({ error: 'Failed to submit enquiry' });
  }
});

// GET /api/enquiries — farmer sees enquiries for their products
router.get('/', verifyToken, async (req, res) => {
  try {
    let query, params;
    if (req.user.role === 'farmer') {
      query = `
        SELECT e.*, p.crop_name, p.price_per_kg as listed_price, u.name as buyer_name, u.phone as buyer_phone
        FROM enquiries e
        JOIN products p ON e.product_id = p.id
        JOIN users u ON e.buyer_id = u.id
        WHERE e.farmer_id = $1
        ORDER BY e.created_at DESC
      `;
      params = [req.user.id];
    } else if (req.user.role === 'buyer') {
      query = `
        SELECT e.*, p.crop_name, u.name as farmer_name
        FROM enquiries e
        JOIN products p ON e.product_id = p.id
        JOIN users u ON e.farmer_id = u.id
        WHERE e.buyer_id = $1
        ORDER BY e.created_at DESC
      `;
      params = [req.user.id];
    } else {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('List enquiries error:', error);
    res.status(500).json({ error: 'Failed to load enquiries' });
  }
});

const RespondEnquirySchema = z.object({
  status: z.enum(['accepted', 'rejected']),
  accepted_price: z.number().positive().optional(),
});

// PATCH /api/enquiries/:id — farmer accepts or rejects
router.patch('/:id', verifyToken, async (req, res) => {
  if (req.user.role !== 'farmer') return res.status(403).json({ error: 'Only farmers can respond to enquiries' });

  const parsed = RespondEnquirySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid response data' });

  const { status, accepted_price } = parsed.data;

  try {
    const result = await pool.query(`
      UPDATE enquiries
      SET status = $1, accepted_price = $2, updated_at = NOW()
      WHERE id = $3 AND farmer_id = $4
      RETURNING *
    `, [status, accepted_price ?? null, req.params.id, req.user.id]);

    if (!result.rows.length) return res.status(404).json({ error: 'Enquiry not found' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Respond enquiry error:', error);
    res.status(500).json({ error: 'Failed to update enquiry' });
  }
});

export default router;
