import { createFileRoute, Link } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";
import { RoleRoute } from "@/components/RoleRoute";
import { useAuth } from "@/hooks/useAuth";
import { useProducts } from "@/hooks/useProducts";
import { primaryProductImage } from "@/lib/products";
import { ShoppingBag, Leaf, Search, ArrowRight, Star, TrendingUp, PackageOpen } from "lucide-react";

export const Route = createFileRoute("/dashboard/buyer")({
  component: () => (
    <RoleRoute allowed={["buyer"]}>
      <BuyerDashboard />
    </RoleRoute>
  ),
});

const CATEGORY_HIGHLIGHTS = [
  { name: "Grains", icon: "🌾", desc: "Rice, Wheat, Corn" },
  { name: "Vegetables", icon: "🥬", desc: "Fresh & seasonal" },
  { name: "Fruits", icon: "🍎", desc: "Mangoes, Apples & more" },
  { name: "Spices", icon: "🌶️", desc: "Turmeric, Pepper" },
];

function BuyerDashboard() {
  const { profile, signOut } = useAuth();
  const { data: featuredProducts, loading: productsLoading } = useProducts({ maxPrice: 500 });
  const displayedProducts = featuredProducts.slice(0, 6);

  return (
    <PageShell>
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-8">
        {/* Hero header */}
        <div
          className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/20 via-card to-amber/10 p-8 md:p-12"
          style={{ animation: "var(--animate-fade-up)" }}
        >
          <div className="absolute right-6 top-6 text-6xl opacity-20 md:text-9xl">🛒</div>
          <div className="relative z-10">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-primary/20 px-3 py-1 text-xs font-semibold text-primary">
              <Leaf className="h-3 w-3" /> Buyer Dashboard
            </div>
            <h1 className="font-display text-3xl font-bold md:text-4xl">
              Welcome, {profile?.name ?? "Buyer"}!
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Discover fresh crops direct from farmers.{" "}
              {profile?.district && `Showing best matches for ${profile.district}.`}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/listings"
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground press shadow-glow"
              >
                <Search className="h-4 w-4" /> Browse Marketplace
              </Link>
              <Link
                to="/orders"
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-card/80 px-5 py-3 text-sm font-semibold press"
              >
                <ShoppingBag className="h-4 w-4" /> My Orders
              </Link>
            </div>
          </div>
        </div>

        {/* Quick Category Browse */}
        <div className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-xl font-bold">Browse by Category</h2>
            <Link
              to="/listings"
              className="flex items-center gap-1 text-sm text-primary font-semibold"
            >
              See all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {CATEGORY_HIGHLIGHTS.map((cat) => (
              <Link
                key={cat.name}
                to="/listings"
                search={{ category: cat.name } as never}
                className="group flex flex-col items-center rounded-2xl border border-border bg-card p-5 text-center press card-lift"
              >
                <div className="mb-2 text-4xl">{cat.icon}</div>
                <div className="font-semibold text-sm">{cat.name}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{cat.desc}</div>
              </Link>
            ))}
          </div>
        </div>

        {/* Featured Products */}
        <div className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-xl font-bold">
              <TrendingUp className="inline h-5 w-5 text-primary mr-2" />
              Fresh Listings
            </h2>
            <Link
              to="/listings"
              className="flex items-center gap-1 text-sm text-primary font-semibold"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {productsLoading ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-52 animate-pulse rounded-2xl border border-border bg-card"
                />
              ))}
            </div>
          ) : displayedProducts.length === 0 ? (
            <div className="flex flex-col items-center rounded-2xl border border-border bg-card py-14 text-center">
              <PackageOpen className="h-12 w-12 text-muted-foreground mb-3" />
              <p className="font-semibold">No listings yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Farmers haven't listed crops yet. Check back soon!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {displayedProducts.map((product) => (
                <Link
                  key={product.id}
                  to="/listings/$id"
                  params={{ id: product.id }}
                  className="group overflow-hidden rounded-2xl border border-border bg-card press card-lift"
                >
                  <div className="relative h-36 overflow-hidden">
                    <img
                      src={primaryProductImage(product)}
                      alt={product.crop_name}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&q=70";
                      }}
                    />
                    {product.is_organic && (
                      <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-primary/90 px-2 py-0.5 text-[10px] font-bold text-white">
                        <Leaf className="h-2.5 w-2.5" /> Organic
                      </span>
                    )}
                  </div>
                  <div className="p-3">
                    <div className="font-semibold text-sm truncate">{product.crop_name}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {product.farmer_name || "Farmer"} · {product.district}
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="font-mono font-bold text-amber">
                        ₹{product.price_per_kg}/kg
                      </span>
                      {product.grade && (
                        <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold">
                          Grade {product.grade}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Profile Summary */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-6">
            <h3 className="mb-4 font-display text-lg font-bold">My Profile</h3>
            <div className="flex items-center gap-4">
              <div className="grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-primary to-primary/60 text-2xl font-bold text-white">
                {profile?.name?.[0]?.toUpperCase() ?? "B"}
              </div>
              <div>
                <div className="font-semibold text-base">{profile?.name ?? "Buyer"}</div>
                <div className="text-sm text-muted-foreground">{profile?.email}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {profile?.district}, {profile?.state}
                </div>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Link
                to="/orders"
                className="flex-1 rounded-xl border border-border bg-secondary py-2.5 text-center text-sm font-semibold press hover:bg-muted"
              >
                My Orders
              </Link>
              <button
                onClick={signOut}
                className="flex-1 rounded-xl border border-destructive/30 bg-destructive/10 py-2.5 text-sm font-semibold text-destructive press"
              >
                Sign Out
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <h3 className="mb-4 font-display text-lg font-bold">Quick Links</h3>
            <div className="space-y-2">
              {[
                { label: "Browse all crops", to: "/listings", icon: "🌾" },
                { label: "View my orders", to: "/orders", icon: "📦" },
                { label: "Checkout", to: "/checkout", icon: "💳" },
                { label: "Cart", to: "/cart", icon: "🛒" },
              ].map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="flex items-center gap-3 rounded-xl border border-border bg-secondary/40 p-3 press hover:bg-secondary"
                >
                  <span className="text-lg">{link.icon}</span>
                  <span className="text-sm font-medium">{link.label}</span>
                  <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
