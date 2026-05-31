import { PageShell } from "@/components/PageShell";
import { listNotifications, markNotificationRead, type Notification } from "@/lib/notifications";
import { createFileRoute } from "@tanstack/react-router";
import { Bell, Check } from "lucide-react";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/notifications")({
  component: NotificationsPage,
});

function NotificationsPage() {
  const [items, setItems] = useState<Notification[]>([]);
  const [error, setError] = useState("");
  const load = () =>
    listNotifications()
      .then(setItems)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Could not load notifications."),
      );

  useEffect(() => {
    load();
  }, []);

  return (
    <PageShell>
      <div className="mx-auto max-w-3xl px-4 py-8 md:px-8">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/15 text-primary">
            <Bell className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold">Notifications</h1>
            <p className="text-sm text-muted-foreground">Order, payment, and dispute updates.</p>
          </div>
        </div>
        {error && (
          <p className="mt-5 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="mt-8 space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className={`rounded-2xl border border-border p-4 ${item.is_read ? "bg-card" : "bg-primary/10"}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold">{item.title}</div>
                  <p className="mt-1 text-sm text-muted-foreground">{item.body}</p>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {new Date(item.created_at).toLocaleString("en-IN")}
                  </div>
                </div>
                {!item.is_read && (
                  <button
                    onClick={() => markNotificationRead(item.id).then(load)}
                    className="grid h-8 w-8 place-items-center rounded-lg border border-border bg-card press"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
          {!items.length && (
            <div className="rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
              No notifications yet.
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}
