import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { getOrderById } from "@/lib/orders";
import type { Order, OrderItem } from "@/types/order";

export function useOrderStatus(orderId: string) {
  const [order, setOrder] = useState<(Order & { items: OrderItem[] }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrder = async () => {
    try {
      const data = await getOrderById(orderId);
      setOrder(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch order");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!orderId) return;

    fetchOrder();

    const channel = supabase
      .channel(`order_${orderId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `id=eq.${orderId}`,
        },
        (payload) => {
          // If the order status changes, we merge the new payload into the local state
          setOrder((prev) => (prev ? { ...prev, ...payload.new } : null));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId]);

  return { order, loading, error, refreshOrder: fetchOrder };
}
