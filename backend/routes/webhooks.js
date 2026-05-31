import express from 'express';
import crypto from 'crypto';
import pool from '../db/index.js';

const router = express.Router();

router.post('/razorpay', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    
    // Compute HMAC
    const expected = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(req.body)
      .digest('hex');

    if (signature !== expected) {
      console.warn('[webhook] Invalid Razorpay signature');
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const event = JSON.parse(req.body);
    
    if (event.event === 'payment.captured') {
      const orderId = event.payload.payment.entity.notes?.order_id;
      if (orderId) {
        await pool.query(`UPDATE orders SET payment_status = 'paid' WHERE id = $1`, [orderId]);
        console.log(`[webhook] Order ${orderId} marked as paid.`);
      }
    }
    
    if (event.event === 'refund.processed') {
      const orderId = event.payload.refund.entity.notes?.order_id;
      if (orderId) {
        await pool.query(`UPDATE orders SET payment_status = 'refunded' WHERE id = $1`, [orderId]);
        console.log(`[webhook] Order ${orderId} marked as refunded.`);
      }
    }

    res.status(200).json({ received: true });
  } catch (err) {
    console.error('[webhook] Razorpay error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
