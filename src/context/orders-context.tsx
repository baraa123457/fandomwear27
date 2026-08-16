"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { CartLine } from "@/context/cart-context";
import { useAuth } from "@/context/auth-context";
import { useCatalog } from "@/context/catalog-context";
import { createClient } from "@/lib/supabase/client";
import { createOrder as createOrderRpc, fetchOrdersForUser } from "@/lib/supabase/queries/orders";

const GUEST_STORAGE_KEY = "fandomwear:guest-orders";

export type OrderStatus = "processing" | "shipped" | "delivered" | "cancelled";

export interface ShippingAddress {
  fullName: string;
  line1: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

export interface Order {
  id: string;
  date: string;
  email: string;
  items: CartLine[];
  subtotal: number;
  discount?: number;
  couponCode?: string;
  shipping: number;
  tax: number;
  total: number;
  status: OrderStatus;
  paymentMethod?: "card" | "cod";
  shippingAddress: ShippingAddress;
}

export interface PlaceOrderInput {
  items: CartLine[];
  subtotal: number;
  discount: number;
  couponCode?: string;
  shipping: number;
  tax: number;
  total: number;
  paymentMethod: "card" | "cod";
  email: string;
  shippingAddress: ShippingAddress;
}

interface OrdersContextValue {
  orders: Order[];
  isLoading: boolean;
  placeOrder: (input: PlaceOrderInput) => Promise<Order>;
}

const OrdersContext = createContext<OrdersContextValue | null>(null);

/**
 * Order history now comes from Supabase (see PHASE 4 — ORDERS/CHECKOUT).
 * Signed-in shoppers get their real order history via `fetchOrdersForUser`
 * (RLS: auth.uid() = user_id). Guest checkout is preserved: a signed-out
 * shopper's placed orders are kept in localStorage only for this browser,
 * same as before, since there's no account to attach them to server-side.
 * placeOrder is now async — it calls the create_order() Postgres function,
 * which re-prices everything server-side and is the sole write path for
 * orders (see queries/orders.ts).
 */
export function OrdersProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { refreshSalesCounts } = useCatalog();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const userRef = useRef(user);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      if (user) {
        try {
          const supabase = createClient();
          const remote = await fetchOrdersForUser(supabase, user.id);
          if (!cancelled) setOrders(remote);
        } catch (err) {
          console.error("[orders] Failed to load orders:", err);
          if (!cancelled) setOrders([]);
        }
      } else {
        try {
          const raw = localStorage.getItem(GUEST_STORAGE_KEY);
          if (!cancelled) setOrders(raw ? JSON.parse(raw) : []);
        } catch {
          if (!cancelled) setOrders([]);
        }
      }
      if (!cancelled) setIsLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const placeOrder = useCallback(async (input: PlaceOrderInput): Promise<Order> => {
    const supabase = createClient();
    const row = await createOrderRpc(supabase, {
      items: input.items.map((line) => ({
        productId: line.productId,
        size: line.size,
        color: line.color,
        quantity: line.quantity,
      })),
      email: input.email,
      fullName: input.shippingAddress.fullName,
      line1: input.shippingAddress.line1,
      city: input.shippingAddress.city,
      state: input.shippingAddress.state,
      zip: input.shippingAddress.zip,
      country: input.shippingAddress.country,
      paymentMethod: input.paymentMethod,
      couponCode: input.couponCode,
    });

    const order: Order = {
      id: row.id,
      date: row.order_date,
      email: row.email,
      items: input.items,
      subtotal: Number(row.subtotal),
      discount: Number(row.discount),
      couponCode: row.coupon_code ?? undefined,
      shipping: Number(row.shipping_cost),
      tax: Number(row.tax),
      total: Number(row.total),
      status: row.status,
      paymentMethod: (row.payment_method as "card" | "cod" | null) ?? undefined,
      shippingAddress: input.shippingAddress,
    };

    setOrders((prev) => {
      const next = [order, ...prev];
      if (!userRef.current) {
        try {
          localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(next));
        } catch {
          /* storage unavailable — order was still placed successfully */
        }
      }
      return next;
    });

    // The order is now committed server-side (order_items were written by
    // create_order()), so Best Sellers' underlying sales data has already
    // changed — refresh it now instead of waiting for a future page load.
    // Best-effort: a failure here shouldn't surface as a failed checkout,
    // since the order itself already succeeded.
    void refreshSalesCounts();

    return order;
  }, [refreshSalesCounts]);

  return (
    <OrdersContext.Provider value={{ orders, isLoading, placeOrder }}>{children}</OrdersContext.Provider>
  );
}

export function useOrders() {
  const ctx = useContext(OrdersContext);
  if (!ctx) throw new Error("useOrders must be used within OrdersProvider");
  return ctx;
}
