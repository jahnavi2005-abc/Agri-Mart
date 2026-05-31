import { AdminShell } from "@/components/AdminShell";
import { getAdminStats } from "@/lib/admin";
import { createFileRoute } from "@tanstack/react-router";
import { Boxes, Gavel, IndianRupee, ShoppingBag, Users } from "lucide-react";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/admin/dashboard")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const [stats, setStats] = useState({ users: 0, products: 0, orders: 0, disputes: 0, revenue: 0 });
  const [error, setError] = useState("");

  useEffect(() => {
    getAdminStats()
      .then(setStats)
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load stats."));
  }, []);

  const cards = [
    { label: "Users", value: stats.users, Icon: Users },
    { label: "Products", value: stats.products, Icon: Boxes },
    { label: "Orders", value: stats.orders, Icon: ShoppingBag },
    { label: "Disputes", value: stats.disputes, Icon: Gavel },
    { label: "Revenue", value: `₹${stats.revenue.toLocaleString("en-IN")}`, Icon: IndianRupee },
  ];

  return (
    <AdminShell>
      <h1 className="font-display text-3xl font-bold md:text-5xl">Admin Dashboard</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Platform controls and marketplace health.
      </p>
      {error && (
        <p className="mt-5 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(({ label, value, Icon }) => (
          <div key={label} className="rounded-2xl border border-border bg-card p-5">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/15 text-primary">
              <Icon className="h-5 w-5" />
            </div>
            <div className="mt-4 text-xs uppercase tracking-widest text-muted-foreground">
              {label}
            </div>
            <div className="font-display text-3xl font-bold">{value}</div>
          </div>
        ))}
      </div>
    </AdminShell>
  );
}
