import { createFileRoute, Link } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";
import {
  ArrowLeft,
  Check,
  Package,
  Truck,
  Home,
  ClipboardCheck,
  Phone,
  MapPin,
  AlertTriangle,
  Star,
  Box,
  RefreshCcw,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { listOrderItems, updateOrderStatus } from "@/lib/orders";
import type { Order, OrderItem } from "@/types/order";
import { useAuth } from "@/hooks/useAuth";
import { useOrderStatus } from "@/hooks/useOrderStatus";
import { createDispute } from "@/lib/disputes";
import type { Dispute } from "@/lib/disputes";
import { addToCart } from "@/lib/cart";
import { useCart } from "@/hooks/useCart";
import { buildAuthHeaders } from "@/lib/products";

export const Route = createFileRoute("/orders/$id")({
  component: OrderTracking,
});

const stages = [
  { status: "pending", Icon: ClipboardCheck, label: "Order Placed" },
  { status: "accepted", Icon: Check, label: "Confirmed" },
  { status: "packed", Icon: Box, label: "Packed" },
  { status: "dispatched", Icon: Truck, label: "Dispatched" },
  { status: "delivered", Icon: Home, label: "Delivered" },
] as const;

const DISPUTE_REASONS = [
  { value: "quality", label: "Quality Mismatch" },
  { value: "missing_items", label: "Missing / Wrong Items" },
  { value: "delay", label: "Delivery Delay" },
  { value: "other", label: "Other" },
] as const;

type DisputeReason = (typeof DISPUTE_REASONS)[number]["value"];

function OrderTracking() {
  const { id } = Route.useParams();
  const { profile } = useAuth();
  const { order, loading, error, refreshOrder } = useOrderStatus(id);
  const [items, setItems] = useState<OrderItem[]>([]);
  const { refreshCart } = useCart();

  // Dispute state
  const [existingDispute, setExistingDispute] = useState<Dispute | null>(null);
  const [disputeReason, setDisputeReason] = useState<DisputeReason>("quality");
  const [disputeText, setDisputeText] = useState("");
  const [disputeEvidenceUrl, setDisputeEvidenceUrl] = useState("");
  const [disputeLoading, setDisputeLoading] = useState(false);
  const [disputeSuccess, setDisputeSuccess] = useState(false);

  // Farmer counter-evidence state
  const [evidenceText, setEvidenceText] = useState("");
  const [evidenceLoading, setEvidenceLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    listOrderItems(id).then(setItems).catch(console.error);
  }, [id]);

  // Load existing dispute for this order (buyer & farmer)
  useEffect(() => {
    if (!id) return;
    fetch(`/api/disputes/order/${id}`, { headers: buildAuthHeaders() })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setExistingDispute(d))
      .catch(console.error);
  }, [id, disputeSuccess]);

  const currentStage = useMemo(() => {
    if (!order) return 0;
    const idx = stages.findIndex((s) => s.status === order.status);
    return idx >= 0 ? idx : 0;
  }, [order]);

  const nextFarmerStatus =
    order?.status === "pending"
      ? "accepted"
      : order?.status === "accepted"
        ? "packed"
        : order?.status === "packed"
          ? "dispatched"
          : null;

  const canFarmerUpdate =
    profile?.role === "farmer" && profile?.id === order?.farmer_id && nextFarmerStatus;
  const canBuyerDeliver =
    profile?.role === "buyer" && profile?.id === order?.buyer_id && order?.status === "dispatched";
  const canBuyerDispute =
    profile?.role === "buyer" &&
    profile?.id === order?.buyer_id &&
    !["cancelled", "disputed", "delivered"].includes(order?.status ?? "") &&
    !existingDispute;
  const canFarmerEvidence =
    profile?.role === "farmer" &&
    profile?.id === order?.farmer_id &&
    order?.status === "disputed" &&
    existingDispute &&
    !existingDispute.farmer_notes;

  const raiseDispute = async () => {
    if (!profile || !order || !disputeText.trim()) return;
    setDisputeLoading(true);
    try {
      await createDispute({
        order_id: order.id,
        reason: disputeReason,
        description: disputeText.trim(),
        buyer_evidence_url: disputeEvidenceUrl.trim() || undefined,
      });
      setDisputeText("");
      setDisputeEvidenceUrl("");
      setDisputeSuccess(true);
      refreshOrder();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to file dispute");
    } finally {
      setDisputeLoading(false);
    }
  };

  const submitCounterEvidence = async () => {
    if (!existingDispute || !evidenceText.trim()) return;
    setEvidenceLoading(true);
    try {
      const { submitCounterEvidence } = await import("@/lib/disputes");
      await submitCounterEvidence(existingDispute.id, evidenceText.trim());
      alert("Counter evidence submitted successfully.");
      setEvidenceText("");
      refreshOrder();
    } catch {
      alert("Failed to submit counter evidence.");
    } finally {
      setEvidenceLoading(false);
    }
  };

  const handleReorder = async () => {
    if (!items.length) return;
    const skipped: string[] = [];
    for (const item of items) {
      try {
        // Fetch current product to check availability
        const res = await fetch(`/api/products/${item.product_id}`);
        if (!res.ok) {
          skipped.push(item.crop_name);
          continue;
        }
        const product = await res.json();
        if ((product.available_quantity_kg ?? 0) < item.quantity_kg) {
          skipped.push(item.crop_name);
          continue;
        }
        await addToCart(product, item.quantity_kg);
      } catch {
        skipped.push(item.crop_name);
      }
    }
    refreshCart();
    if (skipped.length) {
      alert(`Added to cart! Skipped (out of stock): ${skipped.join(", ")}`);
    }
    window.location.href = "/cart";
  };

  if (error) {
    return (
      <PageShell>
        <div className="mx-auto max-w-md px-4 py-20 text-center">
          <h1 className="font-display text-3xl font-bold">Order unavailable</h1>
          <p className="mt-2 text-sm text-muted-foreground">{error}</p>
        </div>
      </PageShell>
    );
  }

  if (!order) {
    return (
      <PageShell>
        <div className="mx-auto max-w-4xl px-4 py-8 md:px-8">
          <div className="h-96 animate-pulse rounded-3xl border border-border bg-card" />
        </div>
      </PageShell>
    );
  }

  const address = order.delivery_address;
  const isDelivered = order.status === "delivered";
  const isDisputeStatus = order.status === "disputed";
  const isCancelled = order.status === "cancelled";

  const disputeStatusConfig = existingDispute
    ? {
        open: { label: "Dispute Under Review", cls: "border-amber/40 bg-amber/10 text-amber" },
        resolved_refunded: {
          label: "Resolved — Refund Issued",
          cls: "border-primary/40 bg-primary/10 text-primary",
        },
        resolved_rejected: {
          label: "Dispute Rejected",
          cls: "border-destructive/40 bg-destructive/10 text-destructive",
        },
      }[existingDispute.status]
    : null;

  return (
    <PageShell>
      <div className="mx-auto max-w-4xl px-4 py-8 md:px-8">
        <Link
          to="/orders"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> All orders
        </Link>

        <div className="rounded-[2rem] border border-border bg-card/40 p-6 md:p-10 backdrop-blur-xl shadow-sm">
          {/* Header */}
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Order ID
              </div>
              <h1 className="font-display text-2xl font-bold md:text-3xl mt-1 text-foreground">
                #{order.id.slice(0, 8).toUpperCase()}
              </h1>
              <div className="mt-1 text-xs text-muted-foreground">
                {new Date(order.created_at).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </div>
            </div>
            <span
              className={`rounded-full border px-4 py-1.5 text-xs font-bold uppercase tracking-widest shadow-sm ${
                isDelivered
                  ? "border-primary/30 bg-primary/10 text-primary"
                  : isDisputeStatus
                    ? "border-destructive/30 bg-destructive/10 text-destructive"
                    : isCancelled
                      ? "border-muted/30 bg-muted/10 text-muted-foreground"
                      : "border-amber/30 bg-amber/10 text-amber"
              }`}
            >
              {order.status}
            </span>
          </div>

          {/* ─── Tracking Timeline (5 stages like Flipkart/Amazon) ─── */}
          {!isCancelled && (
            <div className="mt-12 mb-10">
              <div className="relative grid grid-cols-5 gap-1">
                {/* Background track */}
                <div className="absolute left-0 right-0 top-6 h-1 rounded-full bg-secondary/80" />
                {/* Progress fill */}
                <div
                  className="absolute left-0 top-6 h-1 rounded-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-700 shadow-[0_0_10px_rgba(34,197,94,0.5)]"
                  style={{ width: `${(currentStage / (stages.length - 1)) * 100}%` }}
                />
                {stages.map((stage, i) => {
                  const done = i < currentStage;
                  const active = i === currentStage && !isDelivered && !isDisputeStatus;
                  const completed = i === currentStage && isDelivered;
                  return (
                    <div
                      key={stage.status}
                      className="relative flex flex-col items-center text-center"
                    >
                      <div
                        className={`relative z-10 grid h-12 w-12 place-items-center rounded-full transition-all duration-500 border-4 border-background ${
                          done || completed
                            ? "bg-primary text-primary-foreground scale-100"
                            : active
                              ? "bg-primary text-primary-foreground shadow-[0_0_20px_-3px_rgba(34,197,94,0.6)] scale-110"
                              : "bg-secondary text-muted-foreground scale-95"
                        }`}
                      >
                        {active && (
                          <span className="absolute inset-0 animate-ping rounded-full bg-primary/60" />
                        )}
                        {done || completed ? (
                          <Check className="h-5 w-5" />
                        ) : (
                          <stage.Icon className="h-5 w-5" />
                        )}
                      </div>
                      <div
                        className={`mt-3 text-[9px] font-bold uppercase tracking-widest transition-colors leading-tight max-w-[60px] ${
                          active || done || completed ? "text-foreground" : "text-muted-foreground"
                        }`}
                      >
                        {stage.label}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ─── Items + Delivery info ─── */}
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {/* Order Items */}
            <div className="rounded-3xl border border-border bg-secondary/30 p-6 backdrop-blur-sm hover:bg-secondary/40 transition-all">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Order Items
              </h3>
              <div className="mt-4 space-y-4">
                {items.map((item) => (
                  <div key={item.id} className="flex flex-col gap-2">
                    <div className="flex justify-between gap-3 items-center">
                      <div>
                        <div className="font-bold text-sm text-foreground">{item.crop_name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5 font-medium">
                          {item.quantity_kg} kg × ₹{item.price_per_kg}/kg
                        </div>
                      </div>
                      <div className="font-mono text-lg font-bold text-amber">
                        ₹{Number(item.total_price).toLocaleString("en-IN")}
                      </div>
                    </div>
                    {/* Review Section for Delivered Items */}
                    {isDelivered && profile?.id === order.buyer_id && (
                      <div className="mt-2 border-t border-border/40 pt-3">
                        {!item.review_id ? (
                          <ReviewForm orderItemId={item.id} onReviewed={refreshOrder} />
                        ) : (
                          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-primary">
                            <Star className="h-3.5 w-3.5 fill-primary" /> Rated by you
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-6 border-t border-border/60 pt-5 flex justify-between items-end">
                <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Total Paid
                </div>
                <div className="font-mono text-3xl font-bold text-amber">
                  ₹{Number(order.total_amount).toLocaleString("en-IN")}
                </div>
              </div>
            </div>

            {/* Delivery Details */}
            <div className="rounded-3xl border border-border bg-secondary/30 p-6 backdrop-blur-sm hover:bg-secondary/40 transition-all">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Delivery Details
              </h3>
              <div className="mt-4 p-4 rounded-2xl bg-card border border-border/50">
                <p className="font-display text-xl font-bold text-foreground">{address.name}</p>
                <div className="mt-2 flex items-start gap-2 text-sm text-muted-foreground font-medium">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>
                    {address.address}, {address.district} - {address.pincode}
                  </span>
                </div>
                <button className="mt-4 inline-flex items-center gap-2 rounded-xl border border-border bg-secondary/50 px-4 py-2 text-xs font-bold hover:bg-secondary press transition-all">
                  <Phone className="h-3.5 w-3.5" /> {address.phone}
                </button>
              </div>
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Payment Method</span>
                  <span className="font-semibold uppercase text-foreground">
                    {order.payment_method}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Payment Status</span>
                  <span
                    className={`font-semibold ${order.payment_status === "paid" ? "text-primary" : "text-amber"}`}
                  >
                    {order.payment_status}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ─── Action Buttons (Farmer status update + Buyer confirm) ─── */}
          <div className="mt-8 flex flex-wrap gap-3">
            {canFarmerUpdate && (
              <button
                onClick={() => updateOrderStatus(order.id, nextFarmerStatus!).then(refreshOrder)}
                className="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground press shadow-glow"
              >
                Mark as {nextFarmerStatus}
              </button>
            )}
            {canBuyerDeliver && (
              <button
                onClick={() => updateOrderStatus(order.id, "delivered").then(refreshOrder)}
                className="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground press shadow-glow"
              >
                Confirm Delivery
              </button>
            )}
            {isDelivered && profile?.id === order.buyer_id && (
              <button
                onClick={handleReorder}
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-secondary/60 px-5 py-3 text-sm font-semibold press hover:bg-secondary"
              >
                <RefreshCcw className="h-4 w-4" /> Reorder
              </button>
            )}
          </div>

          {/* ─── Farmer Counter-Evidence (when order is disputed) ─── */}
          {canFarmerEvidence && (
            <div className="mt-8 rounded-2xl border border-amber/30 bg-amber/5 p-5">
              <div className="mb-3 flex items-center gap-2 text-sm font-bold text-amber">
                <AlertTriangle className="h-4 w-4" /> Action Required: Dispute Raised by Buyer
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                A buyer has raised a dispute on this order. Please provide your counter-evidence or
                explanation below.
              </p>
              <textarea
                value={evidenceText}
                onChange={(e) => setEvidenceText(e.target.value)}
                className="min-h-24 w-full rounded-xl border border-border bg-input p-3 text-sm outline-none focus:border-primary"
                placeholder="Describe what happened — delivery proof, quality evidence, etc..."
              />
              <button
                onClick={submitCounterEvidence}
                disabled={evidenceLoading || !evidenceText.trim()}
                className="mt-3 rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold press disabled:opacity-50"
              >
                {evidenceLoading ? "Submitting..." : "Submit Counter Evidence"}
              </button>
            </div>
          )}

          {/* ─── Existing Dispute Status ─── */}
          {existingDispute && disputeStatusConfig && (
            <div className={`mt-8 rounded-2xl border p-5 ${disputeStatusConfig.cls}`}>
              <div className="flex items-center gap-2 text-sm font-bold mb-2">
                <AlertTriangle className="h-4 w-4" />
                {disputeStatusConfig.label}
              </div>
              <div className="text-xs opacity-80">
                <span className="font-semibold capitalize">
                  {existingDispute.reason.replace("_", " ")}
                </span>
                {" — "}
                {existingDispute.description}
              </div>
              {existingDispute.resolution_notes && (
                <div className="mt-2 text-xs opacity-70 italic">
                  {existingDispute.resolution_notes}
                </div>
              )}
            </div>
          )}

          {/* ─── Buyer Dispute Form ─── */}
          {canBuyerDispute && (
            <div className="mt-8 rounded-2xl border border-border bg-secondary/30 p-5">
              <div className="mb-4 flex items-center gap-2 text-sm font-bold">
                <AlertTriangle className="h-4 w-4 text-amber" /> Raise a Dispute
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                Not satisfied with your order? File a dispute and we'll investigate.
              </p>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest block mb-1.5">
                    Reason
                  </label>
                  <select
                    value={disputeReason}
                    onChange={(e) => setDisputeReason(e.target.value as DisputeReason)}
                    className="w-full rounded-xl border border-border bg-input p-3 text-sm outline-none focus:border-primary"
                  >
                    {DISPUTE_REASONS.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest block mb-1.5">
                    Description
                  </label>
                  <textarea
                    value={disputeText}
                    onChange={(e) => setDisputeText(e.target.value)}
                    className="min-h-20 w-full rounded-xl border border-border bg-input p-3 text-sm outline-none focus:border-primary"
                    placeholder="Describe the issue in detail..."
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest block mb-1.5">
                    Evidence Photo URL{" "}
                    <span className="text-muted-foreground/60 font-normal">(optional)</span>
                  </label>
                  <input
                    type="url"
                    value={disputeEvidenceUrl}
                    onChange={(e) => setDisputeEvidenceUrl(e.target.value)}
                    className="w-full rounded-xl border border-border bg-input p-3 text-sm outline-none focus:border-primary"
                    placeholder="https://..."
                  />
                </div>

                <button
                  onClick={raiseDispute}
                  disabled={disputeLoading || !disputeText.trim()}
                  className="w-full rounded-xl border border-destructive/40 bg-destructive/10 text-destructive px-4 py-3 text-sm font-bold press hover:bg-destructive/20 disabled:opacity-50 transition-all"
                >
                  {disputeLoading ? "Filing dispute..." : "File Dispute"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}

function ReviewForm({ orderItemId, onReviewed }: { orderItemId: string; onReviewed: () => void }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (rating === 0) return;
    setLoading(true);
    try {
      const { createReview } = await import("@/lib/reviews");
      await createReview({ order_item_id: orderItemId, rating, comment: comment.trim() });
      onReviewed();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to submit review");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="rounded-xl bg-card p-3 shadow-sm border border-border/50 mt-3"
      style={{ animation: "var(--animate-fade-up)" }}
    >
      <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
        Rate this product
      </div>
      <div className="flex gap-1 mb-3">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => setRating(star)}
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
            className="focus:outline-none press"
          >
            <Star
              className={`h-5 w-5 ${star <= (hover || rating) ? "fill-amber text-amber" : "text-border"}`}
            />
          </button>
        ))}
      </div>
      {rating > 0 && (
        <div className="space-y-2" style={{ animation: "var(--animate-fade-in)" }}>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Write a review (optional)..."
            className="w-full rounded-lg border border-border bg-input p-2 text-xs outline-none focus:border-primary min-h-[60px]"
          />
          <button
            onClick={submit}
            disabled={loading}
            className="w-full rounded-lg bg-primary py-2 text-xs font-semibold text-primary-foreground press shadow-glow"
          >
            {loading ? "Submitting..." : "Submit Review"}
          </button>
        </div>
      )}
    </div>
  );
}
