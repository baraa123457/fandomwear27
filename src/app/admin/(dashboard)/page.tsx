"use client";

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
import { DollarSign, ShoppingCart, Users, TrendingUp } from "lucide-react";
import { StatCard } from "@/components/admin/stat-card";
import { HeroProductsSection } from "@/components/admin/hero-products-section";
import { getAnalytics } from "@/lib/data/admin";
import { useCatalog } from "@/context/catalog-context";
import { formatPrice } from "@/lib/utils";

export default function AdminDashboardPage() {
  const { totalRevenue, totalOrders, avgOrderValue, totalCustomers, revenueByMonth, salesByUniverse } =
    getAnalytics();
  const { universes } = useCatalog();

  const pieData = salesByUniverse.map((s) => ({
    ...s,
    color: universes.find((u) => u.label === s.universe || u.label.includes(s.universe))?.color ?? "#7C5CFF",
  }));

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-ink">Dashboard</h1>
      <p className="mt-1 text-sm text-ink-faint">Store performance at a glance.</p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total revenue" value={formatPrice(totalRevenue)} icon={DollarSign} trend={{ value: "12.4%", positive: true }} />
        <StatCard label="Orders" value={String(totalOrders)} icon={ShoppingCart} trend={{ value: "8.1%", positive: true }} />
        <StatCard label="Customers" value={String(totalCustomers)} icon={Users} trend={{ value: "3.2%", positive: true }} />
        <StatCard label="Avg. order value" value={formatPrice(avgOrderValue)} icon={TrendingUp} trend={{ value: "1.5%", positive: false }} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px]">
        <div className="rounded-2xl border border-line bg-surface p-6">
          <h2 className="font-display text-sm font-bold uppercase tracking-wider text-ink">
            Revenue trend
          </h2>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueByMonth}>
                <defs>
                  <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7C5CFF" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#7C5CFF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a30" vertical={false} />
                <XAxis dataKey="month" stroke="#6b6b73" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#6b6b73" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v / 1000}k`} />
                <Tooltip
                  contentStyle={{ background: "#131316", border: "1px solid #2a2a30", borderRadius: 12, fontSize: 12 }}
                  labelStyle={{ color: "#f5f5f2" }}
                  formatter={(value) => [formatPrice(Number(value)), "Revenue"]}
                />
                <Area type="monotone" dataKey="revenue" stroke="#7C5CFF" strokeWidth={2} fill="url(#revenueFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-6">
          <h2 className="font-display text-sm font-bold uppercase tracking-wider text-ink">
            Sales by universe
          </h2>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="universe" innerRadius={55} outerRadius={85} paddingAngle={2}>
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
          </div>
        </div>
      </div>

      <HeroProductsSection />
    </div>
  );
}
