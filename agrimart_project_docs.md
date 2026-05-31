# AgriMart — Complete Project Documentation

> **Direct Farmer-to-Buyer Agricultural Marketplace**
> India's platform for eliminating middlemen between farmers and buyers.

---

## 1. Project Overview

AgriMart is a full-stack web application that connects **farmers** who want to sell their crops directly with **buyers** who want to purchase fresh produce without middlemen. It is a role-based marketplace with separate dashboards, listing management, order placement, cart & checkout, profile editing, and a full admin panel.

### Core Goals
- Farmers can list crops with pricing, grade, organic certification, and delivery options
- Buyers can browse, filter, add to cart, and place orders directly from farmers
- All transactions are tracked with order status (pending → accepted → packed → dispatched → delivered)
- Platform charges a 2% fee per order and ₹80 delivery flat rate
- No external authentication service — fully custom JWT-based auth with local PostgreSQL

---

## 2. Technology Stack

### Frontend
| Technology | Purpose |
|---|---|
| **React 18** | UI framework |
| **TypeScript** | Type safety across all components and API calls |
| **TanStack Router v1** | File-based routing with type-safe navigation |
| **TanStack Start** | SSR-capable React meta-framework (Vite-based) |
| **Recharts** | Earnings chart on farmer dashboard |
| **Lucide React** | Icon library |
| **Vanilla CSS** | Custom design system with CSS variables (no Tailwind) |
| **Google Fonts** | Inter (body), JetBrains Mono (numbers), Clash Display (headings) |

### Backend
| Technology | Purpose |
|---|---|
| **Node.js (ESM)** | Server runtime |
| **Express.js v5** | HTTP server and routing |
| **PostgreSQL** | Primary database (local instance) |
| **pg (node-postgres)** | PostgreSQL client |
| **bcrypt** | Password hashing |
| **jsonwebtoken** | JWT token generation and verification |
| **AWS SDK v3 (S3)** | Crop image storage (with fallback to Unsplash URLs) |
| **Razorpay** | Payment gateway (integrated, COD default) |
| **cors** | Cross-origin request handling |
| **dotenvx** | Environment variable management |

### Infrastructure
| Component | Detail |
|---|---|
| **Database** | PostgreSQL running locally on default port 5432 |
| **Frontend dev server** | Vite on `http://localhost:3000` |
| **Backend API server** | Express on `http://localhost:3001` |
| **API proxy** | Vite proxies `/api/*` to `http://localhost:3001` |
| **Image storage** | AWS S3 bucket `agrimart-user-crop-images` (fallback: Unsplash CDN) |

---

## 3. Folder Structure

```
AgriMart/
├── frontend/                        # React/TypeScript SPA
│   ├── src/
│   │   ├── routes/                  # File-based pages (TanStack Router)
│   │   │   ├── __root.tsx           # Root layout (AuthProvider, Head, Scripts)
│   │   │   ├── index.tsx            # Landing page / Home
│   │   │   ├── login.tsx            # Sign in page
│   │   │   ├── register.tsx         # Multi-step sign up (role selection)
│   │   │   ├── listings.index.tsx   # Browse all products with filters
│   │   │   ├── listings.$id.tsx     # Product detail page (Premium glassmorphic tabs, Live Auction UI)
│   │   │   ├── cart.tsx             # Shopping cart
│   │   │   ├── checkout.tsx         # 3-step checkout (Address → Review → Place Order)
│   │   │   ├── orders.index.tsx     # My orders list
│   │   │   ├── orders.$id.tsx       # Order tracking with glowing timeline and review system
│   │   │   ├── profile.edit.tsx     # Edit user profile and unified Settings
│   │   │   ├── notifications.tsx    # Notification centre
│   │   │   ├── market-prices.tsx    # Market price reference
│   │   │   ├── dashboard.buyer.tsx  # Buyer dashboard (featured products, categories)
│   │   │   ├── dashboard.farmer.tsx # Farmer dashboard (listings, earnings chart)
│   │   │   ├── farmer.list-product.tsx  # Farmer: create/edit crop listing
│   │   │   ├── admin.dashboard.tsx  # Admin overview
│   │   │   ├── admin.users.tsx      # Admin: manage users
│   │   │   ├── admin.products.tsx   # Admin: manage products
│   │   │   ├── admin.orders.tsx     # Admin: manage orders
│   │   │   └── admin.disputes.tsx   # Admin: dispute resolution
│   │   │
│   │   ├── components/              # Reusable UI components
│   │   │   ├── Navbar.tsx           # Top navigation (smart logo, profile dropdown, cart badge)
│   │   │   ├── BottomNav.tsx        # Mobile bottom tab bar (auth-aware, role-specific tabs)
│   │   │   ├── PageShell.tsx        # Layout wrapper (Navbar + BottomNav + main)
│   │   │   ├── ProductCard.tsx      # Crop listing card (rating, location, quick add-to-cart)
│   │   │   ├── RoleRoute.tsx        # Route guard (redirects if wrong role or not logged in)
│   │   │   ├── AdminShell.tsx       # Admin sidebar layout
│   │   │   └── ui/                  # shadcn-style UI primitives (chart, etc.)
│   │   │
│   │   ├── hooks/
│   │   │   ├── useAuth.tsx          # Auth context (signIn, signOut, refreshProfile, profile state)
│   │   │   ├── useProducts.ts       # Hook to fetch product list or single product
│   │   │   ├── useOrderStatus.ts    # Hook for real-time order tracking
│   │   │   └── use-mobile.tsx       # Responsive breakpoint hook
│   │   │
│   │   ├── lib/                     # Business logic / API calls
│   │   │   ├── auth.ts              # signInWithEmail, registerWithEmail, getAuthToken, logout
│   │   │   ├── products.ts          # listProducts, getProductById, createProduct, updateProfile
│   │   │   ├── orders.ts            # createOrdersFromCart, listMyOrders, updateOrderStatus
│   │   │   ├── cart.ts              # addToCart, removeCartItem, updateCartQuantity, cartTotals
│   │   │   ├── payments.ts          # payOrderWithRazorpay (Razorpay integration)
│   │   │   ├── uploads.ts           # uploadProductImage (S3 presigned URL upload)
│   │   │   ├── notifications.ts     # listNotifications, markNotificationRead
│   │   │   ├── reviews.ts           # createReview, listProductReviews
│   │   │   ├── disputes.ts          # createDispute, getDispute
│   │   │   ├── admin.ts             # Admin API calls
│   │   │   ├── market.ts            # Market price data
│   │   │   └── utils.ts             # Shared utility functions
│   │   │
│   │   ├── types/
│   │   │   ├── database.ts          # UserProfile, FarmerProfile, UserRole types
│   │   │   ├── product.ts           # Product, ProductFilters, CreateProductInput types
│   │   │   └── order.ts             # Order, OrderItem, CartItem, DeliveryAddress types
│   │   │
│   │   ├── styles.css               # Global CSS design system (tokens, animations, utilities)
│   │   ├── router.tsx               # TanStack Router configuration
│   │   └── routeTree.gen.ts         # Auto-generated route tree
│   │
│   └── package.json
│
└── backend/                         # Express.js API server
    ├── server.js                    # Entry point (Express app, middleware, route registration)
    ├── routes/
    │   ├── auth.js                  # /api/auth/* (signup, login, me, profile update)
    │   ├── products.js              # /api/products/* (CRUD + filtering)
    │   ├── orders.js                # /api/orders/* (create, list, get, status update)
    │   ├── payments.js              # /api/payments/* (Razorpay order creation)
    │   └── uploads.js               # /api/uploads/* (S3 presigned URL generation)
    ├── db/
    │   ├── index.js                 # pg Pool connection singleton
    │   ├── init.sql                 # Full schema SQL (all 9 tables)
    │   ├── phase3_migration.sql     # Full Text Search & Reviews additions
    │   ├── phase4_migration.sql     # Auctions, Trust Scores, Analytics
    │   ├── setup.js                 # Runs init.sql to initialise tables
    │   └── seed.js                  # Seeds farmers, buyers, listings, orders
    └── package.json
```

---

## 4. Database Schema (PostgreSQL)

### 4.1 `users` — All accounts (farmers, buyers, admins)

| Column | Type | Description |
|---|---|---|
| `id` | UUID PK | Auto-generated UUID |
| `name` | TEXT | Full name |
| `email` | TEXT UNIQUE | Login email (normalised lowercase) |
| `password_hash` | TEXT | bcrypt hash (never returned to frontend) |
| `phone` | TEXT | With +91 prefix |
| `role` | TEXT | `'farmer'` / `'buyer'` / `'admin'` |
| `avatar_url` | TEXT | Profile photo URL |
| `district` | TEXT | Location district |
| `state` | TEXT | Indian state |
| `address` | TEXT | Full delivery address |
| `language` | TEXT | Preferred language (default `'en'`) |
| `is_verified` | BOOLEAN | Account verification status |
| `is_banned` | BOOLEAN | Admin ban flag |
| `login_attempts` | INTEGER | Failed login count |
| `locked_until` | TIMESTAMPTZ | Account lockout expiry |
| `seller_trust_level` | INTEGER | Platform trust score (0-100) |
| `fcm_token` | TEXT | Firebase push notification token |
| `created_at` | TIMESTAMPTZ | Account creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last update timestamp |

---

### 4.2 `farmer_profiles` — Extended farmer data

| Column | Type | Description |
|---|---|---|
| `id` | UUID PK | |
| `user_id` | UUID FK → users | One-to-one with users |
| `farm_name` | TEXT | Farm/brand name |
| `farm_size_acres` | NUMERIC | Total farm area |
| `primary_crops` | TEXT[] | Array of main crop types |
| `aadhaar_last4` | TEXT | KYC ID last 4 digits |
| `kyc_status` | TEXT | `'pending'` / `'approved'` / `'rejected'` |
| `kyc_document_url` | TEXT | KYC document S3 URL |
| `bank_account_last4` | TEXT | Payout bank account |
| `upi_id` | TEXT | UPI ID for payouts |
| `rating` | NUMERIC | Average rating (0–5) |
| `total_sales` | NUMERIC | Lifetime sales in ₹ |

---

### 4.3 `products` — Crop listings

| Column | Type | Description |
|---|---|---|
| `id` | UUID PK | |
| `farmer_id` | UUID FK → users | Listing owner |
| `crop_name` | TEXT | e.g. "Basmati Rice" |
| `category` | TEXT | e.g. "Grains", "Vegetables" |
| `description` | TEXT | Detailed description |
| `quantity_kg` | NUMERIC | Original total stock |
| `available_quantity_kg` | NUMERIC | Remaining stock (decremented on order) |
| `minimum_order_kg` | NUMERIC | Minimum purchase quantity |
| `maximum_order_kg` | NUMERIC | Maximum per order (optional) |
| `price_per_kg` | NUMERIC | Selling price in ₹ |
| `grade` | TEXT | Quality grade: A, B, C |
| `is_organic` | BOOLEAN | Organic certification |
| `harvest_date` | DATE | When crop was harvested |
| `available_from` | DATE | Earliest availability date |
| `listing_type` | TEXT | `'immediate'` / `'preorder'` / `'auction'` |
| `auction_end_at` | TIMESTAMPTZ | End time for Live Auctions |
| `auction_min_bid`| NUMERIC | Minimum bid required for auctions |
| `district` | TEXT | Farm location district |
| `state` | TEXT | Farm location state |
| `location_lat/lng` | NUMERIC | GPS coordinates |
| `delivery_options` | JSONB | `{ pickup: bool, delivery: bool }` |
| `packaging_info` | TEXT | e.g. "50kg jute bags" |
| `image_urls` | JSONB | Array of image URLs |
| `video_url` | TEXT | Optional product video URL |
| `status` | TEXT | `'draft'` / `'active'` / `'paused'` / `'sold_out'` / `'removed'` |
| `price_negotiable` | BOOLEAN | Buyer can negotiate |
| `avg_rating` | NUMERIC | Computed average rating |
| `review_count` | INTEGER | Total reviews |
| `view_count` | INTEGER | Product page views |
| `flagged_count` | INTEGER | Admin flags |
| `search_vector`  | TSVECTOR | English Full Text Search Vector |

---

### 4.4 `cart_items` — Persistent server-side cart (currently localStorage on client)

| Column | Type | Description |
|---|---|---|
| `id` | UUID PK | |
| `buyer_id` | UUID FK → users | |
| `product_id` | UUID FK → products | |
| `quantity_kg` | NUMERIC | Quantity in cart |
| `UNIQUE(buyer_id, product_id)` | | One entry per product per buyer |

---

### 4.5 `orders` — Confirmed purchase orders

| Column | Type | Description |
|---|---|---|
| `id` | UUID PK | |
| `buyer_id` | UUID FK → users | |
| `farmer_id` | UUID FK → users | Grouped by farmer per order |
| `status` | TEXT | `pending` → `accepted` → `packed` → `dispatched` → `delivered` / `cancelled` / `disputed` |
| `subtotal` | NUMERIC | Pre-fee total |
| `platform_fee` | NUMERIC | 2% of subtotal |
| `delivery_fee` | NUMERIC | Fixed ₹80 |
| `total_amount` | NUMERIC | subtotal + platform_fee + delivery_fee |
| `farmer_payout` | NUMERIC | subtotal - platform_fee |
| `payment_status` | TEXT | `'pending'` / `'paid'` / `'failed'` / `'refunded'` |
| `payment_method` | TEXT | `'cod'` / `'razorpay'` / `'upi'` |
| `delivery_address` | JSONB | `{ name, phone, address, district, pincode }` |
| `expected_delivery_date` | DATE | |
| `actual_delivery_date` | DATE | |
| `cancellation_reason` | TEXT | |
| `dispute_status` | TEXT | `null` / `'open'` / `'resolved'` / `'escalated'` |

---

### 4.6 `order_items` — Individual items within each order

| Column | Type | Description |
|---|---|---|
| `id` | UUID PK | |
| `order_id` | UUID FK → orders | |
| `product_id` | UUID FK → products | |
| `crop_name` | TEXT | Snapshot of name at order time |
| `quantity_kg` | NUMERIC | |
| `price_per_kg` | NUMERIC | Snapshot of price at order time |
| `total_price` | NUMERIC | quantity × price |
| `review_id`  | UUID FK → reviews | Links an item directly to its review |

---

### 4.7 `payments` — Razorpay payment records

| Column | Type | Description |
|---|---|---|
| `id` | UUID PK | |
| `order_id` | UUID FK → orders | |
| `buyer_id` | UUID FK → users | |
| `razorpay_order_id` | TEXT | Razorpay order reference |
| `razorpay_payment_id` | TEXT | Razorpay payment reference |
| `razorpay_signature` | TEXT | HMAC verification |
| `amount` | NUMERIC | Amount in paise |
| `currency` | TEXT | Default `'INR'` |
| `status` | TEXT | `'created'` / `'paid'` / `'failed'` / `'refunded'` |
| `raw_payload` | JSONB | Full Razorpay webhook payload |

---

### 4.8 `reviews` — Product and farmer reviews

| Column | Type | Description |
|---|---|---|
| `id` | UUID PK | |
| `order_id` | UUID FK → orders | Only post-delivery |
| `product_id` | UUID FK → products | |
| `buyer_id` | UUID FK → users | |
| `farmer_id` | UUID FK → users | |
| `rating` | INTEGER | 1–5 stars |
| `comment` | TEXT | Review text |
| `image_urls` | JSONB | Evidence images |

---

### 4.9 `disputes` — Dispute management

| Column | Type | Description |
|---|---|---|
| `id` | UUID PK | |
| `order_id` | UUID FK → orders | |
| `raised_by` | UUID FK → users | Buyer or farmer |
| `reason` | TEXT | `quality_mismatch` / `not_delivered` / `quantity_short` / `fraud` / `other` |
| `description` | TEXT | Detailed explanation |
| `buyer_evidence_urls` | JSONB | Photo evidence from buyer |
| `farmer_evidence_urls` | JSONB | Photo evidence from farmer |
| `admin_notes` | TEXT | Admin investigation notes |
| `resolution` | TEXT | `'pending'` / `'full_refund'` / `'partial_refund'` / `'no_refund'` |
| `refund_amount` | NUMERIC | ₹ amount to refund |
| `resolved_at` | TIMESTAMPTZ | |

---

## 5. API Endpoints

### Authentication — `/api/auth`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/signup` | Public | Create account (farmer/buyer) |
| POST | `/api/auth/login` | Public | Sign in, returns JWT token |
| GET | `/api/auth/me` | JWT | Get current user profile |
| PATCH | `/api/auth/profile` | JWT | Update profile fields |

### Products — `/api/products`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/products` | Optional | List all active products with filters |
| GET | `/api/products/:id` | Optional | Get single product with farmer name joined |
| POST | `/api/products` | Farmer JWT | Create a new crop listing |
| PATCH | `/api/products/:id/status` | Farmer JWT | Toggle listing active/paused |

**Query parameters for `GET /api/products`:**
- `category` — Filter by crop category
- `organic` — `true` for organic only
- `maxPrice` — Maximum price per kg
- `search` — Full Text Search across crop name, category, district
- `state` / `district` — Region proximity filtering
- `listingType` — `auction` or `buy_now` filter
- `grade` — Grade `A`, `B`, or `C` filter
- `farmerId` — Filter by specific farmer
- `includeOwnInactive` — Include paused/draft listings (farmer's own)

### Orders — `/api/orders`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/orders` | JWT | List my orders (buyer or farmer, role-aware) |
| GET | `/api/orders/:id` | JWT | Get order detail with all items |
| POST | `/api/orders` | Buyer JWT | Create orders from cart (grouped by farmer) |
| PATCH | `/api/orders/:id/status` | Farmer JWT | Update order status |

### Auctions — `/api/auctions`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/auctions/:id/bids` | JWT | Get all bids for a specific auction listing |
| POST | `/api/auctions/:id/bid` | Buyer JWT | Place a higher bid on an auction |

### Payments — `/api/payments`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/payments/create-order` | JWT | Create Razorpay order |
| POST | `/api/payments/verify` | JWT | Verify Razorpay signature |

---

## 6. Authentication Flow

```
User fills email + password on /login
        ↓
Frontend calls POST /api/auth/login
        ↓
Backend normalises email (lowercase + trim)
Queries users table → compares bcrypt hash
        ↓
Signs JWT { id, email, role } with 7-day expiry
Returns { session: { access_token, user } }
        ↓
Frontend stores:
  localStorage['token'] = access_token
  localStorage['user']  = user JSON
        ↓
AuthContext.signIn() sets profile state atomically
        ↓
navigate() to role-specific dashboard
```

All protected API calls include:
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

---

## 7. User Roles & Flows

### 7.1 Buyer Flow

```
Register → Select "Buyer" → Fill details → Dashboard

Marketplace (/listings)
├── Search by name / location
├── Filter by Buying Option (Buy Now, Auction)
├── Filter by category, price, grade, organic
└── Premium UI toggle buttons

Product Detail (/listings/:id)
├── Glassmorphic segmented tabs (Details/Farmer/Delivery/Reviews)
├── Glowing Live Auction bidding interface (if auction)
├── Stats row with backdrop-blur
├── Mobile sticky bottom CTA (Place Bid / Add to Cart)
└── Quantity selector

Orders & Reviews (/orders)
├── Order history list
├── Click order for full detail
├── Premium glowing tracking timeline (Placed → Delivered)
├── Dispute filing functionality
└── Inline Review system for delivered items
```

### 7.2 Farmer Flow

```
Dashboard
├── Stats cards: Earnings, Active Listings, Stock, Total Listings
├── Earnings area chart (14-day history powered by Recharts)
├── Trust Score indicator widget
└── Listings table

List Crop (/farmer/list-product)
├── Standard Listing vs Auction selection
├── Crop name, category, description, grade, organic
├── Minimum order, Maximum order
└── Image upload
```

### 7.3 Admin Flow

```
Admin Dashboard (/admin/dashboard)
├── Users management (ban/unban)
├── Products management (flag/remove)
├── Orders management
└── Disputes (issue full/partial refunds, review evidence)
```

---

## 8. Cart System

The cart is stored entirely in **localStorage** (key: `agrimart-cart-v1`) for fast, offline-capable access.

**Pricing formula:**
```
subtotal    = Σ (quantity_kg × price_per_kg)
platform_fee = Math.round(subtotal × 0.02)   // 2%
delivery    = items.length > 0 ? 80 : 0       // ₹80 flat
total       = subtotal + platform_fee + delivery
farmer_payout = subtotal - platform_fee
```

When an order is created:
1. Cart items are grouped by `farmer_id` → one DB order per farmer
2. `available_quantity_kg` is decremented in the products table (DB transaction)
3. Cart is cleared from localStorage

---

## 9. Component Architecture

```
PageShell
├── Navbar
│   ├── Logo (→ dashboard if logged in, → landing if guest)
│   ├── Center nav: Dashboard | Browse Crops | List Crop | My Orders
│   ├── Cart icon with badge (buyers)
│   ├── Notification bell
│   └── Profile avatar dropdown
│       ├── Edit Profile & Settings (Language/Theme)
│       └── Sign Out
├── main (page content)
└── BottomNav (mobile only)
```

---

## 10. Design System & Aesthetics

AgriMart uses an extremely premium, "industrial" e-commerce UI:
- **Glassmorphism:** `.bg-secondary/40 .backdrop-blur-xl` is used for floating cards and stats.
- **Segmented Controls:** Modern, pill-shaped active tab controls instead of basic underlines.
- **Glow Effects:** `.shadow-glow` and `.shadow-[0_0_15px...]` apply beautiful ambient glows to buttons, auction boxes, and order tracking timelines.
- **Animations:** CSS transitions for hovering (`card-lift`), tapping (`press`), pulsing (`animate-ping`), and smooth height expansions.

```css
--primary          /* Green — hsl(145, 40%, 45%) */
--amber            /* Gold  — hsl(38, 90%, 55%)  */
--background       /* Dark background            */
--card             /* Card surface               */
--border           /* Subtle borders             */
```

---

## 11. Completed Advanced Features (Phase 4)

| Feature | Description |
|---|---|
| **Live Auctions** | Full bidding system with glowing UI. Includes countdowns and min-bids (`listing_type = 'auction'`). |
| **Trust Score Engine** | Auto-recalculates farmer reputation based on ratings, orders, and disputes. |
| **Price History Charts** | Tracks price changes via DB triggers; visible on farmer dashboard via Recharts. |
| **Multi-Language (i18n)**| Supports English, Hindi, and Telugu UI switching, relocated inside the Profile Dropdown. |
| **Region Filtering** | Added State and District location-based filtering to the Browse Crops search algorithm. |
| **Full Text Search** | Upgraded PostgreSQL querying to use `ts_vector` for extremely fast English keyword searches. |
| **Premium UI/UX Polish** | Complete upgrade of Product Details, Order Tracking, and Browse Crops filters using glassmorphism. |

---

## 12. Known Limitations & Future Scope

| Feature | Status |
|---|---|
| COD (Cash on Delivery) | ✅ Implemented |
| Razorpay online payment | ⚙️ Integrated, disabled by env flag |
| Real-time order tracking (WebSocket) | 🔲 Schema ready, `ws` package installed, not fully wired |
| SMS/OTP verification | 🔲 Disabled, structure exists |
| Farmer bank payouts | 🔲 Schema ready (`farmer_payout` column tracked) |
