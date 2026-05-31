import { buildAuthHeaders } from "./products";

export type AuctionBid = {
  id: string;
  product_id: string;
  bidder_id: string;
  bidder_name: string;
  bid_amount: string;
  status: "active" | "outbid" | "won" | "cancelled";
  placed_at: string;
};

export async function fetchProductBids(productId: string): Promise<AuctionBid[]> {
  const res = await fetch(`/api/auctions/${productId}/bids`);
  if (!res.ok) throw new Error("Failed to fetch bids");
  return res.json();
}

export async function placeBid(productId: string, bidAmount: number): Promise<AuctionBid> {
  const res = await fetch(`/api/auctions/${productId}/bid`, {
    method: "POST",
    headers: buildAuthHeaders(),
    body: JSON.stringify({ bid_amount: bidAmount }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to place bid");
  }
  return res.json();
}

export async function endAuction(productId: string) {
  const res = await fetch(`/api/auctions/${productId}/end`, {
    method: "POST",
    headers: buildAuthHeaders(),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to end auction");
  }
  return res.json();
}
