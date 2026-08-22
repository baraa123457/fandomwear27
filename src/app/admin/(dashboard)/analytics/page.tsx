"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
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
  TrendingUp,
  PackageCheck,
  AlertTriangle,
  RefreshCw,
  Trophy,
  Shapes,
  Globe2,
  Receipt,
  Percent,
} from "lucide-react";


import { StatCard } from "@/components/admin/stat-card";
import { DateRangeFilter } from "@/components/admin/date-range-filter";
import { Skeleton } from "@/components/shared/skeletons";
import { Button } from "@/components/ui/button";
import { useCatalog } from "@/context/catalog-context";
import { useToast } from "@/context/toast-context";
import { createClient } from "@/lib/supabase/client";
import { fetchAllOrdersAdmin, type OrderWithItems } from "@/lib/supabase/queries/orders";
import { formatPrice } from "@/lib/utils";
import {
  ANALYTICS_DATE_RANGE_PRESETS,
  getPresetRange,
  filterOrdersByRange,
  computeStats,
  computeRevenueSeries,
  computeOrdersSeries,
  computeProductsSoldSeries,
  computeTotalProductsSold,
  computeSalesByCategory,
  computeSalesByUniverse,
  computeTopProducts,
  type DateRangePreset,
} from "@/lib/admin/dashboard-metrics";

const PALETTE = ["#7C5CFF", "#3ED5D0", "#FF6B9D", "#FFB84C", "#5CB8FF", "#9AE87C", "#FF8A5C", "#C792EA"];

export default function AdminAnalyticsPage() {
  const { toast } = useToast();
  const { products, universes } = useCatalog();

  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");

  const [preset, setPreset] = useState<DateRangePreset>("30d");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const loadOrders = async () => {
    setStatus("loading");
    try {
      const supabase = createClient();
      const rows = await fetchAllOrdersAdmin(supabase);
      setOrders(rows);
      setStatus("ready");
    } catch (err) {
      console.error("[admin] Failed to load analytics orders:", err);
      setStatus("error");
      toast({ variant: "error", title: "Failed to load analytics data" });
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

  const categoryByProductId = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of products) map.set(p.id, p.category);
    return map;
  }, [products]);

  const productCostMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of products) {
      if (p.costPrice !== undefined && !Number.isNaN(p.costPrice)) {
        map.set(p.id, p.costPrice);
      }
    }
    return map;
  }, [products]);

  const stats = useMemo(() => computeStats(filteredOrders, productCostMap), [filteredOrders, productCostMap]);
  const totalProductsSold = useMemo(() => computeTotalProductsSold(filteredOrders), [filteredOrders]);

  const revenueSeries = useMemo(() => computeRevenueSeries(filteredOrders), [filteredOrders]);
  const ordersSeries = useMemo(() => computeOrdersSeries(filteredOrders), [filteredOrders]);
  const productsSoldSeries = useMemo(() => computeProductsSoldSeries(filteredOrders), [filteredOrders]);

  const categorySales = useMemo(
    () => computeSalesByCategory(filteredOrders, categoryByProductId),
    [filteredOrders, categoryByProductId]
  );
  const universeSales = useMemo(() => computeSalesByUniverse(filteredOrders), [filteredOrders]);
  const topProducts = useMemo(() => computeTopProducts(filteredOrders, 5, productCostMap), [filteredOrders, productCostMap]);


  const universeMeta = (id: string) => universes.find((u) => u.id === id);

  const universePieData = universeSales.map((s) => ({
    ...s,
    label: universeMeta(s.universe)?.label ?? s.universe,
    color: universeMeta(s.universe)?.color ?? "#7C5CFF",
  }));

  const categoryBarData = categorySales
    .slice(0, 8)
    .map((c, i) => ({ ...c, color: PALETTE[i % PALETTE.length] }));

  const isLoading = status === "loading";
  const isError = status === "error";

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Analytics</h1>
          <p className="mt-1 text-sm text-ink-faint">Real sales performance, computed live from your orders.</p>
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
          presets={ANALYTICS_DATE_RANGE_PRESETS}
        />
      </div>

      {isError && (
        <div className="mt-6 flex flex-col items-start gap-3 rounded-2xl border border-accent-red/30 bg-accent-red/5 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0 text-accent-red" />
            <p className="text-sm text-ink">
              Couldn&apos;t load analytics data from the database. Your store data is safe — this is just a
              connection issue.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={loadOrders}>
            <RefreshCw className="h-3.5 w-3.5" /> Retry
          </Button>
        </div>
      )}

      {isLoading ? (
        <AnalyticsSkeleton />
      ) : (
        <>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <StatCard label="Revenue" value={formatPrice(stats.totalRevenue)} icon={DollarSign} />
            <StatCard label="COGS / Cost" value={formatPrice(stats.totalCost)} icon={Receipt} />
            <StatCard
              label="Net Profit"
              value={formatPrice(stats.netProfit)}
              icon={TrendingUp}
              trend={stats.totalCost > 0 ? { value: `${stats.profitMargin}% margin`, positive: stats.netProfit >= 0 } : undefined}
            />
            <StatCard label="Profit margin" value={`${stats.profitMargin}%`} icon={Percent} />
            <StatCard label="Orders" value={String(stats.orderCount)} icon={ShoppingCart} />
            <StatCard label="Products sold" value={String(totalProductsSold)} icon={PackageCheck} />
          </div>


          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <ChartPanel title="Revenue over time">
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
                    <XAxis dataKey="label" stroke="#6b6b73" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis
                      stroke="#6b6b73"
                      fontSize={11}
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
            </ChartPanel>

            <ChartPanel title="Orders over time">
              {ordersSeries.length === 0 ? (
                <EmptyPanel message="No orders in this range yet" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ordersSeries}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2a30" vertical={false} />
                    <XAxis dataKey="label" stroke="#6b6b73" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis
                      stroke="#6b6b73"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{ background: "#131316", border: "1px solid #2a2a30", borderRadius: 12, fontSize: 12 }}
                      labelStyle={{ color: "#f5f5f2" }}
                      formatter={(value) => [String(value), "Orders"]}
                    />
                    <Bar dataKey="orders" fill="#3ED5D0" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartPanel>

            <ChartPanel title="Products sold over time">
              {productsSoldSeries.length === 0 ? (
                <EmptyPanel message="No units sold in this range yet" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={productsSoldSeries}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2a30" vertical={false} />
                    <XAxis dataKey="label" stroke="#6b6b73" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis
                      stroke="#6b6b73"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{ background: "#131316", border: "1px solid #2a2a30", borderRadius: 12, fontSize: 12 }}
                      labelStyle={{ color: "#f5f5f2" }}
                      formatter={(value) => [String(value), "Units sold"]}
                    />
                    <Bar dataKey="unitsSold" fill="#FFB84C" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartPanel>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ChartPanel title="Sales by category">
              {categoryBarData.length === 0 ? (
                <EmptyPanel message="No sales data yet" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryBarData} layout="vertical" margin={{ left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2a30" horizontal={false} />
                    <XAxis
                      type="number"
                      stroke="#6b6b73"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `$${v >= 1000 ? `${v / 1000}k` : v}`}
                    />
                    <YAxis
                      type="category"
                      dataKey="category"
                      stroke="#6b6b73"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      width={110}
                    />
                    <Tooltip
                      contentStyle={{ background: "#131316", border: "1px solid #2a2a30", borderRadius: 12, fontSize: 12 }}
                      labelStyle={{ color: "#f5f5f2" }}
                      formatter={(value, _name, props) => {
                        const pct = (props as { payload?: { value?: number } })?.payload?.value ?? 0;
                        return [`${formatPrice(Number(value))} (${pct}%)`, "Revenue"];
                      }}
                    />
                    <Bar dataKey="revenue" radius={[0, 6, 6, 0]}>
                      {categoryBarData.map((entry) => (
                        <Cell key={entry.category} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartPanel>

            <ChartPanel title="Sales by universe">
              {universePieData.length === 0 ? (
                <EmptyPanel message="No sales data yet" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={universePieData} dataKey="value" nameKey="label" innerRadius={55} outerRadius={85} paddingAngle={2}>
                      {universePieData.map((entry) => (
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
            </ChartPanel>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <RankedListPanel
              title="Top products"
              icon={Trophy}
              empty="No sales in this range yet."
              items={topProducts.map((p) => ({
                key: p.productId,
                name: p.name,
                sub: p.cost > 0
                  ? `${p.unitsSold} sold · Profit: ${formatPrice(p.profit)} (${p.margin}%)`
                  : `${p.unitsSold} sold`,
                value: formatPrice(p.revenue),
              }))}
            />


            <RankedListPanel
              title="Top categories"
              icon={Shapes}
              empty="No sales in this range yet."
              items={categorySales.slice(0, 5).map((c) => ({
                key: c.category,
                name: c.category,
                sub: `${c.unitsSold} sold · ${c.value}% of revenue`,
                value: formatPrice(c.revenue),
              }))}
            />

            <RankedListPanel
              title="Top universes"
              icon={Globe2}
              empty="No sales in this range yet."
              items={universeSales.slice(0, 5).map((u) => ({
                key: u.universe,
                name: universeMeta(u.universe)?.label ?? u.universe,
                sub: `${u.value}% of revenue`,
                value: formatPrice(u.revenue),
              }))}
            />
          </div>
        </>
      )}
    </div>
  );
}

function ChartPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-6">
      <h2 className="font-display text-sm font-bold uppercase tracking-wider text-ink">{title}</h2>
      <div className="mt-4 h-72">{children}</div>
    </div>
  );
}

function RankedListPanel({
  title,
  icon: Icon,
  items,
  empty,
}: {
  title: string;
  icon: typeof Trophy;
  items: { key: string; name: string; sub: string; value: string }[];
  empty: string;
}) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-6">
      <h2 className="flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wider text-ink">
        <Icon className="h-4 w-4 text-accent-purple" /> {title}
      </h2>
      {items.length === 0 ? (
        <p className="mt-6 text-center text-sm text-ink-faint">{empty}</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {items.map((item, i) => (
            <li key={item.key} className="flex items-center gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-purple/15 text-xs font-bold text-accent-purple">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">{item.name}</p>
                <p className="truncate text-xs text-ink-faint">{item.sub}</p>
              </div>
              <span className="shrink-0 text-sm font-semibold text-ink">{item.value}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EmptyPanel({ message }: { message: string }) {
  return <div className="flex h-full items-center justify-center text-sm text-ink-faint">{message}</div>;
}

function AnalyticsSkeleton() {
  return (
    <div className="mt-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full" />
        ))}
      </div>
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Skeleton className="h-80 w-full" />
        <Skeleton className="h-80 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Skeleton className="h-80 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  );
}
