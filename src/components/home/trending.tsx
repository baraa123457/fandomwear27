"use client";

import { Flame } from "lucide-react";
import { useCatalog } from "@/context/catalog-context";
import { ProductCard } from "@/components/shared/product-card";
import { Reveal } from "@/components/shared/reveal";
import { ScrollRow } from "@/components/shared/scroll-row";
import { Product } from "@/lib/types";

function getTrending(products: Product[], limit = 6) {
  return [...products]
    .sort((a, b) => b.rating * b.reviewCount - a.rating * a.reviewCount)
    .slice(0, limit);
}

export function Trending() {
  const { products, isLoading } = useCatalog();
  const items = getTrending(products, 6);

  if (!isLoading && items.length === 0) return null;

  return (
    <section className="border-b border-line bg-surface/40 py-20 sm:py-28">
      <Reveal className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-red/15 text-accent-red">
            <Flame className="h-4.5 w-4.5" />
          </span>
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-accent-red">
              Right now
            </p>
            <h2 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
              Trending
            </h2>
          </div>
        </div>

        <div className="mt-8">
          <ScrollRow>
            {items.length === 0 ? (
              [...Array(4)].map((_, i) => (
                <div key={i} className="w-[230px] shrink-0 snap-start sm:w-[260px] lg:w-[270px]">
                  <div className="aspect-[3/4] w-full rounded-2xl border border-line/40 bg-surface/40 animate-pulse" />
                  <div className="mt-3 h-4 w-3/4 rounded-lg bg-surface/60 animate-pulse" />
                  <div className="mt-2 h-4 w-1/3 rounded-lg bg-surface/60 animate-pulse" />
                </div>
              ))
            ) : (
              items.map((p) => (
                <div key={p.id} className="w-[230px] shrink-0 snap-start sm:w-[260px] lg:w-[270px]">
                  <ProductCard product={p} />
                </div>
              ))
            )}
          </ScrollRow>
        </div>


      </Reveal>
    </section>
  );
}
