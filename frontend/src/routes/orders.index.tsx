import { createFileRoute, Link } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";
import { Package, ChevronRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { listMyOrders } from "@/lib/orders";
import type { Order } from "@/types/order";

export const Route = createFileRoute("/orders/")({
  component: OrdersPage,
});

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  accepted: "bg-primary/15 text-primary border-primary/30",
  packed: "bg-primary/15 text-primary border-primary/30",
  dispatched: "bg-amber/15 text-amber border-amber/30",
  delivered: "bg-primary/15 text-primary border-primary/30",
  cancelled: "bg-destructive/15 text-destructive border-destructive/30",
  disputed: "bg-destructive/15 text-destructive border-destructive/30",
};

function OrdersPage() {
  const { profile, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!profile) {
      setLoading(false);
      return;
    }

    setLoading(true);
    listMyOrders(profile)
      .then(setOrders)
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load orders."))
      .finally(() => setLoading(false));
  }, [profile]);

  return (
    <PageShell>
      <div className="mx-auto max-w-5xl px-4 py-8 md:px-8">
        <h1 className="font-display text-3xl font-bold md:text-5xl">
          Your <span className="text-gradient">Orders</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track every shipment from farm to your door.
        </p>

        {!authLoading && !profile ? (
          <State
            title="Sign in to view orders"
            detail="Orders are attached to your AgriMart account."
            action="Sign in"
            to="/login"
          />
        ) : error ? (
          <State title="Could not load orders" detail={error} />
        ) : loading ? (
          <div className="mt-8 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-24 animate-pulse rounded-2xl border border-border bg-card"
              />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <State
            title="No orders yet"
            detail="Place an order from the marketplace and it will appear here."
            action="Browse crops"
            to="/listings"
          />
        ) : (
          <div className="mt-8 space-y-3">
            {orders.map((order, i) => (
              <Link
                key={order.id}
                to="/orders/$id"
                params={{ id: order.id }}
                className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-4 card-lift"
              >
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-secondary text-primary">
                  <Package className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold">Order #{order.id.slice(0, 8).toUpperCase()}</h3>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${STATUS_STYLES[order.status]}`}
                    >
                      {order.status}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="font-mono">
                      {new Date(order.created_at).toLocaleDateString("en-IN")}
                    </span>
                    <span>·</span>
                    <span>{order.payment_method.toUpperCase()}</span>
                    <span>·</span>
                    <span>{order.payment_status}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-lg font-semibold text-amber">
                    ₹{order.total_amount.toLocaleString("en-IN")}
                  </div>
                  <ChevronRight className="ml-auto mt-1 h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}

function State({
  title,
  detail,
  action,
  to,
}: {
  title: string;
  detail: string;
  action?: string;
  to?: string;
}) {
  return (
    <div className="mt-10 rounded-3xl border border-border bg-card p-10 text-center">
      <h2 className="font-display text-2xl font-bold">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{detail}</p>
      {action && to && (
        <Link
          to={to as never}
          className="mt-6 inline-flex rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground press shadow-glow"
        >
          {action}
        </Link>
      )}
    </div>
  );
}
