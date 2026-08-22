"use client";

import { Suspense, useCallback, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { SlidersHorizontal, Search, X, Sparkles, FilterX } from "lucide-react";
import { FilterPanel } from "@/components/shop/filter-panel";
import { ProductCard } from "@/components/shared/product-card";
import { Pagination } from "@/components/shared/pagination";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { Dropdown } from "@/components/shared/dropdown";
import { Button } from "@/components/ui/button";
import { RecentlyViewed } from "@/components/product/recently-viewed";
import {
  ShopFilters,
  SortKey,
  filterAndSortProducts,
  paginate,
} from "@/lib/shop-utils";
import { Size, Universe } from "@/lib/types";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";
import { useCatalog } from "@/context/catalog-context";

const sortOptions: { value: SortKey; label: string }[] = [
  { value: "featured", label: "Featured" },
  { value: "new", label: "Newest" },
  { value: "best", label: "Best sellers" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "rating", label: "Top rated" },
];

function parseFilters(params: URLSearchParams): ShopFilters {
  return {
    universe: (params.get("universe") as Universe) || undefined,
    categories: params.get("categories")?.split(",").filter(Boolean) ?? [],
    sizes: (params.get("sizes")?.split(",").filter(Boolean) as Size[]) ?? [],
    colors: params.get("colors")?.split(",").filter(Boolean) ?? [],
    priceMax: params.get("priceMax") ? Number(params.get("priceMax")) : undefined,
    inStockOnly: params.get("inStock") === "1",
    search: params.get("q") ?? "",
    sort: (params.get("sort") as SortKey) ?? "featured",
    page: params.get("page") ? Number(params.get("page")) : 1,
  };
}

function serializeFilters(filters: ShopFilters): string {
  const params = new URLSearchParams();
  if (filters.universe) params.set("universe", filters.universe);
  if (filters.categories.length) params.set("categories", filters.categories.join(","));
  if (filters.sizes.length) params.set("sizes", filters.sizes.join(","));
  if (filters.colors.length) params.set("colors", filters.colors.join(","));
  if (filters.priceMax) params.set("priceMax", String(filters.priceMax));
  if (filters.inStockOnly) params.set("inStock", "1");
  if (filters.search) params.set("q", filters.search);
  if (filters.sort !== "featured") params.set("sort", filters.sort);
  if (filters.page > 1) params.set("page", String(filters.page));
  return params.toString();
}

function ShopSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex flex-col gap-3">
          <div className="aspect-square w-full rounded-2xl bg-surface animate-pulse border border-line/60" />
          <div className="h-4 w-3/4 rounded-md bg-surface animate-pulse" />
          <div className="h-3 w-1/2 rounded-md bg-surface animate-pulse" />
        </div>
      ))}
    </div>
  );
}

function ShopPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  useBodyScrollLock(mobileFiltersOpen);
  const { products, getUniverse, salesCounts } = useCatalog();

  const filters = useMemo(() => parseFilters(searchParams), [searchParams]);

  const updateFilters = useCallback(
    (patch: Partial<ShopFilters>) => {
      const next: ShopFilters = { ...filters, ...patch };
      if (!("page" in patch)) next.page = 1;
      const qs = serializeFilters(next);
      router.push(qs ? `/shop?${qs}` : "/shop", { scroll: false });
    },
    [filters, router]
  );

  const resetFilters = () => router.push("/shop", { scroll: false });

  const filtered = useMemo(
    () => filterAndSortProducts(products, filters, salesCounts),
    [products, filters, salesCounts]
  );
  const { items, totalPages, page, totalItems } = paginate(filtered, filters.page);

  const activeUniverse = filters.universe ? getUniverse(filters.universe) : undefined;

  return (
    <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-12">
      <Breadcrumbs
        items={[
          { label: "Shop", href: activeUniverse ? "/shop" : undefined },
          ...(activeUniverse ? [{ label: activeUniverse.label }] : []),
        ]}
      />

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            {activeUniverse ? `${activeUniverse.label} Collection` : "All Products"}
          </h1>
          <p className="mt-1.5 text-sm text-ink-faint">
            {totalItems} {totalItems === 1 ? "design" : "designs"}
            {activeUniverse ? ` in ${activeUniverse.label}` : ""}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
            <input
              value={filters.search}
              onChange={(e) => updateFilters({ search: e.target.value })}
              placeholder="Search designs..."
              className="h-11 w-full rounded-full border border-line bg-surface pl-10 pr-4 text-sm text-ink placeholder:text-ink-faint focus:border-accent-cyan focus:outline-none sm:w-56"
            />
          </div>

          <Dropdown
            value={filters.sort}
            options={sortOptions}
            onChange={(sort) => updateFilters({ sort })}
            ariaLabel="Sort products"
          />

          <Button
            variant="outline"
            size="md"
            className="lg:hidden"
            onClick={() => setMobileFiltersOpen(true)}
            aria-label="Open filters"
          >
            <SlidersHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-[240px_1fr]">
        <aside className="hidden lg:block">
          <FilterPanel filters={filters} onChange={updateFilters} onReset={resetFilters} />
        </aside>

        <div>
          {products.length === 0 ? (
            <ShopSkeleton />
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-line bg-surface/30 px-6 py-24 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-surface border border-line text-ink-faint shadow-lg">
                <FilterX className="h-8 w-8" />
              </div>
              <h3 className="mt-5 font-display text-xl font-bold text-ink">No matching designs found</h3>
              <p className="mt-2 max-w-sm text-sm text-ink-dim leading-relaxed">
                We couldn&apos;t find any products matching your current filters. Try removing some filters or searching for another keyword.
              </p>
              <Button onClick={resetFilters} variant="accent" size="sm" className="mt-6 gap-2">
                <Sparkles className="h-4 w-4" /> Reset all filters
              </Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 xl:grid-cols-4">
                {items.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
              <div className="mt-14">
                <Pagination page={page} totalPages={totalPages} onChange={(p) => updateFilters({ page: p })} />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Recently Viewed section */}
      <div className="mt-16 border-t border-line pt-12">
        <RecentlyViewed />
      </div>

      {/* Mobile filter drawer */}
      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-[80] lg:hidden">
          <div
            className="absolute inset-0 bg-void/70 backdrop-blur-sm"
            onClick={() => setMobileFiltersOpen(false)}
          />
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            transition={{ type: "spring", damping: 32, stiffness: 320 }}
            className="absolute left-0 top-0 h-dvh w-full max-w-xs overflow-y-auto overscroll-contain border-r border-line bg-void p-6"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-ink">Filters</h2>
              <button
                onClick={() => setMobileFiltersOpen(false)}
                aria-label="Close filters"
                className="flex h-9 w-9 items-center justify-center rounded-full text-ink-dim hover:bg-ink/5 hover:text-ink"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>
            <div className="mt-6">
              <FilterPanel filters={filters} onChange={updateFilters} onReset={resetFilters} />
            </div>
            <Button
              onClick={() => setMobileFiltersOpen(false)}
              variant="accent"
              size="lg"
              className="mt-8 w-full"
            >
              Show {totalItems} results
            </Button>
          </motion.div>
        </div>
      )}
    </div>
  );
}

export default function ShopPage() {
  return (
    <Suspense fallback={<ShopSkeleton />}>
      <ShopPageInner />
    </Suspense>
  );
}
