import { supabase } from "@/lib/supabase";
import type { UserProfile } from "@/types/database";
import type { Product } from "@/types/product";
import type { Order } from "@/types/order";

export async function getAdminStats() {
  const [users, products, orders, disputes] = await Promise.all([
    supabase.from("users").select("id", { count: "exact", head: true }),
    supabase.from("products").select("id", { count: "exact", head: true }),
    supabase.from("orders").select("id,total_amount", { count: "exact" }),
    supabase.from("disputes").select("id", { count: "exact", head: true }),
  ]);

  if (users.error) throw users.error;
  if (products.error) throw products.error;
  if (orders.error) throw orders.error;
  if (disputes.error) throw disputes.error;

  const revenue = (orders.data ?? []).reduce(
    (sum, order) => sum + Number(order.total_amount ?? 0),
    0,
  );

  return {
    users: users.count ?? 0,
    products: products.count ?? 0,
    orders: orders.count ?? 0,
    disputes: disputes.count ?? 0,
    revenue,
  };
}

export async function listAdminUsers() {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .order("created_at", { ascending: false })
    .returns<UserProfile[]>();
  if (error) throw error;
  return data ?? [];
}

export async function listAdminProducts() {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: false })
    .returns<Product[]>();
  if (error) throw error;
  return data ?? [];
}

export async function listAdminOrders() {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false })
    .returns<Order[]>();
  if (error) throw error;
  return data ?? [];
}

export async function updateUserVerification(id: string, is_verified: boolean) {
  const { error } = await supabase.from("users").update({ is_verified }).eq("id", id);
  if (error) throw error;
}

export async function updateUserBan(id: string, is_banned: boolean) {
  const { error } = await supabase.from("users").update({ is_banned }).eq("id", id);
  if (error) throw error;
}
