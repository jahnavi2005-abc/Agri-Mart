import { RoleRoute } from "@/components/RoleRoute";
import { PageShell } from "@/components/PageShell";
import { Link, useLocation } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  Package,
  ShoppingCart,
  AlertTriangle,
  IndianRupee,
  FileText,
} from "lucide-react";

const items = [
  { to: "/admin/dashboard", label: "Overview", Icon: LayoutDashboard },
  { to: "/admin/users", label: "Users", Icon: Users },
  { to: "/admin/products", label: "Listings", Icon: Package },
  { to: "/admin/orders", label: "Orders", Icon: ShoppingCart },
  { to: "/admin/disputes", label: "Disputes", Icon: AlertTriangle },
  { to: "/admin/payouts", label: "Payouts", Icon: IndianRupee },
  { to: "/admin/kyc", label: "KYC Auth", Icon: FileText },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  return (
    <RoleRoute allowed={["admin"]}>
      <PageShell>
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 md:grid-cols-[220px_1fr] md:px-8">
          <aside className="h-fit rounded-2xl border border-border bg-card p-3 md:sticky md:top-24">
            <div className="px-3 py-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Admin
            </div>
            <nav className="mt-2 flex gap-2 overflow-x-auto md:flex-col">
              {items.map(({ to, label, Icon }) => {
                const active = location.pathname === to;
                return (
                  <Link
                    key={to}
                    to={to as never}
                    className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold press ${
                      active
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4" /> {label}
                  </Link>
                );
              })}
            </nav>
          </aside>
          <section>{children}</section>
        </div>
      </PageShell>
    </RoleRoute>
  );
}
