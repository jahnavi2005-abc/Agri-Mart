import { createFileRoute, Link } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";
import { RoleRoute } from "@/components/RoleRoute";
import { useAuth } from "@/hooks/useAuth";
import { useProducts } from "@/hooks/useProducts";
import { primaryProductImage, updateProductStatus, updateProductDetails } from "@/lib/products";
import { useState, useEffect } from "react";
import {
  TrendingUp,
  Package,
  ShoppingBag,
  IndianRupee,
  Plus,
  Edit3,
  Leaf,
  ArrowRight,
  CheckCircle2,
  PauseCircle,
  Eye,
  Wallet,
  MessageSquare,
  Check,
  X,
  Copy,
} from "lucide-react";
import { ResponsiveContainer, XAxis, YAxis, Tooltip, Area, AreaChart } from "recharts";
import {
  getPayoutBalance,
  getPayoutHistory,
  requestPayout,
  type PayoutBalance,
  type Payout,
} from "@/lib/payouts";
import { listFarmerEnquiries, updateEnquiryStatus, type Enquiry } from "@/lib/enquiries";

type FarmerAnalytics = {
  total_revenue: number;
  total_orders: number;
  best_crop: string | null;
  earnings_chart: { day: string; amount: number }[];
};

const SORT_OPTIONS = ["date", "stock", "price"] as const;
type SortOption = (typeof SORT_OPTIONS)[number];

export const Route = createFileRoute("/dashboard/farmer")({
  component: () => (
    <RoleRoute allowed={["farmer"]}>
      <FarmerDashboard />
    </RoleRoute>
  ),
});
function FarmerDashboard() {
  const { profile, signOut } = useAuth();
  const {
    data: listings,
    loading,
    error,
  } = useProducts({
    farmerId: profile?.id,
    includeOwnInactive: true,
  });
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "listings" | "wallet" | "enquiries">(
    "overview",
  );

  // Wallet state
  const [balance, setBalance] = useState<PayoutBalance | null>(null);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [walletLoading, setWalletLoading] = useState(false);
  const [requestAmount, setRequestAmount] = useState("");
  const [upiId, setUpiId] = useState("");

  // Enquiries state
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [enquiriesLoading, setEnquiriesLoading] = useState(false);

  // Analytics state
  const [analytics, setAnalytics] = useState<FarmerAnalytics | null>(null);
  const [analyticsRange, setAnalyticsRange] = useState<number>(14);

  useEffect(() => {
    if (!profile) return;
    fetch(`/api/analytics/farmer?range=${analyticsRange}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    })
      .then((res) => res.json())
      .then((data) => setAnalytics(data))
      .catch(console.error);
  }, [profile, analyticsRange]);

  const loadWallet = () => {
    setWalletLoading(true);
    Promise.all([getPayoutBalance(), getPayoutHistory()])
      .then(([b, p]) => {
        setBalance(b);
        setPayouts(p);
      })
      .catch(console.error)
      .finally(() => setWalletLoading(false));
  };

  const loadEnquiries = () => {
    setEnquiriesLoading(true);
    listFarmerEnquiries()
      .then(setEnquiries)
      .catch(console.error)
      .finally(() => setEnquiriesLoading(false));
  };

  const [sortBy, setSortBy] = useState<SortOption>("date");
  const [editingQtyId, setEditingQtyId] = useState<string | null>(null);
  const [editQtyValue, setEditQtyValue] = useState<string>("");

  const handleUpdateQuantity = async (id: string) => {
    const qty = Number(editQtyValue);
    if (isNaN(qty) || qty < 0) return;
    setUpdatingId(id);
    try {
      await updateProductDetails(id, { available_quantity_kg: qty });
      window.location.reload();
    } catch (err) {
      alert("Failed to update quantity");
    } finally {
      setUpdatingId(null);
      setEditingQtyId(null);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: "active" | "paused") => {
    setUpdatingId(id);
    try {
      await updateProductStatus(id, newStatus);
      window.location.reload();
    } finally {
      setUpdatingId(null);
    }
  };

  const toggleListing = async (id: string, currentStatus: string) => {
    setUpdatingId(id);
    try {
      await updateProductStatus(id, currentStatus === "active" ? "paused" : "active");
      window.location.reload();
    } finally {
      setUpdatingId(null);
    }
  };

  const handlePayoutRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestAmount || !upiId) return;
    try {
      await requestPayout(Number(requestAmount), upiId);
      alert("Payout requested successfully!");
      setRequestAmount("");
      loadWallet();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to request payout");
    }
  };

  const sortedListings = [...listings].sort((a, b) => {
    if (sortBy === "stock") return b.available_quantity_kg - a.available_quantity_kg;
    if (sortBy === "price") return b.price_per_kg - a.price_per_kg;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const activeCount = listings.filter((p) => p.status === "active").length;
  const totalStock = Math.round(listings.reduce((sum, p) => sum + p.available_quantity_kg, 0));

  const stats = [
    {
      Icon: IndianRupee,
      label: `Earnings (${analyticsRange}d)`,
      value: `₹${(analytics?.total_revenue || 0).toLocaleString("en-IN")}`,
      color: "amber" as const,
    },
    {
      Icon: Package,
      label: "Total Orders",
      value: String(analytics?.total_orders || 0),
      color: "primary" as const,
    },
    {
      Icon: TrendingUp,
      label: "Best Crop",
      value: analytics?.best_crop || "-",
      color: "primary" as const,
    },
    {
      Icon: ShoppingBag,
      label: "Active Listings",
      value: String(activeCount),
      color: "blue" as const,
    },
  ];

  return (
    <PageShell>
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-8">
        {/* Header */}
        <div
          className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/20 via-card to-amber/10 p-8 md:p-10"
          style={{ animation: "var(--animate-fade-up)" }}
        >
          <div className="absolute right-6 top-6 text-6xl opacity-20 md:text-9xl">🌾</div>
          <div className="relative z-10">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-primary/20 px-3 py-1 text-xs font-semibold text-primary">
              <Leaf className="h-3 w-3" /> Farmer Dashboard
            </div>
            <h1 className="font-display text-3xl font-bold md:text-4xl">
              Welcome, {profile?.name ?? "Farmer"}!
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Manage your crop listings and track your sales performance.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/farmer/list-product"
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground press shadow-glow"
              >
                <Plus className="h-4 w-4" /> New Listing
              </Link>
              <Link
                to="/listings"
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-card/80 px-5 py-3 text-sm font-semibold press"
              >
                <Eye className="h-4 w-4" /> View Marketplace
              </Link>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-8 flex gap-1 rounded-xl border border-border bg-secondary p-1 overflow-x-auto">
          {(
            [
              { id: "overview", label: "Overview", icon: TrendingUp },
              { id: "listings", label: "My Listings", icon: Package },
              { id: "enquiries", label: "Bulk Enquiries", icon: MessageSquare },
              { id: "wallet", label: "Wallet & Payouts", icon: Wallet },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                if (tab.id === "wallet" && !balance) loadWallet();
                if (tab.id === "enquiries" && enquiries.length === 0) loadEnquiries();
              }}
              className={`flex shrink-0 flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs font-semibold transition-all ${activeTab === tab.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              <tab.icon className="h-4 w-4" /> <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {activeTab === "overview" && (
          <div className="space-y-6" style={{ animation: "var(--animate-fade-up)" }}>
            {/* Stats */}
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {stats.map((s, i) => (
                <div
                  key={s.label}
                  className="rounded-2xl border border-border bg-card p-5 card-lift"
                  style={{
                    animation: "var(--animate-fade-up)",
                    animationDelay: `${i * 80}ms`,
                    animationFillMode: "backwards",
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div
                      className={`grid h-10 w-10 place-items-center rounded-xl ${s.color === "amber" ? "bg-amber/15 text-amber" : s.color === "blue" ? "bg-blue-500/15 text-blue-400" : "bg-primary/15 text-primary"}`}
                    >
                      <s.Icon className="h-5 w-5" />
                    </div>
                  </div>
                  <div className="mt-4 text-xs uppercase tracking-widest text-muted-foreground">
                    {s.label}
                  </div>
                  <div className="font-display text-3xl font-bold">{s.value}</div>
                </div>
              ))}
            </div>

            {/* Chart */}
            <div className="mt-6 rounded-2xl border border-border bg-card p-6">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h3 className="font-display text-lg font-bold">Earnings</h3>
                  <p className="text-xs text-muted-foreground">
                    Estimated daily revenue from sales
                  </p>
                </div>
                <select
                  className="rounded-lg border border-border bg-input px-3 py-1.5 text-sm outline-none"
                  value={analyticsRange}
                  onChange={(e) => setAnalyticsRange(Number(e.target.value))}
                >
                  <option value={7}>Last 7 Days</option>
                  <option value={14}>Last 14 Days</option>
                  <option value={30}>Last 30 Days</option>
                  <option value={90}>Last 90 Days</option>
                </select>
              </div>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analytics?.earnings_chart || []} margin={{ left: -20 }}>
                    <defs>
                      <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="oklch(0.78 0.18 145)" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="oklch(0.78 0.18 145)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="day"
                      stroke="oklch(0.5 0.05 150)"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="oklch(0.5 0.05 150)"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "oklch(0.19 0.02 155)",
                        border: "1px solid oklch(0.28 0.025 150)",
                        borderRadius: 12,
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="amount"
                      stroke="oklch(0.78 0.18 145)"
                      strokeWidth={2.5}
                      fill="url(#g1)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Profile + Quick Links (Moved to overview) */}
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-border bg-card p-6">
                <h3 className="mb-4 font-display text-lg font-bold">Profile</h3>
                <div className="flex items-center gap-4">
                  <div className="grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-primary to-primary/60 text-2xl font-bold text-white">
                    {profile?.name?.[0]?.toUpperCase() ?? "F"}
                  </div>
                  <div>
                    <div className="font-semibold">{profile?.name}</div>
                    <div className="text-sm text-muted-foreground">{profile?.email}</div>
                    <div className="text-xs text-muted-foreground">
                      {profile?.district}, {profile?.state}
                    </div>
                  </div>
                </div>
                <button
                  onClick={signOut}
                  className="mt-4 w-full rounded-xl border border-destructive/30 bg-destructive/10 py-2.5 text-sm font-semibold text-destructive press"
                >
                  Sign Out
                </button>
              </div>

              <div className="rounded-2xl border border-border bg-card p-6">
                <h3 className="mb-4 font-display text-lg font-bold">Quick Links</h3>
                <div className="space-y-2">
                  {[
                    { label: "List new crop", to: "/farmer/list-product", icon: "🌱" },
                    { label: "View marketplace", to: "/listings", icon: "🛒" },
                    { label: "My orders", to: "/orders", icon: "📦" },
                  ].map((link) => (
                    <Link
                      key={link.to}
                      to={link.to}
                      className="flex items-center gap-3 rounded-xl border border-border bg-secondary/40 p-3 press hover:bg-secondary"
                    >
                      <span className="text-lg">{link.icon}</span>
                      <span className="text-sm font-medium">{link.label}</span>
                      <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground" />
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "listings" && (
          <div
            className="mt-6 rounded-2xl border border-border bg-card p-6"
            style={{ animation: "var(--animate-fade-up)" }}
          >
            <div className="mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <h3 className="font-display text-lg font-bold">My Listings</h3>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <select
                  className="input py-2 text-sm"
                  value={sortBy}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (SORT_OPTIONS.includes(value as SortOption)) {
                      setSortBy(value as SortOption);
                    }
                  }}
                >
                  <option value="date">Sort by Date</option>
                  <option value="stock">Sort by Stock</option>
                  <option value="price">Sort by Price</option>
                </select>
                <Link
                  to="/farmer/list-product"
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-primary/15 px-4 py-2 text-sm font-semibold text-primary press"
                >
                  <Plus className="h-3.5 w-3.5" /> Add
                </Link>
              </div>
            </div>

            {error && (
              <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                {error}
              </p>
            )}

            {loading &&
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="mb-2 h-20 animate-pulse rounded-xl bg-secondary" />
              ))}

            {!loading && listings.length === 0 && (
              <div className="rounded-xl border border-border bg-secondary/40 p-8 text-center">
                <div className="text-4xl mb-3">🌱</div>
                <div className="font-semibold">No listings yet</div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Create your first crop listing to start selling!
                </p>
                <Link
                  to="/farmer/list-product"
                  className="mt-4 inline-flex rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
                >
                  Add listing
                </Link>
              </div>
            )}

            <div className="space-y-2">
              {sortedListings.map((p) => (
                <div
                  key={p.id}
                  className="flex flex-wrap sm:flex-nowrap items-center gap-3 rounded-xl border border-border bg-secondary/40 p-3 group"
                >
                  <img
                    src={primaryProductImage(p)}
                    alt=""
                    className="h-14 w-14 rounded-xl object-cover shrink-0"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=100&q=70";
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-semibold">{p.crop_name}</span>
                      {p.is_organic && <Leaf className="h-3 w-3 text-primary shrink-0" />}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      {editingQtyId === p.id ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            className="w-16 rounded border border-border bg-card px-1.5 py-0.5 text-xs text-foreground outline-none"
                            value={editQtyValue}
                            onChange={(e) => setEditQtyValue(e.target.value)}
                            autoFocus
                            onKeyDown={(e) => e.key === "Enter" && handleUpdateQuantity(p.id)}
                          />
                          <button
                            onClick={() => handleUpdateQuantity(p.id)}
                            className="text-primary hover:text-primary/80"
                          >
                            <Check className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => setEditingQtyId(null)}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <span className="flex items-center gap-1">
                          {p.available_quantity_kg} kg
                          <button
                            onClick={() => {
                              setEditingQtyId(p.id);
                              setEditQtyValue(String(p.available_quantity_kg));
                            }}
                            className="opacity-0 transition-opacity group-hover:opacity-100 text-primary hover:text-primary/80 ml-1"
                            title="Edit stock quantity"
                          >
                            <Edit3 className="h-3 w-3" />
                          </button>
                        </span>
                      )}
                      <span className="mx-1">·</span>
                      {p.district}
                    </div>
                  </div>
                  <div className="hidden sm:block text-right shrink-0">
                    <div className="font-mono font-bold text-amber">₹{p.price_per_kg}</div>
                    <div className="text-[10px] text-muted-foreground">/kg</div>
                  </div>

                  <div className="flex items-center gap-2 ml-auto sm:ml-0 shrink-0">
                    <button
                      disabled={updatingId === p.id}
                      onClick={() => toggleListing(p.id, p.status)}
                      title={p.status === "active" ? "Click to pause" : "Click to activate"}
                      className={`flex items-center justify-center h-8 w-8 sm:h-auto sm:w-auto sm:px-3 sm:py-1 rounded-lg sm:rounded-full text-[11px] font-semibold press ${
                        p.status === "active"
                          ? "bg-primary/15 text-primary"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {p.status === "active" ? (
                        <CheckCircle2 className="h-3.5 w-3.5 sm:mr-1" />
                      ) : (
                        <PauseCircle className="h-3.5 w-3.5 sm:mr-1" />
                      )}
                      <span className="hidden sm:inline">
                        {updatingId === p.id ? "..." : p.status}
                      </span>
                    </button>

                    <Link
                      to="/farmer/list-product"
                      search={{ duplicate: p.id }}
                      title="Duplicate Listing"
                      className="grid h-8 w-8 place-items-center rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Link>

                    <Link
                      to="/listings/$id"
                      params={{ id: p.id }}
                      title="View details"
                      className="grid h-8 w-8 place-items-center rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground"
                    >
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "wallet" && (
          <div className="mt-6 space-y-6" style={{ animation: "var(--animate-fade-up)" }}>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-border bg-primary/10 p-6">
                <div className="text-xs font-semibold uppercase tracking-widest text-primary">
                  Available Balance
                </div>
                <div className="mt-2 font-mono text-3xl font-bold text-primary">
                  ₹{(balance?.available_balance ?? 0).toLocaleString("en-IN")}
                </div>
                <div className="mt-1 text-xs text-primary/70">Ready to withdraw</div>
              </div>
              <div className="rounded-2xl border border-border bg-card p-6">
                <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Pending Payouts
                </div>
                <div className="mt-2 font-mono text-3xl font-bold text-amber">
                  ₹{(balance?.total_pending ?? 0).toLocaleString("en-IN")}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">Processing...</div>
              </div>
              <div className="rounded-2xl border border-border bg-card p-6">
                <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Total Earned
                </div>
                <div className="mt-2 font-mono text-3xl font-bold">
                  ₹{(balance?.total_earned ?? 0).toLocaleString("en-IN")}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">Lifetime earnings</div>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-2xl border border-border bg-card p-6">
                <h3 className="mb-4 font-display text-lg font-bold">Request Payout</h3>
                <form onSubmit={handlePayoutRequest} className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      Amount (₹)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max={balance?.available_balance || 0}
                      value={requestAmount}
                      onChange={(e) => setRequestAmount(e.target.value)}
                      className="w-full rounded-xl border border-border bg-input px-4 py-3 text-sm outline-none focus:border-primary"
                      placeholder="e.g. 5000"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      UPI ID
                    </label>
                    <input
                      type="text"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      className="w-full rounded-xl border border-border bg-input px-4 py-3 text-sm outline-none focus:border-primary"
                      placeholder="e.g. 9876543210@ybl"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={
                      !balance?.available_balance ||
                      Number(requestAmount) > balance.available_balance
                    }
                    className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground press disabled:opacity-50"
                  >
                    Withdraw Funds
                  </button>
                </form>
              </div>

              <div className="rounded-2xl border border-border bg-card p-6">
                <h3 className="mb-4 font-display text-lg font-bold">Payout History</h3>
                <div className="space-y-3">
                  {payouts.length === 0 ? (
                    <div className="text-center py-6 text-sm text-muted-foreground">
                      No payouts yet.
                    </div>
                  ) : (
                    payouts.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between rounded-xl border border-border bg-secondary/30 p-3"
                      >
                        <div>
                          <div className="font-semibold">₹{p.amount.toLocaleString("en-IN")}</div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(p.created_at).toLocaleDateString()} · {p.upi_id}
                          </div>
                        </div>
                        <div className="text-right">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                              p.status === "approved"
                                ? "bg-primary/20 text-primary"
                                : p.status === "rejected"
                                  ? "bg-destructive/20 text-destructive"
                                  : "bg-amber/20 text-amber"
                            }`}
                          >
                            {p.status}
                          </span>
                          {p.utr_number && (
                            <div className="mt-1 text-[10px] text-muted-foreground">
                              UTR: {p.utr_number}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
}
