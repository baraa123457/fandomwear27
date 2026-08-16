"use client";

import Link from "next/link";
import { PackageSearch } from "lucide-react";
import { useCatalog } from "@/context/catalog-context";
import { ProductPageContent } from "@/components/product/product-page-content";
import { Button } from "@/components/ui/button";

/**
 * Renders for any /product/[slug] route that wasn't in the static build
 * (i.e. products that only exist in this browser's catalog — created via
 * the admin catalog manager, which has no real backend). Looks the slug up
 * live once CatalogContext has hydrated from localStorage.
 */
export function DynamicProductLookup({ slug }: { slug: string }) {
  const { getProductBySlug } = useCatalog();
  const product = getProductBySlug(slug);

  if (!product) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center px-5 py-16 text-center">
        <PackageSearch className="h-10 w-10 text-ink-faint" />
        <h1 className="mt-4 font-display text-xl font-bold text-ink">Product not found</h1>
        <p className="mt-1.5 text-sm text-ink-dim">
          This design doesn&apos;t exist, or the browser it was created in isn&apos;t this one —
          products added in the admin panel are only saved to that browser.
        </p>
        <Button asChild variant="accent" size="md" className="mt-6">
          <Link href="/shop">Browse the shop</Link>
        </Button>
      </div>
    );
  }

  return <ProductPageContent product={product} />;
}
