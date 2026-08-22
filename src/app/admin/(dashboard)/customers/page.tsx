"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Users, X } from "lucide-react";
import { Dropdown } from "@/components/shared/dropdown";
import { Skeleton } from "@/components/shared/skeletons";
import { Pagination } from "@/components/admin/pagination";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { fetchAdminCustomers, type AdminCustomer } from "@/lib/supabase/queries/customers";
import { useToast } from "@/context/toast-context";
import { formatPrice, getErrorMessage } from "@/lib/utils";

type SortKey = "joined_desc" | "joined_asc" | "spent_desc" | "spent_asc" | "orders_desc" | "name_asc";
const sortOptions: { value: SortKey; label: string }[] = [
  { value: "joined_desc", label: "Newest customers" },
  { value: "joined_asc", label: "Oldest customers" },
  { value: "spent_desc", label: "Total spent: high to low" },
  { value: "spent_asc", label: "Total spent: low to high" },
  { value: "orders_desc", label: "Most orders" },
  { value: "name_asc", label: "Name: A–Z" },
];

const PAGE_SIZE = 12;

export default function AdminCustomersPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [customers, setCustomers] = useState<AdminCustomer[]>([]);
  const [loadStatus, setLoadStatus] = useState<"loading" | "ready" | "error">("loading");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("joined_desc");
  const [page, setPage] = useState(1);

  const load = async () => {
    setLoadStatus("loading");
    try {
      const supabase = createClient();
      const rows = await fetchAdminCustomers(supabase);
      setCustomers(rows);
      setLoadStatus("ready");
    } catch (err) {
      console.error("[admin] Failed to load customers:", err);
      setLoadStatus("error");
      toast({ variant: "error", title: "Failed to load customers", description: getErrorMessage(err) });
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = q
      ? customers.filter((c) => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q))
      : customers;

    rows = [...rows];
    switch (sort) {
      case "joined_asc":
        rows.sort((a, b) => new Date(a.joined).getTime() - new Date(b.joined).getTime());
        break;
      case "spent_desc":
        rows.sort((a, b) => b.totalSpent - a.totalSpent);
        break;
      case "spent_asc":
        rows.sort((a, b) => a.totalSpent - b.totalSpent);
        break;
      case "orders_desc":
        rows.sort((a, b) => b.orders - a.orders);
        break;
      case "name_asc":
        rows.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "joined_desc":
      default:
        rows.sort((a, b) => new Date(b.joined).getTime() - new Date(a.joined).getTime());
        break;
    }
    return rows;
  }, [customers, search, sort]);

  useEffect(() => {
    setPage(1);
  }, [search, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const clampedPage = Math.min(page, pageCount);
  const pageRows = filtered.slice((clampedPage - 1) * PAGE_SIZE, clampedPage * PAGE_SIZE);

  const isLoading = loadStatus === "loading";
  const isError = loadStatus === "error";

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Customers</h1>
          <p className="mt-1 text-sm text-ink-faint">
            {isLoading ? "Loading…" : `${filtered.length} of ${customers.length} customers`}
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or email…"
            className="h-10 w-64 rounded-full border border-line bg-surface pl-10 pr-4 text-sm text-ink placeholder:text-ink-faint focus:border-accent-cyan focus:outline-none"
          />
        </div>
        <Dropdown value={sort} options={sortOptions} onChange={(v) => setSort(v as SortKey)} ariaLabel="Sort customers" />
        {search && (
          <Button variant="ghost" size="sm" onClick={() => setSearch("")}>
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
          <p className="text-sm text-ink-dim">Couldn&apos;t load customers.</p>
          <Button variant="outline" size="sm" onClick={() => void load()}>
            Try again
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="mt-6 flex flex-col items-center gap-2 rounded-2xl border border-line py-16 text-center">
          <Users className="h-6 w-6 text-ink-faint" />
          <p className="text-sm text-ink-dim">
            {customers.length === 0 ? "No customers yet." : "No customers match your search."}
          </p>
        </div>
      ) : (
        <>
          <div className="mt-6 overflow-x-auto rounded-2xl border border-line">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-line bg-surface text-xs uppercase tracking-wider text-ink-faint">
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Orders</th>
                  <th className="px-4 py-3 font-medium">Total spent</th>
                  <th className="px-4 py-3 font-medium">Joined</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => router.push(`/admin/customers/${encodeURIComponent(c.email)}`)}
                    className="cursor-pointer border-b border-line/60 transition-colors last:border-0 hover:bg-ink/5"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-ink">{c.name}</p>
                      <p className="text-xs text-ink-faint">{c.email}</p>
                    </td>
                    <td className="px-4 py-3 text-ink-dim">{c.orders}</td>
                    <td className="px-4 py-3 font-mono text-ink">{formatPrice(c.totalSpent)}</td>
                    <td className="px-4 py-3 text-ink-dim">
                      {new Date(c.joined).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                    </td>
                  </tr>
                ))}
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
