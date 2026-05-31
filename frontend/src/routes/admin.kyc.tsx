import { AdminShell } from "@/components/AdminShell";
import { adminListKYC, adminResolveKYC, type KYCProfile } from "@/lib/kyc";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";

export const Route = createFileRoute("/admin/kyc")({
  component: AdminKycPage,
});

function AdminKycPage() {
  const [profiles, setProfiles] = useState<KYCProfile[]>([]);
  const [error, setError] = useState("");

  const load = () =>
    adminListKYC()
      .then(setProfiles)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Could not load KYC applications."),
      );

  useEffect(() => {
    load();
  }, []);

  return (
    <AdminShell>
      <h1 className="font-display text-3xl font-bold">Farmer KYC Verification</h1>
      <p className="text-sm text-muted-foreground mt-1">
        Review and approve pending KYC applications.
      </p>

      {error && (
        <p className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="mt-6 space-y-4">
        {profiles.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground border border-border rounded-2xl bg-card">
            No pending KYC applications.
          </div>
        ) : (
          profiles.map((p) => (
            <div key={p.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-lg">{p.name || "Unknown Farmer"}</span>
                    <span className="rounded-full bg-amber/10 border border-amber/20 text-amber px-2 py-0.5 text-[10px] font-bold uppercase">
                      Pending
                    </span>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-y-1 text-sm">
                    <div className="text-muted-foreground">Phone:</div>
                    <div>{p.phone || "N/A"}</div>
                    <div className="text-muted-foreground">Email:</div>
                    <div>{p.email || "N/A"}</div>
                    <div className="text-muted-foreground">Aadhaar:</div>
                    <div className="font-mono">XXXX-XXXX-{p.aadhaar_last4}</div>
                    <div className="text-muted-foreground">Submitted:</div>
                    <div>{new Date(p.created_at).toLocaleString()}</div>
                  </div>
                </div>

                <div className="flex flex-col gap-2 md:items-end">
                  <a
                    href={p.kyc_document_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                  >
                    View Document <ExternalLink className="h-3 w-3" />
                  </a>

                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() => {
                        if (confirm("Approve this KYC?"))
                          adminResolveKYC(p.user_id, "approved").then(load);
                      }}
                      className="rounded-xl bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground press"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => {
                        if (confirm("Reject this KYC?"))
                          adminResolveKYC(p.user_id, "rejected").then(load);
                      }}
                      className="rounded-xl border border-destructive bg-destructive/10 px-5 py-2 text-xs font-semibold text-destructive press"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </AdminShell>
  );
}
