"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  DollarSign,
  ShoppingCart,
  Users,
  TrendingUp,
  Package,
  AlertTriangle,
  RefreshCw,
  Trophy,
} from "lucide-react";
import { StatCard } from "@/components/admin/stat-card";
import { StatusBadge } from "@/components/admin/status-badge";
import { HeroProductsSection } from "@/components/admin/hero-products-section";
import { DateRangeFilter } from "@/components/admin/date-range-filter";
import { Skeleton } from "@/components/shared/skeletons";
import { Button } from "@/components/ui/button";
import { useCatalog } from "@/context/catalog-context";
import { useToast } from "@/context/toast-context";
import { createClient } from "@/lib/supabase/client";
import { fetchAllOrdersAdmin, type OrderWithItems } from "@/lib/supabase/queries/orders";
import { formatPrice, cn } from "@/lib/utils";
import {
  getPresetRange,
  filterOrdersByRange,
  computeStats,
  computeRevenueSeries,
  computeSalesByUniverse,
  computeTopProducts,
  computeLowStock,
  type DateRangePreset,
} from "@/lib/admin/dashboard-metrics";

const DEFAULT_LOW_STOCK_THRESHOLD = 10;

export default function AdminDashboardPage() {
  const { toast } = useToast();
  const { products, universes } = useCatalog();

  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");

  const [preset, setPreset] = useState<DateRangePreset>("all");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [threshold, setThreshold] = useState(DEFAULT_LOW_STOCK_THRESHOLD);

  const loadOrders = async () => {
    setStatus("loading");
    try {
      const supabase = createClient();
      const rows = await fetchAllOrdersAdmin(supabase);
      setOrders(rows);
      setStatus("ready");
    } catch (err) {
      console.error("[admin] Failed to load dashboard orders:", err);
      setStatus("error");
      toast({ variant: "error", title: "Failed to load dashboard data" });
    }
  };

  useEffect(() => {
    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const range = useMemo(
    () => getPresetRange(preset, { start: customStart, end: customEnd }),
    [preset, customStart, customEnd]
  );

  const filteredOrders = useMemo(() => filterOrdersByRange(orders, range), [orders, range]);

  const stats = useMemo(() => computeStats(filteredOrders), [filteredOrders]);
  const revenueSeries = useMemo(() => computeRevenueSeries(filteredOrders), [filteredOrders]);
  const universeSales = useMemo(() => computeSalesByUniverse(filteredOrders), [filteredOrders]);
  const topProducts = useMemo(() => computeTopProducts(filteredOrders, 5), [filteredOrders]);
  const lowStock = useMemo(() => computeLowStock(products, threshold), [products, threshold]);

  const recentOrders = useMemo(
    () =>
      [...filteredOrders]
        .sort((a, b) => +new Date(b.date) - +new Date(a.date))
        .slice(0, 8),
    [filteredOrders]
  );

  const universeMeta = (id: string) => universes.find((u) => u.id === id);

  const pieData = universeSales.map((s) => ({
    ...s,
    label: universeMeta(s.universe)?.label ?? s.universe,
    color: universeMeta(s.universe)?.color ?? "#7C5CFF",
  }));

  const isLoading = status === "loading";
  const isError = status === "error";

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Dashboard</h1>
          <p className="mt-1 text-sm text-ink-faint">Store performance at a glance.</p>
        </div>
        <DateRangeFilter
          preset={preset}
          customStart={customStart}
          customEnd={customEnd}
          onPresetChange={setPreset}
          onCustomChange={({ start, end }) => {
            setCustomStart(start);
            setCustomEnd(end);
          }}
        />
      </div>

      {isError && (
        <div className="mt-6 flex flex-col items-start gap-3 rounded-2xl border border-accent-red/30 bg-accent-red/5 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0 text-accent-red" />
            <p className="text-sm text-ink">
              Couldn&apos;t load dashboard data from the database. Your store data is safe — this is just a
              connection issue.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={loadOrders}>
            <RefreshCw className="h-3.5 w-3.5" /> Retry
          </Button>
        </div>
      )}

      {isLoading ? (
        <DashboardSkeleton />
      ) : (
        <>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <StatCard label="Total revenue" value={formatPrice(stats.totalRevenue)} icon={DollarSign} />
            <StatCard label="Orders" value={String(stats.orderCount)} icon={ShoppingCart} />
            <StatCard label="Customers" value={String(stats.customerCount)} icon={Users} />
            <StatCard label="Products" value={String(products.length)} icon={Package} />
            <StatCard label="Avg. order value" value={formatPrice(stats.avgOrderValue)} icon={TrendingUp} />
            <StatCard
              label="Low stock"
              value={String(lowStock.length)}
              icon={AlertTriangle}
              trend={lowStock.length > 0 ? { value: "needs attention", positive: false } : undefined}
            />
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px]">
            <div className="rounded-2xl border border-line bg-surface p-6">
              <h2 className="font-display text-sm font-bold uppercase tracking-wider text-ink">
                Revenue trend
              </h2>
              <div className="mt-4 h-72">
                {revenueSeries.length === 0 ? (
                  <EmptyPanel message="No sales data yet" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={revenueSeries}>
                      <defs>
                        <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#7C5CFF" stopOpacity={0.4} />
                          <stop offset="100%" stopColor="#7C5CFF" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2a2a30" vertical={false} />
                      <XAxis dataKey="label" stroke="#6b6b73" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis
                        stroke="#6b6b73"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => `$${v >= 1000 ? `${v / 1000}k` : v}`}
                      />
                      <Tooltip
                        contentStyle={{ background: "#131316", border: "1px solid #2a2a30", borderRadius: 12, fontSize: 12 }}
                        labelStyle={{ color: "#f5f5f2" }}
                        formatter={(value) => [formatPrice(Number(value)), "Revenue"]}
                      />
                      <Area type="monotone" dataKey="revenue" stroke="#7C5CFF" strokeWidth={2} fill="url(#revenueFill)" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-line bg-surface p-6">
              <h2 className="font-display text-sm font-bold uppercase tracking-wider text-ink">
                Sales by universe
              </h2>
              <div className="mt-4 h-72">
                {pieData.length === 0 ? (
                  <EmptyPanel message="No sales data yet" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} dataKey="value" nameKey="label" innerRadius={55} outerRadius={85} paddingAngle={2}>
                        {pieData.map((entry) => (
                          <Cell key={entry.universe} fill={entry.color} stroke="none" />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ background: "#131316", border: "1px solid #2a2a30", borderRadius: 12, fontSize: 12 }}
                        formatter={(value, name) => [`${value}%`, String(name)]}
                      />
                      <Legend
                        wrapperStyle={{ fontSize: 11, color: "#a3a3ab" }}
                        formatter={(value: string) => <span style={{ color: "#a3a3ab" }}>{value}</span>}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px]">
            <div className="rounded-2xl border border-line bg-surface p-6">
              <h2 className="font-display text-sm font-bold uppercase tracking-wider text-ink">Recent orders</h2>
              {recentOrders.length === 0 ? (
                <p className="mt-6 text-center text-sm text-ink-faint">No orders in this range yet.</p>
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[520px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-line text-xs uppercase tracking-wider text-ink-faint">
                        <th className="px-2 py-2 font-medium">Order</th>
                        <th className="px-2 py-2 font-medium">Customer</th>
                        <th className="px-2 py-2 font-medium">Date</th>
                        <th className="px-2 py-2 font-medium">Status</th>
                        <th className="px-2 py-2 text-right font-medium">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentOrders.map((o) => (
                        <tr key={o.id} className="border-b border-line/60 last:border-0">
                          <td className="px-2 py-3 font-medium text-ink">{o.id}</td>
                          <td className="px-2 py-3 text-ink-dim">{o.shippingAddress.fullName}</td>
                          <td className="px-2 py-3 text-ink-faint">
                            {new Date(o.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </td>
                          <td className="px-2 py-3">
                            <StatusBadge status={o.status} />
                          </td>
                          <td className="px-2 py-3 text-right font-medium text-ink">{formatPrice(o.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-line bg-surface p-6">
              <h2 className="flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wider text-ink">
                <Trophy className="h-4 w-4 text-accent-purple" /> Top products
              </h2>
              {topProducts.length === 0 ? (
                <p className="mt-6 text-center text-sm text-ink-faint">No sales in this range yet.</p>
              ) : (
                <ul className="mt-4 flex flex-col gap-3">
                  {topProducts.map((p, i) => (
                    <li key={p.productId} className="flex items-center gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-purple/15 text-xs font-bold text-accent-purple">
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink">{p.name}</p>
                        <p className="text-xs text-ink-faint">{p.unitsSold} sold</p>
                      </div>
                      <span className="shrink-0 text-sm font-semibold text-ink">{formatPrice(p.revenue)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-line bg-surface p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wider text-ink">
                <AlertTriangle className="h-4 w-4 text-amber-400" /> Low stock
              </h2>
              <label className="flex items-center gap-2 text-xs text-ink-faint">
                Threshold
                <input
                  type="number"
                  min={0}
                  value={threshold}
                  onChange={(e) => setThreshold(Math.max(0, Number(e.target.value) || 0))}
                  className="h-8 w-16 rounded-lg border border-line bg-void px-2 text-center text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan"
                  aria-label="Low stock threshold"
                />
                units
              </label>
            </div>
            {lowStock.length === 0 ? (
              <p className="mt-6 text-center text-sm text-ink-faint">
                Every product is above the {threshold}-unit threshold.
              </p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[420px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-line text-xs uppercase tracking-wider text-ink-faint">
                      <th className="px-2 py-2 font-medium">Product</th>
                      <th className="px-2 py-2 font-medium">Universe</th>
                      <th className="px-2 py-2 font-medium">Stock</th>
                      <th className="px-2 py-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lowStock.map((p) => (
                      <tr key={p.id} className="border-b border-line/60 last:border-0">
                        <td className="px-2 py-3 font-medium text-ink">{p.name}</td>
                        <td className="px-2 py-3 text-ink-dim">{universeMeta(p.universe)?.label ?? p.universe}</td>
                        <td className={cn("px-2 py-3 font-semibold", p.stock === 0 ? "text-accent-red" : "text-amber-400")}>
                          {p.stock}
                        </td>
                        <td className="px-2 py-3">
                          <StatusBadge status={p.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      <HeroProductsSection />
    </div>
  );
}

function EmptyPanel({ message }: { message: string }) {
  return <div className="flex h-full items-center justify-center text-sm text-ink-faint">{message}</div>;
}

function DashboardSkeleton() {
  return (
    <div className="mt-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full" />
        ))}
      </div>
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px]">
        <Skeleton className="h-96 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px]">
        <Skeleton className="h-72 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    </div>
  );
}
