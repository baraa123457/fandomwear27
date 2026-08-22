"use client";

import { useEffect, useState } from "react";
import {
  Bell,
  ShoppingCart,
  PackageX,
  AlertTriangle,
  Tag,
  Clock,
  RefreshCw,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface Notification {
  id: string;
  type: "new_order" | "low_stock" | "out_of_stock" | "expiring_discount" | "pending_orders";
  title: string;
  description: string;
  severity: "info" | "warning" | "error";
  time?: string;
}

/* ------------------------------------------------------------------ */
/* Data fetchers — all from real Supabase tables                       */
/* ------------------------------------------------------------------ */

async function fetchNotifications(): Promise<Notification[]> {
  const supabase = createClient();
  const notes: Notification[] = [];

  // ── 1. New orders (processing, created in last 24h)
  {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data } = await supabase
      .from("orders")
      .select("id, customer, created_at")
      .eq("status", "processing")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(20);

    (data ?? []).forEach((o) => {
      notes.push({
        id: `new_order_${o.id}`,
        type: "new_order",
        title: "New order received",
        description: `Order #${o.id.slice(0, 8).toUpperCase()} from ${o.customer}`,
        severity: "info",
        time: o.created_at,
      });
    });
  }

  // ── 2. Pending orders (processing status, any age — count)
  {
    const { count } = await supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("status", "processing");

    if ((count ?? 0) > 0) {
      notes.push({
        id: "pending_orders",
        type: "pending_orders",
        title: "Pending orders awaiting action",
        description: `${count} order${count === 1 ? "" : "s"} with status "processing" need to be shipped or updated.`,
        severity: "warning",
      });
    }
  }

  // ── 3. Low stock products (stock > 0 but ≤ low_stock_threshold)
  {
    const { data } = await supabase
      .from("products")
      .select("id, name, stock, low_stock_threshold")
      .eq("status", "active")
      .gt("stock", 0);

    (data ?? [])
      .filter((p) => p.stock <= (p.low_stock_threshold ?? 10))
      .forEach((p) => {
        notes.push({
          id: `low_stock_${p.id}`,
          type: "low_stock",
          title: "Low stock warning",
          description: `"${p.name}" — only ${p.stock} unit${p.stock === 1 ? "" : "s"} remaining (threshold: ${p.low_stock_threshold ?? 10})`,
          severity: "warning",
        });
      });
  }

  // ── 4. Out of stock products
  {
    const { data } = await supabase
      .from("products")
      .select("id, name")
      .eq("status", "active")
      .eq("stock", 0);

    (data ?? []).forEach((p) => {
      notes.push({
        id: `out_of_stock_${p.id}`,
        type: "out_of_stock",
        title: "Product out of stock",
        description: `"${p.name}" is out of stock and hidden from add-to-cart.`,
        severity: "error",
      });
    });
  }

  // ── 5. Expiring discounts (active, expiring within 7 days)
  {
    const now = new Date();
    const inSevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const { data } = await supabase
      .from("coupons")
      .select("id, code, expires")
      .eq("active", true)
      .lte("expires", inSevenDays)
      .gte("expires", now.toISOString().slice(0, 10));

    (data ?? []).forEach((c) => {
      const daysLeft = Math.ceil(
        (new Date(c.expires).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      notes.push({
        id: `expiring_${c.id}`,
        type: "expiring_discount",
        title: "Discount expiring soon",
        description: `Coupon "${c.code}" expires in ${daysLeft} day${daysLeft === 1 ? "" : "s"} (${c.expires}).`,
        severity: daysLeft <= 2 ? "error" : "warning",
        time: c.expires,
      });
    });
  }

  return notes;
}

/* ------------------------------------------------------------------ */
/* Icon map                                                            */
/* ------------------------------------------------------------------ */

const TYPE_CONFIG: Record<
  Notification["type"],
  { icon: React.ElementType; label: string }
> = {
  new_order: { icon: ShoppingCart, label: "New Order" },
  low_stock: { icon: AlertTriangle, label: "Low Stock" },
  out_of_stock: { icon: PackageX, label: "Out of Stock" },
  expiring_discount: { icon: Tag, label: "Expiring Discount" },
  pending_orders: { icon: Clock, label: "Pending Orders" },
};

const SEVERITY_STYLES: Record<Notification["severity"], string> = {
  info: "border-blue-500/30 bg-blue-500/5 text-blue-400",
  warning: "border-amber-500/30 bg-amber-500/5 text-amber-400",
  error: "border-red-500/30 bg-red-500/5 text-red-400",
};

/* ================================================================== */
/* Main page                                                           */
/* ================================================================== */

export default function AdminNotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const load = async () => {
    setLoading(true);
    try {
      const notes = await fetchNotifications();
      setNotifications(notes);
      setLastRefreshed(new Date());
    } catch (err) {
      console.error("[notifications] Failed to load:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const grouped = notifications.reduce<Record<Notification["severity"], Notification[]>>(
    (acc, n) => {
      acc[n.severity].push(n);
      return acc;
    },
    { error: [], warning: [], info: [] }
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-xl font-bold text-ink">Notifications</h1>
          <p className="mt-1 text-sm text-ink-faint">
            Live alerts from real database conditions. No fake data.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-ink-faint">
            Last refreshed: {lastRefreshed.toLocaleTimeString()}
          </span>
          <Button size="sm" variant="ghost" onClick={load} disabled={loading}>
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            {loading ? "Refreshing…" : "Refresh"}
          </Button>
        </div>
      </div>

      {/* Summary badges */}
      <div className="grid grid-cols-3 gap-3">
        {(["error", "warning", "info"] as const).map((s) => (
          <div
            key={s}
            className={cn(
              "rounded-xl border px-4 py-3 text-center",
              SEVERITY_STYLES[s]
            )}
          >
            <p className="font-display text-2xl font-bold">{grouped[s].length}</p>
            <p className="text-[10px] uppercase tracking-wider opacity-80">
              {s === "error" ? "Critical" : s === "warning" ? "Warnings" : "Info"}
            </p>
          </div>
        ))}
      </div>

      {/* Notification list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-16 w-full animate-pulse rounded-xl bg-surface-raised"
            />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 px-6 py-12 text-center">
          <Bell className="mx-auto h-8 w-8 text-emerald-400" />
          <p className="mt-3 font-medium text-emerald-400">All clear!</p>
          <p className="mt-1 text-xs text-ink-faint">
            No notifications right now. Everything looks good.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {(["error", "warning", "info"] as const).flatMap((severity) =>
            grouped[severity].map((n) => {
              const { icon: Icon, label } = TYPE_CONFIG[n.type];
              return (
                <div
                  key={n.id}
                  className={cn(
                    "flex items-start gap-4 rounded-xl border px-4 py-3",
                    SEVERITY_STYLES[severity]
                  )}
                >
                  <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-xs font-semibold">{n.title}</p>
                      <span className="shrink-0 rounded bg-current/10 px-1.5 py-0.5 text-[9px] uppercase tracking-wider opacity-70">
                        {label}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] opacity-80">{n.description}</p>
                    {n.time && (
                      <p className="mt-0.5 text-[10px] opacity-50">
                        {new Date(n.time).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
