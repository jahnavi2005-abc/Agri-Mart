import express from 'express';
import pool from '../db/index.js';
import { verifyToken } from './auth.js';

const router = express.Router();

// GET /api/analytics/farmer
// Query params: range=7|30|90 (days)
router.get('/farmer', verifyToken, async (req, res) => {
  if (req.user.role !== 'farmer') {
    return res.status(403).json({ error: 'Only farmers can access analytics' });
  }

  const range = parseInt(req.query.range) || 14;
  const farmerId = req.user.id;

  try {
    // 1. Overall stats (all time)
    const statsRes = await pool.query(
      `SELECT 
        COUNT(DISTINCT o.id) as total_orders,
        SUM(o.farmer_payout) as total_revenue,
        AVG(o.farmer_payout) as avg_order_value
       FROM orders o
       WHERE o.farmer_id = $1 AND o.status NOT IN ('cancelled', 'pending')`,
      [farmerId]
    );

    const stats = statsRes.rows[0];

    // 2. Best selling crop (all time)
    const bestCropRes = await pool.query(
      `SELECT oi.crop_name, SUM(oi.quantity_kg) as total_sold
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       WHERE o.farmer_id = $1 AND o.status NOT IN ('cancelled', 'pending')
       GROUP BY oi.crop_name
       ORDER BY total_sold DESC
       LIMIT 1`,
      [farmerId]
    );

    const bestCrop = bestCropRes.rows[0]?.crop_name || 'None';

    // 3. Earnings over time (for the chart)
    const earningsRes = await pool.query(
      `SELECT 
         DATE(o.created_at) as day,
         SUM(o.farmer_payout) as amount
       FROM orders o
       WHERE o.farmer_id = $1 
         AND o.status NOT IN ('cancelled', 'pending')
         AND o.created_at >= NOW() - INTERVAL '1 day' * $2
       GROUP BY DATE(o.created_at)
       ORDER BY day ASC`,
      [farmerId, range]
    );

    // Fill missing days with 0
    const earningsMap = new Map(earningsRes.rows.map(r => [r.day.toISOString().split('T')[0], parseFloat(r.amount)]));
    const chartData = [];
    for (let i = range - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayStr = d.toISOString().split('T')[0];
      chartData.push({
        day: dayStr,
        amount: earningsMap.get(dayStr) || 0
      });
    }

    // 4. Revenue by category
    const categoryRes = await pool.query(
      `SELECT p.category, SUM(oi.total_price) as revenue
       FROM order_items oi
       JOIN products p ON p.id = oi.product_id
       JOIN orders o ON o.id = oi.order_id
       WHERE o.farmer_id = $1 AND o.status NOT IN ('cancelled', 'pending')
       GROUP BY p.category`,
      [farmerId]
    );

    res.json({
      total_orders: parseInt(stats.total_orders) || 0,
      total_revenue: parseFloat(stats.total_revenue) || 0,
      avg_order_value: parseFloat(stats.avg_order_value) || 0,
      best_crop: bestCrop,
      earnings_chart: chartData,
      category_revenue: categoryRes.rows.map(r => ({ name: r.category, value: parseFloat(r.revenue) }))
    });
  } catch (error) {
    req.log?.error({ err: error }, 'Failed to fetch farmer analytics');
    res.status(500).json({ error: 'Failed to load analytics' });
  }
});

export default router;
