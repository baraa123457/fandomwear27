"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, PackageOpen, Search, X } from "lucide-react";
import { StatusBadge } from "@/components/admin/status-badge";
import { DateRangeFilter } from "@/components/admin/date-range-filter";
import { Pagination } from "@/components/admin/pagination";
import { Dropdown } from "@/components/shared/dropdown";
import { Skeleton } from "@/components/shared/skeletons";
import { Button } from "@/components/ui/button";
import { useToast } from "@/context/toast-context";
import { formatPrice, getErrorMessage } from "@/lib/utils";
import { downloadCSV, ordersToCSV } from "@/lib/csv";
import { createClient } from "@/lib/supabase/client";
import { useCatalog } from "@/context/catalog-context";
import {
  getPresetRange,
  filterOrdersByRange,
  type DateRangePreset,
} from "@/lib/admin/dashboard-metrics";
import {
  fetchAllOrdersAdmin,
  updateOrderStatusAdmin,
  type AdminOrderStatus,
  type OrderWithItems,
} from "@/lib/supabase/queries/orders";

const statusOptions: AdminOrderStatus[] = ["processing", "shipped", "delivered", "cancelled"];
const statusFilterOptions = [
  { value: "all", label: "All statuses" },
  ...statusOptions.map((s) => ({ value: s, label: s[0].toUpperCase() + s.slice(1) })),
];
const paymentFilterOptions = [
  { value: "all", label: "All payments" },
  { value: "card", label: "Card" },
  { value: "cod", label: "Cash on delivery" },
];

type SortKey = "date_desc" | "date_asc" | "total_desc" | "total_asc" | "customer_asc" | "customer_desc";
const sortOptions: { value: SortKey; label: string }[] = [
  { value: "date_desc", label: "Newest first" },
  { value: "date_asc", label: "Oldest first" },
  { value: "total_desc", label: "Total: high to low" },
  { value: "total_asc", label: "Total: low to high" },
  { value: "customer_asc", label: "Customer: A–Z" },
  { value: "customer_desc", label: "Customer: Z–A" },
];

const PAGE_SIZE = 10;

export default function AdminOrdersPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { refreshSalesCounts, refreshProducts, restoreStock, deductStock } = useCatalog();
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loadStatus, setLoadStatus] = useState<"loading" | "ready" | "error">("loading");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<AdminOrderStatus | "all">("all");
  const [paymentFilter, setPaymentFilter] = useState<"all" | "card" | "cod">("all");
  const [datePreset, setDatePreset] = useState<DateRangePreset>("all");
  const [customRange, setCustomRange] = useState({ start: "", end: "" });
  const [sort, setSort] = useState<SortKey>("date_desc");
  const [page, setPage] = useState(1);

  const load = async () => {
    setLoadStatus("loading");
    try {
      const supabase = createClient();
      const rows = await fetchAllOrdersAdmin(supabase);
      setOrders(rows);
      setLoadStatus("ready");
    } catch (err) {
      console.error("[admin] Failed to load orders:", err);
      setLoadStatus("error");
      toast({ variant: "error", title: "Failed to load orders", description: getErrorMessage(err) });
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateStatus = async (id: string, status: AdminOrderStatus) => {
    const targetOrder = orders.find((o) => o.id === id);
    const previous = targetOrder?.status;
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
    try {
      const supabase = createClient();
      await updateOrderStatusAdmin(supabase, id, status);
      toast({ variant: "success", title: "Order updated", description: `${id} → ${status}` });
      if (status === "cancelled" && previous !== "cancelled" && targetOrder) {
        restoreStock(targetOrder.items.map((it) => ({ productId: it.productId, quantity: it.quantity })));
      } else if (previous === "cancelled" && status !== "cancelled" && targetOrder) {
        deductStock(targetOrder.items.map((it) => ({ productId: it.productId, quantity: it.quantity })));
      }
      if (status === "cancelled" || previous === "cancelled") {
        void refreshSalesCounts();
        void refreshProducts();
      }
    } catch (err) {
      console.error("[admin] Failed to update order status:", err);
      if (previous) setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status: previous } : o)));
      toast({ variant: "error", title: "Couldn't update order", description: getErrorMessage(err) });
    }
  };

  const dateRange = useMemo(() => getPresetRange(datePreset, customRange), [datePreset, customRange]);

  const filtered = useMemo(() => {
    let rows = filterOrdersByRange(orders, dateRange);

    if (statusFilter !== "all") rows = rows.filter((o) => o.status === statusFilter);
    if (paymentFilter !== "all") rows = rows.filter((o) => (o.paymentMethod ?? "card") === paymentFilter);

    const q = search.trim().toLowerCase();
    if (q) {
      rows = rows.filter(
        (o) =>
          o.id.toLowerCase().includes(q) ||
          o.email.toLowerCase().includes(q) ||
          o.shippingAddress.fullName.toLowerCase().includes(q)
      );
    }

    const sorted = [...rows];
    switch (sort) {
      case "date_asc":
        sorted.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        break;
      case "total_desc":
        sorted.sort((a, b) => b.total - a.total);
        break;
      case "total_asc":
        sorted.sort((a, b) => a.total - b.total);
        break;
      case "customer_asc":
        sorted.sort((a, b) => a.shippingAddress.fullName.localeCompare(b.shippingAddress.fullName));
        break;
      case "customer_desc":
        sorted.sort((a, b) => b.shippingAddress.fullName.localeCompare(a.shippingAddress.fullName));
        break;
      case "date_desc":
      default:
        sorted.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        break;
    }
    return sorted;
  }, [orders, dateRange, statusFilter, paymentFilter, search, sort]);

  // Any filter/search/sort change should snap back to page 1.
  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, paymentFilter, datePreset, customRange, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const clampedPage = Math.min(page, pageCount);
  const pageRows = filtered.slice((clampedPage - 1) * PAGE_SIZE, clampedPage * PAGE_SIZE);

  const activeFilterCount =
    (statusFilter !== "all" ? 1 : 0) + (paymentFilter !== "all" ? 1 : 0) + (datePreset !== "all" ? 1 : 0);

  const clearFilters = () => {
    setStatusFilter("all");
    setPaymentFilter("all");
    setDatePreset("all");
    setCustomRange({ start: "", end: "" });
    setSearch("");
  };

  const handleExportCSV = () => {
    if (filtered.length === 0) {
      toast({ variant: "error", title: "No orders to export" });
      return;
    }
    downloadCSV(`fandomwear-orders-${new Date().toISOString().slice(0, 10)}.csv`, ordersToCSV(filtered));
    toast({ variant: "success", title: "Orders exported", description: `${filtered.length} orders` });
  };

  const isLoading = loadStatus === "loading";
  const isError = loadStatus === "error";

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Orders</h1>
          <p className="mt-1 text-sm text-ink-faint">
            {isLoading ? "Loading…" : `${filtered.length} of ${orders.length} orders`}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExportCSV}>
          <Download className="h-3.5 w-3.5" /> Export CSV
        </Button>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search order ID, customer, email…"
            className="h-10 w-64 rounded-full border border-line bg-surface pl-10 pr-4 text-sm text-ink placeholder:text-ink-faint focus:border-accent-cyan focus:outline-none"
          />
        </div>
        <Dropdown
          value={statusFilter}
          options={statusFilterOptions}
          onChange={(v) => setStatusFilter(v as AdminOrderStatus | "all")}
          ariaLabel="Filter by status"
        />
        <Dropdown
          value={paymentFilter}
          options={paymentFilterOptions}
          onChange={(v) => setPaymentFilter(v as "all" | "card" | "cod")}
          ariaLabel="Filter by payment method"
        />
        <DateRangeFilter
          preset={datePreset}
          customStart={customRange.start}
          customEnd={customRange.end}
          onPresetChange={setDatePreset}
          onCustomChange={setCustomRange}
        />
        <Dropdown value={sort} options={sortOptions} onChange={(v) => setSort(v as SortKey)} ariaLabel="Sort orders" />
        {(activeFilterCount > 0 || search) && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="h-3.5 w-3.5" /> Clear
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="mt-6 space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : isError ? (
        <div className="mt-6 flex flex-col items-center gap-3 rounded-2xl border border-line py-16 text-center">
          <p className="text-sm text-ink-dim">Couldn&apos;t load orders.</p>
          <Button variant="outline" size="sm" onClick={() => void load()}>
            Try again
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="mt-6 flex flex-col items-center gap-2 rounded-2xl border border-line py-16 text-center">
          <PackageOpen className="h-6 w-6 text-ink-faint" />
          <p className="text-sm text-ink-dim">
            {orders.length === 0 ? "No orders yet." : "No orders match your search/filters."}
          </p>
        </div>
      ) : (
        <>
          <div className="mt-6 overflow-x-auto rounded-2xl border border-line">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead>
                <tr className="border-b border-line bg-surface text-xs uppercase tracking-wider text-ink-faint">
                  <th className="px-4 py-3 font-medium">Order</th>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Items</th>
                  <th className="px-4 py-3 font-medium">Payment</th>
                  <th className="px-4 py-3 font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((o) => {
                  const itemCount = o.items.reduce((sum, i) => sum + i.quantity, 0);
                  return (
                    <tr
                      key={o.id}
                      onClick={() => router.push(`/admin/orders/${o.id}`)}
                      className="cursor-pointer border-b border-line/60 transition-colors last:border-0 hover:bg-ink/5"
                    >
                      <td className="px-4 py-3 font-mono text-ink">{o.id}</td>
                      <td className="px-4 py-3">
                        <p className="text-ink">{o.shippingAddress.fullName}</p>
                        <p className="text-xs text-ink-faint">{o.email}</p>
                      </td>
                      <td className="px-4 py-3 text-ink-dim">
                        {new Date(o.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={o.status} />
                          <Dropdown
                            compact
                            ariaLabel={`Update status for ${o.id}`}
                            value={o.status}
                            options={statusOptions.map((s) => ({ value: s, label: s }))}
                            onChange={(status) => updateStatus(o.id, status)}
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-ink-dim">{itemCount}</td>
                      <td className="px-4 py-3 text-ink-dim">
                        {o.paymentMethod === "cod" ? "Cash on delivery" : "Card"}
                      </td>
                      <td className="px-4 py-3 font-mono text-ink">{formatPrice(o.total)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination
            page={clampedPage}
            pageCount={pageCount}
            totalItems={filtered.length}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  );
}
