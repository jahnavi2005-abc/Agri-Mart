import express from 'express';
import pool from '../db/index.js';
import { verifyToken } from './auth.js';
import { z } from 'zod';

const router = express.Router();

// GET /api/products - list products with advanced filters and ranking (Phase 5)
router.get('/', async (req, res) => {
  try {
    const { 
      category, organic, maxPrice, minPrice, search, farmerId, includeOwnInactive, 
      listingType, grade, lat, lng, radius, minTrust, minRating, harvestFreshness, deliveryType 
    } = req.query;

    let conditions = [];
    let values = [];
    let paramIndex = 1;

    // Base active check
    if (includeOwnInactive !== 'true') {
      conditions.push(`p.status = 'active'`);
      conditions.push(`COALESCE(p.flagged, false) = false`);
    }

    if (farmerId) {
      conditions.push(`p.farmer_id = $${paramIndex++}`);
      values.push(farmerId);
    }

    if (category && category !== 'All') {
      conditions.push(`p.category = $${paramIndex++}`);
      values.push(category);
    }

    if (organic === 'true') {
      conditions.push(`p.is_organic = true`);
    }

    if (maxPrice) {
      conditions.push(`p.price_per_kg <= $${paramIndex++}`);
      values.push(parseFloat(maxPrice));
    }
    
    if (minPrice) {
      conditions.push(`p.price_per_kg >= $${paramIndex++}`);
      values.push(parseFloat(minPrice));
    }

    if (search && search.trim()) {
      const q = search.trim().split(/\\s+/).map(word => `${word}:*`).join(' & ');
      conditions.push(`search_vector @@ to_tsquery('english', $${paramIndex})`);
      values.push(q);
      paramIndex++;
    }

    // Region fallback if no lat/lng provided
    if (!lat || !lng) {
      if (req.query.state && req.query.state !== 'All') {
        conditions.push(`p.state = $${paramIndex++}`);
        values.push(req.query.state);
      }
      if (req.query.district && req.query.district.trim()) {
        conditions.push(`LOWER(p.district) LIKE LOWER($${paramIndex++})`);
        values.push(`%${req.query.district.trim()}%`);
      }
    }

    // Advanced Filters (Phase 5)
    if (listingType && listingType !== 'All') {
      if (listingType === 'auction') {
        conditions.push(`p.listing_type = 'auction'`);
      } else if (listingType === 'buy_now') {
        conditions.push(`(p.listing_type = 'immediate' OR p.listing_type IS NULL)`);
      }
    }

    if (grade && grade !== 'All') {
      const grades = grade.split(',');
      const placeholders = grades.map(() => `$${paramIndex++}`).join(',');
      conditions.push(`p.grade IN (${placeholders})`);
      values.push(...grades);
    }
    
    if (harvestFreshness) {
      conditions.push(`p.harvest_date >= NOW() - INTERVAL '${parseInt(harvestFreshness)} days'`);
    }
    
    if (deliveryType && deliveryType !== 'All') {
      conditions.push(`p.delivery_options->>'type' = $${paramIndex++}`);
      values.push(deliveryType);
    }
    
    if (minTrust) {
      conditions.push(`u.seller_trust_level >= $${paramIndex++}`);
      values.push(parseInt(minTrust));
    }
    
    if (minRating) {
      conditions.push(`p.avg_rating >= $${paramIndex++}`);
      values.push(parseFloat(minRating));
    }

    // Geo-Distance Filter using Haversine
    let selectDistance = '0';
    if (lat && lng) {
      const userLat = parseFloat(lat);
      const userLng = parseFloat(lng);
      const searchRadius = radius ? parseFloat(radius) : 50; // Default 50km
      
      // Haversine formula
      selectDistance = `(
        6371 * acos(
          cos(radians($${paramIndex})) * 
          cos(radians(p.location_lat)) * 
          cos(radians(p.location_lng) - radians($${paramIndex+1})) + 
          sin(radians($${paramIndex})) * 
          sin(radians(p.location_lat))
        )
      )`;
      
      conditions.push(`(p.location_lat IS NULL OR p.location_lng IS NULL OR ${selectDistance} <= $${paramIndex+2})`);
      values.push(userLat, userLng, searchRadius);
      paramIndex += 3;
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Ranking Engine: Weighting Distance, Trust, Rating, Price, Freshness
    // Lower score is better for sorting DESC if we invert distance and price, but let's build a positive score:
    // score = (100 / MAX(distance, 1)) * 30 + (Trust / 100) * 25 + (Rating / 5) * 20 - (Price * 0.1)
    
    let rankScore = `
      (
        CASE
          WHEN p.location_lat IS NULL OR p.location_lng IS NULL OR ${selectDistance} = 0 THEN 0
          ELSE (100 / GREATEST(${selectDistance}, 1)) * 0.30
        END +
        COALESCE(u.seller_trust_level, 50) * 0.25 +
        COALESCE(p.avg_rating, 0) * 4.0 +
        CASE WHEN p.is_organic THEN 5 ELSE 0 END +
        CASE WHEN p.harvest_date >= NOW() - INTERVAL '7 days' THEN 10 ELSE 0 END
      )
    `;

    // Only apply Ranking Engine if doing a general search (no specific farmer)
    let orderBy = `ORDER BY p.created_at DESC`;
    if (!farmerId && !includeOwnInactive) {
      orderBy = `ORDER BY ranking_score DESC, p.created_at DESC`;
    }

    const query = `
      SELECT p.*, 
             u.name as farmer_name, 
             u.district as farmer_district, 
             u.seller_trust_level,
             ${selectDistance} as distance_km,
             ${rankScore} as ranking_score
      FROM products p
      LEFT JOIN users u ON p.farmer_id = u.id
      ${where}
      ${orderBy}
    `;

    const result = await pool.query(query, values);
    res.status(200).json(result.rows);
  } catch (error) {
    req.log?.error({ err: error }, 'Advanced Search query failed');
    console.error('Advanced Search error:', error);
    res.status(500).json({ error: 'Failed to load products' });
  }
});

// GET /api/products/autocomplete - search suggestions
router.get('/autocomplete', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || typeof q !== 'string' || q.trim().length < 2) {
      return res.json([]);
    }

    const tsQuery = q.trim().split(/\s+/).map(word => `${word}:*`).join(' & ');
    
    // Using ts_rank to get best matches, limit to 5
    const result = await pool.query(`
      SELECT DISTINCT crop_name, category
      FROM products
      WHERE status = 'active' AND search_vector @@ to_tsquery('english', $1)
      ORDER BY ts_rank(search_vector, to_tsquery('english', $1)) DESC
      LIMIT 5
    `, [tsQuery]);

    res.json(result.rows);
  } catch (error) {
    console.error('Autocomplete error:', error);
    res.status(500).json({ error: 'Failed to fetch suggestions' });
  }
});

// GET /api/products/:id - get single product
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT p.*, u.name as farmer_name, u.district as farmer_district, u.phone as farmer_phone
       FROM products p
       LEFT JOIN users u ON p.farmer_id = u.id
       WHERE p.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ error: 'Failed to load product' });
  }
});

// GET /api/products/:id/price-history - get price history
router.get('/:id/price-history', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT price_per_kg, recorded_at 
       FROM price_history 
       WHERE product_id = $1 
       ORDER BY recorded_at ASC`,
      [id]
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Get price history error:', error);
    res.status(500).json({ error: 'Failed to load price history' });
  }
});

const CreateProductSchema = z.object({
  crop_name: z.string().min(2).max(100),
  category: z.string().min(2),
  description: z.string().optional(),
  quantity_kg: z.coerce.number().positive(),
  minimum_order_kg: z.coerce.number().positive().optional(),
  price_per_kg: z.coerce.number().positive(),
  grade: z.string().optional(),
  is_organic: z.boolean().optional(),
  harvest_date: z.string().optional(),
  available_from: z.string().optional(),
  listing_type: z.string().optional(),
  district: z.string().optional(),
  state: z.string().optional(),
  delivery_options: z.any().optional(),
  packaging_info: z.string().optional(),
  image_urls: z.array(z.string()).optional(),
  video_url: z.string().optional(),
  price_negotiable: z.boolean().optional(),
  auction_end_at: z.string().optional(),
  auction_min_bid: z.coerce.number().optional(),
});

// POST /api/products - create product (farmer only)
router.post('/', verifyToken, async (req, res) => {
  if (req.user.role !== 'farmer') {
    return res.status(403).json({ error: 'Only farmers can create products' });
  }

  const parsed = CreateProductSchema.safeParse(req.body);
  if (!parsed.success) {
    console.error('Validation error:', JSON.stringify(parsed.error.format(), null, 2));
    return res.status(400).json({ error: 'Validation failed', details: parsed.error.format() });
  }

  const {
    crop_name, category, description, quantity_kg, minimum_order_kg,
    price_per_kg, grade, is_organic, harvest_date, available_from,
    listing_type, district, state, delivery_options, packaging_info,
    image_urls, video_url, price_negotiable, auction_end_at, auction_min_bid
  } = parsed.data;

  try {
    const result = await pool.query(
      `INSERT INTO products (
        farmer_id, crop_name, category, description, quantity_kg, available_quantity_kg,
        minimum_order_kg, price_per_kg, grade, is_organic, harvest_date, available_from,
        listing_type, district, state, delivery_options, packaging_info,
        image_urls, video_url, price_negotiable, status, auction_end_at, auction_min_bid
      ) VALUES ($1,$2,$3,$4,$5,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,'active', $20, $21)
      RETURNING *`,
      [
        req.user.id, crop_name, category, description, quantity_kg,
        minimum_order_kg, price_per_kg, grade, is_organic, harvest_date,
        available_from, listing_type || 'immediate', district, state,
        JSON.stringify(delivery_options || {}), packaging_info,
        JSON.stringify(image_urls || []), video_url, price_negotiable,
        auction_end_at || null, auction_min_bid || null
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// PATCH /api/products/:id/status - update product status (farmer only)
router.patch('/:id/status', verifyToken, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const validStatuses = ['draft', 'active', 'paused', 'sold_out', 'removed'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status value' });
  }

  try {
    const result = await pool.query(
      `UPDATE products SET status = $1, updated_at = NOW() 
       WHERE id = $2 AND farmer_id = $3 RETURNING *`,
      [status, id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found or not authorized' });
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Update product status error:', error);
    res.status(500).json({ error: 'Failed to update product status' });
  }
});

// PATCH /api/products/:id - update product details (farmer only)
router.patch('/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  const { available_quantity_kg, price_per_kg } = req.body;

  try {
    const fields = [];
    const values = [];
    let idx = 1;

    if (available_quantity_kg !== undefined) {
      fields.push(`available_quantity_kg = $${idx++}`);
      values.push(available_quantity_kg);
    }
    if (price_per_kg !== undefined) {
      fields.push(`price_per_kg = $${idx++}`);
      values.push(price_per_kg);
    }

    if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' });

    fields.push(`updated_at = NOW()`);
    values.push(id);
    values.push(req.user.id);

    const result = await pool.query(
      `UPDATE products SET ${fields.join(', ')} 
       WHERE id = $${idx} AND farmer_id = $${idx + 1} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found or not authorized' });
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

export default router;
