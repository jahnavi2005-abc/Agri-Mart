import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";
import {
  ArrowLeft,
  MapPin,
  Calendar,
  ShieldCheck,
  Minus,
  Plus,
  ShoppingCart,
  Package,
  Leaf,
  Scale,
  Truck,
  Star,
  CheckCircle2,
  Info,
  Phone,
  BadgeCheck,
  Wheat,
  Clock,
  Tag,
  Heart,
  MessageSquare,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useProduct } from "@/hooks/useProducts";
import { primaryProductImage, fetchPriceHistory, buildAuthHeaders } from "@/lib/products";
import { addToCart } from "@/lib/cart";
import { LineChart, Line, ResponsiveContainer, YAxis, Tooltip } from "recharts";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import { useWishlist } from "@/hooks/useWishlist";
import { listProductReviews } from "@/lib/reviews";
import type { Review } from "@/lib/reviews";
import { fetchProductBids, placeBid, type AuctionBid } from "@/lib/auctions";

export const Route = createFileRoute("/listings/$id")({
  component: ProductDetail,
  notFoundComponent: () => (
    <PageShell>
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="font-display text-3xl font-bold">Product not found</h1>
        <Link to="/listings" className="mt-4 inline-block text-primary">
          Back to listings
        </Link>
      </div>
    </PageShell>
  ),
});

const GRADE_INFO: Record<string, { label: string; color: string }> = {
  A: { label: "Premium Quality", color: "text-primary bg-primary/15" },
  B: { label: "Good Quality", color: "text-amber bg-amber/15" },
  C: { label: "Standard", color: "text-muted-foreground bg-secondary" },
};

const PRODUCT_TABS = ["details", "farmer", "delivery", "reviews"] as const;
type ProductTab = (typeof PRODUCT_TABS)[number];

function ProductDetail() {
  const { id } = Route.useParams();
  const { data: p, loading, error } = useProduct(id);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [bids, setBids] = useState<AuctionBid[]>([]);
  const [priceHistory, setPriceHistory] = useState<{ price_per_kg: string; recorded_at: string }[]>(
    [],
  );
  const [bidAmount, setBidAmount] = useState("");
  const [placingBid, setPlacingBid] = useState(false);
  const [qty, setQty] = useState(10);
  const [addedToCart, setAddedToCart] = useState(false);
  const [activeTab, setActiveTab] = useState<"details" | "farmer" | "delivery" | "reviews">(
    "details",
  );
  const [showEnquiryModal, setShowEnquiryModal] = useState(false);
  const [enquiryQty, setEnquiryQty] = useState("");
  const [enquiryPrice, setEnquiryPrice] = useState("");
  const [enquiryMsg, setEnquiryMsg] = useState("");
  const [enquiryLoading, setEnquiryLoading] = useState(false);
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { items: cartItems, refreshCart } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const cartCount = cartItems.length;

  const isBuyer = profile?.role === "buyer";

  useEffect(() => {
    listProductReviews(id).then(setReviews).catch(console.error);
    fetchPriceHistory(id).then(setPriceHistory).catch(console.error);
    if (p?.listing_type === "auction") {
      fetchProductBids(id).then(setBids).catch(console.error);
    }
  }, [id, p?.listing_type]);

  if (loading) {
    return (
      <PageShell>
        <div className="mx-auto max-w-7xl px-4 py-10 md:px-8">
          <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
            <div className="aspect-[4/3] animate-pulse rounded-3xl border border-border bg-card" />
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className={`h-${8 + i * 4} animate-pulse rounded-xl bg-card`} />
              ))}
            </div>
          </div>
        </div>
      </PageShell>
    );
  }

  if (error || !p) {
    return (
      <PageShell>
        <div className="mx-auto max-w-md px-4 py-20 text-center">
          <div className="text-6xl mb-4">🌾</div>
          <h1 className="font-display text-3xl font-bold">Product not found</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {error ?? "This listing is unavailable."}
          </p>
          <Link
            to="/listings"
            className="mt-6 inline-flex rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground press shadow-glow"
          >
            Back to listings
          </Link>
        </div>
      </PageShell>
    );
  }

  const farmerName = p.farmer_name || p.farmer_display_name || "Farmer";
  const farmerPhone = p.farmer_phone;
  const safeMax = p.maximum_order_kg ?? p.available_quantity_kg;
  const clampedQty = Math.min(
    Math.max(qty, p.minimum_order_kg ?? 1),
    safeMax,
    p.available_quantity_kg,
  );
  const total = clampedQty * p.price_per_kg;
  const stockPercent = Math.min(100, (p.available_quantity_kg / (p.quantity_kg || 1000)) * 100);
  const gradeInfo = GRADE_INFO[p.grade ?? "A"] ?? GRADE_INFO["A"];

  const deliveryOpts = (() => {
    try {
      return typeof p.delivery_options === "string"
        ? JSON.parse(p.delivery_options)
        : (p.delivery_options ?? {});
    } catch {
      return {};
    }
  })();

  const handleAddToCart = async () => {
    await addToCart(p, clampedQty);
    setAddedToCart(true);
    refreshCart();
    setTimeout(() => setAddedToCart(false), 2000);
  };

  const handleBuyNow = async () => {
    await addToCart(p, clampedQty);
    refreshCart();
    navigate({ to: "/checkout" });
  };

  const handlePlaceBid = async () => {
    if (!bidAmount) return;
    setPlacingBid(true);
    try {
      await placeBid(p.id, Number(bidAmount));
      // Refresh bids
      const freshBids = await fetchProductBids(p.id);
      setBids(freshBids);
      setBidAmount("");
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to place bid");
    } finally {
      setPlacingBid(false);
    }
  };

  const handleEnquirySubmit = async () => {
    if (!p || !enquiryQty) return;
    setEnquiryLoading(true);
    try {
      const res = await fetch("/api/enquiries", {
        method: "POST",
        headers: buildAuthHeaders(),
        body: JSON.stringify({
          product_id: p.id,
          quantity_kg: Number(enquiryQty),
          offered_price: enquiryPrice ? Number(enquiryPrice) : undefined,
          message: enquiryMsg || undefined,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      alert("Enquiry sent to the farmer!");
      setShowEnquiryModal(false);
      setEnquiryQty("");
      setEnquiryPrice("");
      setEnquiryMsg("");
    } catch (e) {
      alert("Failed to submit enquiry");
    } finally {
      setEnquiryLoading(false);
    }
  };

  const isAuction = p.listing_type === "auction";
  const highestBid =
    bids.length > 0 ? Number(bids[0].bid_amount) : p.auction_min_bid || p.price_per_kg;
  const auctionEnded = isAuction && new Date() > new Date(p.auction_end_at || "");

  return (
    <PageShell>
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-10">
        {/* Breadcrumb */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link to="/listings" className="flex items-center gap-1 hover:text-foreground">
              <ArrowLeft className="h-3.5 w-3.5" /> Listings
            </Link>
            <span>/</span>
            <span className="text-foreground font-medium">{p.crop_name}</span>
          </div>
          {isBuyer && (
            <Link
              to="/cart"
              className="relative flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold press hover:bg-secondary"
            >
              <ShoppingCart className="h-4 w-4" /> Cart
              {cartCount > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground shadow-glow">
                  {cartCount}
                </span>
              )}
            </Link>
          )}
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
          {/* LEFT: Image + badges */}
          <div className="space-y-4">
            <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-border bg-card">
              <img
                src={primaryProductImage(p)}
                alt={`${p.crop_name} from ${p.district}`}
                className="h-full w-full object-cover transition-transform duration-700 hover:scale-105"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=800&q=80";
                }}
              />
              {p.is_organic && (
                <div className="absolute left-4 top-4 flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground shadow-glow">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-foreground opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-primary-foreground" />
                  </span>
                  ORGANIC CERTIFIED
                </div>
              )}
              <div
                className={`absolute right-4 top-4 rounded-full px-3 py-1 text-xs font-bold ${gradeInfo.color}`}
              >
                Grade {p.grade ?? "A"} · {gradeInfo.label}
              </div>
              {/* Wishlist toggle */}
              {isBuyer && (
                <button
                  onClick={() => toggleWishlist(p.id)}
                  className="absolute right-4 top-14 grid h-10 w-10 place-items-center rounded-full bg-card/80 backdrop-blur-sm transition-all hover:scale-110 press shadow-sm"
                >
                  <Heart
                    className={`h-5 w-5 ${isInWishlist(p.id) ? "fill-red-500 text-red-500" : "text-muted-foreground"}`}
                  />
                </button>
              )}
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3">
              <StatCard
                icon={<Star className="h-4 w-4 text-amber" />}
                label="Rating"
                value="4.5★"
                sub="Verified"
              />
              <StatCard
                icon={<MapPin className="h-4 w-4 text-primary" />}
                label="Location"
                value={p.district}
                sub={p.state}
              />
              <StatCard
                icon={<Wheat className="h-4 w-4 text-primary" />}
                label="Category"
                value={p.category}
                sub={p.listing_type ?? "Immediate"}
              />
            </div>
          </div>

          {/* RIGHT: Info + CTA */}
          <div className="flex flex-col">
            <div className="text-xs font-semibold uppercase tracking-widest text-primary">
              {p.category}
            </div>
            <h1 className="mt-1 font-display text-4xl font-bold leading-tight md:text-5xl">
              {p.crop_name}
            </h1>

            {/* Price */}
            <div className="mt-4 flex items-end gap-4">
              <div>
                <div className="text-xs uppercase tracking-widest text-muted-foreground">
                  Price per kg
                </div>
                <div className="font-mono text-5xl font-bold text-gradient-amber">
                  ₹{p.price_per_kg}
                </div>
              </div>
              {p.price_negotiable && (
                <span className="mb-2 rounded-full border border-amber/30 bg-amber/10 px-3 py-1 text-xs font-semibold text-amber flex items-center gap-1">
                  <Tag className="h-3 w-3" /> Price Negotiable
                </span>
              )}
            </div>

            {/* Stock */}
            <div className="mt-4 space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Stock available</span>
                <span className="font-semibold text-foreground">
                  {p.available_quantity_kg.toLocaleString("en-IN")} kg of{" "}
                  {(p.quantity_kg ?? p.available_quantity_kg).toLocaleString("en-IN")} kg
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-border">
                <div
                  className={`h-full rounded-full transition-all ${stockPercent > 50 ? "bg-gradient-to-r from-primary to-primary/70" : stockPercent > 20 ? "bg-amber" : "bg-destructive"}`}
                  style={{ width: `${stockPercent}%` }}
                />
              </div>
              {stockPercent < 20 && (
                <p className="text-xs text-destructive font-medium">⚠ Low stock — order soon!</p>
              )}
            </div>

            {/* Segmented Control Tabs */}
            <div className="mt-5 flex gap-1 rounded-xl border border-border bg-secondary/50 p-1 backdrop-blur-sm">
              {PRODUCT_TABS.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 rounded-lg px-2 py-2 text-sm font-semibold capitalize transition-all ${
                    activeTab === tab
                      ? "bg-card text-foreground shadow-sm ring-1 ring-border"
                      : "text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
                  }`}
                >
                  {tab === "farmer" ? "Farmer Info" : tab}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="mt-4 min-h-[120px]">
              {activeTab === "details" && (
                <div className="space-y-3" style={{ animation: "var(--animate-fade-up)" }}>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {p.description && p.description !== "Dummy Seed Data"
                      ? p.description
                      : `Premium ${p.crop_name.toLowerCase()} grown in the fertile lands of ${p.district}, ${p.state}. Sourced directly from ${farmerName}. Fresh, quality-assured produce delivered to your door.`}
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <InfoRow
                      icon={<Scale className="h-3.5 w-3.5" />}
                      label="Min Order"
                      value={`${p.minimum_order_kg ?? 10} kg`}
                    />
                    <InfoRow
                      icon={<Package className="h-3.5 w-3.5" />}
                      label="Packaging"
                      value={p.packaging_info ?? "Loose bags"}
                    />
                    {p.harvest_date && (
                      <InfoRow
                        icon={<Calendar className="h-3.5 w-3.5" />}
                        label="Harvested"
                        value={p.harvest_date}
                      />
                    )}
                    {p.available_from && (
                      <InfoRow
                        icon={<Clock className="h-3.5 w-3.5" />}
                        label="Available From"
                        value={p.available_from}
                      />
                    )}
                  </div>
                  {/* Price History Chart */}
                  {priceHistory.length > 1 && (
                    <div className="mt-4 rounded-xl border border-border bg-card p-4">
                      <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                        Price Trend
                      </div>
                      <div className="h-32">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart
                            data={priceHistory.map((h) => ({
                              date: new Date(h.recorded_at).toLocaleDateString(),
                              price: Number(h.price_per_kg),
                            }))}
                          >
                            <YAxis domain={["dataMin - 5", "dataMax + 5"]} hide />
                            <Tooltip
                              contentStyle={{
                                borderRadius: "12px",
                                border: "1px solid var(--border)",
                                background: "var(--card)",
                                fontSize: "12px",
                              }}
                              formatter={(val) => [`₹${val}`, "Price"]}
                              labelStyle={{ color: "var(--muted-foreground)" }}
                            />
                            <Line
                              type="monotone"
                              dataKey="price"
                              stroke="var(--primary)"
                              strokeWidth={3}
                              dot={{ r: 4, fill: "var(--primary)", strokeWidth: 0 }}
                              activeDot={{ r: 6 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "farmer" && (
                <div className="space-y-3" style={{ animation: "var(--animate-fade-up)" }}>
                  <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
                    <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary to-primary/60 text-2xl font-bold text-primary-foreground">
                      {farmerName[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 font-semibold">
                        {farmerName}
                        <BadgeCheck className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                        <MapPin className="h-3 w-3" /> {p.district}, {p.state}
                      </div>
                      <div className="flex items-center gap-1 mt-1 text-xs font-medium text-amber">
                        <Star className="h-3 w-3 fill-amber text-amber" />
                        <Star className="h-3 w-3 fill-amber text-amber" />
                        <Star className="h-3 w-3 fill-amber text-amber" />
                        <Star className="h-3 w-3 fill-amber text-amber" />
                        <Star className="h-3 w-3 text-amber" />
                        <span className="text-muted-foreground ml-1">4.0 (12 reviews)</span>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <InfoRow
                      icon={<CheckCircle2 className="h-3.5 w-3.5 text-primary" />}
                      label="KYC"
                      value="Verified Farmer"
                    />
                    <InfoRow
                      icon={<MapPin className="h-3.5 w-3.5" />}
                      label="District"
                      value={p.district}
                    />
                    {farmerPhone && (
                      <InfoRow
                        icon={<Phone className="h-3.5 w-3.5" />}
                        label="Contact"
                        value={farmerPhone}
                      />
                    )}
                  </div>
                </div>
              )}

              {activeTab === "delivery" && (
                <div className="space-y-3" style={{ animation: "var(--animate-fade-up)" }}>
                  <div className="grid grid-cols-2 gap-2">
                    <div
                      className={`flex items-center gap-2 rounded-xl border p-3 text-sm ${deliveryOpts?.delivery ? "border-primary/30 bg-primary/10 text-primary" : "border-border bg-secondary text-muted-foreground"}`}
                    >
                      <Truck className="h-4 w-4 shrink-0" />
                      <div>
                        <div className="font-semibold">
                          {deliveryOpts?.delivery ? "Home Delivery" : "No Delivery"}
                        </div>
                        <div className="text-xs opacity-70">
                          {deliveryOpts?.delivery ? "Available" : "Pickup only"}
                        </div>
                      </div>
                    </div>
                    <div
                      className={`flex items-center gap-2 rounded-xl border p-3 text-sm ${deliveryOpts?.pickup ? "border-amber/30 bg-amber/10 text-amber" : "border-border bg-secondary text-muted-foreground"}`}
                    >
                      <Package className="h-4 w-4 shrink-0" />
                      <div>
                        <div className="font-semibold">Farm Pickup</div>
                        <div className="text-xs opacity-70">
                          {deliveryOpts?.pickup ? "Available" : "Not available"}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-xl border border-border bg-secondary p-3 text-sm">
                    <div className="flex items-start gap-2">
                      <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <p className="text-muted-foreground">
                        Delivery charges: ₹80 flat per order. Estimated delivery 2–5 business days
                        from {p.district}, {p.state}.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "reviews" && (
                <div className="space-y-4" style={{ animation: "var(--animate-fade-up)" }}>
                  {reviews.length === 0 ? (
                    <div className="text-center py-6 text-sm text-muted-foreground">
                      No reviews yet for this product.
                    </div>
                  ) : (
                    reviews.map((r) => (
                      <div key={r.id} className="rounded-xl border border-border bg-card p-4">
                        <div className="flex items-center justify-between">
                          <div className="font-semibold text-sm">{r.buyer_name || "Buyer"}</div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(r.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              className={`h-3 w-3 ${s <= r.rating ? "fill-amber text-amber" : "text-border"}`}
                            />
                          ))}
                        </div>
                        {r.comment && (
                          <p className="mt-2 text-sm text-muted-foreground">{r.comment}</p>
                        )}
                        {r.farmer_reply && (
                          <div className="mt-3 rounded-lg bg-secondary/50 p-3 text-xs border border-border/50">
                            <div className="font-semibold text-primary mb-1">Farmer Reply</div>
                            <p className="text-muted-foreground">{r.farmer_reply}</p>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* CTA Section */}
            {isAuction ? (
              <div className="mt-5 rounded-3xl border border-amber/30 bg-gradient-to-br from-amber/10 via-card to-background p-6 shadow-[0_0_40px_-10px_rgba(245,158,11,0.2)] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber/20 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
                <div className="mb-4 flex items-center justify-between relative z-10">
                  <h3 className="font-display text-xl font-bold flex items-center gap-2 text-amber">
                    <Clock className="h-5 w-5" /> Live Auction
                  </h3>
                  <span
                    className={`text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-widest ${auctionEnded ? "bg-destructive/20 text-destructive" : "bg-amber text-amber-foreground shadow-glow"}`}
                  >
                    {auctionEnded
                      ? "Auction Ended"
                      : `Ends: ${new Date(p.auction_end_at || "").toLocaleString()}`}
                  </span>
                </div>

                <div className="mb-6 rounded-2xl bg-card/60 backdrop-blur-md p-5 text-center border border-border/50 relative z-10">
                  <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">
                    Current Highest Bid
                  </div>
                  <div className="font-mono text-5xl font-bold text-foreground">
                    ₹{highestBid.toLocaleString("en-IN")}
                  </div>
                  <div className="text-xs font-medium text-amber mt-2">
                    {bids.length} bids placed so far
                  </div>
                </div>

                {isBuyer && !auctionEnded && (
                  <div className="flex flex-col gap-2 relative z-10">
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-mono font-bold">
                          ₹
                        </span>
                        <input
                          type="number"
                          value={bidAmount}
                          onChange={(e) => setBidAmount(e.target.value)}
                          placeholder={`${highestBid + 1}`}
                          min={highestBid + 1}
                          className="w-full rounded-2xl border border-border bg-card/80 pl-8 pr-4 py-4 text-lg font-bold outline-none focus:border-amber focus:ring-1 focus:ring-amber transition-all"
                        />
                      </div>
                      <button
                        onClick={handlePlaceBid}
                        disabled={placingBid || !bidAmount || Number(bidAmount) <= highestBid}
                        className="rounded-2xl bg-amber px-6 py-4 font-bold text-amber-foreground press shadow-[0_4px_15px_-3px_rgba(245,158,11,0.5)] disabled:opacity-50 transition-all hover:bg-amber/90"
                      >
                        {placingBid ? "Placing..." : "Place Bid"}
                      </button>
                    </div>
                  </div>
                )}

                {bids.length > 0 && (
                  <div className="mt-6 border-t border-border/50 pt-5 relative z-10">
                    <div className="text-xs font-bold uppercase tracking-widest mb-3 text-muted-foreground">
                      Recent Activity
                    </div>
                    <div className="space-y-2">
                      {bids.slice(0, 3).map((b, idx) => (
                        <div
                          key={b.id}
                          className={`flex justify-between items-center text-sm p-2 rounded-xl transition-all ${idx === 0 ? "bg-amber/10 border border-amber/20 scale-[1.02]" : ""}`}
                        >
                          <span className="font-medium flex items-center gap-2">
                            {idx === 0 && <Star className="h-3.5 w-3.5 text-amber fill-amber" />}
                            {b.bidder_name}
                          </span>
                          <span className="font-mono font-bold text-amber">₹{b.bid_amount}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              isBuyer && (
                <>
                  <div className="mt-5 rounded-2xl border border-border bg-card p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                        Quantity (kg)
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Min: {p.minimum_order_kg ?? 10} kg
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 rounded-xl border border-border bg-input p-1">
                        <button
                          onClick={() =>
                            setQty((q) =>
                              Math.max(p.minimum_order_kg ?? 1, q - (p.minimum_order_kg ?? 1)),
                            )
                          }
                          className="grid h-10 w-10 place-items-center rounded-lg hover:bg-secondary press"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="min-w-[3.5ch] text-center font-mono text-xl font-bold">
                          {clampedQty}
                        </span>
                        <button
                          onClick={() =>
                            setQty((q) => Math.min(safeMax, q + (p.minimum_order_kg ?? 1)))
                          }
                          className="grid h-10 w-10 place-items-center rounded-lg hover:bg-secondary press"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">Total</div>
                        <div className="font-mono text-2xl font-bold text-amber">
                          ₹{total.toLocaleString("en-IN")}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Desktop CTAs */}
                  <div className="mt-4 hidden gap-3 md:flex">
                    <button
                      onClick={handleAddToCart}
                      className={`flex flex-1 items-center justify-center gap-2 rounded-2xl border py-4 font-semibold press transition-all ${addedToCart ? "border-primary bg-primary/10 text-primary" : "border-border bg-card hover:bg-secondary"}`}
                    >
                      <ShoppingCart className="h-5 w-5" />
                      {addedToCart ? "Added to Cart ✓" : "Add to Cart"}
                    </button>
                    <button
                      onClick={handleBuyNow}
                      className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-primary py-4 font-semibold text-primary-foreground press shadow-glow"
                    >
                      Buy Now · ₹{total.toLocaleString("en-IN")}
                    </button>
                  </div>
                  <div className="mt-3 hidden md:block">
                    <button
                      onClick={() => setShowEnquiryModal(true)}
                      className="w-full flex items-center justify-center gap-2 rounded-2xl border border-border bg-secondary/50 py-4 font-semibold hover:bg-secondary press"
                    >
                      <MessageSquare className="h-5 w-5" /> Bulk Enquiry
                    </button>
                  </div>
                </>
              )
            )}

            {!profile && (
              <Link
                to="/login"
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 font-semibold text-primary-foreground press shadow-glow"
              >
                Sign in to Buy
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Mobile sticky CTA (buyers only) */}
      {isBuyer && (
        <div className="fixed bottom-[60px] md:hidden left-0 right-0 z-30 border-t border-border bg-card/80 backdrop-blur-xl shadow-[0_-10px_40px_rgba(0,0,0,0.1)]">
          <div className="flex items-center gap-3 p-4">
            {!isAuction ? (
              <>
                <div className="shrink-0">
                  <div className="text-[10px] uppercase font-semibold text-muted-foreground">
                    Total
                  </div>
                  <div className="font-mono text-xl font-bold text-amber">
                    ₹{total.toLocaleString("en-IN")}
                  </div>
                </div>
                <div className="flex flex-1 gap-2">
                  <button
                    onClick={handleAddToCart}
                    className={`grid flex-1 place-items-center rounded-xl border py-3 font-semibold press transition-all ${addedToCart ? "border-primary bg-primary/10 text-primary" : "border-border bg-card"}`}
                  >
                    <ShoppingCart className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => setShowEnquiryModal(true)}
                    className="grid flex-1 place-items-center rounded-xl border border-border bg-secondary/50 py-3 font-semibold press"
                  >
                    <MessageSquare className="h-5 w-5" />
                  </button>
                </div>
                <button
                  onClick={handleBuyNow}
                  className="flex-[2] rounded-xl bg-primary py-3 font-semibold text-primary-foreground press shadow-glow"
                >
                  Buy Now
                </button>
              </>
            ) : (
              <>
                <div className="shrink-0">
                  <div className="text-[10px] uppercase font-semibold text-muted-foreground">
                    Highest Bid
                  </div>
                  <div className="font-mono text-xl font-bold text-amber">
                    ₹{highestBid.toLocaleString("en-IN")}
                  </div>
                </div>
                {auctionEnded ? (
                  <div className="flex-1 rounded-2xl bg-secondary py-3.5 text-center text-[15px] font-bold text-muted-foreground">
                    Auction Ended
                  </div>
                ) : (
                  <button
                    onClick={() =>
                      document
                        .querySelector('input[type="number"]')
                        ?.scrollIntoView({ behavior: "smooth", block: "center" })
                    }
                    className="flex flex-1 items-center justify-center rounded-2xl bg-amber py-3.5 text-[15px] font-bold text-amber-foreground press shadow-glow"
                  >
                    Place Bid
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Enquiry Modal */}
      {showEnquiryModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
          style={{ animation: "var(--animate-fade-in)" }}
        >
          <div
            className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl"
            style={{ animation: "var(--animate-scale-in)" }}
          >
            <h2 className="font-display text-2xl font-bold">Bulk Enquiry</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Send a direct message to the farmer for wholesale pricing.
            </p>

            <div className="mt-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1.5 block">
                  Quantity Required (kg) *
                </label>
                <input
                  type="number"
                  value={enquiryQty}
                  onChange={(e) => setEnquiryQty(e.target.value)}
                  className="w-full rounded-xl border border-border bg-input p-3 outline-none focus:border-primary"
                  placeholder="e.g. 500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1.5 block">
                  Offered Price / kg (₹) (Optional)
                </label>
                <input
                  type="number"
                  value={enquiryPrice}
                  onChange={(e) => setEnquiryPrice(e.target.value)}
                  className="w-full rounded-xl border border-border bg-input p-3 outline-none focus:border-primary"
                  placeholder={`e.g. ${p.price_per_kg - 5}`}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1.5 block">
                  Message (Optional)
                </label>
                <textarea
                  value={enquiryMsg}
                  onChange={(e) => setEnquiryMsg(e.target.value)}
                  className="w-full rounded-xl border border-border bg-input p-3 outline-none focus:border-primary min-h-20"
                  placeholder="Any specific requirements..."
                />
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowEnquiryModal(false)}
                className="flex-1 rounded-xl border border-border bg-secondary py-3 font-semibold press hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={handleEnquirySubmit}
                disabled={!enquiryQty || enquiryLoading}
                className="flex-1 rounded-xl bg-primary py-3 font-semibold text-primary-foreground press shadow-glow disabled:opacity-50"
              >
                {enquiryLoading ? "Sending..." : "Send Enquiry"}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-secondary/40 backdrop-blur-sm p-3 text-center transition-all hover:bg-secondary/60">
      <div className="flex justify-center mb-1.5">{icon}</div>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm font-bold truncate">{value}</div>
      <div className="text-[10px] font-medium text-muted-foreground truncate">{sub}</div>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-border bg-card/50 p-2.5">
      <span className="text-primary">{icon}</span>
      <div className="min-w-0">
        <div className="text-[10px] text-muted-foreground">{label}</div>
        <div className="text-xs font-semibold truncate">{value}</div>
      </div>
    </div>
  );
}
