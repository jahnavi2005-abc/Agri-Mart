import type { Product } from "@/types/product";

export type CartItem = {
  product: Product;
  quantity_kg: number;
};

export type DeliveryAddress = {
  name: string;
  phone: string;
  address: string;
  district: string;
  state: string;
  pincode: string;
};

export type Order = {
  id: string;
  buyer_id: string;
  farmer_id: string;
  status: "pending" | "accepted" | "packed" | "dispatched" | "delivered" | "cancelled" | "disputed";
  subtotal: number;
  platform_fee: number;
  delivery_fee: number;
  total_amount: number;
  farmer_payout: number;
  payment_status: "pending" | "paid" | "failed" | "refunded";
  payment_method: string;
  delivery_address: DeliveryAddress;
  created_at: string;
  updated_at: string;
};

export type OrderItem = {
  id: string;
  order_id: string;
  product_id: string;
  crop_name: string;
  quantity_kg: number;
  price_per_kg: number;
  total_price: number;
  review_id?: string;
  created_at: string;
};
