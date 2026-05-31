import express from 'express';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

import WebSocket from 'ws';

dotenv.config();

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
  realtime: { transport: WebSocket }
});

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

router.post('/create-order', async (req, res) => {
  try {
    const { orderId } = req.body;
    
    // Fetch the order from Supabase
    const { data: order, error } = await supabase
      .from('orders')
      .select('total_amount, id')
      .eq('id', orderId)
      .single();
      
    if (error || !order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Create Razorpay order
    const options = {
      amount: Math.round(order.total_amount * 100), // amount in smallest currency unit (paise)
      currency: "INR",
      receipt: `receipt_order_${orderId}`,
    };
    
    const rzpOrder = await razorpay.orders.create(options);
    
    res.status(200).json({
      keyId: process.env.RAZORPAY_KEY_ID,
      razorpayOrderId: rzpOrder.id,
      amount: options.amount,
      currency: options.currency,
      name: "AgriMart",
      description: `Payment for Order ${orderId}`
    });
  } catch (error) {
    console.error('Razorpay create-order error:', error);
    res.status(500).json({ error: 'Failed to create payment order' });
  }
});

router.post('/verify', async (req, res) => {
  try {
    const { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    const isAuthentic = expectedSignature === razorpay_signature;

    if (isAuthentic) {
      // Payment is successful, update the order in Supabase
      const { error } = await supabase
        .from('orders')
        .update({ payment_status: 'paid', status: 'accepted' })
        .eq('id', orderId);

      if (error) {
         console.error('Failed to update order status:', error);
         return res.status(500).json({ error: 'Failed to update order in database' });
      }

      res.status(200).json({ message: 'Payment verified successfully' });
    } else {
      res.status(400).json({ error: 'Invalid payment signature' });
    }
  } catch (error) {
    console.error('Razorpay verify error:', error);
    res.status(500).json({ error: 'Payment verification failed' });
  }
});

export default router;
