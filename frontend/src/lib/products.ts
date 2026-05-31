import type { CreateProductInput, Product, ProductFilters, ProductStatus } from "@/types/product";
import type { UserProfile } from "@/types/database";
import { getAuthToken } from "@/lib/auth";

type ApiErrorBody = { error?: string };
type ProductResponse = Omit<Product, "image_urls"> & { image_urls: unknown };

/** Always returns a plain Record<string, string> — no undefined values — so TypeScript accepts it as HeadersInit */
export function buildAuthHeaders(extra?: Record<string, string>): Record<string, string> {
  const token = getAuthToken();
  const base: Record<string, string> = { "Content-Type": "application/json" };
  if (token) base["Authorization"] = `Bearer ${token}`;
  return { ...base, ...extra };
}

export async function listProducts(filters: ProductFilters = {}): Promise<Product[]> {
  const params = new URLSearchParams();
  if (filters.category && filters.category !== "All") params.set("category", filters.category);
  if (filters.organic) params.set("organic", "true");
  if (filters.maxPrice) params.set("maxPrice", String(filters.maxPrice));
  if (filters.minPrice) params.set("minPrice", String(filters.minPrice));
  if (filters.search?.trim()) params.set("search", filters.search.trim());
  if (filters.farmerId) params.set("farmerId", filters.farmerId);
  if (filters.includeOwnInactive) params.set("includeOwnInactive", "true");
  if (filters.state && filters.state !== "All") params.set("state", filters.state);
  if (filters.district?.trim()) params.set("district", filters.district.trim());
  if (filters.listingType && filters.listingType !== "All")
    params.set("listingType", filters.listingType);
  if (filters.grade && filters.grade !== "All") params.set("grade", filters.grade);

  // Phase 5 Geo & Quality Filters
  if (filters.lat !== undefined) params.set("lat", String(filters.lat));
  if (filters.lng !== undefined) params.set("lng", String(filters.lng));
  if (filters.radius !== undefined) params.set("radius", String(filters.radius));
  if (filters.minTrust) params.set("minTrust", String(filters.minTrust));
  if (filters.minRating) params.set("minRating", String(filters.minRating));
  if (filters.harvestFreshness) params.set("harvestFreshness", String(filters.harvestFreshness));
  if (filters.deliveryType && filters.deliveryType !== "All")
    params.set("deliveryType", filters.deliveryType);

  const res = await fetch(`/api/products?${params.toString()}`, {
    headers: buildAuthHeaders(),
  });
  if (!res.ok) throw new Error("Could not load products");
  const data = await res.json();

  return (data as ProductResponse[]).map((p) => ({
    ...p,
    image_urls: Array.isArray(p.image_urls)
      ? p.image_urls
      : typeof p.image_urls === "string"
        ? (() => {
            try {
              return JSON.parse(p.image_urls);
            } catch {
              return [];
            }
          })()
        : [],
  })) as Product[];
}

export async function getProductById(id: string): Promise<Product> {
  const res = await fetch(`/api/products/${id}`, { headers: buildAuthHeaders() });
  if (!res.ok) throw new Error("Could not load product");
  const p = await res.json();
  return {
    ...p,
    image_urls: Array.isArray(p.image_urls)
      ? p.image_urls
      : typeof p.image_urls === "string"
        ? (() => {
            try {
              return JSON.parse(p.image_urls);
            } catch {
              return [];
            }
          })()
        : [],
  } as Product;
}

export async function createProduct(
  input: CreateProductInput,
  profile: UserProfile,
): Promise<Product> {
  const payload = {
    ...input,
    farmer_id: profile.id,
    available_quantity_kg: input.quantity_kg,
    status: "active" as ProductStatus,
  };
  const res = await fetch("/api/products", {
    method: "POST",
    headers: buildAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as ApiErrorBody;
    throw new Error(err.error || "Failed to create product");
  }
  return res.json();
}

export async function updateProductStatus(id: string, status: ProductStatus): Promise<Product> {
  const res = await fetch(`/api/products/${id}/status`, {
    method: "PATCH",
    headers: buildAuthHeaders(),
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error("Failed to update product status");
  return res.json();
}

export async function updateProductDetails(
  id: string,
  data: { available_quantity_kg?: number; price_per_kg?: number },
): Promise<Product> {
  const res = await fetch(`/api/products/${id}`, {
    method: "PATCH",
    headers: buildAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update product details");
  return res.json();
}

export async function updateProfile(
  data: Partial<{
    name: string;
    phone: string;
    district: string;
    state: string;
    address: string;
    avatar_url: string;
    language: string;
  }>,
): Promise<UserProfile> {
  const res = await fetch("/api/auth/profile", {
    method: "PATCH",
    headers: buildAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as ApiErrorBody;
    throw new Error(err.error || "Failed to save profile");
  }
  return res.json();
}

export function primaryProductImage(product: Pick<Product, "image_urls">): string {
  const imgs = Array.isArray(product.image_urls) ? product.image_urls : [];
  return imgs[0] || "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=800&q=80";
}

export async function fetchPriceHistory(
  id: string,
): Promise<{ price_per_kg: string; recorded_at: string }[]> {
  const res = await fetch(`/api/products/${id}/price-history`);
  if (!res.ok) throw new Error("Failed to load price history");
  return res.json();
}
