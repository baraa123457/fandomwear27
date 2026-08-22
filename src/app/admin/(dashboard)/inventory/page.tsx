"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Boxes, DollarSign, AlertTriangle, PackageX, Minus, Plus, Check, RefreshCw } from "lucide-react";
import { getInventory, computeInventoryMetrics } from "@/lib/data/admin";
import { useCatalog } from "@/context/catalog-context";
import { useToast } from "@/context/toast-context";
import { StatusBadge } from "@/components/admin/status-badge";
import { StatCard } from "@/components/admin/stat-card";
import { ProductVisual } from "@/components/shared/product-visual";
import { formatPrice, cn, getErrorMessage } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { fetchAllProductsAdmin, updateProductRow } from "@/lib/supabase/queries/products";
import type { Product } from "@/lib/types";
import { Button } from "@/components/ui/button";

export default function AdminInventoryPage() {
  const { products: catalogProducts, updateProduct: catalogUpdateProduct, getUniverse, refreshProducts } = useCatalog();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>(catalogProducts);
  const [loading, setLoading] = useState(true);
  const [setInputs, setSetInputs] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const rows = await fetchAllProductsAdmin(supabase);
      setProducts(rows);
    } catch (err) {
      console.warn("[inventory] Failed to fetch live products, using catalog state:", err);
      setProducts(catalogProducts);
    } finally {
      setLoading(false);
    }
  }, [catalogProducts]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const items = useMemo(() => getInventory(products), [products]);
  const metrics = useMemo(() => computeInventoryMetrics(items), [items]);

  const adjust = async (id: string, delta: number) => {
    const current = products.find((p) => p.id === id);
    if (!current) return;
    const nextStock = Math.max(0, current.stock + delta);
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, stock: nextStock } : p)));
    try {
      const supabase = createClient();
      await updateProductRow(supabase, id, { stock: nextStock });
      await catalogUpdateProduct(id, { stock: nextStock }).catch(() => {});
      void refreshProducts();
    } catch (err) {
      setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, stock: current.stock } : p)));
      toast({ variant: "error", title: "Couldn't update stock", description: getErrorMessage(err) });
    }
  };

  const handleSetStock = async (id: string) => {
    const raw = setInputs[id];
    if (raw === undefined || raw.trim() === "") return;
    const next = Math.max(0, Math.floor(Number(raw)));
    if (Number.isNaN(next)) return;
    const current = products.find((p) => p.id === id);
    if (!current) return;

    setSavingId(id);
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, stock: next } : p)));
    try {
      const supabase = createClient();
      await updateProductRow(supabase, id, { stock: next });
      await catalogUpdateProduct(id, { stock: next }).catch(() => {});
      void refreshProducts();
      setSetInputs((prev) => {
        const nextState = { ...prev };
        delete nextState[id];
        return nextState;
      });
      toast({ variant: "success", title: "Stock updated", description: `${current.name} → ${next} units` });
    } catch (err) {
      setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, stock: current.stock } : p)));
      toast({ variant: "error", title: "Couldn't update stock", description: getErrorMessage(err) });
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Inventory</h1>
          <p className="mt-1 text-sm text-ink-faint">{items.length} SKUs</p>
        </div>
        <Button size="sm" variant="outline" onClick={loadProducts} disabled={loading}>
          <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total inventory units" value={metrics.totalUnits.toLocaleString()} icon={Boxes} />
        <StatCard label="Inventory value" value={formatPrice(metrics.inventoryValue)} icon={DollarSign} />
        <StatCard label="Low stock" value={metrics.lowStockCount.toLocaleString()} icon={AlertTriangle} />
        <StatCard label="Out of stock" value={metrics.outOfStockCount.toLocaleString()} icon={PackageX} />
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-line">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead>
            <tr className="border-b border-line bg-surface text-xs uppercase tracking-wider text-ink-faint">
              <th className="px-4 py-3 font-medium">Image</th>
              <th className="px-4 py-3 font-medium">Product</th>
              <th className="px-4 py-3 font-medium">SKU</th>
              <th className="px-4 py-3 font-medium">Stock</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Updated</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const universe = getUniverse(item.universe);
              return (
                <tr key={item.id} className="border-b border-line/60 last:border-0">
                  <td className="px-4 py-3">
                    <ProductVisual
                      image={item.image}
                      color={universe.color}
                      icon={item.artIcon}
                      label={item.name}
                      className="h-10 w-10 shrink-0"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink">{item.name}</p>
                    <p className="flex items-center gap-1.5 text-xs text-ink-faint">
                      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: universe.color }} />
                      {universe.label} · {item.category} · {formatPrice(item.price)}
                    </p>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-ink-dim">{item.sku ?? "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => adjust(item.id, -1)}
                          aria-label={`Decrease stock for ${item.name}`}
                          className="flex h-7 w-7 items-center justify-center rounded-full border border-line text-ink-dim hover:text-ink"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className={cn("w-8 text-center font-mono", item.status !== "healthy" && "text-amber-400")}>
                          {item.stock}
                        </span>
                        <button
                          onClick={() => adjust(item.id, 1)}
                          aria-label={`Increase stock for ${item.name}`}
                          className="flex h-7 w-7 items-center justify-center rounded-full border border-line text-ink-dim hover:text-ink"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min={0}
                          placeholder="Set"
                          value={setInputs[item.id] ?? ""}
                          onChange={(e) =>
                            setSetInputs((prev) => ({ ...prev, [item.id]: e.target.value }))
                          }
                          onKeyDown={(e) => e.key === "Enter" && handleSetStock(item.id)}
                          className="h-7 w-16 rounded-lg border border-line bg-void px-2 text-xs text-ink focus:border-accent-cyan focus:outline-none"
                        />
                        <button
                          onClick={() => handleSetStock(item.id)}
                          disabled={savingId === item.id || setInputs[item.id] === undefined || setInputs[item.id] === ""}
                          aria-label={`Set stock for ${item.name}`}
                          className="flex h-7 w-7 items-center justify-center rounded-full border border-line text-ink-dim hover:text-ink disabled:opacity-40"
                        >
                          <Check className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={item.status} /></td>
                  <td className="px-4 py-3 text-ink-dim">
                    {item.updatedAt
                      ? new Date(item.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                      : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
