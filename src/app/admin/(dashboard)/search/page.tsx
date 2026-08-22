"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  Search,
  Package,
  ShoppingCart,
  Users,
  Tag,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatPrice, cn } from "@/lib/utils";

interface ProductResult {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  sku: string | null;
}

interface OrderResult {
  id: string;
  customer: string;
  email: string;
  total: number;
  status: string;
  created_at: string;
}

interface CustomerResult {
  id: string;
  name: string;
  email: string;
  orders: number;
  total_spent: number;
}

interface CouponResult {
  id: string;
  code: string;
  type: string;
  value: number;
  active: boolean;
}

interface SearchResults {
  products: ProductResult[];
  orders: OrderResult[];
  customers: CustomerResult[];
  coupons: CouponResult[];
}

export default function AdminSearchPage() {
  const [query, setQuery] = useState("");
  const [isPending, startTransition] = useTransition();
  const [results, setResults] = useState<SearchResults>({
    products: [],
    orders: [],
    customers: [],
    coupons: [],
  });
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults({ products: [], orders: [], customers: [], coupons: [] });
      setSearched(false);
      return;
    }

    const timer = setTimeout(() => {
      startTransition(async () => {
        try {
          const supabase = createClient();
          const pattern = `%${trimmed}%`;

          const [productsRes, ordersRes, customersRes, couponsRes] = await Promise.all([
            supabase
              .from("products")
              .select("id, name, category, price, stock, sku")
              .or(`name.ilike.${pattern},description.ilike.${pattern},category.ilike.${pattern},sku.ilike.${pattern}`)
              .limit(8),
            supabase
              .from("orders")
              .select("id, customer, email, total, status, created_at")
              .or(`customer.ilike.${pattern},email.ilike.${pattern},id.ilike.${pattern}`)
              .limit(8),
            supabase
              .from("customers")
              .select("id, name, email, orders, total_spent")
              .or(`name.ilike.${pattern},email.ilike.${pattern}`)
              .limit(8),
            supabase
              .from("coupons")
              .select("id, code, type, value, active")
              .ilike("code", pattern)
              .limit(8),
          ]);

          setResults({
            products: (productsRes.data as ProductResult[]) || [],
            orders: (ordersRes.data as OrderResult[]) || [],
            customers: (customersRes.data as CustomerResult[]) || [],
            coupons: (couponsRes.data as CouponResult[]) || [],
          });
          setSearched(true);
        } catch (err) {
          console.error("Global search failed:", err);
        }
      });
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  const totalResults =
    results.products.length +
    results.orders.length +
    results.customers.length +
    results.coupons.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-bold text-ink">Global Search</h1>
        <p className="mt-1 text-sm text-ink-faint">
          Search dynamically across products, orders, customers, and discounts.
        </p>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-faint" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by product name, SKU, customer, email, order ID, or discount code..."
          className="w-full rounded-2xl border border-line bg-surface py-3.5 pl-12 pr-10 text-sm text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none"
          autoFocus
        />
        {isPending && (
          <Loader2 className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-accent" />
        )}
      </div>

      {searched && (
        <div className="text-xs text-ink-dim">
          Found <span className="font-semibold text-ink">{totalResults}</span> result
          {totalResults === 1 ? "" : "s"} for &ldquo;{query}&rdquo;
        </div>
      )}

      {/* Results grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Products */}
        <div className="rounded-2xl border border-line bg-surface p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-accent" />
              <h2 className="font-display text-sm font-bold uppercase tracking-wider text-ink">
                Products ({results.products.length})
              </h2>
            </div>
            <Link
              href="/admin/products"
              className="flex items-center gap-1 text-xs text-accent hover:underline"
            >
              All products <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="space-y-2">
            {results.products.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-xl border border-line/60 bg-surface-raised p-3 text-xs"
              >
                <div className="min-w-0 flex-1 pr-3">
                  <p className="truncate font-medium text-ink">{p.name}</p>
                  <p className="truncate text-[10px] text-ink-faint">
                    {p.category} {p.sku ? `• SKU: ${p.sku}` : ""} • Stock: {p.stock}
                  </p>
                </div>
                <span className="font-mono font-medium text-ink">
                  {formatPrice(p.price)}
                </span>
              </div>
            ))}
            {searched && results.products.length === 0 && (
              <p className="py-4 text-center text-xs text-ink-faint">No matching products</p>
            )}
            {!searched && (
              <p className="py-4 text-center text-xs text-ink-faint">Type to search products</p>
            )}
          </div>
        </div>

        {/* Orders */}
        <div className="rounded-2xl border border-line bg-surface p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-accent" />
              <h2 className="font-display text-sm font-bold uppercase tracking-wider text-ink">
                Orders ({results.orders.length})
              </h2>
            </div>
            <Link
              href="/admin/orders"
              className="flex items-center gap-1 text-xs text-accent hover:underline"
            >
              All orders <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="space-y-2">
            {results.orders.map((o) => (
              <div
                key={o.id}
                className="flex items-center justify-between rounded-xl border border-line/60 bg-surface-raised p-3 text-xs"
              >
                <div className="min-w-0 flex-1 pr-3">
                  <p className="truncate font-medium text-ink">
                    #{o.id.slice(0, 8).toUpperCase()} • {o.customer}
                  </p>
                  <p className="truncate text-[10px] text-ink-faint">
                    {o.email} • {new Date(o.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <span className="font-mono font-medium text-ink">{formatPrice(o.total)}</span>
                  <p className="text-[10px] uppercase tracking-wider text-accent">{o.status}</p>
                </div>
              </div>
            ))}
            {searched && results.orders.length === 0 && (
              <p className="py-4 text-center text-xs text-ink-faint">No matching orders</p>
            )}
            {!searched && (
              <p className="py-4 text-center text-xs text-ink-faint">Type to search orders</p>
            )}
          </div>
        </div>

        {/* Customers */}
        <div className="rounded-2xl border border-line bg-surface p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-accent" />
              <h2 className="font-display text-sm font-bold uppercase tracking-wider text-ink">
                Customers ({results.customers.length})
              </h2>
            </div>
            <Link
              href="/admin/customers"
              className="flex items-center gap-1 text-xs text-accent hover:underline"
            >
              All customers <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="space-y-2">
            {results.customers.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between rounded-xl border border-line/60 bg-surface-raised p-3 text-xs"
              >
                <div className="min-w-0 flex-1 pr-3">
                  <p className="truncate font-medium text-ink">{c.name}</p>
                  <p className="truncate text-[10px] text-ink-faint">{c.email}</p>
                </div>
                <div className="text-right text-[10px] text-ink-dim">
                  <p>{c.orders} order{c.orders === 1 ? "" : "s"}</p>
                  <p className="font-mono">{formatPrice(c.total_spent)} spent</p>
                </div>
              </div>
            ))}
            {searched && results.customers.length === 0 && (
              <p className="py-4 text-center text-xs text-ink-faint">No matching customers</p>
            )}
            {!searched && (
              <p className="py-4 text-center text-xs text-ink-faint">Type to search customers</p>
            )}
          </div>
        </div>

        {/* Discounts */}
        <div className="rounded-2xl border border-line bg-surface p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-accent" />
              <h2 className="font-display text-sm font-bold uppercase tracking-wider text-ink">
                Discounts ({results.coupons.length})
              </h2>
            </div>
            <Link
              href="/admin/discounts"
              className="flex items-center gap-1 text-xs text-accent hover:underline"
            >
              All discounts <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="space-y-2">
            {results.coupons.map((cp) => (
              <div
                key={cp.id}
                className="flex items-center justify-between rounded-xl border border-line/60 bg-surface-raised p-3 text-xs"
              >
                <div className="min-w-0 flex-1 pr-3">
                  <p className="font-mono font-bold text-ink">{cp.code}</p>
                  <p className="text-[10px] text-ink-faint">
                    {cp.type === "percentage" ? `${cp.value}% off` : `${formatPrice(cp.value)} off`}
                  </p>
                </div>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[9px] font-medium uppercase tracking-wider",
                    cp.active ? "bg-emerald-500/10 text-emerald-400" : "bg-line/40 text-ink-faint"
                  )}
                >
                  {cp.active ? "Active" : "Inactive"}
                </span>
              </div>
            ))}
            {searched && results.coupons.length === 0 && (
              <p className="py-4 text-center text-xs text-ink-faint">No matching discounts</p>
            )}
            {!searched && (
              <p className="py-4 text-center text-xs text-ink-faint">Type to search discounts</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
