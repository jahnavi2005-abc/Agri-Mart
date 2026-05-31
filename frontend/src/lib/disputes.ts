import { buildAuthHeaders } from "./products";

export type Dispute = {
  id: string;
  order_id: string;
  raised_by: string;
  reason: "quality" | "missing_items" | "delay" | "other";
  description: string;
  buyer_evidence_url: string | null;
  farmer_evidence_url: string | null;
  farmer_notes: string | null;
  resolution_notes: string | null;
  status: "open" | "resolved_refunded" | "resolved_rejected";
  refund_amount: number | null;
  resolved_at: string | null;
  created_at: string;
  buyer_name?: string;
  farmer_name?: string;
  total_amount?: number;
};

export async function listDisputes(): Promise<Dispute[]> {
  const res = await fetch("/api/disputes", { headers: buildAuthHeaders() });
  if (!res.ok) throw new Error("Failed to load disputes");
  return res.json();
}

export async function createDispute(input: {
  order_id: string;
  reason: string;
  description: string;
  buyer_evidence_url?: string;
}): Promise<Dispute> {
  const res = await fetch("/api/disputes", {
    method: "POST",
    headers: buildAuthHeaders(),
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error("Failed to create dispute");
  return res.json();
}

export async function submitCounterEvidence(
  id: string,
  farmer_notes: string,
  farmer_evidence_url?: string,
): Promise<Dispute> {
  const res = await fetch(`/api/disputes/${id}/evidence`, {
    method: "PATCH",
    headers: buildAuthHeaders(),
    body: JSON.stringify({ farmer_notes, farmer_evidence_url }),
  });
  if (!res.ok) throw new Error("Failed to submit counter-evidence");
  return res.json();
}

export async function resolveDispute(
  id: string,
  status: Dispute["status"],
  resolution_notes: string,
  refund_amount?: number,
): Promise<Dispute> {
  const res = await fetch(`/api/disputes/${id}/resolve`, {
    method: "PATCH",
    headers: buildAuthHeaders(),
    body: JSON.stringify({ status, resolution_notes, refund_amount }),
  });
  if (!res.ok) throw new Error("Failed to resolve dispute");
  return res.json();
}
