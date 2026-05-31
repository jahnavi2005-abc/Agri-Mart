import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";
import {
  Check,
  MapPin,
  CreditCard,
  ShieldCheck,
  ArrowRight,
  ShoppingBag,
  Package,
} from "lucide-react";
import { useEffect, useState } from "react";
import { getCartItems, clearCart } from "@/lib/cart";
import { useCart } from "@/hooks/useCart";
import { primaryProductImage } from "@/lib/products";
import type { CartItem, DeliveryAddress, Order } from "@/types/order";
import { createOrdersFromCart } from "@/lib/orders";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/checkout")({
  component: CheckoutPage,
});

const STEPS = ["Address", "Review", "Place Order"];

function CheckoutPage() {
  const [step, setStep] = useState(0);
  const [createdOrders, setCreatedOrders] = useState<Order[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { profile, loading: authLoading } = useAuth();
  const { items, totals } = useCart();
  const navigate = useNavigate();
  const [address, setAddress] = useState<DeliveryAddress>({
    name: "",
    phone: "",
    address: "",
    district: "",
    state: "",
    pincode: "",
  });

  useEffect(() => {
    if (!profile) return;
    setAddress((cur) => ({
      ...cur,
      name: cur.name || profile.name,
      phone: cur.phone || profile.phone || "",
      district: cur.district || profile.district || "",
      state: cur.state || profile.state || "",
    }));
  }, [profile]);

  const placeOrder = async () => {
    if (!profile) {
      navigate({ to: "/login" });
      return;
    }
    if (
      !address.name ||
      !address.phone ||
      !address.address ||
      !address.district ||
      !address.state ||
      !address.pincode
    ) {
      setError("Please fill all delivery address fields.");
      setStep(0);
      return;
    }
    setError("");
    setLoading(true);
    try {
      const orders = await createOrdersFromCart(items, profile, address);
      setCreatedOrders(orders);
      await clearCart(); // ✅ Clear cart after successful order placement
      setStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not place order.");
    } finally {
      setLoading(false);
    }
  };

  if (!authLoading && !profile) {
    return (
      <PageShell>
        <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 py-12 text-center">
          <ShoppingBag className="mb-4 h-16 w-16 text-primary" />
          <h1 className="font-display text-3xl font-bold">Sign in to checkout</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your cart is ready — sign in to place your order.
          </p>
          <Link
            to="/login"
            className="mt-6 w-full rounded-xl bg-primary py-3.5 text-center font-semibold text-primary-foreground press shadow-glow"
          >
            Sign in
          </Link>
        </div>
      </PageShell>
    );
  }

  // Order success screen
  if (step === 3) {
    return (
      <PageShell>
        <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-4 py-12 text-center">
          <div className="relative mb-6">
            <div className="absolute inset-0 animate-ping rounded-full bg-primary/30" />
            <div className="relative grid h-24 w-24 place-items-center rounded-full bg-primary text-primary-foreground shadow-glow">
              <Check className="h-12 w-12" strokeWidth={3} />
            </div>
          </div>
          <h1 className="font-display text-4xl font-bold">Order Placed!</h1>
          <p className="mt-2 text-muted-foreground">
            Your order has been confirmed. The farmer will accept it shortly.
          </p>
          <div className="mt-6 w-full space-y-2">
            {createdOrders.map((order) => (
              <Link
                key={order.id}
                to="/orders/$id"
                params={{ id: order.id }}
                className="flex items-center justify-between rounded-2xl border border-border bg-card p-4 press hover:bg-secondary"
              >
                <div className="flex items-center gap-3">
                  <Package className="h-5 w-5 text-primary" />
                  <div className="text-left">
                    <div className="font-semibold">Order #{order.id.slice(0, 8).toUpperCase()}</div>
                    <div className="text-xs text-muted-foreground">Tap to track</div>
                  </div>
                </div>
                <div className="font-mono font-bold text-amber">
                  ₹{Number(order.total_amount).toLocaleString("en-IN")}
                </div>
              </Link>
            ))}
          </div>
          <Link
            to="/orders"
            className="mt-6 w-full rounded-xl bg-primary py-3.5 text-center font-semibold text-primary-foreground press shadow-glow"
          >
            View All Orders
          </Link>
          <Link to="/listings" className="mt-3 text-sm text-muted-foreground hover:text-foreground">
            Continue shopping
          </Link>
        </div>
      </PageShell>
    );
  }

  if (items.length === 0) {
    return (
      <PageShell>
        <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 py-12 text-center">
          <div className="text-6xl mb-4">🛒</div>
          <h1 className="font-display text-3xl font-bold">Your cart is empty</h1>
          <p className="mt-2 text-sm text-muted-foreground">Add crops before checkout.</p>
          <Link
            to="/listings"
            className="mt-6 w-full rounded-xl bg-primary py-3.5 text-center font-semibold text-primary-foreground press shadow-glow"
          >
            Browse crops
          </Link>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="mx-auto max-w-4xl px-4 py-8 md:px-8">
        <h1 className="font-display text-3xl font-bold md:text-4xl">Checkout</h1>

        {/* Step indicator */}
        <div className="mt-6 flex items-center gap-2">
          {STEPS.map((s, i) => (
            <div key={s} className="flex flex-1 items-center gap-2">
              <div
                className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold transition-all ${step >= i ? "bg-primary text-primary-foreground shadow-glow" : "bg-secondary text-muted-foreground"}`}
              >
                {step > i ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              <span
                className={`hidden text-sm font-medium sm:inline ${step >= i ? "text-foreground" : "text-muted-foreground"}`}
              >
                {s}
              </span>
              {i < STEPS.length - 1 && (
                <div className={`h-0.5 flex-1 rounded ${step > i ? "bg-primary" : "bg-border"}`} />
              )}
            </div>
          ))}
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_340px]">
          {/* Left panel */}
          <div className="rounded-3xl border border-border bg-card p-6 md:p-8">
            {step === 0 && <AddressStep address={address} setAddress={setAddress} />}
            {step === 1 && <ReviewStep items={items} address={address} />}
            {step === 2 && (
              <div className="text-center" style={{ animation: "var(--animate-fade-up)" }}>
                <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">
                  <ShieldCheck className="h-3.5 w-3.5" /> Cash on Delivery
                </div>
                <h3 className="mt-2 font-display text-2xl font-bold">
                  Confirm ₹{totals.total.toLocaleString("en-IN")}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Your order will be placed as Cash on Delivery. The farmer will confirm and
                  dispatch.
                </p>
                <div className="mt-6 space-y-2 text-left rounded-2xl border border-border bg-secondary p-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-mono">₹{totals.subtotal.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Platform fee (2%)</span>
                    <span className="font-mono">₹{totals.platformFee.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Delivery</span>
                    <span className="font-mono">₹{totals.delivery.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between border-t border-border pt-2 font-semibold">
                    <span>Total</span>
                    <span className="font-mono text-xl text-amber">
                      ₹{totals.total.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
                <button
                  onClick={placeOrder}
                  disabled={loading}
                  className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 text-base font-semibold text-primary-foreground press shadow-glow disabled:opacity-60"
                >
                  <CreditCard className="h-5 w-5" />
                  {loading ? "Placing Order..." : "Place Order (COD)"}
                </button>
              </div>
            )}
            {error && (
              <p className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </p>
            )}
            <div className="mt-8 flex items-center justify-between">
              <button
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                disabled={step === 0 || loading}
                className="rounded-xl border border-border px-5 py-3 text-sm font-semibold press disabled:opacity-30"
              >
                Back
              </button>
              {step < 2 && (
                <button
                  onClick={() => setStep((s) => s + 1)}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground press shadow-glow"
                >
                  Continue <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Order summary sidebar */}
          <aside className="h-fit rounded-2xl border border-border bg-card p-5">
            <h3 className="mb-3 font-display text-base font-bold">Order Summary</h3>
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.product.id} className="flex items-center gap-3">
                  <img
                    src={primaryProductImage(item.product)}
                    alt=""
                    className="h-12 w-12 rounded-xl object-cover shrink-0"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=100&q=70";
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="truncate text-sm font-semibold">{item.product.crop_name}</div>
                    <div className="text-xs text-muted-foreground">{item.quantity_kg} kg</div>
                  </div>
                  <div className="font-mono text-sm font-semibold text-amber shrink-0">
                    ₹{(item.quantity_kg * item.product.price_per_kg).toLocaleString("en-IN")}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 space-y-1.5 border-t border-border pt-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-mono">₹{totals.subtotal.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Platform fee</span>
                <span className="font-mono">₹{totals.platformFee.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Delivery</span>
                <span className="font-mono">₹{totals.delivery.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between border-t border-border pt-2 font-semibold">
                <span>Total</span>
                <span className="font-mono text-lg text-amber">
                  ₹{totals.total.toLocaleString("en-IN")}
                </span>
              </div>
            </div>
          </aside>
        </div>
      </div>
      <style>{`.input{width:100%;background:var(--input);border:1px solid var(--border);border-radius:12px;padding:12px 16px;outline:none;transition:all .2s;color:var(--foreground)}.input:focus{border-color:var(--primary);box-shadow:var(--shadow-glow)}`}</style>
    </PageShell>
  );
}

function AddressStep({
  address,
  setAddress,
}: {
  address: DeliveryAddress;
  setAddress: React.Dispatch<React.SetStateAction<DeliveryAddress>>;
}) {
  const update = (key: keyof DeliveryAddress, value: string) =>
    setAddress((cur) => ({ ...cur, [key]: value }));

  return (
    <div style={{ animation: "var(--animate-fade-up)" }}>
      <div className="mb-5 flex items-center gap-2 font-semibold">
        <MapPin className="h-4 w-4 text-primary" /> Delivery Address
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Full Name">
          <input
            className="input"
            value={address.name}
            onChange={(e) => update("name", e.target.value)}
            placeholder="Ravi Kumar"
          />
        </Field>
        <Field label="Phone">
          <input
            className="input"
            value={address.phone}
            onChange={(e) => update("phone", e.target.value)}
            placeholder="+91 98765 43210"
          />
        </Field>
        <div className="md:col-span-2">
          <Field label="Full Address">
            <textarea
              className="input min-h-[80px]"
              value={address.address}
              onChange={(e) => update("address", e.target.value)}
              placeholder="Door no, Street, Village..."
            />
          </Field>
        </div>
        <Field label="District">
          <input
            className="input"
            value={address.district}
            onChange={(e) => update("district", e.target.value)}
            placeholder="Guntur"
          />
        </Field>
        <Field label="State">
          <input
            className="input"
            value={address.state}
            onChange={(e) => update("state", e.target.value)}
            placeholder="Andhra Pradesh"
          />
        </Field>
        <Field label="Pincode">
          <input
            className="input"
            value={address.pincode}
            onChange={(e) => update("pincode", e.target.value)}
            placeholder="522001"
            maxLength={6}
          />
        </Field>
      </div>
    </div>
  );
}

function getDeliveryEstimate(
  buyerDistrict: string,
  buyerState: string,
  farmerDistrict: string,
  farmerState: string,
) {
  const bd = (buyerDistrict || "").trim().toLowerCase();
  const bs = (buyerState || "").trim().toLowerCase();
  const fd = (farmerDistrict || "").trim().toLowerCase();
  const fs = (farmerState || "").trim().toLowerCase();
  if (bd && fd && bd === fd) {
    return "1-2 days (Local)";
  }
  if (bs && fs && bs === fs) {
    return "2-4 days (Regional)";
  }
  return "4-7 days (National)";
}

function ReviewStep({ items, address }: { items: CartItem[]; address: DeliveryAddress }) {
  // Group items by farmer
  const grouped = items.reduce(
    (acc, item) => {
      const fId = item.product.farmer_id;
      if (!acc[fId]) acc[fId] = { farmerName: item.product.farmer_display_name, items: [] };
      acc[fId].items.push(item);
      return acc;
    },
    {} as Record<string, { farmerName: string; items: CartItem[] }>,
  );

  return (
    <div style={{ animation: "var(--animate-fade-up)" }}>
      <h3 className="mb-4 font-display text-xl font-bold">Review your order</h3>
      <div className="space-y-6">
        {Object.entries(grouped).map(([farmerId, group]) => {
          const firstProd = group.items[0].product;
          const estimate = getDeliveryEstimate(
            address.district,
            address.state,
            firstProd.district,
            firstProd.state,
          );
          return (
            <div key={farmerId} className="rounded-2xl border border-border bg-secondary/50 p-4">
              <div className="flex justify-between items-center mb-3 pb-2 border-b border-border/40">
                <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Order from {group.farmerName}
                </span>
                <span className="text-xs font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                  {estimate}
                </span>
              </div>
              <div className="space-y-3">
                {group.items.map((item) => (
                  <div key={item.product.id} className="flex items-center gap-3">
                    <img
                      src={primaryProductImage(item.product)}
                      alt=""
                      className="h-10 w-10 rounded-lg object-cover shrink-0"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=100&q=70";
                      }}
                    />
                    <div className="flex-1">
                      <div className="text-sm font-semibold">{item.product.crop_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {item.quantity_kg} kg · ₹{item.product.price_per_kg}/kg
                      </div>
                    </div>
                    <div className="font-mono text-sm font-semibold text-amber">
                      ₹{(item.quantity_kg * item.product.price_per_kg).toLocaleString("en-IN")}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}
