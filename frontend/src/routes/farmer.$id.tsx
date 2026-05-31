import { createFileRoute, Link } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";
import { useEffect, useState } from "react";
import { User, MapPin, Calendar, Star, ShieldCheck, CheckCircle2 } from "lucide-react";
import { ProductCard } from "@/components/ProductCard";
import type { Product } from "@/types/product";

type FarmerPublicProfile = {
  id: string;
  name: string | null;
  district: string | null;
  state: string | null;
  seller_trust_level: number;
  created_at: string;
};

export const Route = createFileRoute("/farmer/$id")({
  component: FarmerProfilePage,
});

function FarmerProfilePage() {
  const { id } = Route.useParams();
  const [farmer, setFarmer] = useState<FarmerPublicProfile | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    // Fetch farmer profile and active listings
    fetch(`/api/products?farmerId=${id}`)
      .then((res) => res.json() as Promise<Product[]>)
      .then((productsData) => {
        setProducts(productsData);

        // Extract farmer details from the first product, or make a separate API call
        if (productsData.length > 0) {
          const p = productsData[0];
          setFarmer({
            id,
            name: p.farmer_name,
            district: p.district,
            state: p.state,
            seller_trust_level: p.seller_trust_level || 85,
            created_at: new Date().toISOString(), // Mocking join date if missing
          });
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <PageShell>
        <div className="flex h-[50vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </PageShell>
    );
  }

  if (error || (!farmer && products.length === 0)) {
    return (
      <PageShell>
        <div className="mx-auto flex h-[50vh] max-w-md flex-col items-center justify-center text-center">
          <div className="text-4xl mb-4">🚜</div>
          <h2 className="text-2xl font-bold">Farmer Not Found</h2>
          <p className="mt-2 text-muted-foreground">
            This farmer profile doesn't exist or has no active listings.
          </p>
          <Link
            to="/listings"
            className="mt-6 rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground"
          >
            Browse Market
          </Link>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
        {/* Farmer Header */}
        <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-card to-secondary/30 p-8 shadow-sm">
          <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-primary/5 to-transparent pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row gap-6 items-start md:items-center">
            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/60 text-4xl font-bold text-white shadow-lg">
              {farmer?.name?.[0]?.toUpperCase() ?? "F"}
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="font-display text-3xl font-bold">{farmer?.name || "Farmer"}</h1>
                <CheckCircle2 className="h-6 w-6 text-primary" />
              </div>

              <div className="flex flex-wrap gap-x-6 gap-y-2 mt-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" /> {farmer?.district}, {farmer?.state}
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" /> Member since{" "}
                  {new Date(farmer?.created_at).getFullYear()}
                </div>
                <div className="flex items-center gap-1.5 text-amber-500 font-medium">
                  <Star className="h-4 w-4 fill-current" /> 4.8 Rating
                </div>
              </div>
            </div>

            <div className="shrink-0 rounded-2xl border border-border bg-card p-4 text-center shadow-sm">
              <div className="flex items-center justify-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-primary mb-1">
                <ShieldCheck className="h-4 w-4" /> Trust Score
              </div>
              <div className="font-display text-3xl font-bold text-foreground">
                {farmer?.seller_trust_level}/100
              </div>
            </div>
          </div>
        </div>

        {/* Listings */}
        <div className="mt-12">
          <h2 className="font-display text-2xl font-bold mb-6">Available Crops</h2>

          {products.length === 0 ? (
            <div className="rounded-2xl border border-border bg-secondary/30 p-12 text-center text-muted-foreground">
              This farmer currently has no active listings.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {products.map((p) => (
                <ProductCard key={p.id} p={p} hideFarmerName={true} />
              ))}
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}
