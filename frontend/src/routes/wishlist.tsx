import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";
import { ProductCard } from "@/components/ProductCard";
import { useWishlist } from "@/hooks/useWishlist";
import { useAuth } from "@/hooks/useAuth";
import { Heart } from "lucide-react";
import { useEffect } from "react";

export const Route = createFileRoute("/wishlist")({
  component: WishlistPage,
});

function WishlistPage() {
  const { items, loading } = useWishlist();
  const { profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !profile) {
      navigate({ to: "/login" });
    }
  }, [authLoading, profile, navigate]);

  if (!profile) return null;

  return (
    <PageShell>
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
        <h1 className="font-display text-3xl font-bold md:text-5xl">
          Your <span className="text-gradient-amber">Wishlist</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{items.length} saved crops</p>

        {loading ? (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="aspect-[4/5] animate-pulse rounded-2xl bg-secondary" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="mt-12 flex flex-col items-center justify-center rounded-3xl border border-border bg-card py-20 text-center">
            <div className="grid h-20 w-20 place-items-center rounded-full bg-secondary text-2xl">
              <Heart className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mt-4 font-display text-2xl font-bold">Your wishlist is empty</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Save your favorite crops to find them quickly later.
            </p>
            <Link
              to="/listings"
              className="mt-6 rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground press shadow-glow"
            >
              Browse Crops
            </Link>
          </div>
        ) : (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((product, idx) => (
              <ProductCard key={product.id} p={product} idx={idx} />
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}
