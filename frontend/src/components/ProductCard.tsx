import { Link } from "@tanstack/react-router";
import { MapPin, Leaf, Star, ShoppingCart, Heart } from "lucide-react";
import type { Product } from "@/types/product";
import { primaryProductImage } from "@/lib/products";
import { addToCart } from "@/lib/cart";
import { useAuth } from "@/hooks/useAuth";
import { useWishlist } from "@/hooks/useWishlist";
import { useCart } from "@/hooks/useCart";

export function ProductCard({
  p,
  idx = 0,
  hideFarmerName = false,
}: {
  p: Product;
  idx?: number;
  hideFarmerName?: boolean;
}) {
  const { profile } = useAuth();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { refreshCart } = useCart();
  const isBuyer = profile?.role === "buyer";
  const isOutOfStock = (p.available_quantity_kg ?? 0) <= 0;
  // farmer_name is added by the backend join, farmer_display_name for legacy
  const farmerName = p.farmer_name || p.farmer_display_name || "Farmer";

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isOutOfStock) return;
    addToCart(p, p.minimum_order_kg ?? 10).then(refreshCart);
  };

  return (
    <Link
      to="/listings/$id"
      params={{ id: p.id }}
      className="group relative block overflow-hidden rounded-2xl border border-border bg-card card-lift"
      style={{
        animation: "var(--animate-fade-up)",
        animationDelay: `${idx * 60}ms`,
        animationFillMode: "backwards",
      }}
    >
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-secondary">
        <img
          src={primaryProductImage(p)}
          alt={`${p.crop_name} from ${p.district}`}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&q=70";
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/20 to-transparent" />

        {/* Organic badge */}
        {p.is_organic && (
          <div className="absolute left-2.5 top-2.5 flex items-center gap-1 rounded-full bg-primary/90 px-2 py-0.5 text-[10px] font-bold text-primary-foreground backdrop-blur-sm">
            <Leaf className="h-2.5 w-2.5" /> Organic
          </div>
        )}

        {/* Wishlist toggle (buyers only) */}
        {isBuyer && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleWishlist(p.id);
            }}
            className="absolute right-2.5 top-2.5 grid h-8 w-8 place-items-center rounded-full bg-card/80 backdrop-blur-sm transition-all hover:scale-110 press"
            title="Wishlist"
          >
            <Heart
              className={`h-4 w-4 ${isInWishlist(p.id) ? "fill-red-500 text-red-500" : "text-muted-foreground"}`}
            />
          </button>
        )}

        {/* Grade badge */}
        {p.grade && (
          <div className="absolute left-2.5 top-10 rounded-full bg-card/80 px-2 py-0.5 text-[10px] font-bold backdrop-blur-sm">
            Grade {p.grade}
          </div>
        )}

        {/* Quick add-to-cart (buyers only) */}
        {isBuyer && (
          <button
            onClick={handleAddToCart}
            className="absolute bottom-2.5 right-2.5 grid h-8 w-8 place-items-center rounded-xl bg-primary opacity-0 shadow-glow transition-all group-hover:opacity-100 press"
            title="Add to cart"
          >
            <ShoppingCart className="h-4 w-4 text-primary-foreground" />
          </button>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <div className="mb-0.5 flex items-center justify-between">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            {p.category}
          </div>
          <div className="flex items-center gap-0.5 text-[10px] font-medium text-amber">
            <Star className="h-2.5 w-2.5 fill-amber text-amber" />
            {p.avg_rating ? Number(p.avg_rating).toFixed(1) : "—"}
            {p.review_count ? (
              <span className="text-muted-foreground ml-0.5">({p.review_count})</span>
            ) : null}
          </div>
        </div>
        <h3 className="font-display text-base font-bold leading-tight">{p.crop_name}</h3>
        <div className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
          <MapPin className="h-2.5 w-2.5 shrink-0" />
          <span className="truncate">
            {p.district}, {p.state}
          </span>
        </div>
        {!hideFarmerName && (
          <div className="mt-0.5 text-[11px] text-muted-foreground truncate">
            by{" "}
            <Link
              to="/farmer/$id"
              params={{ id: p.farmer_id }}
              onClick={(e) => e.stopPropagation()}
              className="hover:underline text-primary/80"
            >
              {farmerName}
            </Link>
          </div>
        )}
        <div className="mt-2.5 flex items-end justify-between">
          <div>
            <div className="font-mono text-lg font-bold text-amber">₹{p.price_per_kg}</div>
            <div className="text-[10px] text-muted-foreground">per kg</div>
          </div>
          <div className="text-right">
            <div className="text-[11px] font-semibold text-foreground">
              {p.available_quantity_kg.toLocaleString("en-IN")} kg
            </div>
            <div className="text-[10px] text-muted-foreground">available</div>
          </div>
          {isOutOfStock && (
            <div className="mt-2 text-[10px] font-bold text-destructive uppercase tracking-widest">
              Out of Stock
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
