import { PageShell } from "@/components/PageShell";
import { listPriceHistory, type PriceHistory } from "@/lib/market";
import { createFileRoute } from "@tanstack/react-router";
import { Search, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/market-prices")({
  component: MarketPrices,
});

function MarketPrices() {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<PriceHistory[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    listPriceHistory(q)
      .then(setRows)
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load prices."));
  }, [q]);

  return (
    <PageShell>
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <div className="text-xs uppercase tracking-widest text-primary">Mandi Prices</div>
            <h1 className="font-display text-3xl font-bold md:text-5xl">Market prices</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Compare platform prices with local mandi benchmarks.
            </p>
          </div>
          <div className="flex items-center rounded-xl border border-border bg-input md:w-80">
            <Search className="ml-3 h-4 w-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search crop..."
              className="flex-1 bg-transparent px-3 py-3 text-sm outline-none"
            />
          </div>
        </div>
        {error && (
          <p className="mt-5 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="mt-8 overflow-hidden rounded-2xl border border-border bg-card">
          {rows.map((row) => (
            <div
              key={row.id}
              className="grid gap-3 border-b border-border p-4 last:border-0 md:grid-cols-[1fr_160px_160px_160px] md:items-center"
            >
              <div>
                <div className="font-semibold">{row.crop_name}</div>
                <div className="text-xs text-muted-foreground">
                  {row.district} · {row.recorded_date}
                </div>
              </div>
              <Metric label="Mandi" value={row.mandi_price} />
              <Metric label="AgriMart avg" value={row.platform_avg_price ?? 0} />
              <div className="inline-flex items-center gap-2 text-sm text-primary">
                <TrendingUp className="h-4 w-4" /> Watch trend
              </div>
            </div>
          ))}
          {!rows.length && (
            <div className="p-10 text-center text-sm text-muted-foreground">
              No market prices yet. Seed `price_history` in Supabase.
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="font-mono text-lg font-semibold text-amber">₹{value}/kg</div>
    </div>
  );
}
