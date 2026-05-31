import { useState, useEffect, createContext, useContext } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./useAuth";
import type { CartItem } from "@/types/order";
import { getCartItems, cartTotals, getSavedItems } from "@/lib/cart";

type CartContextType = {
  items: CartItem[];
  savedItems: CartItem[];
  loading: boolean;
  totals: ReturnType<typeof cartTotals>;
  refreshCart: () => Promise<void>;
  refreshSaved: () => void;
};

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [savedItems, setSavedItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCart = async () => {
    if (!profile) {
      setItems(getCartItems()); // Fallback to local storage for guests
      setLoading(false);
      return;
    }

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const res = await fetch("/api/cart", {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setItems(data);
      }
    } catch (error) {
      console.error("Failed to fetch cart:", error);
    } finally {
      setLoading(false);
    }
  };

  const refreshSaved = () => {
    setSavedItems(getSavedItems());
  };

  useEffect(() => {
    fetchCart();
    refreshSaved();

    const handleLocalCart = () => {
      if (!profile) setItems(getCartItems());
    };
    const handleLocalSaved = () => {
      setSavedItems(getSavedItems());
    };

    window.addEventListener("agrimart-cart", handleLocalCart);
    window.addEventListener("agrimart-saved", handleLocalSaved);

    if (!profile)
      return () => {
        window.removeEventListener("agrimart-cart", handleLocalCart);
        window.removeEventListener("agrimart-saved", handleLocalSaved);
      };

    const channel = supabase
      .channel("cart_updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "cart_items", filter: `buyer_id=eq.${profile.id}` },
        () => fetchCart(),
      )
      .subscribe();

    return () => {
      window.removeEventListener("agrimart-cart", handleLocalCart);
      window.removeEventListener("agrimart-saved", handleLocalSaved);
      supabase.removeChannel(channel);
    };
  }, [profile]);

  return (
    <CartContext.Provider
      value={{
        items,
        savedItems,
        loading,
        totals: cartTotals(items),
        refreshCart: fetchCart,
        refreshSaved,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
