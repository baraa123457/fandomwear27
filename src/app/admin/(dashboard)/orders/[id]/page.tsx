"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CreditCard, MapPin, Wallet } from "lucide-react";
import { StatusBadge } from "@/components/admin/status-badge";
import { Dropdown } from "@/components/shared/dropdown";
import { ProductVisual } from "@/components/shared/product-visual";
import { Skeleton } from "@/components/shared/skeletons";
import { Button } from "@/components/ui/button";
import { useToast } from "@/context/toast-context";
import { useCatalog } from "@/context/catalog-context";
import { formatPrice, getErrorMessage } from "@/lib/utils";
import { resolveUniverse } from "@/lib/data/universes";
import { createClient } from "@/lib/supabase/client";
import {
  fetchOrderByIdAdmin,
  updateOrderStatusAdmin,
  type AdminOrderStatus,
  type OrderWithItems,
} from "@/lib/supabase/queries/orders";
import { updateProductRow } from "@/lib/supabase/queries/products";

const statusOptions: AdminOrderStatus[] = ["processing", "shipped", "delivered", "cancelled"];

export default function AdminOrderDetailsPage() {
  const params = useParams<{ id: string }>();
  const id = decodeURIComponent(params.id);
  const router = useRouter();
  const { toast } = useToast();
  const { products, universes, refreshSalesCounts, refreshProducts, restoreStock, deductStock } = useCatalog();

  const [order, setOrder] = useState<OrderWithItems | null>(null);
  const [loadStatus, setLoadStatus] = useState<"loading" | "ready" | "error" | "not_found">("loading");
  const [statusSaving, setStatusSaving] = useState(false);

  const load = async () => {
    setLoadStatus("loading");
    try {
      const supabase = createClient();
      const row = await fetchOrderByIdAdmin(supabase, id);
      if (!row) {
        setLoadStatus("not_found");
        return;
      }
      setOrder(row);
      setLoadStatus("ready");
    } catch (err) {
      console.error("[admin] Failed to load order:", err);
      setLoadStatus("error");
      toast({ variant: "error", title: "Failed to load order", description: getErrorMessage(err) });
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const updateStatus = async (status: AdminOrderStatus) => {
    if (!order) return;
    const previous = order.status;
    setOrder({ ...order, status });
    setStatusSaving(true);
    try {
      const supabase = createClient();
      await updateOrderStatusAdmin(supabase, order.id, status);
      toast({ variant: "success", title: "Order updated", description: `${order.id} → ${status}` });

      if (status === "cancelled" && previous !== "cancelled") {
        restoreStock(order.items.map((it) => ({ productId: it.productId, quantity: it.quantity })));
        for (const item of order.items) {
          const p = products.find((x) => x.id === item.productId);
          if (p) {
            void updateProductRow(supabase, item.productId, { stock: p.stock + item.quantity }).catch(() => {});
          }
        }
      } else if (previous === "cancelled" && status !== "cancelled") {
        deductStock(order.items.map((it) => ({ productId: it.productId, quantity: it.quantity })));
        for (const item of order.items) {
          const p = products.find((x) => x.id === item.productId);
          if (p) {
            void updateProductRow(supabase, item.productId, { stock: Math.max(0, p.stock - item.quantity) }).catch(() => {});
          }
        }
      }

      if (status === "cancelled" || previous === "cancelled") {
        void refreshSalesCounts();
        void refreshProducts();
      }
    } catch (err) {
      console.error("[admin] Failed to update order status:", err);
      setOrder((prev) => (prev ? { ...prev, status: previous } : prev));
      toast({ variant: "error", title: "Couldn't update order", description: getErrorMessage(err) });
    } finally {
      setStatusSaving(false);
    }
  };

  if (loadStatus === "loading") {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (loadStatus === "not_found") {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-line py-20 text-center">
        <p className="text-sm text-ink-dim">Order &ldquo;{id}&rdquo; doesn&apos;t exist.</p>
        <Button variant="outline" size="sm" onClick={() => router.push("/admin/orders")}>
          <ArrowLeft className="h-3.5 w-3.5" /> Back to orders
        </Button>
      </div>
    );
  }

  if (loadStatus === "error" || !order) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-line py-20 text-center">
        <p className="text-sm text-ink-dim">Couldn&apos;t load this order.</p>
        <Button variant="outline" size="sm" onClick={() => void load()}>
          Try again
        </Button>
      </div>
    );
  }

  const addr = order.shippingAddress;

  return (
    <div>
      <button
        type="button"
        onClick={() => router.push("/admin/orders")}
        className="flex items-center gap-1.5 text-sm text-ink-faint transition-colors hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to orders
      </button>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-2xl font-bold text-ink">{order.id}</h1>
            <StatusBadge status={order.status} />
          </div>
          <p className="mt-1 text-sm text-ink-faint">
            Placed{" "}
            {new Date(order.date).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-ink-faint">Status</span>
          <Dropdown
            ariaLabel="Update order status"
            value={order.status}
            options={statusOptions.map((s) => ({ value: s, label: s[0].toUpperCase() + s.slice(1) }))}
            onChange={(v) => updateStatus(v)}
          />
          {statusSaving && <span className="text-xs text-ink-faint">Saving…</span>}
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-line">
            <div className="border-b border-line px-4 py-3">
              <h2 className="text-sm font-semibold text-ink">Products</h2>
            </div>
            <div className="divide-y divide-line/60">
              {order.items.map((item, idx) => {
                const product = products.find((p) => p.id === item.productId);
                const universe = resolveUniverse(universes, item.universe);
                const lineSubtotal = item.price * item.quantity;
                return (
                  <div key={`${item.productId}-${item.size}-${item.color}-${idx}`} className="flex items-center gap-4 px-4 py-4">
                    <ProductVisual
                      image={product?.image}
                      color={universe.color}
                      icon={item.artIcon}
                      label={item.name}
                      className="h-16 w-16 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-ink">{item.name}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-faint">
                        <span className="rounded-full border border-line bg-void px-2 py-0.5 font-semibold text-ink">
                          {item.size}
                        </span>
                        <span>{item.color}</span>
                        <span>·</span>
                        <span>Qty {item.quantity}</span>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-mono text-sm text-ink">{formatPrice(lineSubtotal)}</p>
                      <p className="text-xs text-ink-faint">{formatPrice(item.price)} each</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-line p-4">
            <h2 className="text-sm font-semibold text-ink">Customer</h2>
            <p className="mt-2 text-sm text-ink">{addr.fullName}</p>
            <p className="text-xs text-ink-faint">{order.email}</p>

            <div className="mt-4 flex items-start gap-2 border-t border-line/60 pt-4">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-faint" />
              <div className="text-xs text-ink-dim">
                <p>{addr.line1 || "—"}</p>
                <p>
                  {[addr.city, addr.state, addr.zip].filter(Boolean).join(", ") || "—"}
                </p>
                <p>{addr.country || "—"}</p>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2 border-t border-line/60 pt-4 text-xs text-ink-dim">
              {order.paymentMethod === "cod" ? (
                <Wallet className="h-3.5 w-3.5 shrink-0 text-ink-faint" />
              ) : (
                <CreditCard className="h-3.5 w-3.5 shrink-0 text-ink-faint" />
              )}
              {order.paymentMethod === "cod" ? "Cash on delivery" : "Card payment"}
            </div>
          </div>

          <div className="rounded-2xl border border-line p-4">
            <h2 className="text-sm font-semibold text-ink">Order summary</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-faint">Subtotal</dt>
                <dd className="font-mono text-ink-dim">{formatPrice(order.subtotal)}</dd>
              </div>
              {!!order.discount && (
                <div className="flex justify-between">
                  <dt className="text-ink-faint">
                    Discount{order.couponCode ? ` (${order.couponCode})` : ""}
                  </dt>
                  <dd className="font-mono text-accent-purple">−{formatPrice(order.discount)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-ink-faint">Shipping</dt>
                <dd className="font-mono text-ink-dim">
                  {order.shipping === 0 ? "Free" : formatPrice(order.shipping)}
                </dd>
              </div>
              {order.tax > 0 && (
                <div className="flex justify-between">
                  <dt className="text-ink-faint">Tax</dt>
                  <dd className="font-mono text-ink-dim">{formatPrice(order.tax)}</dd>
                </div>
              )}

              <div className="flex justify-between border-t border-line/60 pt-2 text-base">
                <dt className="font-semibold text-ink">Total</dt>
                <dd className="font-mono font-semibold text-ink">{formatPrice(order.total)}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
