import { AdminShell } from "@/components/AdminShell";
import { listAdminUsers, updateUserBan, updateUserVerification } from "@/lib/admin";
import type { UserProfile } from "@/types/database";
import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck, ShieldX } from "lucide-react";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/admin/users")({
  component: AdminUsers,
});

function AdminUsers() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [error, setError] = useState("");

  const load = () =>
    listAdminUsers()
      .then(setUsers)
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load users."));
  useEffect(load, []);

  return (
    <AdminShell>
      <h1 className="font-display text-3xl font-bold">Users</h1>
      {error && (
        <p className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card">
        {users.map((user) => (
          <div
            key={user.id}
            className="flex flex-wrap items-center gap-3 border-b border-border p-4 last:border-0"
          >
            <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/15 font-bold text-primary">
              {user.name[0]}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-semibold">{user.name}</div>
              <div className="text-xs text-muted-foreground">
                {user.email ?? user.phone} · {user.role}
              </div>
            </div>
            <button
              onClick={() => updateUserVerification(user.id, !user.is_verified).then(load)}
              className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-semibold press"
            >
              <ShieldCheck className="h-3.5 w-3.5" /> {user.is_verified ? "Unverify" : "Verify"}
            </button>
            <button
              onClick={() => updateUserBan(user.id, !user.is_banned).then(load)}
              className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-semibold press"
            >
              <ShieldX className="h-3.5 w-3.5" /> {user.is_banned ? "Unban" : "Ban"}
            </button>
          </div>
        ))}
      </div>
    </AdminShell>
  );
}
