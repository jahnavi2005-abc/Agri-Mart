import express from 'express';
import pool from '../db/index.js';
import { verifyToken } from './auth.js';

const router = express.Router();

// GET /api/wishlist - Get current buyer's wishlist
router.get('/', verifyToken, async (req, res) => {
  if (req.user.role !== 'buyer') return res.status(403).json({ error: 'Only buyers have wishlists' });

  try {
    const query = `
      SELECT p.*, w.created_at as wishlisted_at
      FROM wishlists w
      JOIN products p ON w.product_id = p.id
      WHERE w.buyer_id = $1
      ORDER BY w.created_at DESC
    `;
    const result = await pool.query(query, [req.user.id]);
    res.json(result.rows);
  } catch (error) {
    console.error('Fetch wishlist error:', error);
    res.status(500).json({ error: 'Failed to fetch wishlist' });
  }
});

// POST /api/wishlist/:productId - Add to wishlist
router.post('/:productId', verifyToken, async (req, res) => {
  if (req.user.role !== 'buyer') return res.status(403).json({ error: 'Only buyers have wishlists' });

  try {
    const query = `
      INSERT INTO wishlists (buyer_id, product_id)
      VALUES ($1, $2)
      ON CONFLICT DO NOTHING
      RETURNING *
    `;
    const result = await pool.query(query, [req.user.id, req.params.productId]);
    res.status(201).json({ success: true });
  } catch (error) {
    console.error('Add to wishlist error:', error);
    res.status(500).json({ error: 'Failed to add to wishlist' });
  }
});

// DELETE /api/wishlist/:productId - Remove from wishlist
router.delete('/:productId', verifyToken, async (req, res) => {
  if (req.user.role !== 'buyer') return res.status(403).json({ error: 'Only buyers have wishlists' });

  try {
    const query = `
      DELETE FROM wishlists 
      WHERE buyer_id = $1 AND product_id = $2
    `;
    await pool.query(query, [req.user.id, req.params.productId]);
    res.json({ success: true });
  } catch (error) {
    console.error('Remove from wishlist error:', error);
    res.status(500).json({ error: 'Failed to remove from wishlist' });
  }
});

export default router;
