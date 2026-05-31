import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  Sprout,
  ShoppingBasket,
  Check,
  Mail,
  Lock,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import { dashboardPathForRole } from "@/lib/auth";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/register")({
  component: RegisterPage,
});

type FormState = {
  name: string;
  phone: string;
  email: string;
  password: string;
  district: string;
  state: string;
};

const initialForm: FormState = {
  name: "",
  phone: "",
  email: "",
  password: "",
  district: "",
  state: "Andhra Pradesh",
};

function RegisterPage() {
  const [step, setStep] = useState(0);
  const [role, setRole] = useState<"farmer" | "buyer" | null>(null);
  const [form, setForm] = useState<FormState>(initialForm);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { signUp } = useAuth();

  const update = (key: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const canContinueDetails =
    form.name.trim().length >= 2 &&
    /^\d{10}$/.test(form.phone) &&
    form.district.trim().length >= 2 &&
    form.state.trim().length >= 2;

  const canCreateAccount =
    role && canContinueDetails && form.email.includes("@") && form.password.length >= 6;

  const completeRegistration = async () => {
    if (!role || !canCreateAccount) {
      setError("Fill all required fields. Password must be at least 6 characters.");
      return;
    }

    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const user = await signUp({
        role: role!,
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        phone: form.phone,
        district: form.district.trim(),
        state: form.state,
      });

      navigate({ to: dashboardPathForRole(user.role) as never });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not create your account.";
      if (msg.toLowerCase().includes("email")) {
        // If supabase requires email verification and throws an error about it or returns empty session
        // Actually, signUp would throw if backend fails. If backend succeeds but user is unverified...
        setError(msg);
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen px-4 py-8 md:py-16">
      <div className="mx-auto max-w-2xl">
        <Link
          to="/"
          className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>

        <div className="mb-10 flex items-center gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex flex-1 items-center gap-3">
              <div
                className={`grid h-9 w-9 place-items-center rounded-full text-sm font-bold transition-all ${
                  step > i
                    ? "bg-primary text-primary-foreground"
                    : step === i
                      ? "bg-primary text-primary-foreground shadow-glow"
                      : "bg-secondary text-muted-foreground"
                }`}
              >
                {step > i ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              {i < 2 && (
                <div
                  className={`h-0.5 flex-1 rounded transition-all ${step > i ? "bg-primary" : "bg-border"}`}
                />
              )}
            </div>
          ))}
        </div>

        <div className="rounded-3xl border border-border bg-card p-6 md:p-10">
          {step === 0 && (
            <div style={{ animation: "var(--animate-fade-up)" }}>
              <h1 className="font-display text-3xl font-bold md:text-4xl">Who are you?</h1>
              <p className="mt-2 text-muted-foreground">Choose your role to get started.</p>
              <div className="mt-8 grid gap-4 md:grid-cols-2">
                <RoleCard
                  Icon={Sprout}
                  title="I'm a Farmer"
                  desc="List crops and sell directly to buyers."
                  selected={role === "farmer"}
                  accent="primary"
                  onClick={() => setRole("farmer")}
                />
                <RoleCard
                  Icon={ShoppingBasket}
                  title="I'm a Buyer"
                  desc="Buy fresh crops directly from farmers."
                  selected={role === "buyer"}
                  accent="amber"
                  onClick={() => setRole("buyer")}
                />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4" style={{ animation: "var(--animate-fade-up)" }}>
              <h1 className="font-display text-3xl font-bold md:text-4xl">Your details</h1>
              <p className="text-muted-foreground">Tell us a little about yourself.</p>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <Field label="Full name">
                  <input
                    value={form.name}
                    onChange={(event) => update("name", event.target.value)}
                    className="input"
                    placeholder="Ravi Kumar"
                  />
                </Field>
                <Field label="Phone">
                  <div className="flex items-center rounded-xl border border-border bg-input">
                    <span className="border-r border-border px-3 py-3.5 font-mono text-sm">
                      +91
                    </span>
                    <input
                      value={form.phone}
                      onChange={(event) =>
                        update("phone", event.target.value.replace(/\D/g, "").slice(0, 10))
                      }
                      className="flex-1 bg-transparent px-3 py-3.5 outline-none"
                      placeholder="98765 43210"
                    />
                  </div>
                </Field>
                <Field label="District">
                  <input
                    value={form.district}
                    onChange={(event) => update("district", event.target.value)}
                    className="input"
                    placeholder="Guntur"
                  />
                </Field>
                <Field label="State">
                  <select
                    value={form.state}
                    onChange={(event) => update("state", event.target.value)}
                    className="input"
                  >
                    <option>Andhra Pradesh</option>
                    <option>Telangana</option>
                    <option>Karnataka</option>
                    <option>Tamil Nadu</option>
                    <option>Maharashtra</option>
                  </select>
                </Field>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4" style={{ animation: "var(--animate-fade-up)" }}>
              <h1 className="font-display text-3xl font-bold md:text-4xl">Create login</h1>
              <p className="text-muted-foreground">
                Use this email and password to sign in to AgriMart.
              </p>
              <Field label="Email">
                <div className="flex items-center rounded-xl border border-border bg-input focus-within:border-primary focus-within:shadow-glow">
                  <Mail className="ml-4 h-4 w-4 text-muted-foreground" />
                  <input
                    value={form.email}
                    onChange={(event) => update("email", event.target.value)}
                    type="email"
                    className="flex-1 bg-transparent px-3 py-3.5 outline-none"
                    placeholder="you@email.com"
                  />
                </div>
              </Field>
              <Field label="Password">
                <div className="flex items-center rounded-xl border border-border bg-input focus-within:border-primary focus-within:shadow-glow">
                  <Lock className="ml-4 h-4 w-4 text-muted-foreground" />
                  <input
                    value={form.password}
                    onChange={(event) => update("password", event.target.value)}
                    type="password"
                    className="flex-1 bg-transparent px-3 py-3.5 outline-none"
                    placeholder="Minimum 6 characters"
                  />
                </div>
              </Field>
              {error && (
                <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {error}
                </p>
              )}
              {success && (
                <p className="rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary">
                  {success}
                </p>
              )}
            </div>
          )}

          <div className="mt-10 flex items-center justify-between">
            <button
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0 || loading}
              className="rounded-xl border border-border px-5 py-3 text-sm font-semibold press disabled:opacity-30"
            >
              Back
            </button>
            {step < 2 ? (
              <button
                onClick={() => {
                  setError("");
                  if (step === 1 && !canContinueDetails) {
                    setError("Please enter your name, 10-digit phone number, district, and state.");
                    return;
                  }
                  setStep((s) => s + 1);
                }}
                disabled={(step === 0 && !role) || loading}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground press shadow-glow disabled:opacity-40 disabled:shadow-none"
              >
                Continue <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                disabled={loading || !canCreateAccount}
                onClick={completeRegistration}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground press shadow-glow disabled:opacity-40 disabled:shadow-none"
              >
                {loading ? "Creating..." : "Complete"} <Check className="h-4 w-4" />
              </button>
            )}
          </div>
          {step === 1 && error && (
            <p className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </p>
          )}
        </div>
      </div>

      <style>{`.input{width:100%;background:var(--input);border:1px solid var(--border);border-radius:12px;padding:14px 16px;outline:none;transition:all .2s}.input:focus{border-color:var(--primary);box-shadow:var(--shadow-glow)}`}</style>
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

function RoleCard({
  Icon,
  title,
  desc,
  selected,
  onClick,
  accent,
}: {
  Icon: LucideIcon;
  title: string;
  desc: string;
  selected: boolean;
  onClick: () => void;
  accent: "primary" | "amber";
}) {
  return (
    <button
      onClick={onClick}
      className={`group relative overflow-hidden rounded-2xl border-2 p-6 text-left transition-all press ${
        selected
          ? "border-primary bg-primary/5 shadow-glow"
          : "border-border bg-secondary hover:border-primary/40"
      }`}
    >
      <div
        className={`mb-4 grid h-14 w-14 place-items-center rounded-2xl ${accent === "primary" ? "bg-primary/15 text-primary" : "bg-amber/15 text-amber"}`}
      >
        <Icon className="h-7 w-7" />
      </div>
      <div className="font-display text-xl font-bold">{title}</div>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
      {selected && (
        <div className="absolute right-4 top-4 grid h-6 w-6 place-items-center rounded-full bg-primary text-primary-foreground">
          <Check className="h-3.5 w-3.5" />
        </div>
      )}
    </button>
  );
}
