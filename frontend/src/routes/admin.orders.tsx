import { AdminShell } from "@/components/AdminShell";
import { listAdminOrders } from "@/lib/admin";
import type { Order } from "@/types/order";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/admin/orders")({
  component: AdminOrders,
});

function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    listAdminOrders()
      .then(setOrders)
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load orders."));
  }, []);

  return (
    <AdminShell>
      <h1 className="font-display text-3xl font-bold">Orders</h1>
      {error && (
        <p className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="mt-6 space-y-3">
        {orders.map((order) => (
          <Link
            key={order.id}
            to="/orders/$id"
            params={{ id: order.id }}
            className="block rounded-2xl border border-border bg-card p-4 card-lift"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-semibold">#{order.id.slice(0, 8).toUpperCase()}</div>
                <div className="text-xs text-muted-foreground">
                  {order.status} · {order.payment_status}
                </div>
              </div>
              <div className="font-mono text-lg font-semibold text-amber">
                ₹{order.total_amount.toLocaleString("en-IN")}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </AdminShell>
  );
}
