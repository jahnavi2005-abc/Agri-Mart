import express from 'express';
import pool from '../db/index.js';
import { verifyToken } from './auth.js';
import supabase from '../db/supabase.js';
import { sendMail, orderPlacedEmail, orderStatusEmail } from '../lib/mailer.js';
import { z } from 'zod';

const router = express.Router();

// Helper to insert a notification via Supabase (never throws)
async function notify(userId, title, body, type = 'order', data = {}) {
  try {
    await supabase.from('notifications').insert({
      user_id: userId,
      title,
      body,
      type,
      data,
      is_read: false,
    });
  } catch (e) {
    console.error('[notify] Failed to insert notification:', e.message);
  }
}

// GET /api/orders - list orders for the logged-in user
router.get('/', verifyToken, async (req, res) => {
  try {
    const { role, id } = req.user;
    const column = role === 'farmer' ? 'farmer_id' : 'buyer_id';

    const result = await pool.query(
      `SELECT o.*, 
        u.name as buyer_name, 
        f.name as farmer_name
       FROM orders o
       LEFT JOIN users u ON o.buyer_id = u.id
       LEFT JOIN users f ON o.farmer_id = f.id
       WHERE o.${column} = $1
       ORDER BY o.created_at DESC`,
      [id]
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('List orders error:', error);
    res.status(500).json({ error: 'Failed to load orders' });
  }
});

// GET /api/orders/:id - get single order with its items
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    const orderRes = await pool.query(
      `SELECT o.*, u.name as buyer_name, f.name as farmer_name
       FROM orders o
       LEFT JOIN users u ON o.buyer_id = u.id
       LEFT JOIN users f ON o.farmer_id = f.id
       WHERE o.id = $1 AND (o.buyer_id = $2 OR o.farmer_id = $2)`,
      [id, req.user.id]
    );

    if (orderRes.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const itemsRes = await pool.query(
      `SELECT oi.*, p.image_urls FROM order_items oi
       LEFT JOIN products p ON oi.product_id = p.id
       WHERE oi.order_id = $1`,
      [id]
    );

    res.status(200).json({ ...orderRes.rows[0], items: itemsRes.rows });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ error: 'Failed to load order' });
  }
});

const CreateOrderSchema = z.object({
  items: z.array(z.object({
    product: z.object({
      id: z.string(),
      farmer_id: z.string(),
      price_per_kg: z.coerce.number(),
      crop_name: z.string()
    }),
    quantity_kg: z.coerce.number().positive()
  })).min(1),
  delivery_address: z.object({
    name: z.string().min(1),
    phone: z.string().min(1),
    address: z.string().min(1),
    district: z.string().min(1),
    state: z.string().min(1),
    pincode: z.string().min(1),
  }),
});

// POST /api/orders - create orders from cart (buyer only)
router.post('/', verifyToken, async (req, res) => {
  if (req.user.role !== 'buyer') {
    return res.status(403).json({ error: 'Only buyers can place orders' });
  }

  const parsed = CreateOrderSchema.safeParse(req.body);
  if (!parsed.success) {
    console.error('Order validation failed:', JSON.stringify(parsed.error.format(), null, 2));
    return res.status(400).json({ error: 'Validation failed', details: parsed.error.format() });
  }

  const { items, delivery_address } = parsed.data;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Fetch product locations
    const productIds = items.map(i => i.product.id);
    const prodRes = await client.query('SELECT id, district, state FROM products WHERE id = ANY($1)', [productIds]);
    const prodMap = {};
    for (const r of prodRes.rows) {
      prodMap[r.id] = r;
    }

    // Group items by farmer
    const grouped = {};
    for (const item of items) {
      const farmerId = item.product.farmer_id;
      if (!grouped[farmerId]) grouped[farmerId] = [];
      grouped[farmerId].push(item);
    }

    const created = [];

    for (const [farmerId, farmerItems] of Object.entries(grouped)) {
      const subtotal = farmerItems.reduce((sum, item) => sum + item.quantity_kg * item.product.price_per_kg, 0);
      const platformFee = Math.round(subtotal * 0.02);
      const deliveryFee = 80;
      const totalAmount = subtotal + platformFee + deliveryFee;
      const farmerPayout = subtotal - platformFee;

      // Calculate estimated delivery
      const firstProd = prodMap[farmerItems[0].product.id];
      let daysMax = 7;
      if (firstProd) {
        const pDist = (firstProd.district || '').trim().toLowerCase();
        const pState = (firstProd.state || '').trim().toLowerCase();
        const dDist = (delivery_address.district || '').trim().toLowerCase();
        const dState = (delivery_address.state || '').trim().toLowerCase();

        if (pDist === dDist && pDist !== '') {
          daysMax = 2;
        } else if (pState === dState && pState !== '') {
          daysMax = 4;
        }
      }
      const expectedDeliveryDate = new Date();
      expectedDeliveryDate.setDate(expectedDeliveryDate.getDate() + daysMax);

      const orderRes = await client.query(
        `INSERT INTO orders (buyer_id, farmer_id, subtotal, platform_fee, delivery_fee, total_amount, farmer_payout, payment_status, payment_method, delivery_address, expected_delivery_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
        [req.user.id, farmerId, subtotal, platformFee, deliveryFee, totalAmount, farmerPayout, 'pending', 'cod', JSON.stringify(delivery_address), expectedDeliveryDate]
      );
      const order = orderRes.rows[0];

      for (const item of farmerItems) {
        await client.query(
          `INSERT INTO order_items (order_id, product_id, crop_name, quantity_kg, price_per_kg, total_price)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [order.id, item.product.id, item.product.crop_name, item.quantity_kg, item.product.price_per_kg, item.quantity_kg * item.product.price_per_kg]
        );

        // Reduce stock
        await client.query(
          `UPDATE products SET available_quantity_kg = GREATEST(0, available_quantity_kg - $1), updated_at = NOW() WHERE id = $2`,
          [item.quantity_kg, item.product.id]
        );
      }

      created.push(order);
    }

    await client.query('COMMIT');

    // Send order confirmation email to buyer
    try {
      const buyerRes = await pool.query('SELECT name, email FROM users WHERE id = $1', [req.user.id]);
      if (buyerRes.rows.length > 0) {
        const buyer = buyerRes.rows[0];
        const { subject, html } = orderPlacedEmail(buyer.name, created);
        await sendMail(buyer.email, subject, html);
      }
    } catch (mailErr) {
      console.error('[orders] Email send failed:', mailErr.message);
    }

    // Notify each farmer about their new order
    for (const order of created) {
      await notify(
        order.farmer_id,
        'New Order Received 🛒',
        `Order #${order.id.slice(0, 8).toUpperCase()} — ₹${Number(order.total_amount).toLocaleString('en-IN')} from a buyer`,
        'order',
        { order_id: order.id }
      );
    }

    res.status(201).json(created);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create order error:', error);
    res.status(500).json({ error: 'Failed to place order' });
  } finally {
    client.release();
  }
});

// PATCH /api/orders/:id/status - update order status (farmer)
router.patch('/:id/status', verifyToken, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const allowed = ['accepted', 'packed', 'dispatched', 'delivered', 'cancelled'];
  if (!allowed.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  try {
    const result = await pool.query(
      `UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 AND farmer_id = $3 RETURNING *`,
      [status, id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found or not authorized' });
    }

    const updatedOrder = result.rows[0];

    // Send status update email to buyer
    try {
      const buyerRes = await pool.query('SELECT name, email FROM users WHERE id = $1', [updatedOrder.buyer_id]);
      if (buyerRes.rows.length > 0) {
        const buyer = buyerRes.rows[0];
        const { subject, html } = orderStatusEmail(buyer.name, updatedOrder.id, status);
        await sendMail(buyer.email, subject, html);
      }
    } catch (mailErr) {
      console.error('[orders] Status email failed:', mailErr.message);
    }

    // Notify buyer about status change
    const notifMessages = {
      accepted:   { title: 'Order Confirmed ✅', body: 'Your order has been confirmed by the farmer.' },
      packed:     { title: 'Order Packed 📦', body: 'Your order has been packed and is ready to ship.' },
      dispatched: { title: 'Order Dispatched 🚚', body: 'Great news! Your order is on the way.' },
      delivered:  { title: 'Order Delivered 🎉', body: 'Your order has been delivered. Tap to rate your experience.' },
      cancelled:  { title: 'Order Cancelled ❌', body: 'Your order has been cancelled by the farmer.' },
    };
    if (notifMessages[status]) {
      const { title, body } = notifMessages[status];
      await notify(updatedOrder.buyer_id, title, body, 'order', { order_id: id });
    }

    res.status(200).json(updatedOrder);
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ error: 'Failed to update order' });
  }
});

export default router;
