import { createFileRoute, Link } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";
import { Minus, Plus, Trash2, ArrowRight, ShoppingBag, Bookmark, UploadCloud } from "lucide-react";
import { useEffect, useState } from "react";
import {
  cartTotals,
  getCartItems,
  removeCartItem,
  updateCartQuantity,
  moveItemToSaved,
  moveItemToCart,
} from "@/lib/cart";
import type { CartItem } from "@/types/order";
import { primaryProductImage } from "@/lib/products";
import { useCart } from "@/hooks/useCart";

export const Route = createFileRoute("/cart")({
  component: CartPage,
});

function CartPage() {
  const { items, savedItems, totals, refreshCart, refreshSaved } = useCart();

  const changeQty = async (productId: string, nextQty: number) => {
    await updateCartQuantity(productId, nextQty);
    refreshCart();
  };

  const remove = async (productId: string) => {
    await removeCartItem(productId);
    refreshCart();
  };

  const saveForLater = async (item: CartItem) => {
    await moveItemToSaved(item);
    refreshCart();
    refreshSaved();
  };

  const moveToCart = async (item: CartItem) => {
    await moveItemToCart(item);
    refreshCart();
    refreshSaved();
  };

  return (
    <PageShell>
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
        <h1 className="font-display text-3xl font-bold md:text-5xl">
          Your <span className="text-gradient-amber">Cart</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {items.length} items ready for checkout
        </p>

        {items.length === 0 ? (
          <div className="mt-12 flex flex-col items-center justify-center rounded-3xl border border-border bg-card py-20 text-center">
            <div className="grid h-20 w-20 place-items-center rounded-full bg-secondary text-2xl">
              AG
            </div>
            <h3 className="mt-4 font-display text-2xl font-bold">Your cart is empty</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Browse fresh crops and add to your cart.
            </p>
            <Link
              to="/listings"
              className="mt-6 rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground press shadow-glow"
            >
              Browse Crops
            </Link>
          </div>
        ) : (
          <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
            <div className="space-y-3">
              {items.map((item, idx) => {
                const product = item.product;
                return (
                  <div
                    key={product.id}
                    className="flex gap-4 rounded-2xl border border-border bg-card p-3 md:p-4"
                    style={{
                      animation: "var(--animate-fade-up)",
                      animationDelay: `${idx * 60}ms`,
                      animationFillMode: "backwards",
                    }}
                  >
                    <img
                      src={primaryProductImage(product)}
                      alt=""
                      className="h-20 w-20 shrink-0 rounded-xl object-cover md:h-24 md:w-24"
                    />
                    <div className="flex flex-1 flex-col">
                      <div className="flex justify-between gap-2">
                        <div>
                          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                            {product.category}
                          </div>
                          <h3 className="font-display font-semibold">{product.crop_name}</h3>
                          <p className="text-xs text-muted-foreground">
                            by {product.farmer_display_name} · {product.district}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => saveForLater(item)}
                            title="Save for later"
                            className="flex items-center gap-1 rounded-lg px-2 text-xs font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground press"
                          >
                            <Bookmark className="h-3.5 w-3.5" />{" "}
                            <span className="hidden sm:inline">Save</span>
                          </button>
                          <button
                            onClick={() => remove(product.id)}
                            className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-destructive/15 hover:text-destructive press"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <div className="mt-auto flex items-center justify-between pt-2">
                        <div className="flex items-center gap-1 rounded-lg border border-border bg-input p-0.5">
                          <button
                            onClick={() => changeQty(product.id, item.quantity_kg - 1)}
                            className="grid h-8 w-8 place-items-center rounded-md hover:bg-secondary press"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="min-w-[2.5ch] text-center font-mono text-sm font-semibold">
                            {item.quantity_kg}
                          </span>
                          <button
                            onClick={() => changeQty(product.id, item.quantity_kg + 1)}
                            className="grid h-8 w-8 place-items-center rounded-md hover:bg-secondary press"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                          <span className="px-2 text-xs text-muted-foreground">kg</span>
                        </div>
                        <div className="font-mono text-lg font-semibold text-amber">
                          ₹{(item.quantity_kg * product.price_per_kg).toLocaleString("en-IN")}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              {savedItems.length > 0 && (
                <div className="mt-12">
                  <h3 className="mb-4 font-display text-xl font-bold">
                    Saved for Later ({savedItems.length})
                  </h3>
                  <div className="space-y-3 opacity-80 transition-opacity hover:opacity-100">
                    {savedItems.map((item, idx) => {
                      const product = item.product;
                      return (
                        <div
                          key={product.id}
                          className="flex gap-4 rounded-2xl border border-border bg-card/50 p-3 md:p-4 grayscale-[0.3]"
                        >
                          <img
                            src={primaryProductImage(product)}
                            alt=""
                            className="h-16 w-16 shrink-0 rounded-xl object-cover"
                          />
                          <div className="flex flex-1 flex-col">
                            <div className="flex justify-between gap-2">
                              <div>
                                <h4 className="font-semibold text-sm">{product.crop_name}</h4>
                                <p className="text-[10px] text-muted-foreground">
                                  ₹{product.price_per_kg}/kg
                                </p>
                              </div>
                              <button
                                onClick={() => moveToCart(item)}
                                className="flex items-center gap-1 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-bold text-foreground hover:border-primary hover:text-primary press shadow-sm"
                              >
                                <UploadCloud className="h-3 w-3" /> Move to Cart
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <aside className="sticky top-24 h-fit rounded-2xl border border-border bg-card p-6">
              <h3 className="font-display text-lg font-bold">Order Summary</h3>
              <dl className="mt-4 space-y-3 text-sm">
                <Row label="Subtotal" value={`₹${totals.subtotal.toLocaleString("en-IN")}`} />
                <Row
                  label="Platform fee"
                  value={`₹${totals.platformFee.toLocaleString("en-IN")}`}
                />
                <Row
                  label="Delivery estimate"
                  value={`₹${totals.delivery.toLocaleString("en-IN")}`}
                />
                <div className="flex justify-between border-t border-border pt-3">
                  <dt className="font-semibold">Total</dt>
                  <dd className="font-mono text-2xl font-semibold text-amber">
                    ₹{totals.total.toLocaleString("en-IN")}
                  </dd>
                </div>
              </dl>
              <Link
                to="/checkout"
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 font-semibold text-primary-foreground press shadow-glow"
              >
                <ShoppingBag className="h-4 w-4" /> Checkout <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/listings"
                className="mt-2 block text-center text-xs text-muted-foreground hover:text-foreground"
              >
                Continue shopping
              </Link>
            </aside>
          </div>
        )}
      </div>
    </PageShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-mono">{value}</dd>
    </div>
  );
}
