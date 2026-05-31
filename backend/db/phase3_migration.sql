-- 1. Create Wishlists Table
CREATE TABLE IF NOT EXISTS wishlists (
    buyer_id UUID REFERENCES users(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (buyer_id, product_id)
);

-- 2. Create Payouts Table
CREATE TABLE IF NOT EXISTS payouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farmer_id UUID REFERENCES users(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    upi_id TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    utr_number TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

-- 3. Modify Reviews Table to match our backend code
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS farmer_reply TEXT;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS reply_created_at TIMESTAMPTZ;

-- 4. Add review_id to order_items to ensure 1 review per item
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS review_id UUID REFERENCES reviews(id) ON DELETE SET NULL;

-- 5. Modify Disputes Table to match our backend code
ALTER TABLE disputes ADD COLUMN IF NOT EXISTS buyer_evidence_url TEXT;
ALTER TABLE disputes ADD COLUMN IF NOT EXISTS farmer_evidence_url TEXT;
ALTER TABLE disputes ADD COLUMN IF NOT EXISTS farmer_notes TEXT;
ALTER TABLE disputes ADD COLUMN IF NOT EXISTS resolution_notes TEXT;
ALTER TABLE disputes ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'open' CHECK (status IN ('open', 'resolved_refunded', 'resolved_rejected'));

-- Disable constraint on reason so we can use new ones
ALTER TABLE disputes DROP CONSTRAINT IF EXISTS disputes_reason_check;
ALTER TABLE disputes DROP CONSTRAINT IF EXISTS disputes_resolution_check;
