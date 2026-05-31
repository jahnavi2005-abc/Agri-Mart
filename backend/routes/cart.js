import express from 'express';
import pool from '../db/index.js';
import { verifyToken } from './auth.js';
import { z } from 'zod';

const router = express.Router();

// GET /api/cart - list cart items for buyer
router.get('/', verifyToken, async (req, res) => {
  if (req.user.role !== 'buyer') return res.status(403).json({ error: 'Only buyers can have a cart' });
  try {
    const query = `
      SELECT c.quantity_kg, p.*, u.name as farmer_name, u.district as farmer_district, u.phone as farmer_phone
      FROM cart_items c
      JOIN products p ON c.product_id = p.id
      LEFT JOIN users u ON p.farmer_id = u.id
      WHERE c.buyer_id = $1
    `;
    const result = await pool.query(query, [req.user.id]);
    
    const formattedItems = result.rows.map(r => {
      // Reconstruct the cart item structure
      const { quantity_kg, ...productData } = r;
      return {
        quantity_kg: parseFloat(quantity_kg),
        product: productData
      };
    });
    
    res.status(200).json(formattedItems);
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({ error: 'Failed to load cart' });
  }
});

const UpdateCartSchema = z.object({
  product_id: z.string().uuid(),
  quantity_kg: z.number().positive(),
});

// POST /api/cart - upsert cart item
router.post('/', verifyToken, async (req, res) => {
  if (req.user.role !== 'buyer') return res.status(403).json({ error: 'Only buyers can have a cart' });
  const parsed = UpdateCartSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid cart data', details: parsed.error.format() });

  const { product_id, quantity_kg } = parsed.data;

  try {
    // First, verify the product exists and has enough stock
    const pResult = await pool.query('SELECT available_quantity_kg, minimum_order_kg, maximum_order_kg FROM products WHERE id = $1 AND status = \'active\'', [product_id]);
    if (pResult.rows.length === 0) return res.status(404).json({ error: 'Product not found or inactive' });
    const product = pResult.rows[0];

    const safeQuantity = Math.min(
      Math.max(quantity_kg, parseFloat(product.minimum_order_kg || 1)),
      parseFloat(product.maximum_order_kg || product.available_quantity_kg),
      parseFloat(product.available_quantity_kg)
    );

    const query = `
      INSERT INTO cart_items (buyer_id, product_id, quantity_kg)
      VALUES ($1, $2, $3)
      ON CONFLICT (buyer_id, product_id)
      DO UPDATE SET quantity_kg = EXCLUDED.quantity_kg, updated_at = NOW()
      RETURNING *
    `;
    const result = await pool.query(query, [req.user.id, product_id, safeQuantity]);
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Update cart error:', error);
    res.status(500).json({ error: 'Failed to update cart' });
  }
});

// PATCH /api/cart/:productId - update quantity
router.patch('/:productId', verifyToken, async (req, res) => {
  if (req.user.role !== 'buyer') return res.status(403).json({ error: 'Only buyers can have a cart' });
  const { productId } = req.params;
  const quantity_kg = req.body.quantity_kg;
  if (!quantity_kg || quantity_kg <= 0) return res.status(400).json({ error: 'Invalid quantity' });

  try {
    const query = `
      UPDATE cart_items SET quantity_kg = $1, updated_at = NOW()
      WHERE buyer_id = $2 AND product_id = $3
      RETURNING *
    `;
    const result = await pool.query(query, [quantity_kg, req.user.id, productId]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Item not found in cart' });
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Update cart quantity error:', error);
    res.status(500).json({ error: 'Failed to update cart quantity' });
  }
});

// DELETE /api/cart/:productId - remove item
router.delete('/:productId', verifyToken, async (req, res) => {
  if (req.user.role !== 'buyer') return res.status(403).json({ error: 'Only buyers can have a cart' });
  const { productId } = req.params;

  try {
    const query = `
      DELETE FROM cart_items
      WHERE buyer_id = $1 AND product_id = $2
    `;
    await pool.query(query, [req.user.id, productId]);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Delete cart item error:', error);
    res.status(500).json({ error: 'Failed to remove item from cart' });
  }
});

// POST /api/cart/merge - merge local storage cart into DB
const MergeCartSchema = z.object({
  items: z.array(z.object({
    product: z.object({ id: z.string().uuid() }),
    quantity_kg: z.number().positive(),
  }))
});

router.post('/merge', verifyToken, async (req, res) => {
  if (req.user.role !== 'buyer') return res.status(403).json({ error: 'Only buyers can have a cart' });
  const parsed = MergeCartSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid merge data' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const item of parsed.data.items) {
      const { id } = item.product;
      const { quantity_kg } = item;
      await client.query(`
        INSERT INTO cart_items (buyer_id, product_id, quantity_kg)
        VALUES ($1, $2, $3)
        ON CONFLICT (buyer_id, product_id)
        DO UPDATE SET quantity_kg = GREATEST(cart_items.quantity_kg, EXCLUDED.quantity_kg), updated_at = NOW()
      `, [req.user.id, id, quantity_kg]);
    }
    await client.query('COMMIT');
    res.status(200).json({ success: true });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Merge cart error:', error);
    res.status(500).json({ error: 'Failed to merge cart' });
  } finally {
    client.release();
  }
});

export default router;
