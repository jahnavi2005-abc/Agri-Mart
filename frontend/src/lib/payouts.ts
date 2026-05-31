import { buildAuthHeaders } from "./products";

export type PayoutBalance = {
  total_earned: number;
  total_paid: number;
  total_pending: number;
  available_balance: number;
};

export type Payout = {
  id: string;
  farmer_id: string;
  amount: number;
  upi_id: string;
  status: "pending" | "approved" | "rejected";
  utr_number: string | null;
  created_at: string;
  resolved_at: string | null;
  farmer_name?: string;
  phone?: string;
};

export async function getPayoutBalance(): Promise<PayoutBalance> {
  const res = await fetch("/api/payouts/balance", { headers: buildAuthHeaders() });
  if (!res.ok) throw new Error("Failed to load balance");
  return res.json();
}

export async function getPayoutHistory(): Promise<Payout[]> {
  const res = await fetch("/api/payouts/history", { headers: buildAuthHeaders() });
  if (!res.ok) throw new Error("Failed to load payout history");
  return res.json();
}

export async function requestPayout(amount: number, upi_id: string): Promise<Payout> {
  const res = await fetch("/api/payouts/request", {
    method: "POST",
    headers: buildAuthHeaders(),
    body: JSON.stringify({ amount, upi_id }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to request payout");
  }
  return res.json();
}

export async function adminListPayouts(): Promise<Payout[]> {
  const res = await fetch("/api/payouts/admin", { headers: buildAuthHeaders() });
  if (!res.ok) throw new Error("Failed to list payouts");
  return res.json();
}

export async function adminResolvePayout(
  id: string,
  status: "approved" | "rejected",
  utr_number?: string,
): Promise<Payout> {
  const res = await fetch(`/api/payouts/admin/${id}`, {
    method: "PATCH",
    headers: buildAuthHeaders(),
    body: JSON.stringify({ status, utr_number }),
  });
  if (!res.ok) throw new Error("Failed to resolve payout");
  return res.json();
}
