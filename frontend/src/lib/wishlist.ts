import { buildAuthHeaders } from "./products";
import type { Product } from "@/types/product";

export type WishlistItem = Product & { wishlisted_at: string };

export async function getWishlist(): Promise<WishlistItem[]> {
  const res = await fetch("/api/wishlist", { headers: buildAuthHeaders() });
  if (!res.ok) throw new Error("Failed to fetch wishlist");
  return res.json();
}

export async function addToWishlist(productId: string): Promise<void> {
  const res = await fetch(`/api/wishlist/${productId}`, {
    method: "POST",
    headers: buildAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to add to wishlist");
}

export async function removeFromWishlist(productId: string): Promise<void> {
  const res = await fetch(`/api/wishlist/${productId}`, {
    method: "DELETE",
    headers: buildAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to remove from wishlist");
}
