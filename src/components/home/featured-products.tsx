"use client";

import { useCatalog } from "@/context/catalog-context";
import { ProductCard } from "@/components/shared/product-card";
import { Reveal } from "@/components/shared/reveal";

export function FeaturedProducts() {
  const { getFeatured, isLoading } = useCatalog();
  const items = getFeatured(8);

  if (!isLoading && items.length === 0) return null;

  return (
    <section className="border-b border-line bg-void py-20 sm:py-28">
      <Reveal className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="max-w-lg">
          <p className="font-mono text-xs uppercase tracking-widest text-accent-purple">
            Fan favorites
          </p>
          <h2 className="mt-3 text-balance font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Featured products
          </h2>
          <p className="mt-3 text-sm text-ink-dim">
            The highest-rated designs across every universe, picked by the people wearing them.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
          {items.length === 0 ? (
            [...Array(4)].map((_, i) => (
              <div key={i} className="flex flex-col">
                <div className="aspect-[3/4] w-full rounded-2xl border border-line/40 bg-surface/40 animate-pulse" />
                <div className="mt-3 h-4 w-3/4 rounded-lg bg-surface/60 animate-pulse" />
                <div className="mt-2 h-4 w-1/3 rounded-lg bg-surface/60 animate-pulse" />
              </div>
            ))
          ) : (
            items.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))
          )}
        </div>
      </Reveal>
    </section>
  );
}

