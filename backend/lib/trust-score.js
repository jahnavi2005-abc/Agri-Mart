import pool from '../db/index.js';

/**
 * Recalculate seller_trust_level for a given farmer.
 * Factors:
 * 1. Average Rating (0-50 points)
 * 2. Order Completion Rate (0-30 points)
 * 3. Dispute Win Ratio (0-20 points)
 */
export async function recalculateTrustScore(farmerId) {
  try {
    // 1. Average Rating (max 50 points, 10 pts per star)
    const ratingRes = await pool.query(`SELECT avg_rating FROM farmer_profiles WHERE user_id = $1`, [farmerId]);
    const avgRating = ratingRes.rows.length > 0 ? Number(ratingRes.rows[0].avg_rating) || 0 : 0;
    const ratingScore = avgRating * 10;

    // 2. Order Completion Rate (max 30 points)
    // Completed orders vs all orders for this farmer
    const ordersRes = await pool.query(`
      SELECT 
        COUNT(*) as total_orders,
        COUNT(*) FILTER (WHERE status = 'delivered') as completed_orders
      FROM orders
      WHERE farmer_id = $1
    `, [farmerId]);
    
    let completionRate = 0;
    if (ordersRes.rows.length > 0 && Number(ordersRes.rows[0].total_orders) > 0) {
      completionRate = Number(ordersRes.rows[0].completed_orders) / Number(ordersRes.rows[0].total_orders);
    } else {
      completionRate = 1; // Default to 100% if no orders yet
    }
    const completionScore = completionRate * 30;

    // 3. Dispute Win Ratio (max 20 points)
    const disputesRes = await pool.query(`
      SELECT 
        COUNT(*) as total_disputes,
        COUNT(*) FILTER (WHERE resolution = 'no_refund' OR resolution = 'rejected') as won_disputes
      FROM disputes
      WHERE order_id IN (SELECT id FROM orders WHERE farmer_id = $1)
    `, [farmerId]);

    let disputeWinRatio = 1; // Default to 100% if no disputes
    if (disputesRes.rows.length > 0 && Number(disputesRes.rows[0].total_disputes) > 0) {
      disputeWinRatio = Number(disputesRes.rows[0].won_disputes) / Number(disputesRes.rows[0].total_disputes);
    }
    const disputeScore = disputeWinRatio * 20;

    // Final Score
    let trustScore = Math.round(ratingScore + completionScore + disputeScore);
    
    // KYC Boost: if kyc is approved, ensure a minimum score or add a small bump
    const kycRes = await pool.query(`SELECT kyc_status FROM farmer_profiles WHERE user_id = $1`, [farmerId]);
    if (kycRes.rows.length > 0 && kycRes.rows[0].kyc_status === 'approved') {
      trustScore = Math.min(100, trustScore + 10);
    }

    // Cap at 100
    trustScore = Math.min(100, Math.max(0, trustScore));

    // Update users table
    await pool.query(`UPDATE users SET seller_trust_level = $1 WHERE id = $2`, [trustScore, farmerId]);

    return trustScore;
  } catch (error) {
    console.error('Error calculating trust score for farmer', farmerId, error);
    return null;
  }
}
