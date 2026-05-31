import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Mail, Lock, Eye, EyeOff, Leaf } from "lucide-react";
import { useState } from "react";
import { dashboardPathForRole, friendlyAuthError } from "@/lib/auth";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  return (
    <div className="grid min-h-screen bg-[radial-gradient(circle_at_20%_10%,oklch(0.72_0.18_145_/_0.18),transparent_32%),radial-gradient(circle_at_90%_20%,oklch(0.78_0.16_80_/_0.14),transparent_30%)] lg:grid-cols-[1.05fr_0.95fr]">
      {/* Left panel — hero image replaced with branded graphic */}
      <div className="relative hidden overflow-hidden lg:flex lg:flex-col lg:items-center lg:justify-center bg-gradient-to-br from-primary/20 via-background to-background">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_50%,oklch(0.72_0.18_145_/_0.25),transparent_60%)]" />
        <div className="relative z-10 max-w-md px-12 text-center">
          <div className="mb-6 grid h-20 w-20 place-items-center rounded-3xl bg-gradient-to-br from-primary to-primary/60 shadow-glow mx-auto">
            <Leaf className="h-10 w-10 text-primary-foreground" />
          </div>
          <div className="mb-3 inline-flex rounded-full bg-primary/20 px-3 py-1 text-xs font-semibold text-primary">
            AgriMart — Farm Fresh
          </div>
          <h2 className="font-display text-4xl font-bold leading-tight">
            Your harvest. <span className="text-gradient-amber">Your price.</span>
          </h2>
          <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
            India's direct farmer-to-buyer platform. No middlemen. Fair prices. Fresh crops
            delivered from farm to your door.
          </p>
          <div className="mt-8 grid grid-cols-3 gap-4 text-center">
            {[
              { emoji: "🌾", label: "10+ Crops", sub: "listed daily" },
              { emoji: "👨‍🌾", label: "5 Farmers", sub: "verified & KYC'd" },
              { emoji: "🚚", label: "Fast delivery", sub: "2–5 days" },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-2xl border border-border bg-card/40 p-3 backdrop-blur"
              >
                <div className="text-2xl">{s.emoji}</div>
                <div className="mt-1 text-xs font-bold">{s.label}</div>
                <div className="text-[10px] text-muted-foreground">{s.sub}</div>
              </div>
            ))}
          </div>
        </div>

        <Link
          to="/"
          className="absolute left-8 top-8 inline-flex items-center gap-2 rounded-xl border border-border bg-card/60 px-4 py-2 text-sm font-medium backdrop-blur press"
        >
          <ArrowLeft className="h-4 w-4" /> Back home
        </Link>
      </div>

      {/* Right panel — form */}
      <div className="flex items-center justify-center p-5 md:p-10">
        <div className="w-full max-w-md rounded-3xl border border-border bg-card/80 p-6 shadow-lift backdrop-blur md:p-8">
          <Link
            to="/"
            className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground lg:hidden"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
          <div className="mb-2 flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-primary to-primary/60 shadow-glow">
              <Leaf className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-display text-xl font-bold">AgriMart</span>
          </div>
          <h1 className="mt-4 font-display text-3xl font-bold">Sign in</h1>
          <p className="mt-1 mb-7 text-sm text-muted-foreground">
            Welcome back. Continue to your account.
          </p>

          <EmailForm />

          <p className="mt-6 text-center text-sm text-muted-foreground">
            New here?{" "}
            <Link to="/register" className="font-semibold text-primary">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function EmailForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { signIn } = useAuth();

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }
    setError("");
    setLoading(true);

    try {
      // signIn() calls the API AND updates AuthContext state atomically.
      // By the time navigate() fires, profile is already set in context.
      const user = await signIn(email.trim(), password);
      navigate({ to: dashboardPathForRole(user.role) as never });
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4" style={{ animation: "var(--animate-fade-up)" }}>
      <label className="block">
        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Email
        </span>
        <div className="flex items-center rounded-xl border border-border bg-input transition-all focus-within:border-primary focus-within:shadow-glow">
          <Mail className="ml-4 h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            autoComplete="email"
            placeholder="you@email.com"
            className="flex-1 bg-transparent px-3 py-3.5 text-sm outline-none"
          />
        </div>
      </label>

      <label className="block">
        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Password
        </span>
        <div className="flex items-center rounded-xl border border-border bg-input transition-all focus-within:border-primary focus-within:shadow-glow">
          <Lock className="ml-4 h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type={showPwd ? "text" : "password"}
            autoComplete="current-password"
            placeholder="Your password"
            className="flex-1 bg-transparent px-3 py-3.5 text-sm outline-none"
          />
          <button
            type="button"
            onClick={() => setShowPwd((v) => !v)}
            className="mr-3 grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-secondary"
          >
            {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </label>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <button
        disabled={loading}
        type="submit"
        className="mt-2 w-full rounded-xl bg-primary py-3.5 font-semibold text-primary-foreground press shadow-glow disabled:opacity-60 transition-opacity"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
            Signing in...
          </span>
        ) : (
          "Sign in"
        )}
      </button>
    </form>
  );
}
