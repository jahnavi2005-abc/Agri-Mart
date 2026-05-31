import express from 'express';
import pool from '../db/index.js';
import { verifyToken } from './auth.js';
import { z } from 'zod';

const router = express.Router();

// GET /api/payouts/balance - Get current farmer's balance and metrics
router.get('/balance', verifyToken, async (req, res) => {
  if (req.user.role !== 'farmer') return res.status(403).json({ error: 'Only farmers have balances' });

  try {
    // Total earned from all delivered & paid orders
    const earnedRes = await pool.query(`
      SELECT SUM(farmer_payout) as total_earned 
      FROM orders 
      WHERE farmer_id = $1 AND status = 'delivered'
    `, [req.user.id]);
    
    // Total paid out so far
    const paidRes = await pool.query(`
      SELECT SUM(amount) as total_paid 
      FROM payouts 
      WHERE farmer_id = $1 AND status = 'approved'
    `, [req.user.id]);

    // Pending payout requests
    const pendingRes = await pool.query(`
      SELECT SUM(amount) as total_pending 
      FROM payouts 
      WHERE farmer_id = $1 AND status = 'pending'
    `, [req.user.id]);

    const totalEarned = Number(earnedRes.rows[0].total_earned) || 0;
    const totalPaid = Number(paidRes.rows[0].total_paid) || 0;
    const totalPending = Number(pendingRes.rows[0].total_pending) || 0;
    const availableBalance = totalEarned - totalPaid - totalPending;

    res.json({
      total_earned: totalEarned,
      total_paid: totalPaid,
      total_pending: totalPending,
      available_balance: availableBalance
    });
  } catch (error) {
    console.error('Fetch balance error:', error);
    res.status(500).json({ error: 'Failed to fetch balance' });
  }
});

// GET /api/payouts/history - Get farmer's payout history
router.get('/history', verifyToken, async (req, res) => {
  if (req.user.role !== 'farmer') return res.status(403).json({ error: 'Only farmers have payouts' });

  try {
    const result = await pool.query(`
      SELECT * FROM payouts 
      WHERE farmer_id = $1 
      ORDER BY created_at DESC
    `, [req.user.id]);
    res.json(result.rows);
  } catch (error) {
    console.error('Fetch history error:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// POST /api/payouts/request - Request a payout
const PayoutRequestSchema = z.object({
  amount: z.number().positive(),
  upi_id: z.string().min(5)
});

router.post('/request', verifyToken, async (req, res) => {
  if (req.user.role !== 'farmer') return res.status(403).json({ error: 'Only farmers can request payouts' });

  const parsed = PayoutRequestSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payout request data' });

  try {
    // Need to verify balance again to prevent over-withdrawing
    const earnedRes = await pool.query(`SELECT SUM(farmer_payout) as total_earned FROM orders WHERE farmer_id = $1 AND status = 'delivered'`, [req.user.id]);
    const paidRes = await pool.query(`SELECT SUM(amount) as total_paid FROM payouts WHERE farmer_id = $1 AND status = 'approved'`, [req.user.id]);
    const pendingRes = await pool.query(`SELECT SUM(amount) as total_pending FROM payouts WHERE farmer_id = $1 AND status = 'pending'`, [req.user.id]);

    const totalEarned = Number(earnedRes.rows[0].total_earned) || 0;
    const totalPaid = Number(paidRes.rows[0].total_paid) || 0;
    const totalPending = Number(pendingRes.rows[0].total_pending) || 0;
    const availableBalance = totalEarned - totalPaid - totalPending;

    if (parsed.data.amount > availableBalance) {
      return res.status(400).json({ error: 'Insufficient available balance' });
    }

    const query = `
      INSERT INTO payouts (farmer_id, amount, upi_id)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    const result = await pool.query(query, [req.user.id, parsed.data.amount, parsed.data.upi_id]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Payout request error:', error);
    res.status(500).json({ error: 'Failed to request payout' });
  }
});

// GET /api/payouts/admin - Admin view all payouts
router.get('/admin', verifyToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });

  try {
    const result = await pool.query(`
      SELECT p.*, f.name as farmer_name, f.phone
      FROM payouts p
      JOIN users f ON p.farmer_id = f.id
      ORDER BY p.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Admin fetch payouts error:', error);
    res.status(500).json({ error: 'Failed to fetch payouts' });
  }
});

// PATCH /api/payouts/admin/:id - Admin approve/reject payout
const ResolvePayoutSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  utr_number: z.string().optional()
});

router.patch('/admin/:id', verifyToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });

  const parsed = ResolvePayoutSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid resolution data' });

  try {
    const query = `
      UPDATE payouts 
      SET status = $1, utr_number = $2, resolved_at = NOW()
      WHERE id = $3 AND status = 'pending'
      RETURNING *
    `;
    const result = await pool.query(query, [parsed.data.status, parsed.data.utr_number, req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Payout not found or already resolved' });
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Resolve payout error:', error);
    res.status(500).json({ error: 'Failed to resolve payout' });
  }
});

export default router;
