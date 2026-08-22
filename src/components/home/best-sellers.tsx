"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useCatalog } from "@/context/catalog-context";
import { useHomepageSettings } from "@/context/homepage-settings-context";
import { ProductCard } from "@/components/shared/product-card";
import { Reveal } from "@/components/shared/reveal";
import type { Product } from "@/lib/types";

export function BestSellers() {
  const { products, salesCounts } = useCatalog();
  const { bestsellerMode, bestsellerProductIds } = useHomepageSettings();

  const items = useMemo(() => {
    if (products.length === 0) return [];

    const productMap = new Map(products.map((p) => [p.id, p]));

    // 1. If Admin configured Custom Best Sellers in /admin/content
    if (bestsellerMode === "custom" && bestsellerProductIds.length > 0) {
      const customList: Product[] = [];
      for (const id of bestsellerProductIds) {
        const found = productMap.get(id);
        if (found) customList.push(found);
      }
      if (customList.length > 0) return customList.slice(0, 8);
    }

    // 2. Automatic Mode: ONLY products with real sales (purchased at least once)
    const withSales = products
      .filter((p) => (salesCounts[p.id] ?? 0) > 0)
      .sort((a, b) => (salesCounts[b.id] ?? 0) - (salesCounts[a.id] ?? 0));

    return withSales.slice(0, 8);
  }, [products, salesCounts, bestsellerMode, bestsellerProductIds]);

  // If no products have been bought yet and no custom picks exist, do not render the section
  if (items.length === 0) return null;

  return (
    <section className="border-b border-line bg-void py-20 sm:py-28">
      <Reveal className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-accent-red">
              Proven favorites
            </p>
            <h2 className="mt-3 text-balance font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
              Best sellers
            </h2>
          </div>
          <Link
            href="/shop?sort=best"
            className="hidden shrink-0 items-center gap-1.5 text-sm font-medium text-ink-dim transition-colors hover:text-ink sm:flex"
          >
            View all <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </Reveal>
    </section>
  );
}
