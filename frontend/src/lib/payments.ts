import { supabase } from "@/lib/supabase";
import type { Order } from "@/types/order";

type RazorpayCreateResponse = {
  keyId: string;
  razorpayOrderId: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
};

type RazorpaySuccess = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

export async function loadRazorpayScript() {
  if (window.Razorpay) return;

  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]',
    );
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Could not load Razorpay.")));
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Could not load Razorpay."));
    document.body.appendChild(script);
  });
}

export async function payOrderWithRazorpay(order: Order) {
  await loadRazorpayScript();

  const response = await fetch("/api/payments/create-order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderId: order.id }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || "Failed to create order");
  }
  const data = (await response.json()) as RazorpayCreateResponse;
  const Razorpay = window.Razorpay;
  if (!data || !Razorpay) throw new Error("Razorpay checkout is not available.");

  const result = await new Promise<RazorpaySuccess>((resolve, reject) => {
    const checkout = new Razorpay({
      key: data.keyId,
      amount: data.amount,
      currency: data.currency,
      name: data.name,
      description: data.description,
      order_id: data.razorpayOrderId,
      handler: (response: RazorpaySuccess) => resolve(response),
      modal: {
        ondismiss: () => reject(new Error("Payment was cancelled.")),
      },
      prefill: {
        name: order.delivery_address.name,
        contact: order.delivery_address.phone,
      },
      theme: {
        color: "#2f8f46",
      },
    });
    checkout.open();
  });

  const verifyRes = await fetch("/api/payments/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      orderId: order.id,
      ...result,
    }),
  });

  if (!verifyRes.ok) {
    const err = await verifyRes.json().catch(() => ({}));
    throw new Error(err.error || "Payment verification failed");
  }
}
