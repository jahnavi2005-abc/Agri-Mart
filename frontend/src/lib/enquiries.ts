import { buildAuthHeaders } from "./products";

export type Enquiry = {
  id: string;
  product_id: string;
  buyer_id: string;
  farmer_id: string;
  quantity_kg: number;
  offered_price: number | null;
  message: string | null;
  status: "pending" | "accepted" | "rejected";
  created_at: string;
  updated_at: string;
  buyer_name?: string;
  crop_name?: string;
};

export async function listFarmerEnquiries(): Promise<Enquiry[]> {
  const res = await fetch("/api/enquiries/farmer", { headers: buildAuthHeaders() });
  if (!res.ok) throw new Error("Failed to load enquiries");
  return res.json();
}

export async function updateEnquiryStatus(
  id: string,
  status: "accepted" | "rejected",
): Promise<Enquiry> {
  const res = await fetch(`/api/enquiries/${id}`, {
    method: "PATCH",
    headers: buildAuthHeaders(),
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error("Failed to update enquiry");
  return res.json();
}
