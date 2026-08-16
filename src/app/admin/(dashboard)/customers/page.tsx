"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { fetchAdminCustomers, type AdminCustomer } from "@/lib/supabase/queries/customers";
import { useToast } from "@/context/toast-context";
import { formatPrice } from "@/lib/utils";

export default function AdminCustomersPage() {
  const { toast } = useToast();
  const [customers, setCustomers] = useState<AdminCustomer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const rows = await fetchAdminCustomers(supabase);
        if (!cancelled) setCustomers(rows);
      } catch (err) {
        console.error("[admin] Failed to load customers:", err);
        if (!cancelled) toast({ variant: "error", title: "Failed to load customers" });
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [toast]);

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-ink">Customers</h1>
      <p className="mt-1 text-sm text-ink-faint">{isLoading ? "Loading…" : `${customers.length} customers`}</p>

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
            {customers.map((c) => (
              <tr key={c.id} className="border-b border-line/60 last:border-0">
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
    </div>
  );
}
