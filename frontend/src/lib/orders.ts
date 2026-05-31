import { clearCart } from "@/lib/cart";
import { buildAuthHeaders } from "@/lib/products";
import type { CartItem, DeliveryAddress, Order, OrderItem } from "@/types/order";
import type { UserProfile } from "@/types/database";

type ApiErrorBody = { error?: string };

export async function createOrdersFromCart(
  items: CartItem[],
  buyer: UserProfile,
  deliveryAddress: DeliveryAddress,
): Promise<Order[]> {
  const res = await fetch("/api/orders", {
    method: "POST",
    headers: buildAuthHeaders(),
    body: JSON.stringify({ items, delivery_address: deliveryAddress }),
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as ApiErrorBody;
    throw new Error(err.error || "Failed to place order");
  }

  const data = await res.json();
  clearCart();
  return data;
}

export async function listMyOrders(_profile: UserProfile): Promise<Order[]> {
  const res = await fetch("/api/orders", { headers: buildAuthHeaders() });
  if (!res.ok) throw new Error("Failed to load orders");
  return res.json();
}

export async function listOrderItems(orderId: string): Promise<OrderItem[]> {
  const res = await fetch(`/api/orders/${orderId}`, { headers: buildAuthHeaders() });
  if (!res.ok) throw new Error("Failed to load order details");
  const data = await res.json();
  return data.items ?? [];
}

export async function getOrderById(orderId: string): Promise<Order & { items: OrderItem[] }> {
  const res = await fetch(`/api/orders/${orderId}`, { headers: buildAuthHeaders() });
  if (!res.ok) throw new Error("Order not found");
  return res.json();
}

export async function updateOrderStatus(orderId: string, status: Order["status"]): Promise<Order> {
  const res = await fetch(`/api/orders/${orderId}/status`, {
    method: "PATCH",
    headers: buildAuthHeaders(),
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error("Failed to update order status");
  return res.json();
}
