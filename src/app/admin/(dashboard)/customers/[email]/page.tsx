"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Mail, MapPin, Package, User } from "lucide-react";
import { StatusBadge } from "@/components/admin/status-badge";
import { Skeleton } from "@/components/shared/skeletons";
import { Button } from "@/components/ui/button";
import { useToast } from "@/context/toast-context";
import { formatPrice, getErrorMessage } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { fetchAdminCustomerByEmail, type AdminCustomer } from "@/lib/supabase/queries/customers";
import { fetchOrdersByEmailAdmin, type OrderWithItems } from "@/lib/supabase/queries/orders";

export default function AdminCustomerDetailsPage() {
  const params = useParams<{ email: string }>();
  const email = decodeURIComponent(params.email);
  const router = useRouter();
  const { toast } = useToast();

  const [customer, setCustomer] = useState<AdminCustomer | null>(null);
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loadStatus, setLoadStatus] = useState<"loading" | "ready" | "error" | "not_found">("loading");

  const load = async () => {
    setLoadStatus("loading");
    try {
      const supabase = createClient();
      const [customerRow, orderRows] = await Promise.all([
        fetchAdminCustomerByEmail(supabase, email),
        fetchOrdersByEmailAdmin(supabase, email),
      ]);
      if (!customerRow) {
        setLoadStatus("not_found");
        return;
      }
      setCustomer(customerRow);
      setOrders(orderRows);
      setLoadStatus("ready");
    } catch (err) {
      console.error("[admin] Failed to load customer:", err);
      setLoadStatus("error");
      toast({ variant: "error", title: "Failed to load customer", description: getErrorMessage(err) });
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email]);

  const addresses = useMemo(() => {
    const seen = new Map<string, OrderWithItems["shippingAddress"]>();
    for (const o of orders) {
      const a = o.shippingAddress;
      const key = [a.line1, a.city, a.state, a.zip, a.country].join("|").toLowerCase();
      if (key.trim() !== "|||" && !seen.has(key)) seen.set(key, a);
    }
    return Array.from(seen.values());
  }, [orders]);

  const lastOrderDate = useMemo(
    () => (orders.length ? orders.reduce((latest, o) => (new Date(o.date) > new Date(latest) ? o.date : latest), orders[0].date) : null),
    [orders]
  );

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
        <p className="text-sm text-ink-dim">Customer &ldquo;{email}&rdquo; doesn&apos;t exist.</p>
        <Button variant="outline" size="sm" onClick={() => router.push("/admin/customers")}>
          <ArrowLeft className="h-3.5 w-3.5" /> Back to customers
        </Button>
      </div>
    );
  }

  if (loadStatus === "error" || !customer) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-line py-20 text-center">
        <p className="text-sm text-ink-dim">Couldn&apos;t load this customer.</p>
        <Button variant="outline" size="sm" onClick={() => void load()}>
          Try again
        </Button>
      </div>
    );
  }

  const avgOrderValue = customer.orders > 0 ? customer.totalSpent / customer.orders : 0;

  return (
    <div>
      <button
        type="button"
        onClick={() => router.push("/admin/customers")}
        className="flex items-center gap-1.5 text-sm text-ink-faint transition-colors hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to customers
      </button>

      <div className="mt-3">
        <h1 className="font-display text-2xl font-bold text-ink">{customer.name}</h1>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-faint">
          <Mail className="h-3.5 w-3.5" /> {customer.email}
        </p>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-line p-4">
          <p className="text-xs text-ink-faint">Orders</p>
          <p className="mt-1 font-display text-xl font-bold text-ink">{customer.orders}</p>
        </div>
        <div className="rounded-2xl border border-line p-4">
          <p className="text-xs text-ink-faint">Total spent</p>
          <p className="mt-1 font-display text-xl font-bold text-ink">{formatPrice(customer.totalSpent)}</p>
        </div>
        <div className="rounded-2xl border border-line p-4">
          <p className="text-xs text-ink-faint">Avg. order value</p>
          <p className="mt-1 font-display text-xl font-bold text-ink">{formatPrice(avgOrderValue)}</p>
        </div>
        <div className="rounded-2xl border border-line p-4">
          <p className="text-xs text-ink-faint">Last order</p>
          <p className="mt-1 font-display text-xl font-bold text-ink">
            {lastOrderDate
              ? new Date(lastOrderDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })
              : "—"}
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-line">
            <div className="flex items-center gap-2 border-b border-line px-4 py-3">
              <Package className="h-4 w-4 text-ink-faint" />
              <h2 className="text-sm font-semibold text-ink">Orders</h2>
            </div>
            {orders.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-ink-faint">No orders yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[500px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-line/60 text-xs uppercase tracking-wider text-ink-faint">
                      <th className="px-4 py-2.5 font-medium">Order</th>
                      <th className="px-4 py-2.5 font-medium">Date</th>
                      <th className="px-4 py-2.5 font-medium">Status</th>
                      <th className="px-4 py-2.5 font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((o) => (
                      <tr
                        key={o.id}
                        onClick={() => router.push(`/admin/orders/${o.id}`)}
                        className="cursor-pointer border-b border-line/60 transition-colors last:border-0 hover:bg-ink/5"
                      >
                        <td className="px-4 py-3 font-mono text-ink">{o.id}</td>
                        <td className="px-4 py-3 text-ink-dim">
                          {new Date(o.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={o.status} />
                        </td>
                        <td className="px-4 py-3 font-mono text-ink">{formatPrice(o.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-line p-4">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-ink-faint" />
              <h2 className="text-sm font-semibold text-ink">Profile</h2>
            </div>
            <dl className="mt-3 space-y-2 text-xs">
              <div className="flex justify-between">
                <dt className="text-ink-faint">Registered</dt>
                <dd className="text-ink-dim">
                  {new Date(customer.joined).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                </dd>
              </div>
            </dl>
          </div>

          <div className="rounded-2xl border border-line p-4">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-ink-faint" />
              <h2 className="text-sm font-semibold text-ink">Addresses</h2>
            </div>
            {addresses.length === 0 ? (
              <p className="mt-3 text-xs text-ink-faint">No shipping addresses on file.</p>
            ) : (
              <div className="mt-3 space-y-3">
                {addresses.map((a, i) => (
                  <div key={i} className="border-t border-line/60 pt-3 text-xs text-ink-dim first:border-0 first:pt-0">
                    <p>{a.line1 || "—"}</p>
                    <p>{[a.city, a.state, a.zip].filter(Boolean).join(", ") || "—"}</p>
                    <p>{a.country || "—"}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
