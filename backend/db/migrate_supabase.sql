-- AgriMart Phase 1 Supabase Migration
-- Run this in the Supabase SQL Editor after running the main init.sql

-- 1. Full-text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS search_vector TSVECTOR
  GENERATED ALWAYS AS (
    to_tsvector('english', crop_name || ' ' || COALESCE(category,'') || ' ' || COALESCE(description,''))
  ) STORED;

CREATE INDEX IF NOT EXISTS products_search_idx ON products USING GIN(search_vector);

-- 2. New columns in users table for Supabase Auth link
ALTER TABLE users ADD COLUMN IF NOT EXISTS supabase_uid UUID UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;

-- 3. Row Level Security (RLS)
-- These ensure that even if someone connects directly to the DB, they can't see others' data

-- Cart Items: Buyer can only see their own cart
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY cart_owner ON cart_items 
  FOR ALL 
  USING (buyer_id = (SELECT id FROM users WHERE supabase_uid = auth.uid()));

-- Orders: Only buyer and farmer involved can see the order
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY order_parties ON orders 
  FOR ALL 
  USING (
    buyer_id = (SELECT id FROM users WHERE supabase_uid = auth.uid()) OR 
    farmer_id = (SELECT id FROM users WHERE supabase_uid = auth.uid())
  );

-- Disputes: Only the person who raised it (and admin) can see it
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;
CREATE POLICY dispute_parties ON disputes 
  FOR ALL 
  USING (raised_by = (SELECT id FROM users WHERE supabase_uid = auth.uid()));

-- Products: Anyone can read, only farmer can insert/update their own
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY products_read_all ON products FOR SELECT USING (true);
CREATE POLICY products_manage_own ON products 
  FOR ALL 
  USING (farmer_id = (SELECT id FROM users WHERE supabase_uid = auth.uid()));
