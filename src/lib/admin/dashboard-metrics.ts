import type { OrderWithItems } from "@/lib/supabase/queries/orders";
import type { Product } from "@/lib/types";

/* ------------------------------------------------------------------ */
/* Date range                                                          */
/* ------------------------------------------------------------------ */

export type DateRangePreset =
  | "today"
  | "yesterday"
  | "7d"
  | "30d"
  | "90d"
  | "this_month"
  | "last_month"
  | "this_year"
  | "all"
  | "custom";

export interface DateRange {
  preset: DateRangePreset;
  /** Inclusive lower bound, or null for "no lower bound". */
  start: Date | null;
  /** Inclusive upper bound, or null for "no upper bound". */
  end: Date | null;
  label: string;
}

export const DATE_RANGE_PRESETS: { value: DateRangePreset; label: string }[] = [
  { value: "all", label: "All time" },
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "this_month", label: "This month" },
  { value: "last_month", label: "Last month" },
  { value: "custom", label: "Custom range" },
];

/**
 * The exact preset set the Analytics page's date-range filter exposes
 * (Today / 7d / 30d / 90d / This year / Custom) — a subset of the same
 * `DateRangePreset` values the dashboard uses, just a different menu.
 */
export const ANALYTICS_DATE_RANGE_PRESETS: { value: DateRangePreset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "this_year", label: "This year" },
  { value: "custom", label: "Custom range" },
];

function startOfDay(d: Date) {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

function endOfDay(d: Date) {
  const c = new Date(d);
  c.setHours(23, 59, 59, 999);
  return c;
}

/** Builds a concrete {start, end} window from a preset (or a custom pair of yyyy-mm-dd strings). */
export function getPresetRange(
  preset: DateRangePreset,
  custom?: { start: string; end: string }
): DateRange {
  const now = new Date();

  switch (preset) {
    case "today":
      return { preset, start: startOfDay(now), end: endOfDay(now), label: "Today" };
    case "yesterday": {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      return { preset, start: startOfDay(y), end: endOfDay(y), label: "Yesterday" };
    }
    case "7d": {
      const s = new Date(now);
      s.setDate(s.getDate() - 6);
      return { preset, start: startOfDay(s), end: endOfDay(now), label: "Last 7 days" };
    }
    case "30d": {
      const s = new Date(now);
      s.setDate(s.getDate() - 29);
      return { preset, start: startOfDay(s), end: endOfDay(now), label: "Last 30 days" };
    }
    case "90d": {
      const s = new Date(now);
      s.setDate(s.getDate() - 89);
      return { preset, start: startOfDay(s), end: endOfDay(now), label: "Last 90 days" };
    }
    case "this_year": {
      const s = new Date(now.getFullYear(), 0, 1);
      return { preset, start: s, end: endOfDay(now), label: "This year" };
    }
    case "this_month": {
      const s = new Date(now.getFullYear(), now.getMonth(), 1);
      return { preset, start: s, end: endOfDay(now), label: "This month" };
    }
    case "last_month": {
      const s = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const e = new Date(now.getFullYear(), now.getMonth(), 0);
      return { preset, start: s, end: endOfDay(e), label: "Last month" };
    }
    case "custom": {
      const s = custom?.start ? startOfDay(new Date(`${custom.start}T00:00:00`)) : null;
      const e = custom?.end ? endOfDay(new Date(`${custom.end}T00:00:00`)) : null;
      return { preset, start: s, end: e, label: "Custom range" };
    }
    case "all":
    default:
      return { preset: "all", start: null, end: null, label: "All time" };
  }
}

export function filterOrdersByRange(orders: OrderWithItems[], range: DateRange): OrderWithItems[] {
  if (!range.start && !range.end) return orders;
  return orders.filter((o) => {
    const d = new Date(o.date);
    if (range.start && d < range.start) return false;
    if (range.end && d > range.end) return false;
    return true;
  });
}

/* ------------------------------------------------------------------ */
/* Top-line stats                                                      */
/* ------------------------------------------------------------------ */

export interface DashboardStats {
  totalRevenue: number;
  orderCount: number;
  customerCount: number;
  avgOrderValue: number;
  totalCost: number;
  netProfit: number;
  profitMargin: number;
}

/**
 * Cancelled orders never happened as far as revenue/AOV/profit is concerned —
 * same convention as the `product_sales_counts` view (migration
 * 20260816000015) that powers Best Sellers. `orderCount` and
 * `customerCount` still count every order/customer in range, cancelled
 * or not, since those are "how much happened", not "how much did we earn".
 */
export function computeStats(
  orders: OrderWithItems[],
  productCostMap?: Map<string, number>
): DashboardStats {
  const settled = orders.filter((o) => o.status !== "cancelled");
  const totalRevenue = settled.reduce((sum, o) => sum + o.total, 0);
  const customerCount = new Set(orders.map((o) => o.email)).size;
  const avgOrderValue = settled.length ? totalRevenue / settled.length : 0;

  let totalCost = 0;
  if (productCostMap) {
    for (const o of settled) {
      for (const item of o.items) {
        const unitCost = productCostMap.get(item.productId) ?? 0;
        totalCost += unitCost * item.quantity;
      }
    }
  }

  const netProfit = totalRevenue - totalCost;
  const profitMargin = totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 1000) / 10 : 0;

  return {
    totalRevenue,
    orderCount: orders.length,
    customerCount,
    avgOrderValue,
    totalCost,
    netProfit,
    profitMargin,
  };
}


/* ------------------------------------------------------------------ */
/* Revenue trend                                                       */
/* ------------------------------------------------------------------ */

export interface RevenuePoint {
  label: string;
  revenue: number;
}

/** Buckets by day when the order spread fits in ~2 months, otherwise by month. */
export function computeRevenueSeries(orders: OrderWithItems[]): RevenuePoint[] {
  const settled = orders.filter((o) => o.status !== "cancelled");
  if (settled.length === 0) return [];

  const timestamps = settled.map((o) => new Date(o.date).getTime());
  const spanDays = (Math.max(...timestamps) - Math.min(...timestamps)) / 86_400_000;
  const byMonth = spanDays > 62;

  const buckets = new Map<string, { label: string; revenue: number }>();
  for (const o of settled) {
    const d = new Date(o.date);
    const key = byMonth
      ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
      : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const label = byMonth
      ? d.toLocaleDateString("en-US", { month: "short", year: "2-digit" })
      : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

    const existing = buckets.get(key);
    if (existing) existing.revenue += o.total;
    else buckets.set(key, { label, revenue: o.total });
  }

  return Array.from(buckets.keys())
    .sort()
    .map((key) => {
      const bucket = buckets.get(key)!;
      return { label: bucket.label, revenue: Math.round(bucket.revenue * 100) / 100 };
    });
}

/* ------------------------------------------------------------------ */
/* Orders over time                                                    */
/* ------------------------------------------------------------------ */

export interface OrdersPoint {
  label: string;
  orders: number;
}

/**
 * Buckets by day when the order spread fits in ~2 months, otherwise by
 * month. Counts every order regardless of status — "how many orders came
 * in", the same convention as `DashboardStats.orderCount`.
 */
export function computeOrdersSeries(orders: OrderWithItems[]): OrdersPoint[] {
  if (orders.length === 0) return [];

  const timestamps = orders.map((o) => new Date(o.date).getTime());
  const spanDays = (Math.max(...timestamps) - Math.min(...timestamps)) / 86_400_000;
  const byMonth = spanDays > 62;

  const buckets = new Map<string, OrdersPoint>();
  for (const o of orders) {
    const d = new Date(o.date);
    const key = byMonth
      ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
      : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const label = byMonth
      ? d.toLocaleDateString("en-US", { month: "short", year: "2-digit" })
      : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

    const existing = buckets.get(key);
    if (existing) existing.orders += 1;
    else buckets.set(key, { label, orders: 1 });
  }

  return Array.from(buckets.keys())
    .sort()
    .map((key) => buckets.get(key)!);
}

/* ------------------------------------------------------------------ */
/* Products sold                                                       */
/* ------------------------------------------------------------------ */

export interface ProductsSoldPoint {
  label: string;
  unitsSold: number;
}

/** Total real units sold (line-item quantities), cancelled orders excluded — they were never actually sold. */
export function computeTotalProductsSold(orders: OrderWithItems[]): number {
  const settled = orders.filter((o) => o.status !== "cancelled");
  return settled.reduce(
    (sum, o) => sum + o.items.reduce((s, item) => s + item.quantity, 0),
    0
  );
}

/** Same bucketing rule as `computeRevenueSeries`/`computeOrdersSeries`. */
export function computeProductsSoldSeries(orders: OrderWithItems[]): ProductsSoldPoint[] {
  const settled = orders.filter((o) => o.status !== "cancelled");
  if (settled.length === 0) return [];

  const timestamps = settled.map((o) => new Date(o.date).getTime());
  const spanDays = (Math.max(...timestamps) - Math.min(...timestamps)) / 86_400_000;
  const byMonth = spanDays > 62;

  const buckets = new Map<string, ProductsSoldPoint>();
  for (const o of settled) {
    const d = new Date(o.date);
    const key = byMonth
      ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
      : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const label = byMonth
      ? d.toLocaleDateString("en-US", { month: "short", year: "2-digit" })
      : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

    const unitsSold = o.items.reduce((s, item) => s + item.quantity, 0);
    const existing = buckets.get(key);
    if (existing) existing.unitsSold += unitsSold;
    else buckets.set(key, { label, unitsSold });
  }

  return Array.from(buckets.keys())
    .sort()
    .map((key) => buckets.get(key)!);
}

/* ------------------------------------------------------------------ */
/* Sales by category                                                   */
/* ------------------------------------------------------------------ */

export interface CategorySales {
  category: string;
  revenue: number;
  unitsSold: number;
  /** Share of total revenue, 0-100. */
  value: number;
}

/**
 * Order line items don't carry `category` (only `universe`) — it's looked
 * up from the live catalog by product id, same pattern the order-details
 * page uses to resolve a line item's real photo. A product that's since
 * been deleted falls back to "Uncategorized" rather than being dropped.
 */
export function computeSalesByCategory(
  orders: OrderWithItems[],
  categoryByProductId: Map<string, string>
): CategorySales[] {
  const settled = orders.filter((o) => o.status !== "cancelled");
  const totals = new Map<string, { revenue: number; unitsSold: number }>();
  let grandTotal = 0;

  for (const o of settled) {
    for (const item of o.items) {
      const category = categoryByProductId.get(item.productId) ?? "Uncategorized";
      const revenue = item.price * item.quantity;
      const existing = totals.get(category);
      if (existing) {
        existing.revenue += revenue;
        existing.unitsSold += item.quantity;
      } else {
        totals.set(category, { revenue, unitsSold: item.quantity });
      }
      grandTotal += revenue;
    }
  }

  if (grandTotal === 0) return [];

  return Array.from(totals.entries())
    .map(([category, t]) => ({
      category,
      revenue: t.revenue,
      unitsSold: t.unitsSold,
      value: Math.round((t.revenue / grandTotal) * 1000) / 10,
    }))
    .sort((a, b) => b.revenue - a.revenue);
}

/* ------------------------------------------------------------------ */
/* Sales by universe                                                   */
/* ------------------------------------------------------------------ */

export interface UniverseSales {
  universe: string;
  revenue: number;
  /** Share of total revenue, 0-100. */
  value: number;
}

export function computeSalesByUniverse(orders: OrderWithItems[]): UniverseSales[] {
  const settled = orders.filter((o) => o.status !== "cancelled");
  const totals = new Map<string, number>();
  let grandTotal = 0;

  for (const o of settled) {
    for (const item of o.items) {
      const revenue = item.price * item.quantity;
      totals.set(item.universe, (totals.get(item.universe) ?? 0) + revenue);
      grandTotal += revenue;
    }
  }

  if (grandTotal === 0) return [];

  return Array.from(totals.entries())
    .map(([universe, revenue]) => ({
      universe,
      revenue,
      value: Math.round((revenue / grandTotal) * 1000) / 10,
    }))
    .sort((a, b) => b.revenue - a.revenue);
}

/* ------------------------------------------------------------------ */
/* Top products                                                        */
/* ------------------------------------------------------------------ */

export interface TopProduct {
  productId: string;
  name: string;
  slug: string;
  universe: string;
  artIcon: string;
  unitsSold: number;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
}

/** Ranked purely by real units sold in the selected range — no manual pinning. */
export function computeTopProducts(
  orders: OrderWithItems[],
  limit = 5,
  productCostMap?: Map<string, number>
): TopProduct[] {
  const settled = orders.filter((o) => o.status !== "cancelled");
  const map = new Map<string, TopProduct>();

  for (const o of settled) {
    for (const item of o.items) {
      const unitCost = productCostMap?.get(item.productId) ?? 0;
      const cost = unitCost * item.quantity;
      const revenue = item.price * item.quantity;
      const existing = map.get(item.productId);

      if (existing) {
        existing.unitsSold += item.quantity;
        existing.revenue += revenue;
        existing.cost += cost;
        existing.profit = existing.revenue - existing.cost;
        existing.margin = existing.revenue > 0 ? Math.round((existing.profit / existing.revenue) * 100) : 0;
      } else {
        const profit = revenue - cost;
        const margin = revenue > 0 ? Math.round((profit / revenue) * 100) : 0;
        map.set(item.productId, {
          productId: item.productId,
          name: item.name,
          slug: item.slug,
          universe: item.universe,
          artIcon: item.artIcon,
          unitsSold: item.quantity,
          revenue,
          cost,
          profit,
          margin,
        });
      }
    }
  }

  return Array.from(map.values())
    .sort((a, b) => b.unitsSold - a.unitsSold)
    .slice(0, limit);
}


/* ------------------------------------------------------------------ */
/* Low stock                                                           */
/* ------------------------------------------------------------------ */

export interface LowStockProduct {
  id: string;
  name: string;
  slug: string;
  universe: string;
  artIcon: string;
  stock: number;
  status: "out" | "low";
}

/** Threshold is caller-supplied (dashboard exposes it as an adjustable control), not hardcoded. */
export function computeLowStock(products: Product[], threshold: number): LowStockProduct[] {
  return products
    .filter((p) => p.stock <= threshold)
    .map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      universe: p.universe,
      artIcon: p.artIcon,
      stock: p.stock,
      status: p.stock === 0 ? ("out" as const) : ("low" as const),
    }))
    .sort((a, b) => a.stock - b.stock);
}
