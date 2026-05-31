-- Auctions
ALTER TABLE products ADD COLUMN IF NOT EXISTS auction_end_at TIMESTAMPTZ;
ALTER TABLE products ADD COLUMN IF NOT EXISTS auction_min_bid NUMERIC;

CREATE TABLE IF NOT EXISTS auction_bids (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    bidder_id UUID REFERENCES users(id) ON DELETE CASCADE,
    bid_amount NUMERIC NOT NULL,
    status TEXT DEFAULT 'active', -- 'active', 'outbid', 'won', 'cancelled'
    placed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Price History
CREATE TABLE IF NOT EXISTS price_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    price_per_kg NUMERIC NOT NULL,
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger function for price history
CREATE OR REPLACE FUNCTION record_price_history()
RETURNS TRIGGER AS $$
BEGIN
    -- Record if this is a new product or if the price changed
    IF (TG_OP = 'INSERT') OR (TG_OP = 'UPDATE' AND OLD.price_per_kg IS DISTINCT FROM NEW.price_per_kg) THEN
        INSERT INTO price_history (product_id, price_per_kg)
        VALUES (NEW.id, NEW.price_per_kg);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS trg_record_price_history ON products;
CREATE TRIGGER trg_record_price_history
AFTER INSERT OR UPDATE OF price_per_kg ON products
FOR EACH ROW
EXECUTE FUNCTION record_price_history();

-- Backfill initial price history for existing products
INSERT INTO price_history (product_id, price_per_kg, recorded_at)
SELECT id, price_per_kg, created_at FROM products
WHERE id NOT IN (SELECT product_id FROM price_history);
