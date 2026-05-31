import express from 'express';
import pool from '../db/index.js';
import { verifyToken } from './auth.js';
import { z } from 'zod';

const router = express.Router();

const CreateDisputeSchema = z.object({
  order_id: z.string().uuid(),
  reason: z.enum(['quality', 'missing_items', 'delay', 'other']),
  description: z.string(),
  buyer_evidence_url: z.string().url().optional()
});

router.post('/', verifyToken, async (req, res) => {
  const parsed = CreateDisputeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid dispute data' });

  const { order_id, reason, description, buyer_evidence_url } = parsed.data;

  try {
    const checkOrder = await pool.query('SELECT * FROM orders WHERE id = $1 AND buyer_id = $2', [order_id, req.user.id]);
    if (checkOrder.rows.length === 0) return res.status(404).json({ error: 'Order not found' });

    const query = `
      INSERT INTO disputes (order_id, raised_by, reason, description, buyer_evidence_url, status)
      VALUES ($1, $2, $3, $4, $5, 'open')
      RETURNING *
    `;
    const result = await pool.query(query, [order_id, req.user.id, reason, description, buyer_evidence_url]);
    
    // Update order status to disputed
    await pool.query("UPDATE orders SET status = 'disputed' WHERE id = $1", [order_id]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create dispute error:', error);
    res.status(500).json({ error: 'Failed to create dispute' });
  }
});

const CounterEvidenceSchema = z.object({
  farmer_evidence_url: z.string().url().optional(),
  farmer_notes: z.string().optional()
});

router.patch('/:id/evidence', verifyToken, async (req, res) => {
  if (req.user.role !== 'farmer') return res.status(403).json({ error: 'Only farmers can submit counter-evidence' });
  
  const parsed = CounterEvidenceSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid evidence data' });

  try {
    // Ensure this dispute belongs to the farmer
    const dCheck = await pool.query(`
      SELECT d.id FROM disputes d
      JOIN orders o ON d.order_id = o.id
      WHERE d.id = $1 AND o.farmer_id = $2
    `, [req.params.id, req.user.id]);

    if (dCheck.rows.length === 0) return res.status(403).json({ error: 'Cannot update this dispute' });

    const query = `
      UPDATE disputes 
      SET farmer_evidence_url = $1, farmer_notes = $2
      WHERE id = $3
      RETURNING *
    `;
    const result = await pool.query(query, [parsed.data.farmer_evidence_url, parsed.data.farmer_notes, req.params.id]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update dispute error:', error);
    res.status(500).json({ error: 'Failed to update dispute' });
  }
});

const ResolveDisputeSchema = z.object({
  resolution_notes: z.string(),
  refund_amount: z.number().min(0).optional(),
  status: z.enum(['resolved_refunded', 'resolved_rejected'])
});

router.patch('/:id/resolve', verifyToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Only admins can resolve disputes' });
  
  const parsed = ResolveDisputeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid resolution data' });

  try {
    const query = `
      UPDATE disputes 
      SET status = $1, resolution_notes = $2, refund_amount = $3, resolved_at = NOW()
      WHERE id = $4
      RETURNING *
    `;
    const result = await pool.query(query, [parsed.data.status, parsed.data.resolution_notes, parsed.data.refund_amount, req.params.id]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Resolve dispute error:', error);
    res.status(500).json({ error: 'Failed to resolve dispute' });
  }
});

// Admin endpoint to list disputes
router.get('/', verifyToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Only admins can view all disputes' });
  try {
    const result = await pool.query(`
      SELECT d.*, o.total_amount, o.status as order_status, 
             b.name as buyer_name, f.name as farmer_name
      FROM disputes d
      JOIN orders o ON d.order_id = o.id
      JOIN users b ON o.buyer_id = b.id
      JOIN users f ON o.farmer_id = f.id
      ORDER BY d.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('List disputes error:', error);
    res.status(500).json({ error: 'Failed to list disputes' });
  }
});

// GET /api/disputes/order/:orderId - buyer or farmer can fetch their own dispute
router.get('/order/:orderId', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT d.*, o.total_amount, o.status as order_status,
             b.name as buyer_name, f.name as farmer_name
      FROM disputes d
      JOIN orders o ON d.order_id = o.id
      JOIN users b ON o.buyer_id = b.id
      JOIN users f ON o.farmer_id = f.id
      WHERE d.order_id = $1 AND (o.buyer_id = $2 OR o.farmer_id = $2)
    `, [req.params.orderId, req.user.id]);
    res.json(result.rows[0] || null);
  } catch (error) {
    console.error('Get dispute by order error:', error);
    res.status(500).json({ error: 'Failed to fetch dispute' });
  }
});

export default router;
