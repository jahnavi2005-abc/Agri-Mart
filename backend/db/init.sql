-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    phone TEXT,
    role TEXT NOT NULL CHECK (role IN ('farmer', 'buyer', 'admin')),
    avatar_url TEXT,
    district TEXT,
    state TEXT,
    address TEXT,
    language TEXT DEFAULT 'en',
    is_verified BOOLEAN DEFAULT false,
    email_verified BOOLEAN DEFAULT false,
    supabase_uid UUID UNIQUE,
    is_banned BOOLEAN DEFAULT false,
    login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMPTZ,
    seller_trust_level INTEGER DEFAULT 0,
    fcm_token TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Farmer Profiles Table
CREATE TABLE IF NOT EXISTS farmer_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    farm_name TEXT,
    farm_size_acres NUMERIC,
    primary_crops TEXT[],
    aadhaar_last4 TEXT,
    kyc_status TEXT DEFAULT 'pending' CHECK (kyc_status IN ('pending', 'approved', 'rejected')),
    kyc_document_url TEXT,
    bank_account_last4 TEXT,
    upi_id TEXT,
    rating NUMERIC DEFAULT 0,
    total_sales NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- 3. Products Table
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farmer_id UUID REFERENCES users(id) ON DELETE CASCADE,
    crop_name TEXT NOT NULL,
    category TEXT,
    description TEXT,
    quantity_kg NUMERIC NOT NULL,
    available_quantity_kg NUMERIC NOT NULL,
    minimum_order_kg NUMERIC,
    maximum_order_kg NUMERIC,
    price_per_kg NUMERIC NOT NULL,
    grade TEXT,
    is_organic BOOLEAN DEFAULT false,
    harvest_date DATE,
    available_from DATE,
    listing_type TEXT DEFAULT 'immediate' CHECK (listing_type IN ('immediate', 'preorder', 'auction')),
    district TEXT,
    state TEXT,
    location_lat NUMERIC,
    location_lng NUMERIC,
    delivery_options JSONB,
    packaging_info TEXT,
    image_urls JSONB,
    video_url TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('draft', 'active', 'paused', 'sold_out', 'removed')),
    price_negotiable BOOLEAN DEFAULT false,
    avg_rating NUMERIC DEFAULT 0,
    review_count INTEGER DEFAULT 0,
    view_count INTEGER DEFAULT 0,
    flagged_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Cart Items Table
CREATE TABLE IF NOT EXISTS cart_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    buyer_id UUID REFERENCES users(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    quantity_kg NUMERIC NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(buyer_id, product_id)
);

-- 5. Orders Table
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    buyer_id UUID REFERENCES users(id) ON DELETE RESTRICT,
    farmer_id UUID REFERENCES users(id) ON DELETE RESTRICT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'packed', 'dispatched', 'delivered', 'cancelled', 'disputed')),
    subtotal NUMERIC NOT NULL,
    platform_fee NUMERIC DEFAULT 0,
    delivery_fee NUMERIC DEFAULT 0,
    total_amount NUMERIC NOT NULL,
    farmer_payout NUMERIC NOT NULL,
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
    payment_method TEXT CHECK (payment_method IN ('razorpay', 'cod', 'upi')),
    delivery_address JSONB NOT NULL,
    expected_delivery_date DATE,
    actual_delivery_date DATE,
    cancellation_reason TEXT,
    dispute_status TEXT CHECK (dispute_status IN (NULL, 'open', 'resolved', 'escalated')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Order Items Table
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE RESTRICT,
    crop_name TEXT NOT NULL,
    quantity_kg NUMERIC NOT NULL,
    price_per_kg NUMERIC NOT NULL,
    total_price NUMERIC NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Payments Table
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    buyer_id UUID REFERENCES users(id) ON DELETE CASCADE,
    razorpay_order_id TEXT,
    razorpay_payment_id TEXT,
    razorpay_signature TEXT,
    amount NUMERIC NOT NULL,
    currency TEXT DEFAULT 'INR',
    status TEXT DEFAULT 'created' CHECK (status IN ('created', 'paid', 'failed', 'refunded')),
    raw_payload JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Reviews Table
CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    buyer_id UUID REFERENCES users(id) ON DELETE CASCADE,
    farmer_id UUID REFERENCES users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    image_urls JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Disputes Table
CREATE TABLE IF NOT EXISTS disputes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    raised_by UUID REFERENCES users(id) ON DELETE CASCADE,
    reason TEXT NOT NULL CHECK (reason IN ('quality_mismatch', 'not_delivered', 'quantity_short', 'fraud', 'other')),
    description TEXT,
    buyer_evidence_urls JSONB,
    farmer_evidence_urls JSONB,
    admin_notes TEXT,
    resolution TEXT DEFAULT 'pending' CHECK (resolution IN ('pending', 'full_refund', 'partial_refund', 'no_refund')),
    refund_amount NUMERIC DEFAULT 0,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
