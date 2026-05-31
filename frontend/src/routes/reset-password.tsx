import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Lock, Eye, EyeOff, CheckCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    // Check if the user arrived here with a valid recovery token in the URL hash
    supabase.auth.onAuthStateChange((event, session) => {
      if (event == "PASSWORD_RECOVERY") {
        console.log("Password recovery mode active");
      }
    });
  }, []);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setError("");
    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setSuccess(true);
      setTimeout(() => navigate({ to: "/login" }), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_20%_10%,oklch(0.72_0.18_145_/_0.18),transparent_32%),radial-gradient(circle_at_90%_20%,oklch(0.78_0.16_80_/_0.14),transparent_30%)] p-5 md:p-10">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card/80 p-6 shadow-lift backdrop-blur md:p-8">
        <h1 className="font-display text-3xl font-bold">Set New Password</h1>
        <p className="mt-1 mb-7 text-sm text-muted-foreground">
          Enter a new password for your account.
        </p>

        {success ? (
          <div className="rounded-2xl border border-primary/30 bg-primary/10 p-6 text-center">
            <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-primary/20 text-primary">
              <CheckCircle className="h-6 w-6" />
            </div>
            <h3 className="font-semibold text-primary">Password updated</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Your password has been changed successfully. Redirecting to login...
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
                New Password
              </span>
              <div className="flex items-center rounded-xl border border-border bg-input transition-all focus-within:border-primary focus-within:shadow-glow">
                <Lock className="ml-4 h-4 w-4 shrink-0 text-muted-foreground" />
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type={showPwd ? "text" : "password"}
                  placeholder="Minimum 6 characters"
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
                  Updating...
                </span>
              ) : (
                "Update password"
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
