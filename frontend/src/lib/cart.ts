import type { CartItem } from "@/types/order";
import type { Product } from "@/types/product";
import { buildAuthHeaders } from "./products";
import { supabase } from "./supabase";

const CART_KEY = "agrimart-cart-v1";

// Keeps synchronous local storage for guest browsing, but API for actions
export function getCartItems(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    return [];
  }
}

export function saveCartItems(items: CartItem[]) {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event("agrimart-cart"));
}

const SAVED_KEY = "agrimart-saved-v1";

export function getSavedItems(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SAVED_KEY);
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    return [];
  }
}

export function saveSavedItems(items: CartItem[]) {
  localStorage.setItem(SAVED_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event("agrimart-saved"));
}

export async function addToCart(product: Product, quantity_kg: number) {
  const { data } = await supabase.auth.getSession();
  if (data.session) {
    // API Call
    await fetch("/api/cart", {
      method: "POST",
      headers: buildAuthHeaders(),
      body: JSON.stringify({ product_id: product.id, quantity_kg }),
    });
  } else {
    // Local storage
    const existing = getCartItems();
    const index = existing.findIndex((item) => item.product.id === product.id);
    if (index >= 0) {
      existing[index].quantity_kg = Math.min(
        product.available_quantity_kg,
        existing[index].quantity_kg + quantity_kg,
      );
    } else {
      existing.push({ product, quantity_kg: Math.min(product.available_quantity_kg, quantity_kg) });
    }
    saveCartItems(existing);
  }
}

export async function updateCartQuantity(productId: string, quantity_kg: number) {
  const { data } = await supabase.auth.getSession();
  if (data.session) {
    await fetch(`/api/cart/${productId}`, {
      method: "PATCH",
      headers: buildAuthHeaders(),
      body: JSON.stringify({ quantity_kg }),
    });
  } else {
    const items = getCartItems()
      .map((item) => (item.product.id === productId ? { ...item, quantity_kg } : item))
      .filter((item) => item.quantity_kg > 0);
    saveCartItems(items);
  }
}

export async function removeCartItem(productId: string) {
  const { data } = await supabase.auth.getSession();
  if (data.session) {
    await fetch(`/api/cart/${productId}`, {
      method: "DELETE",
      headers: buildAuthHeaders(),
    });
  } else {
    saveCartItems(getCartItems().filter((item) => item.product.id !== productId));
  }
}

export async function clearCart() {
  const { data } = await supabase.auth.getSession();
  if (data.session) {
    const items = getCartItems(); // We can't clear all API cart easily unless we loop or make a new endpoint
    for (const item of items) {
      await fetch(`/api/cart/${item.product.id}`, {
        method: "DELETE",
        headers: buildAuthHeaders(),
      });
    }
  } else {
    saveCartItems([]);
  }
}

export function cartTotals(items: CartItem[]) {
  const subtotal = items.reduce(
    (sum, item) => sum + item.quantity_kg * item.product.price_per_kg,
    0,
  );
  const delivery = items.length ? 80 : 0;
  const platformFee = Math.round(subtotal * 0.02);
  const total = subtotal + delivery + platformFee;

  return { subtotal, delivery, platformFee, total };
}

export async function moveItemToSaved(item: CartItem) {
  await removeCartItem(item.product.id);
  const saved = getSavedItems();
  if (!saved.find((s) => s.product.id === item.product.id)) {
    saved.push(item);
    saveSavedItems(saved);
  }
}

export async function moveItemToCart(item: CartItem) {
  const saved = getSavedItems().filter((s) => s.product.id !== item.product.id);
  saveSavedItems(saved);
  await addToCart(item.product, item.quantity_kg);
}
