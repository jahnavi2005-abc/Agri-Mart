-- ============================================================
-- AgriMart Phase 5 Migration
-- Creates: notifications table, enquiries table,
--          flagged column on products, low stock trigger
-- ============================================================

-- 1. Notifications table (used by Supabase Realtime on frontend)
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT DEFAULT 'general',
  data JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id
  ON notifications(user_id, is_read, created_at DESC);

-- Note: RLS policies using auth.uid() should be configured in Supabase dashboard
-- The backend inserts notifications via service role key which bypasses RLS

-- 2. Enquiries table (bulk/wholesale order requests)
CREATE TABLE IF NOT EXISTS enquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  buyer_id UUID REFERENCES users(id) ON DELETE CASCADE,
  farmer_id UUID REFERENCES users(id),
  quantity_kg NUMERIC NOT NULL CHECK (quantity_kg > 0),
  offered_price NUMERIC,
  message TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  accepted_price NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Flagged column on products (for admin moderation)
ALTER TABLE products ADD COLUMN IF NOT EXISTS flagged BOOLEAN DEFAULT false;

-- 4. Low stock alert trigger
CREATE OR REPLACE FUNCTION check_low_stock()
RETURNS TRIGGER AS $$
BEGIN
  -- Fire when stock drops below 20% of original quantity
  IF NEW.available_quantity_kg < (NEW.quantity_kg * 0.20)
     AND NEW.available_quantity_kg > 0
     AND (OLD.available_quantity_kg IS NULL OR OLD.available_quantity_kg >= (NEW.quantity_kg * 0.20))
  THEN
    INSERT INTO notifications (user_id, title, body, type, data)
    VALUES (
      NEW.farmer_id,
      'Low Stock Alert ⚠️',
      'Your ' || NEW.crop_name || ' is running low — only ' ||
        ROUND(NEW.available_quantity_kg::numeric, 0) || ' kg remaining.',
      'stock_alert',
      jsonb_build_object('product_id', NEW.id, 'crop_name', NEW.crop_name)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS low_stock_trigger ON products;
CREATE TRIGGER low_stock_trigger
  AFTER UPDATE OF available_quantity_kg ON products
  FOR EACH ROW
  EXECUTE FUNCTION check_low_stock();
