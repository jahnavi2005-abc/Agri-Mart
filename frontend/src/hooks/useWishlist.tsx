import { useState, useEffect, createContext, useContext } from "react";
import { getWishlist, addToWishlist, removeFromWishlist } from "@/lib/wishlist";
import { useAuth } from "./useAuth";
import type { WishlistItem } from "@/lib/wishlist";

type WishlistContextType = {
  items: WishlistItem[];
  loading: boolean;
  toggleWishlist: (productId: string) => Promise<void>;
  isInWishlist: (productId: string) => boolean;
};

const WishlistContext = createContext<WishlistContextType | null>(null);

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWishlist = async () => {
    if (!profile || profile.role !== "buyer") {
      setItems([]);
      setLoading(false);
      return;
    }
    try {
      const data = await getWishlist();
      setItems(data);
    } catch (error) {
      console.error("Failed to fetch wishlist", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWishlist();
  }, [profile]);

  const isInWishlist = (productId: string) => items.some((item) => item.id === productId);

  const toggleWishlist = async (productId: string) => {
    if (!profile || profile.role !== "buyer") return;
    try {
      if (isInWishlist(productId)) {
        await removeFromWishlist(productId);
        setItems(items.filter((item) => item.id !== productId));
      } else {
        await addToWishlist(productId);
        await fetchWishlist(); // Refresh to get the full product details
      }
    } catch (error) {
      console.error("Toggle wishlist failed", error);
    }
  };

  return (
    <WishlistContext.Provider value={{ items, loading, toggleWishlist, isInWishlist }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used within WishlistProvider");
  return ctx;
}
