import express from 'express';
import pool from '../db/index.js';
import { verifyToken } from './auth.js';
import { z } from 'zod';

const router = express.Router();

// GET /api/auctions/:productId/bids - Get all bids for a product
router.get('/:productId/bids', async (req, res) => {
  try {
    const { productId } = req.params;
    const result = await pool.query(`
      SELECT b.*, u.name as bidder_name 
      FROM auction_bids b
      JOIN users u ON b.bidder_id = u.id
      WHERE b.product_id = $1
      ORDER BY b.bid_amount DESC
    `, [productId]);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Fetch bids error:', error);
    res.status(500).json({ error: 'Failed to fetch bids' });
  }
});

// POST /api/auctions/:productId/bid - Place a bid
const PlaceBidSchema = z.object({
  bid_amount: z.number().positive()
});

router.post('/:productId/bid', verifyToken, async (req, res) => {
  if (req.user.role !== 'buyer') return res.status(403).json({ error: 'Only buyers can place bids' });

  const parsed = PlaceBidSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid bid amount' });

  const { productId } = req.params;
  const bidAmount = parsed.data.bid_amount;

  try {
    await pool.query('BEGIN');

    // 1. Get product details to check auction status
    const prodRes = await pool.query('SELECT * FROM products WHERE id = $1 FOR UPDATE', [productId]);
    if (prodRes.rows.length === 0) throw new Error('Product not found');
    const product = prodRes.rows[0];

    if (product.listing_type !== 'auction') throw new Error('This product is not up for auction');
    if (new Date() > new Date(product.auction_end_at)) throw new Error('Auction has ended');
    if (bidAmount < Number(product.auction_min_bid)) throw new Error(`Bid must be at least ₹${product.auction_min_bid}`);

    // 2. Get current highest bid
    const highestRes = await pool.query('SELECT MAX(bid_amount) as max_bid FROM auction_bids WHERE product_id = $1', [productId]);
    const currentMax = Number(highestRes.rows[0].max_bid) || 0;

    if (bidAmount <= currentMax) throw new Error(`Bid must be higher than current highest bid (₹${currentMax})`);

    // 3. Mark previous bids for this product as 'outbid'
    await pool.query(`UPDATE auction_bids SET status = 'outbid' WHERE product_id = $1 AND status = 'active'`, [productId]);

    // 4. Insert new bid
    const result = await pool.query(`
      INSERT INTO auction_bids (product_id, bidder_id, bid_amount, status)
      VALUES ($1, $2, $3, 'active')
      RETURNING *
    `, [productId, req.user.id, bidAmount]);

    await pool.query('COMMIT');
    res.status(201).json(result.rows[0]);
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Place bid error:', error);
    res.status(400).json({ error: error.message || 'Failed to place bid' });
  }
});

// POST /api/auctions/:productId/end - End auction manually (Farmer only)
router.post('/:productId/end', verifyToken, async (req, res) => {
  if (req.user.role !== 'farmer') return res.status(403).json({ error: 'Only farmers can end auctions' });

  try {
    await pool.query('BEGIN');
    
    // Check ownership
    const prodRes = await pool.query('SELECT * FROM products WHERE id = $1 AND farmer_id = $2', [req.params.productId, req.user.id]);
    if (prodRes.rows.length === 0) throw new Error('Product not found or access denied');
    
    // Set auction end date to now
    await pool.query(`UPDATE products SET auction_end_at = NOW() WHERE id = $1`, [req.params.productId]);
    
    // Set highest active bid to 'won'
    await pool.query(`
      UPDATE auction_bids 
      SET status = 'won' 
      WHERE id = (
        SELECT id FROM auction_bids WHERE product_id = $1 AND status = 'active' ORDER BY bid_amount DESC LIMIT 1
      )
    `, [req.params.productId]);

    await pool.query('COMMIT');
    res.json({ success: true, message: 'Auction ended successfully' });
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('End auction error:', error);
    res.status(400).json({ error: error.message || 'Failed to end auction' });
  }
});

export default router;
