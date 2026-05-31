import { buildAuthHeaders } from "./products";

export type KYCProfile = {
  id: string;
  user_id: string;
  aadhaar_last4: string;
  kyc_document_url: string;
  kyc_status: "pending" | "approved" | "rejected";
  name?: string;
  email?: string;
  phone?: string;
  created_at: string;
};

export async function uploadKYC(aadhaar_last4: string, kyc_document_url: string) {
  const res = await fetch("/api/kyc/upload", {
    method: "POST",
    headers: buildAuthHeaders(),
    body: JSON.stringify({ aadhaar_last4, kyc_document_url }),
  });
  if (!res.ok) throw new Error("Failed to submit KYC");
  return res.json();
}

export async function adminListKYC(): Promise<KYCProfile[]> {
  const res = await fetch("/api/kyc/admin", { headers: buildAuthHeaders() });
  if (!res.ok) throw new Error("Failed to load KYC applications");
  return res.json();
}

export async function adminResolveKYC(userId: string, status: "approved" | "rejected") {
  const res = await fetch(`/api/kyc/admin/${userId}`, {
    method: "PATCH",
    headers: buildAuthHeaders(),
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error("Failed to resolve KYC");
  return res.json();
}
