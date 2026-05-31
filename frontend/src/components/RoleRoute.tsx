import { dashboardPathForRole } from "@/lib/auth";
import type { UserRole } from "@/types/database";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export function RoleRoute({
  allowed,
  children,
}: {
  allowed?: UserRole[];
  children: React.ReactNode;
}) {
  const { loading, profile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;

    if (!profile) {
      navigate({ to: "/login" });
      return;
    }

    if (allowed?.length && !allowed.includes(profile.role)) {
      navigate({ to: dashboardPathForRole(profile.role) as never });
    }
  }, [allowed, loading, navigate, profile]);

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-4 text-center">
        <div>
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="mt-4 text-sm text-muted-foreground">Checking your account...</p>
        </div>
      </div>
    );
  }

  if (!profile || (allowed?.length && !allowed.includes(profile.role))) {
    return null;
  }

  return children;
}
