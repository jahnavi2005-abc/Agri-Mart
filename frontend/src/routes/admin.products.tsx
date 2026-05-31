import { AdminShell } from "@/components/AdminShell";
import { listAdminProducts } from "@/lib/admin";
import { primaryProductImage, updateProductStatus } from "@/lib/products";
import type { Product } from "@/types/product";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/admin/products")({
  component: AdminProducts,
});

function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState("");
  const load = () =>
    listAdminProducts()
      .then(setProducts)
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load products."));
  useEffect(load, []);

  return (
    <AdminShell>
      <h1 className="font-display text-3xl font-bold">Products</h1>
      {error && (
        <p className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="mt-6 space-y-3">
        {products.map((product) => (
          <div
            key={product.id}
            className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4"
          >
            <img
              src={primaryProductImage(product)}
              alt=""
              className="h-14 w-14 rounded-xl object-cover"
            />
            <div className="min-w-0 flex-1">
              <Link
                to="/listings/$id"
                params={{ id: product.id }}
                className="font-semibold hover:text-primary"
              >
                {product.crop_name}
              </Link>
              <div className="text-xs text-muted-foreground">
                {product.farmer_display_name} · {product.status} · ₹{product.price_per_kg}/kg
              </div>
            </div>
            <button
              onClick={() =>
                updateProductStatus(
                  product.id,
                  product.status === "removed" ? "active" : "removed",
                ).then(load)
              }
              className="rounded-xl border border-border px-3 py-2 text-xs font-semibold press"
            >
              {product.status === "removed" ? "Restore" : "Remove"}
            </button>
          </div>
        ))}
      </div>
    </AdminShell>
  );
}
