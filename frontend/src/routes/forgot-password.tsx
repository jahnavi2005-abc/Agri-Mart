import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Mail, Leaf } from "lucide-react";
import { useState } from "react";
import { sendForgotPasswordEmail } from "@/lib/auth";

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Please enter your email.");
      return;
    }
    setError("");
    setLoading(true);

    try {
      await sendForgotPasswordEmail(email.trim());
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send reset email.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_20%_10%,oklch(0.72_0.18_145_/_0.18),transparent_32%),radial-gradient(circle_at_90%_20%,oklch(0.78_0.16_80_/_0.14),transparent_30%)] p-5 md:p-10">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card/80 p-6 shadow-lift backdrop-blur md:p-8">
        <Link
          to="/login"
          className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to login
        </Link>
        <div className="mb-2 flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-primary to-primary/60 shadow-glow">
            <Leaf className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display text-xl font-bold">AgriMart</span>
        </div>
        <h1 className="mt-4 font-display text-3xl font-bold">Reset Password</h1>
        <p className="mt-1 mb-7 text-sm text-muted-foreground">
          Enter your email address and we'll send you a link to reset your password.
        </p>

        {success ? (
          <div className="rounded-2xl border border-primary/30 bg-primary/10 p-6 text-center">
            <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-primary/20 text-primary">
              <Mail className="h-6 w-6" />
            </div>
            <h3 className="font-semibold text-primary">Check your email</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              We've sent a password reset link to <strong>{email}</strong>.
            </p>
          </div>
        ) : (
          <form
            onSubmit={submit}
            className="space-y-4"
            style={{ animation: "var(--animate-fade-up)" }}
          >
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
                  Sending link...
                </span>
              ) : (
                "Send reset link"
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
