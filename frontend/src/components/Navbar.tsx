import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  Bell,
  Globe,
  Leaf,
  Sun,
  Moon,
  LogOut,
  ShoppingCart,
  User,
  ChevronDown,
  LayoutDashboard,
  Package,
  Pencil,
  Heart,
  Search,
  Settings,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { dashboardPathForRole } from "@/lib/auth";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import { useWishlist } from "@/hooks/useWishlist";
import { useTranslation } from "react-i18next";
import { listNotifications } from "@/lib/notifications";

export function useTheme() {
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("agrimart-theme") as "dark" | "light") || "dark";
    }
    return "dark";
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "light") {
      root.classList.add("light");
      root.classList.remove("dark");
    } else {
      root.classList.remove("light");
      root.classList.add("dark");
    }
    localStorage.setItem("agrimart-theme", theme);
  }, [theme]);

  const toggle = () => setTheme((t) => (t === "dark" ? "light" : "dark"));
  return { theme, toggle };
}

export function Navbar() {
  const { t, i18n } = useTranslation();
  const [lang, setLang] = useState("EN");
  const [langOpen, setLangOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);
  const loc = useLocation();
  const navigate = useNavigate();
  const onLanding = loc.pathname === "/";
  const { theme, toggle } = useTheme();
  const { profile, signOut } = useAuth();
  const { items: cartItems } = useCart();
  const cartCount = cartItems.length;

  // Safe to call unconditionally; if user isn't a buyer, it just returns an empty list.
  const { items: wishlistItems } = useWishlist();
  const wishlistCount = wishlistItems.length;

  const [unreadCount, setUnreadCount] = useState(0);

  // Load unread notification count when user is authenticated
  const loadUnreadCount = useCallback(async () => {
    if (!profile) {
      setUnreadCount(0);
      return;
    }
    try {
      const notifications = await listNotifications();
      setUnreadCount(notifications.filter((n) => !n.is_read).length);
    } catch {
      // Silently fail — notifications table may not exist yet
    }
  }, [profile]);

  useEffect(() => {
    loadUnreadCount();
  }, [loadUnreadCount]);

  const langs = [
    { code: "EN", label: "English", i18nCode: "en" },
    { code: "తె", label: "తెలుగు", i18nCode: "te" },
    { code: "हि", label: "हिन्दी", i18nCode: "hi" },
  ];

  const handleLangChange = (l: (typeof langs)[0]) => {
    setLang(l.code);
    i18n.changeLanguage(l.i18nCode);
    setLangOpen(false);
  };

  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<{ crop_name: string; category: string }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node))
        setProfileOpen(false);
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node))
        setSettingsOpen(false);
      if (searchRef.current && !searchRef.current.contains(e.target as Node))
        setShowSuggestions(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Fetch autocomplete suggestions
  useEffect(() => {
    if (searchQuery.trim().length >= 2) {
      const timer = setTimeout(() => {
        fetch(`/api/products/autocomplete?q=${encodeURIComponent(searchQuery)}`)
          .then((res) => res.json())
          .then((data) => {
            setSuggestions(data);
            setShowSuggestions(true);
          })
          .catch(console.error);
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [searchQuery]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setShowSuggestions(false);
      navigate({ to: "/listings", search: { search: searchQuery } as never });
    }
  };

  const handleSuggestionClick = (cropName: string) => {
    setSearchQuery(cropName);
    setShowSuggestions(false);
    navigate({ to: "/listings", search: { search: cropName } as never });
  };

  // Smart logo click — dashboard if logged in, else landing page
  const handleLogoClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (profile) {
      navigate({ to: dashboardPathForRole(profile.role) as never });
    } else {
      navigate({ to: "/" });
    }
  };

  return (
    <header className={`sticky top-0 z-50 ${onLanding ? "" : "border-b border-border/60"}`}>
      <div className="glass">
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-8">
          {/* Logo — smart routing */}
          <button onClick={handleLogoClick} className="flex items-center gap-2 press">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-hero shadow-glow">
              <Leaf className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-display text-xl font-bold tracking-tight">AgriMart</span>
          </button>

          {/* Center nav links (desktop only) */}
          <div className="hidden items-center gap-1 md:flex flex-1 mx-6">
            <div className="flex gap-1 items-center mr-4">
              {profile && <NavLink to={dashboardPathForRole(profile.role)} label="Dashboard" />}
              <NavLink to="/listings" label="Browse" />
              {profile?.role === "buyer" && <NavLink to="/orders" label="Orders" />}
            </div>

            {/* Search Bar */}
            <div className="relative max-w-sm flex-1" ref={searchRef}>
              <form onSubmit={handleSearchSubmit} className="relative flex items-center">
                <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder={t("nav.search_placeholder")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => {
                    if (suggestions.length > 0) setShowSuggestions(true);
                  }}
                  className="w-full rounded-xl border border-border bg-secondary/50 py-2 pl-9 pr-4 text-sm outline-none transition-all focus:border-primary focus:bg-card focus:shadow-sm"
                />
              </form>

              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full mt-2 w-full overflow-hidden rounded-xl border border-border bg-card shadow-lg z-50">
                  <div className="p-1">
                    {suggestions.map((s, i) => (
                      <button
                        key={i}
                        onClick={() => handleSuggestionClick(s.crop_name)}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-secondary focus:bg-secondary focus:outline-none"
                      >
                        <Search className="h-3 w-3 text-muted-foreground" />
                        <div className="flex-1 text-left truncate">
                          <span className="font-semibold">{s.crop_name}</span>
                          <span className="ml-2 text-xs text-muted-foreground capitalize">
                            {s.category}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* System Settings (Guest Only) */}
            {!profile && (
              <div className="relative" ref={settingsRef}>
                <button
                  onClick={() => setSettingsOpen((v) => !v)}
                  title="System Settings"
                  className="grid h-10 w-10 place-items-center rounded-xl border border-border bg-secondary press hover:bg-muted"
                >
                  <Settings className="h-4 w-4 text-primary" />
                </button>
                {settingsOpen && (
                  <div
                    className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-border bg-popover shadow-lift z-50"
                    style={{ animation: "var(--animate-scale-in)" }}
                  >
                    <div className="border-b border-border px-4 py-3">
                      <h4 className="font-semibold text-sm">System Settings</h4>
                    </div>
                    <div className="p-2 space-y-4">
                      {/* Theme Toggle */}
                      <div>
                        <div className="px-2 mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                          Theme
                        </div>
                        <div className="flex items-center gap-2 px-2">
                          <button
                            onClick={() => {
                              if (theme !== "light") toggle();
                            }}
                            className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-1.5 text-sm ${theme === "light" ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-muted"}`}
                          >
                            <Sun className="h-4 w-4" /> Light
                          </button>
                          <button
                            onClick={() => {
                              if (theme !== "dark") toggle();
                            }}
                            className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-1.5 text-sm ${theme === "dark" ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-muted"}`}
                          >
                            <Moon className="h-4 w-4" /> Dark
                          </button>
                        </div>
                      </div>
                      {/* Language */}
                      <div>
                        <div className="px-2 mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                          Language
                        </div>
                        <div className="space-y-1">
                          {langs.map((l) => (
                            <button
                              key={l.code}
                              onClick={() => handleLangChange(l)}
                              className={`flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-sm ${lang === l.code ? "bg-primary/10 text-primary font-semibold" : "hover:bg-secondary"}`}
                            >
                              <div className="flex items-center gap-2">
                                <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                                {l.label}
                              </div>
                              <span className="font-mono text-[10px] text-muted-foreground">
                                {l.code}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {profile ? (
              <>
                {/* Wishlist (buyers only) */}
                {profile.role === "buyer" && (
                  <Link
                    to="/wishlist"
                    className="relative grid h-10 w-10 place-items-center rounded-xl border border-border bg-secondary press hover:bg-muted"
                  >
                    <Heart className="h-4 w-4 text-primary" />
                    {wishlistCount > 0 && (
                      <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground shadow-glow">
                        {wishlistCount}
                      </span>
                    )}
                  </Link>
                )}

                {/* Cart (buyers only) */}
                {profile.role === "buyer" && (
                  <Link
                    to="/cart"
                    className="relative grid h-10 w-10 place-items-center rounded-xl border border-border bg-secondary press hover:bg-muted"
                  >
                    <ShoppingCart className="h-4 w-4 text-primary" />
                    {cartCount > 0 && (
                      <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground shadow-glow">
                        {cartCount}
                      </span>
                    )}
                  </Link>
                )}

                {/* Notifications */}
                <Link
                  to="/notifications"
                  onClick={loadUnreadCount}
                  className="relative grid h-10 w-10 place-items-center rounded-xl border border-border bg-secondary press hover:bg-muted"
                >
                  <Bell className="h-4 w-4 text-primary" />
                  {unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-white shadow">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </Link>

                {/* Profile avatar dropdown */}
                <div ref={profileRef} className="relative">
                  <button
                    onClick={() => setProfileOpen((v) => !v)}
                    className="flex h-10 items-center gap-2 rounded-xl border border-border bg-secondary px-2 press hover:bg-muted"
                  >
                    <div className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-primary to-primary/60 text-sm font-bold text-primary-foreground">
                      {profile.name?.[0]?.toUpperCase() ?? "U"}
                    </div>
                    <span className="hidden max-w-[80px] truncate text-sm font-medium sm:block">
                      {profile.name?.split(" ")[0]}
                    </span>
                    <ChevronDown
                      className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${profileOpen ? "rotate-180" : ""}`}
                    />
                  </button>

                  {profileOpen && (
                    <div
                      className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-border bg-popover shadow-lift"
                      style={{ animation: "var(--animate-scale-in)" }}
                    >
                      {/* User info header */}
                      <div className="border-b border-border px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-primary to-primary/60 text-lg font-bold text-primary-foreground">
                            {profile.name?.[0]?.toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="truncate font-semibold text-sm">{profile.name}</div>
                            <div className="truncate text-xs text-muted-foreground capitalize">
                              {profile.role}
                            </div>
                          </div>
                        </div>
                      </div>
                      {/* Menu items */}
                      <div className="py-1">
                        <DropdownLink
                          Icon={LayoutDashboard}
                          label="Dashboard"
                          to={dashboardPathForRole(profile.role)}
                          onClick={() => setProfileOpen(false)}
                        />
                        {profile.role === "buyer" && (
                          <DropdownLink
                            Icon={Package}
                            label="My Orders"
                            to="/orders"
                            onClick={() => setProfileOpen(false)}
                          />
                        )}

                        {profile.role === "buyer" && (
                          <DropdownLink
                            Icon={Heart}
                            label="Wishlist"
                            to="/wishlist"
                            onClick={() => setProfileOpen(false)}
                          />
                        )}
                        {profile.role === "farmer" && (
                          <DropdownLink
                            Icon={Package}
                            label="My Listings"
                            to="/farmer/list-product"
                            onClick={() => setProfileOpen(false)}
                          />
                        )}
                        <DropdownLink
                          Icon={Pencil}
                          label="Edit Profile"
                          to="/profile/edit"
                          onClick={() => setProfileOpen(false)}
                        />

                        <div className="border-t border-border my-1" />

                        {/* Theme and Language Settings inside Profile */}
                        <div className="px-4 py-2 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                              Theme
                            </span>
                            <div className="flex items-center gap-1 rounded-lg bg-secondary p-0.5">
                              <button
                                onClick={() => {
                                  if (theme !== "light") toggle();
                                }}
                                className={`rounded-md p-1 ${theme === "light" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                              >
                                <Sun className="h-3 w-3" />
                              </button>
                              <button
                                onClick={() => {
                                  if (theme !== "dark") toggle();
                                }}
                                className={`rounded-md p-1 ${theme === "dark" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                              >
                                <Moon className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                          <div>
                            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground block mb-1">
                              Language
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {langs.map((l) => (
                                <button
                                  key={l.code}
                                  onClick={() => handleLangChange(l)}
                                  className={`flex-1 rounded-md px-2 py-1 text-[10px] font-bold ${lang === l.code ? "bg-primary/20 text-primary" : "bg-secondary hover:bg-muted text-muted-foreground"}`}
                                >
                                  {l.code}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="border-t border-border my-1" />
                        <button
                          onClick={() => {
                            setProfileOpen(false);
                            signOut();
                          }}
                          className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10"
                        >
                          <LogOut className="h-4 w-4" />
                          Sign Out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <Link
                to="/login"
                className="inline-flex h-10 items-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground press shadow-glow"
              >
                Sign In
              </Link>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}

function NavLink({ to, label }: { to: string; label: string }) {
  const loc = useLocation();
  const active = loc.pathname.startsWith(to);
  return (
    <Link
      to={to}
      className={`rounded-xl px-4 py-2 text-sm font-medium transition-all press ${active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`}
    >
      {label}
    </Link>
  );
}

function DropdownLink({
  Icon,
  label,
  to,
  onClick,
}: {
  Icon: LucideIcon;
  label: string;
  to: string;
  onClick: () => void;
}) {
  return (
    <Link
      to={to as never}
      onClick={onClick}
      className="flex w-full items-center gap-3 px-4 py-2.5 text-sm hover:bg-secondary"
    >
      <Icon className="h-4 w-4 text-muted-foreground" />
      {label}
    </Link>
  );
}
