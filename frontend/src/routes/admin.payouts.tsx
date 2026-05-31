import { AdminShell } from "@/components/AdminShell";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { adminListPayouts, adminResolvePayout, type Payout } from "@/lib/payouts";
import { CheckCircle, XCircle, IndianRupee, Clock, Phone } from "lucide-react";

export const Route = createFileRoute("/admin/payouts")({
  component: AdminPayouts,
});

function AdminPayouts() {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [error, setError] = useState("");
  const [utrNumbers, setUtrNumbers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState<"pending" | "all" | "approved" | "rejected">("pending");

  const load = () =>
    adminListPayouts()
      .then(setPayouts)
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load payouts."));

  useEffect(() => {
    load();
  }, []);

  const filtered = payouts.filter((p) => filter === "all" || p.status === filter);
  const pendingCount = payouts.filter((p) => p.status === "pending").length;

  const handleResolve = async (id: string, status: "approved" | "rejected") => {
    setLoading((prev) => ({ ...prev, [id]: true }));
    try {
      await adminResolvePayout(id, status, utrNumbers[id]);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to update payout");
    } finally {
      setLoading((prev) => ({ ...prev, [id]: false }));
    }
  };

  return (
    <AdminShell>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="font-display text-3xl font-bold">Farmer Payouts</h1>
          {pendingCount > 0 && (
            <p className="mt-1 text-sm text-amber font-medium">
              {pendingCount} pending withdrawal request{pendingCount !== 1 ? "s" : ""}
            </p>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          {(["pending", "all", "approved", "rejected"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-xl px-4 py-2 text-sm font-semibold capitalize press transition-all ${
                filter === f
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-secondary hover:bg-muted"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="space-y-4">
        {filtered.length === 0 && (
          <div className="py-16 text-center text-muted-foreground rounded-2xl border border-border bg-card">
            No {filter === "all" ? "" : filter} payout requests.
          </div>
        )}

        {filtered.map((payout) => (
          <div key={payout.id} className="rounded-2xl border border-border bg-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-2xl text-amber">
                    ₹{Number(payout.amount).toLocaleString("en-IN")}
                  </span>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${
                      payout.status === "pending"
                        ? "border-amber/50 bg-amber/10 text-amber"
                        : payout.status === "approved"
                          ? "border-primary/50 bg-primary/10 text-primary"
                          : "border-destructive/30 bg-destructive/10 text-destructive"
                    }`}
                  >
                    {payout.status}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground">
                  Farmer: <strong className="text-foreground">{payout.farmer_name || "—"}</strong>
                </div>
                <div className="font-mono text-sm text-muted-foreground">
                  UPI: <strong className="text-foreground">{payout.upi_id}</strong>
                </div>
                {payout.phone && (
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Phone className="h-3.5 w-3.5" /> {payout.phone}
                  </div>
                )}
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  {new Date(payout.created_at).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
                {payout.utr_number && (
                  <div className="font-mono text-xs bg-secondary/50 px-2 py-1 rounded-lg border border-border inline-block">
                    UTR: {payout.utr_number}
                  </div>
                )}
              </div>
            </div>

            {/* Approve/Reject for pending */}
            {payout.status === "pending" && (
              <div className="mt-4 space-y-3">
                <input
                  type="text"
                  placeholder="UTR / Transaction reference (required for approval)"
                  value={utrNumbers[payout.id] ?? ""}
                  onChange={(e) => setUtrNumbers((p) => ({ ...p, [payout.id]: e.target.value }))}
                  className="w-full rounded-xl border border-border bg-input px-3 py-2 text-sm outline-none focus:border-primary font-mono"
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleResolve(payout.id, "rejected")}
                    disabled={loading[payout.id]}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-destructive/40 bg-destructive/10 text-destructive px-4 py-2 text-xs font-bold press hover:bg-destructive/20 disabled:opacity-50"
                  >
                    <XCircle className="h-3.5 w-3.5" /> Reject
                  </button>
                  <button
                    onClick={() => handleResolve(payout.id, "approved")}
                    disabled={loading[payout.id] || !utrNumbers[payout.id]?.trim()}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground press shadow-glow disabled:opacity-50"
                  >
                    <CheckCircle className="h-3.5 w-3.5" /> Approve & Mark Paid
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </AdminShell>
  );
}
