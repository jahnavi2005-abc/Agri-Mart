import express from 'express';
import pool from '../db/index.js';
import { verifyToken } from './auth.js';
import { z } from 'zod';

const router = express.Router();

const CreateReviewSchema = z.object({
  order_item_id: z.string().uuid(),
  rating: z.number().min(1).max(5),
  comment: z.string().optional(),
  photo_url: z.string().url().optional(),
});

// POST /api/reviews - submit a new review
router.post('/', verifyToken, async (req, res) => {
  if (req.user.role !== 'buyer') return res.status(403).json({ error: 'Only buyers can submit reviews' });
  
  const parsed = CreateReviewSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid review data', details: parsed.error.format() });

  const { order_item_id, rating, comment, photo_url } = parsed.data;

  try {
    // 1. Verify the order_item belongs to a delivered order of this buyer
    const oiQuery = `
      SELECT oi.id, oi.product_id, o.farmer_id, o.status, oi.review_id
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE oi.id = $1 AND o.buyer_id = $2
    `;
    const oiResult = await pool.query(oiQuery, [order_item_id, req.user.id]);
    
    if (oiResult.rows.length === 0) return res.status(404).json({ error: 'Order item not found' });
    const oi = oiResult.rows[0];
    
    if (oi.status !== 'delivered') return res.status(400).json({ error: 'Cannot review an order that is not delivered' });
    if (oi.review_id) return res.status(400).json({ error: 'Review already exists for this item' });

    // 2. Insert the review
    const rQuery = `
      INSERT INTO reviews (product_id, buyer_id, rating, comment, photo_url)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const rResult = await pool.query(rQuery, [oi.product_id, req.user.id, rating, comment, photo_url]);
    const review = rResult.rows[0];

    // 3. Link review to order_item
    await pool.query('UPDATE order_items SET review_id = $1 WHERE id = $2', [review.id, order_item_id]);

    // 4. Update farmer's average rating
    const ratingQuery = `
      WITH product_reviews AS (
        SELECT rating FROM reviews r
        JOIN products p ON r.product_id = p.id
        WHERE p.farmer_id = $1
      )
      UPDATE farmer_profiles 
      SET avg_rating = (SELECT ROUND(AVG(rating), 1) FROM product_reviews)
      WHERE user_id = $1;
    `;
    await pool.query(ratingQuery, [oi.farmer_id]);

    // 5. Recalculate Trust Score
    import('../lib/trust-score.js').then(ts => ts.recalculateTrustScore(oi.farmer_id)).catch(console.error);

    res.status(201).json(review);
  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({ error: 'Failed to submit review' });
  }
});

const ReplyReviewSchema = z.object({
  reply: z.string().min(1)
});

// PATCH /api/reviews/:id/reply - farmer replies to a review
router.patch('/:id/reply', verifyToken, async (req, res) => {
  if (req.user.role !== 'farmer') return res.status(403).json({ error: 'Only farmers can reply' });
  
  const parsed = ReplyReviewSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid reply data' });

  try {
    // Check if the review belongs to the farmer's product
    const checkQuery = `
      SELECT r.id FROM reviews r
      JOIN products p ON r.product_id = p.id
      WHERE r.id = $1 AND p.farmer_id = $2
    `;
    const checkRes = await pool.query(checkQuery, [req.params.id, req.user.id]);
    if (checkRes.rows.length === 0) return res.status(403).json({ error: 'Cannot reply to this review' });

    const uQuery = `
      UPDATE reviews 
      SET farmer_reply = $1, reply_created_at = NOW()
      WHERE id = $2
      RETURNING *
    `;
    const result = await pool.query(uQuery, [parsed.data.reply, req.params.id]);
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Reply review error:', error);
    res.status(500).json({ error: 'Failed to reply to review' });
  }
});

// GET /api/reviews/product/:productId - list reviews for a product
router.get('/product/:productId', async (req, res) => {
  try {
    const query = `
      SELECT r.*, u.name as buyer_name
      FROM reviews r
      JOIN users u ON r.buyer_id = u.id
      WHERE r.product_id = $1
      ORDER BY r.created_at DESC
    `;
    const result = await pool.query(query, [req.params.productId]);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('List reviews error:', error);
    res.status(500).json({ error: 'Failed to load reviews' });
  }
});

// GET /api/reviews/farmer/:farmerId - list all reviews for a farmer's products
router.get('/farmer/:farmerId', async (req, res) => {
  try {
    const query = `
      SELECT r.*, u.name as buyer_name, p.crop_name
      FROM reviews r
      JOIN users u ON r.buyer_id = u.id
      JOIN products p ON r.product_id = p.id
      WHERE r.farmer_id = $1
      ORDER BY r.created_at DESC
      LIMIT 20
    `;
    const result = await pool.query(query, [req.params.farmerId]);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('List farmer reviews error:', error);
    res.status(500).json({ error: 'Failed to load reviews' });
  }
});

export default router;
