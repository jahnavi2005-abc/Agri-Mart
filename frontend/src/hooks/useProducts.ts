import { getProductById, listProducts } from "@/lib/products";
import type { ProductFilters } from "@/types/product";
import { useEffect, useState } from "react";

export function useProducts(filters: ProductFilters = {}) {
  const [data, setData] = useState<Awaited<ReturnType<typeof listProducts>>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    const timer = setTimeout(() => {
      listProducts(filters)
        .then((products) => {
          if (active) setData(products);
        })
        .catch((err) => {
          if (active) setError(err instanceof Error ? err.message : "Could not load products.");
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 300);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [JSON.stringify(filters)]);

  return { data, loading, error };
}

export function useProduct(id: string) {
  const [data, setData] = useState<Awaited<ReturnType<typeof getProductById>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    getProductById(id)
      .then((product) => {
        if (active) setData(product);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : "Could not load product.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id]);

  return { data, loading, error };
}
