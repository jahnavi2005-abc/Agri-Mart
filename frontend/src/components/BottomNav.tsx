import { Link, useLocation } from "@tanstack/react-router";
import { Home, PackageSearch, ShoppingCart, User, LayoutDashboard, Package } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { dashboardPathForRole } from "@/lib/auth";
import { useState, useEffect } from "react";
import { getCartItems } from "@/lib/cart";

export function BottomNav() {
  const loc = useLocation();
  const { profile } = useAuth();
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    const refresh = () => setCartCount(getCartItems().length);
    refresh();
    window.addEventListener("agrimart-cart", refresh);
    return () => window.removeEventListener("agrimart-cart", refresh);
  }, []);

  const dashPath = profile ? dashboardPathForRole(profile.role) : "/login";

  type BottomNavItem = {
    to: string;
    label: string;
    Icon: LucideIcon;
    badge?: number;
  };

  const items: BottomNavItem[] = profile
    ? profile.role === "farmer"
      ? [
          { to: dashPath, label: "Home", Icon: Home },
          { to: "/listings", label: "Market", Icon: PackageSearch },
          { to: "/orders", label: "Orders", Icon: Package },
          { to: "/profile/edit", label: "Profile", Icon: User },
        ]
      : [
          // buyer
          { to: dashPath, label: "Home", Icon: Home },
          { to: "/listings", label: "Crops", Icon: PackageSearch },
          { to: "/orders", label: "Orders", Icon: Package },
          { to: "/profile/edit", label: "Profile", Icon: User },
        ]
    : [
        { to: "/", label: "Home", Icon: Home },
        { to: "/listings", label: "Crops", Icon: PackageSearch },
        { to: "/cart", label: "Cart", Icon: ShoppingCart, badge: cartCount },
        { to: "/login", label: "Sign In", Icon: User },
      ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border md:hidden">
      <div className="glass">
        <div className="mx-auto flex max-w-md items-stretch justify-around px-2 pb-[env(safe-area-inset-bottom)] pt-1.5">
          {items.map(({ to, label, Icon, badge = 0 }) => {
            const active = to === "/" ? loc.pathname === "/" : loc.pathname.startsWith(to);
            return (
              <Link
                key={label}
                to={to as never}
                className="relative flex flex-1 flex-col items-center gap-1 px-2 py-2 press"
              >
                <div
                  className={`relative grid h-9 w-9 place-items-center rounded-xl transition-all ${active ? "bg-primary/15 text-primary" : "text-muted-foreground"}`}
                >
                  <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 1.8} />
                  {badge > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                      {badge}
                    </span>
                  )}
                </div>
                <span
                  className={`text-[10px] font-medium ${active ? "text-primary" : "text-muted-foreground"}`}
                >
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
