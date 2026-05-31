import { AdminShell } from "@/components/AdminShell";
import { listDisputes, resolveDispute, type Dispute } from "@/lib/disputes";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle, XCircle, ExternalLink, Filter } from "lucide-react";

export const Route = createFileRoute("/admin/disputes")({
  component: AdminDisputes,
});

function AdminDisputes() {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | "open" | "resolved">("all");
  const [refundAmounts, setRefundAmounts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const load = () =>
    listDisputes()
      .then(setDisputes)
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load disputes."));

  useEffect(() => {
    load();
  }, []);

  const filtered = disputes.filter((d) => {
    if (filter === "open") return d.status === "open";
    if (filter === "resolved") return d.status !== "open";
    return true;
  });

  const handleResolve = async (
    dispute: Dispute,
    status: "resolved_refunded" | "resolved_rejected",
    notes: string,
    refund?: number,
  ) => {
    setLoading((p) => ({ ...p, [dispute.id]: true }));
    try {
      await resolveDispute(dispute.id, status, notes, refund);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to resolve dispute");
    } finally {
      setLoading((p) => ({ ...p, [dispute.id]: false }));
    }
  };

  return (
    <AdminShell>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="font-display text-3xl font-bold">Disputes</h1>
        <div className="flex gap-2">
          {(["all", "open", "resolved"] as const).map((f) => (
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
          <div className="py-16 text-center text-muted-foreground">No disputes found.</div>
        )}
        {filtered.map((dispute) => (
          <div key={dispute.id} className="rounded-2xl border border-border bg-card p-5">
            {/* Header */}
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-base capitalize">
                    {dispute.reason.replaceAll("_", " ")}
                  </span>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${
                      dispute.status === "open"
                        ? "border-amber/50 bg-amber/10 text-amber"
                        : dispute.status === "resolved_refunded"
                          ? "border-primary/50 bg-primary/10 text-primary"
                          : "border-destructive/30 bg-destructive/10 text-destructive"
                    }`}
                  >
                    {dispute.status.replaceAll("_", " ")}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{dispute.description}</p>
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span>
                    Buyer: <strong className="text-foreground">{dispute.buyer_name}</strong>
                  </span>
                  <span>
                    Farmer: <strong className="text-foreground">{dispute.farmer_name}</strong>
                  </span>
                  <span>
                    Order Total:{" "}
                    <strong className="text-amber">
                      ₹{Number(dispute.total_amount).toLocaleString("en-IN")}
                    </strong>
                  </span>
                </div>
                <Link
                  to="/orders/$id"
                  params={{ id: dispute.order_id }}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                >
                  View Order <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            </div>

            {/* Buyer Evidence */}
            {dispute.buyer_evidence_url && (
              <div className="mt-4 rounded-xl border border-border bg-secondary/30 p-3">
                <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
                  Buyer Evidence
                </div>
                <a
                  href={dispute.buyer_evidence_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary underline inline-flex items-center gap-1"
                >
                  View Evidence <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}

            {/* Farmer Counter-evidence */}
            {(dispute.farmer_notes || dispute.farmer_evidence_url) && (
              <div className="mt-3 rounded-xl border border-border bg-secondary/30 p-3">
                <div className="text-[10px] font-bold uppercase tracking-widest text-primary mb-1">
                  Farmer Counter-Evidence
                </div>
                {dispute.farmer_notes && (
                  <p className="text-sm text-muted-foreground">{dispute.farmer_notes}</p>
                )}
                {dispute.farmer_evidence_url && (
                  <a
                    href={dispute.farmer_evidence_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 text-xs text-primary underline inline-flex items-center gap-1"
                  >
                    View Farmer Evidence <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            )}

            {/* Resolve Actions */}
            {dispute.status === "open" && (
              <div className="mt-4 space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder={`Refund amount (max ₹${dispute.total_amount})`}
                    value={refundAmounts[dispute.id] ?? ""}
                    onChange={(e) =>
                      setRefundAmounts((p) => ({ ...p, [dispute.id]: e.target.value }))
                    }
                    className="flex-1 rounded-xl border border-border bg-input px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() =>
                      handleResolve(dispute, "resolved_rejected", "Dispute rejected after review.")
                    }
                    disabled={loading[dispute.id]}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-destructive/40 bg-destructive/10 text-destructive px-4 py-2 text-xs font-bold press hover:bg-destructive/20 disabled:opacity-50"
                  >
                    <XCircle className="h-3.5 w-3.5" /> Reject Dispute
                  </button>
                  <button
                    onClick={() => {
                      const amt = Number(refundAmounts[dispute.id] ?? dispute.total_amount);
                      handleResolve(
                        dispute,
                        "resolved_refunded",
                        `Refund of ₹${amt} approved.`,
                        amt,
                      );
                    }}
                    disabled={loading[dispute.id]}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground press shadow-glow disabled:opacity-50"
                  >
                    <CheckCircle className="h-3.5 w-3.5" /> Approve Refund
                  </button>
                </div>
              </div>
            )}

            {/* Resolution summary */}
            {dispute.status !== "open" && dispute.resolution_notes && (
              <div className="mt-4 rounded-xl border border-border bg-secondary/30 p-3 text-xs">
                <span className="font-semibold text-foreground">Resolution: </span>
                <span className="text-muted-foreground">{dispute.resolution_notes}</span>
                {dispute.refund_amount ? (
                  <span className="ml-1 font-semibold text-primary">
                    — ₹{dispute.refund_amount} refunded
                  </span>
                ) : null}
              </div>
            )}
          </div>
        ))}
      </div>
    </AdminShell>
  );
}
