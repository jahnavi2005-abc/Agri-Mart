import { buildAuthHeaders } from "./products";

export type Review = {
  id: string;
  product_id: string;
  buyer_id: string;
  buyer_name?: string;
  rating: number;
  comment: string | null;
  photo_url: string | null;
  farmer_reply: string | null;
  reply_created_at: string | null;
  created_at: string;
};

export async function listProductReviews(productId: string): Promise<Review[]> {
  const res = await fetch(`/api/reviews/product/${productId}`);
  if (!res.ok) throw new Error("Failed to load reviews");
  return res.json();
}

export async function createReview(input: {
  order_item_id: string;
  rating: number;
  comment?: string;
  photo_url?: string;
}): Promise<Review> {
  const res = await fetch("/api/reviews", {
    method: "POST",
    headers: buildAuthHeaders(),
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to submit review");
  }
  return res.json();
}

export async function replyToReview(reviewId: string, reply: string): Promise<Review> {
  const res = await fetch(`/api/reviews/${reviewId}/reply`, {
    method: "PATCH",
    headers: buildAuthHeaders(),
    body: JSON.stringify({ reply }),
  });
  if (!res.ok) throw new Error("Failed to reply to review");
  return res.json();
}
