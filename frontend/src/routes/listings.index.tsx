import { createFileRoute, Link } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";
import { ProductCard } from "@/components/ProductCard";
import { SlidersHorizontal, Search, X, Plus, MapPin } from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { useProducts } from "@/hooks/useProducts";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/listings/")({
  validateSearch: (search: Record<string, unknown>) => ({
    search: (search.search as string) || "",
  }),
  component: ListingsPage,
});

const CATS = ["All", "Grains", "Vegetables", "Fruits", "Spices", "Pulses", "Oilseeds"];
const STATES = [
  "All",
  "Andhra Pradesh",
  "Telangana",
  "Karnataka",
  "Tamil Nadu",
  "Maharashtra",
  "Madhya Pradesh",
  "Haryana",
  "Punjab",
  "Rajasthan",
  "Uttar Pradesh",
  "Gujarat",
  "Bihar",
];

type ProductSuggestion = {
  id?: string;
  crop_name: string;
  category?: string;
};

function ListingsPage() {
  const { search } = Route.useSearch();
  const [cat, setCat] = useState("All");
  const [organic, setOrganic] = useState(false);
  const [maxPrice, setMaxPrice] = useState(500);
  const [selectedState, setSelectedState] = useState("All");
  const [district, setDistrict] = useState("");
  const [listingType, setListingType] = useState("All");
  const [grade, setGrade] = useState("All");
  const [drawer, setDrawer] = useState(false);
  const { profile } = useAuth();

  const [lat, setLat] = useState<number>();
  const [lng, setLng] = useState<number>();
  const [radius, setRadius] = useState<number>(50);
  const [minTrust, setMinTrust] = useState<number>(0);
  const [minRating, setMinRating] = useState<number>(0);
  const [harvestFreshness, setHarvestFreshness] = useState<number>(0);

  // Request location on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
      });
    }
  }, []);

  const filters = useMemo(
    () => ({
      category: cat,
      organic,
      maxPrice,
      search: search || "",
      state: selectedState,
      district: district,
      listingType,
      grade,
      lat,
      lng,
      radius,
      minTrust: minTrust || undefined,
      minRating: minRating || undefined,
      harvestFreshness: harvestFreshness || undefined,
    }),
    [
      cat,
      maxPrice,
      organic,
      search,
      selectedState,
      district,
      listingType,
      grade,
      lat,
      lng,
      radius,
      minTrust,
      minRating,
      harvestFreshness,
    ],
  );
  const { data: products, loading, error } = useProducts(filters);
  const districtCount = new Set(products.map((p) => p.district)).size;

  const filterControls = (
    <div className="space-y-6">
      <div>
        <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Category
        </div>
        <div className="flex flex-wrap gap-2">
          {CATS.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition-all press ${
                cat === c
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>
      <div>
        <div className="mb-3 flex items-center justify-between text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          <span>Max price</span>
          <span className="font-mono text-amber">₹{maxPrice}/kg</span>
        </div>
        <input
          type="range"
          min={10}
          max={500}
          value={maxPrice}
          onChange={(e) => setMaxPrice(+e.target.value)}
          className="w-full accent-[oklch(0.78_0.18_145)]"
        />
      </div>
      <label
        className={`flex cursor-pointer items-center justify-between gap-4 rounded-xl border p-4 transition-all hover:bg-secondary/80 ${organic ? "border-primary/50 bg-primary/5 shadow-[0_0_15px_-3px_rgba(34,197,94,0.1)]" : "border-border bg-secondary"}`}
      >
        <div className="flex-1 min-w-0">
          <div
            className={`text-sm font-bold truncate transition-colors ${organic ? "text-primary" : "text-foreground"}`}
          >
            Organic only
          </div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground truncate mt-0.5">
            Certified
          </div>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            setOrganic((v) => !v);
          }}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${organic ? "bg-primary" : "bg-border"}`}
        >
          <span className="sr-only">Toggle organic</span>
          <span
            aria-hidden="true"
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out ${organic ? "translate-x-5" : "translate-x-0"}`}
          />
        </button>
      </label>

      {/* Listing Type Filter */}
      <div>
        <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Buying Option
        </div>
        <div className="flex rounded-xl border border-border bg-secondary/50 p-1 backdrop-blur-sm">
          {["All", "Buy Now", "Auction"].map((type) => {
            const val = type === "Buy Now" ? "buy_now" : type.toLowerCase();
            return (
              <button
                key={type}
                onClick={() => setListingType(val)}
                className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-all ${
                  listingType === val
                    ? "bg-card text-foreground shadow-sm ring-1 ring-border"
                    : "text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
                }`}
              >
                {type}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grade Filter */}
      <div>
        <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Quality Grade
        </div>
        <div className="flex flex-wrap gap-2">
          {["All", "A", "B", "C"].map((g) => (
            <button
              key={g}
              onClick={() => setGrade(g)}
              className={`rounded-full border px-4 py-2 text-xs font-bold transition-all press ${
                grade === g
                  ? "border-amber bg-amber/10 text-amber shadow-[0_0_15px_-3px_rgba(245,158,11,0.3)]"
                  : "border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground"
              }`}
            >
              {g === "All" ? "Any" : `Grade ${g}`}
            </button>
          ))}
        </div>
      </div>

      {/* Distance Filter */}
      {lat && lng && (
        <div>
          <div className="mb-3 flex items-center justify-between text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" /> Radius
            </span>
            <span className="font-mono text-primary">{radius} km</span>
          </div>
          <input
            type="range"
            min={5}
            max={500}
            step={5}
            value={radius}
            onChange={(e) => setRadius(+e.target.value)}
            className="w-full accent-primary"
          />
        </div>
      )}

      {/* Trust Score */}
      <div>
        <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Minimum Trust Score{" "}
          {minTrust > 0 && (
            <span className="font-mono text-primary normal-case">({minTrust}+)</span>
          )}
        </div>
        <input
          type="range"
          min={0}
          max={90}
          step={10}
          value={minTrust}
          onChange={(e) => setMinTrust(+e.target.value)}
          className="w-full accent-primary"
        />
      </div>

      {/* Freshness */}
      <div>
        <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Harvest Freshness
        </div>
        <select
          className="input w-full text-sm py-2"
          value={harvestFreshness}
          onChange={(e) => setHarvestFreshness(Number(e.target.value))}
        >
          <option value={0}>Any time</option>
          <option value={3}>Last 3 Days</option>
          <option value={7}>Last 7 Days</option>
          <option value={14}>Last 14 Days</option>
        </select>
      </div>
    </div>
  );

  return (
    <PageShell>
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-8">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold md:text-5xl">
              Browse <span className="text-gradient">Crops</span>
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {loading
                ? "Loading listings..."
                : `${products.length} listings from ${districtCount} districts`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {profile?.role === "farmer" && (
              <Link
                to="/farmer/list-product"
                className="hidden h-12 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground press shadow-glow sm:inline-flex"
              >
                <Plus className="h-4 w-4" /> List
              </Link>
            )}
            <button
              onClick={() => setDrawer(true)}
              className="grid h-12 w-12 place-items-center rounded-xl border border-border bg-secondary md:hidden"
            >
              <SlidersHorizontal className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex gap-8">
          <aside className="sticky top-24 hidden h-fit w-64 shrink-0 rounded-2xl border border-border bg-card p-6 md:block">
            {filterControls}
          </aside>

          <div className="flex-1">
            {error ? (
              <StateBox title="Could not load crops" detail={error} />
            ) : loading ? (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-72 animate-pulse rounded-2xl border border-border bg-card"
                  />
                ))}
              </div>
            ) : products.length === 0 ? (
              <StateBox
                title="No crops found"
                detail="Try adjusting your filters, or ask a farmer to add a listing."
              />
            ) : (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {products.map((p, i) => (
                  <ProductCard key={p.id} p={p} idx={i} />
                ))}
              </div>
            )}
          </div>
        </div>

        {drawer && (
          <div
            className="fixed inset-0 z-50 md:hidden"
            style={{ animation: "var(--animate-fade-in)" }}
          >
            <div
              className="absolute inset-0 bg-background/80 backdrop-blur"
              onClick={() => setDrawer(false)}
            />
            <div
              className="absolute bottom-0 left-0 right-0 rounded-t-3xl border-t border-border bg-card p-6"
              style={{ animation: "var(--animate-fade-up)" }}
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-display text-lg font-bold">Filters</h3>
                <button
                  onClick={() => setDrawer(false)}
                  className="grid h-9 w-9 place-items-center rounded-xl bg-secondary"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              {filterControls}
              <button
                onClick={() => setDrawer(false)}
                className="mt-6 w-full rounded-xl bg-primary py-3.5 font-semibold text-primary-foreground"
              >
                Apply Filters
              </button>
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
}

function StateBox({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card py-20 text-center">
      <div className="text-5xl">AG</div>
      <h3 className="mt-4 font-display text-xl font-bold">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{detail}</p>
    </div>
  );
}
