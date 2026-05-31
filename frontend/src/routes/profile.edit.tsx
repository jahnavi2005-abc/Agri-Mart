import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";
import { useAuth } from "@/hooks/useAuth";
import { updateProfile } from "@/lib/products";
import { useState, useEffect } from "react";
import { uploadDocument } from "@/lib/uploads";
import { uploadKYC } from "@/lib/kyc";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Globe,
  Home,
  Camera,
  Save,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  FileText,
  Upload,
  CheckCircle,
  Lock,
} from "lucide-react";

export const Route = createFileRoute("/profile/edit")({
  component: ProfileEditPage,
});

const STATES = [
  "Andhra Pradesh",
  "Telangana",
  "Karnataka",
  "Tamil Nadu",
  "Maharashtra",
  "Uttar Pradesh",
  "Rajasthan",
  "Gujarat",
  "West Bengal",
  "Punjab",
  "Haryana",
  "Bihar",
];

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "te", label: "తెలుగు (Telugu)" },
  { code: "hi", label: "हिन्दी (Hindi)" },
  { code: "ta", label: "தமிழ் (Tamil)" },
  { code: "kn", label: "ಕನ್ನಡ (Kannada)" },
  { code: "mr", label: "मराठी (Marathi)" },
];

function ProfileEditPage() {
  const { profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    phone: "",
    district: "",
    state: "Andhra Pradesh",
    address: "",
    avatar_url: "",
    language: "en",
  });

  const [pwdForm, setPwdForm] = useState({ current: "", newPwd: "", confirm: "" });
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdError, setPwdError] = useState("");
  const [pwdSuccess, setPwdSuccess] = useState(false);

  // Prefill with current profile
  useEffect(() => {
    if (!profile) return;
    setForm({
      name: profile.name ?? "",
      phone: profile.phone?.replace(/^\+91/, "") ?? "",
      district: profile.district ?? "",
      state: profile.state ?? "Andhra Pradesh",
      address: profile.address ?? "",
      avatar_url: profile.avatar_url ?? "",
      language: profile.language ?? "en",
    });
  }, [profile]);

  const [kycAadhaar, setKycAadhaar] = useState("");
  const [kycUploading, setKycUploading] = useState(false);
  const [kycDocUrl, setKycDocUrl] = useState("");

  const update = (key: keyof typeof form, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError("Name is required.");
      return;
    }
    if (form.district.trim().length < 2) {
      setError("Please enter a valid district.");
      return;
    }

    setError("");
    setSaving(true);

    try {
      const updated = await updateProfile({
        name: form.name.trim(),
        phone: form.phone ? `+91${form.phone.replace(/^\+91/, "")}` : undefined,
        district: form.district.trim(),
        state: form.state,
        address: form.address.trim() || undefined,
        avatar_url: form.avatar_url.trim() || undefined,
        language: form.language,
      });

      localStorage.setItem("user", JSON.stringify(updated));
      await refreshProfile();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const handleKycUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setKycUploading(true);
    setError("");
    try {
      const url = await uploadDocument(file);
      setKycDocUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload document");
    } finally {
      setKycUploading(false);
    }
  };

  const handlePwdChange = async () => {
    if (pwdForm.newPwd !== pwdForm.confirm) {
      setPwdError("Passwords do not match");
      return;
    }
    if (pwdForm.newPwd.length < 6) {
      setPwdError("Password must be at least 6 characters");
      return;
    }

    setPwdSaving(true);
    setPwdError("");
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ currentPassword: pwdForm.current, newPassword: pwdForm.newPwd }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to change password");
      setPwdSuccess(true);
      setPwdForm({ current: "", newPwd: "", confirm: "" });
      setTimeout(() => setPwdSuccess(false), 3000);
    } catch (e) {
      setPwdError(e instanceof Error ? e.message : "Error");
    } finally {
      setPwdSaving(false);
    }
  };

  const handleKycSubmit = async () => {
    if (kycAadhaar.length !== 4) {
      setError("Please enter the last 4 digits of Aadhaar");
      return;
    }
    if (!kycDocUrl) {
      setError("Please upload a document");
      return;
    }

    setSaving(true);
    try {
      await uploadKYC(kycAadhaar, kycDocUrl);
      setSuccess(true);
      await refreshProfile();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit KYC");
    } finally {
      setSaving(false);
    }
  };

  if (!profile) {
    return (
      <PageShell>
        <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center">
          <p className="text-muted-foreground">Please sign in to edit your profile.</p>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="mx-auto max-w-2xl px-4 py-8 md:px-8">
        {/* Header */}
        <div className="mb-6 flex items-center gap-4">
          <button
            onClick={() => window.history.back()}
            className="grid h-10 w-10 place-items-center rounded-xl border border-border bg-secondary press hover:bg-muted"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="font-display text-2xl font-bold">Edit Profile</h1>
            <p className="text-sm text-muted-foreground">Update your personal information</p>
          </div>
        </div>

        {/* Avatar section */}
        <div className="mb-6 flex flex-col items-center gap-4 rounded-3xl border border-border bg-card p-6">
          <div className="relative">
            {form.avatar_url ? (
              <img
                src={form.avatar_url}
                alt="Avatar"
                className="h-24 w-24 rounded-full object-cover border-4 border-primary/30"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/60 text-4xl font-bold text-primary-foreground">
                {profile.name?.[0]?.toUpperCase()}
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 grid h-8 w-8 place-items-center rounded-full bg-primary text-primary-foreground shadow-glow">
              <Camera className="h-4 w-4" />
            </div>
          </div>
          <div className="w-full">
            <label className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">
              Avatar URL (optional)
            </label>
            <input
              className="input"
              value={form.avatar_url}
              onChange={(e) => update("avatar_url", e.target.value)}
              placeholder="https://example.com/your-photo.jpg"
            />
          </div>
          <div className="text-center text-xs text-muted-foreground">
            <span className="font-medium capitalize text-primary">{profile.role}</span>
            {" · "}
            <span>{profile.email}</span>
          </div>
        </div>

        {/* Form */}
        <div className="space-y-4 rounded-3xl border border-border bg-card p-6 md:p-8">
          <h2 className="font-display text-lg font-bold">Personal Information</h2>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Full Name" icon={<User className="h-4 w-4" />} required>
              <input
                className="input"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                placeholder="Ravi Kumar"
              />
            </Field>

            <Field label="Email Address" icon={<Mail className="h-4 w-4" />}>
              <input
                className="input opacity-60 cursor-not-allowed"
                value={profile.email ?? ""}
                disabled
                title="Email cannot be changed"
              />
            </Field>

            <Field label="Phone Number" icon={<Phone className="h-4 w-4" />}>
              <div className="flex items-center overflow-hidden rounded-xl border border-border bg-input focus-within:border-primary focus-within:shadow-glow transition-all">
                <span className="border-r border-border px-3 py-3.5 font-mono text-sm text-muted-foreground">
                  +91
                </span>
                <input
                  className="flex-1 bg-transparent px-3 py-3.5 outline-none text-sm"
                  value={form.phone}
                  onChange={(e) => update("phone", e.target.value.replace(/\D/g, "").slice(0, 10))}
                  placeholder="98765 43210"
                />
              </div>
            </Field>

            <Field label="District" icon={<MapPin className="h-4 w-4" />} required>
              <input
                className="input"
                value={form.district}
                onChange={(e) => update("district", e.target.value)}
                placeholder="Guntur"
              />
            </Field>

            <Field label="State" icon={<MapPin className="h-4 w-4" />}>
              <select
                className="input"
                value={form.state}
                onChange={(e) => update("state", e.target.value)}
              >
                {STATES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </Field>

            <Field label="Language" icon={<Globe className="h-4 w-4" />}>
              <select
                className="input"
                value={form.language}
                onChange={(e) => update("language", e.target.value)}
              >
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.label}
                  </option>
                ))}
              </select>
            </Field>

            <div className="md:col-span-2">
              <Field label="Full Address" icon={<Home className="h-4 w-4" />}>
                <textarea
                  className="input min-h-[90px] resize-none"
                  value={form.address}
                  onChange={(e) => update("address", e.target.value)}
                  placeholder="Door no, Street, Village / Town..."
                />
              </Field>
            </div>
          </div>

          {/* Feedback */}
          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              Profile saved successfully!
            </div>
          )}
          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 font-semibold text-primary-foreground press shadow-glow disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>

        {/* Password Reset Section */}
        <div className="mt-6 space-y-4 rounded-3xl border border-border bg-card p-6 md:p-8">
          <h2 className="font-display text-lg font-bold flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            Security
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Current Password" icon={<Lock className="h-4 w-4" />}>
              <input
                type="password"
                value={pwdForm.current}
                onChange={(e) => setPwdForm((f) => ({ ...f, current: e.target.value }))}
                className="input"
                placeholder="••••••••"
              />
            </Field>
            <div className="hidden md:block"></div>
            <Field label="New Password" icon={<Lock className="h-4 w-4" />}>
              <input
                type="password"
                value={pwdForm.newPwd}
                onChange={(e) => setPwdForm((f) => ({ ...f, newPwd: e.target.value }))}
                className="input"
                placeholder="••••••••"
              />
            </Field>
            <Field label="Confirm New Password" icon={<Lock className="h-4 w-4" />}>
              <input
                type="password"
                value={pwdForm.confirm}
                onChange={(e) => setPwdForm((f) => ({ ...f, confirm: e.target.value }))}
                className="input"
                placeholder="••••••••"
              />
            </Field>
          </div>
          {pwdError && <div className="text-sm text-destructive">{pwdError}</div>}
          {pwdSuccess && <div className="text-sm text-primary">Password updated successfully!</div>}
          <button
            onClick={handlePwdChange}
            disabled={pwdSaving || !pwdForm.current || !pwdForm.newPwd}
            className="mt-2 w-full md:w-auto rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground press disabled:opacity-50"
          >
            {pwdSaving ? "Updating..." : "Change Password"}
          </button>
        </div>

        {/* Read-only account info */}
        <div className="mt-6 rounded-2xl border border-border bg-card/50 p-5">
          <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-widest">
            Account Info
          </h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <ReadOnly
              label="Role"
              value={profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}
            />
            <ReadOnly label="Verified" value={profile.is_verified ? "✓ Verified" : "Pending"} />
            <ReadOnly
              label="Member Since"
              value={new Date(profile.created_at).toLocaleDateString("en-IN", {
                year: "numeric",
                month: "long",
              })}
            />
            <ReadOnly label="Trust Level" value={String(profile.seller_trust_level ?? 0)} />
          </div>
        </div>

        {/* KYC Verification Section (Farmers Only) */}
        {profile.role === "farmer" && (
          <div className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h3 className="mb-1 font-display text-lg font-bold flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              KYC Verification
            </h3>

            {/* Show status if already submitted */}
            {profile.kyc_status ? (
              <div className="mt-4 rounded-xl border border-border bg-secondary/30 p-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`grid h-10 w-10 place-items-center rounded-full ${
                      profile.kyc_status === "approved"
                        ? "bg-primary/20 text-primary"
                        : profile.kyc_status === "rejected"
                          ? "bg-destructive/20 text-destructive"
                          : "bg-amber/20 text-amber"
                    }`}
                  >
                    {profile.kyc_status === "approved" ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : profile.kyc_status === "rejected" ? (
                      <AlertCircle className="h-5 w-5" />
                    ) : (
                      <FileText className="h-5 w-5" />
                    )}
                  </div>
                  <div>
                    <div className="font-semibold capitalize">Status: {profile.kyc_status}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {profile.kyc_status === "approved"
                        ? "Your account is verified. You can now receive payouts."
                        : profile.kyc_status === "pending"
                          ? "Your document is under review by our team."
                          : "Your verification was rejected. Please contact support."}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              // KYC Form
              <div className="mt-4 space-y-4">
                <p className="text-sm text-muted-foreground">
                  Complete your KYC to get verified and enable payouts directly to your bank
                  account.
                </p>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field
                    label="Aadhaar Last 4 Digits"
                    icon={<FileText className="h-4 w-4" />}
                    required
                  >
                    <input
                      type="text"
                      maxLength={4}
                      className="input font-mono"
                      value={kycAadhaar}
                      onChange={(e) => setKycAadhaar(e.target.value.replace(/\D/g, ""))}
                      placeholder="e.g. 1234"
                    />
                  </Field>
                  <Field label="Aadhaar Document" icon={<Upload className="h-4 w-4" />} required>
                    <div className="relative overflow-hidden rounded-xl border border-dashed border-border bg-input/50 transition-colors hover:bg-input">
                      <input
                        type="file"
                        accept="image/jpeg, image/png, application/pdf"
                        onChange={handleKycUpload}
                        disabled={kycUploading}
                        className="absolute inset-0 cursor-pointer opacity-0"
                      />
                      <div className="flex items-center gap-3 px-4 py-3">
                        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-secondary">
                          {kycUploading ? (
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                          ) : kycDocUrl ? (
                            <CheckCircle className="h-4 w-4 text-primary" />
                          ) : (
                            <Upload className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold">
                            {kycDocUrl ? "Document Uploaded" : "Upload Aadhaar Card"}
                          </div>
                          <div className="text-[10px] text-muted-foreground uppercase tracking-widest">
                            Max 5MB (JPG, PNG, PDF)
                          </div>
                        </div>
                      </div>
                    </div>
                  </Field>
                </div>
                <button
                  onClick={handleKycSubmit}
                  disabled={saving || !kycAadhaar || !kycDocUrl}
                  className="mt-2 w-full rounded-xl bg-primary py-3.5 font-semibold text-primary-foreground press shadow-glow disabled:opacity-50"
                >
                  Submit for Verification
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`.input{width:100%;background:var(--input);border:1px solid var(--border);border-radius:12px;padding:13px 16px;outline:none;transition:all .2s;color:var(--foreground);font-size:.875rem}.input:focus{border-color:var(--primary);box-shadow:var(--shadow-glow)}`}</style>
    </PageShell>
  );
}

function Field({
  label,
  icon,
  children,
  required,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {icon && <span className="text-primary">{icon}</span>}
        {label}
        {required && <span className="text-destructive">*</span>}
      </span>
      {children}
    </label>
  );
}

function ReadOnly({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-secondary/30 p-3">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm font-semibold">{value}</div>
    </div>
  );
}
