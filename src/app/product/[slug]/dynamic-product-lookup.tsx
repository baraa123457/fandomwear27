"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PackageSearch } from "lucide-react";

import { useCatalog } from "@/context/catalog-context";
import { ProductPageContent } from "@/components/product/product-page-content";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { fetchProducts } from "@/lib/supabase/queries/products";
import type { Product } from "@/lib/types";

interface DynamicProductLookupProps {
  slug: string;
}

export function DynamicProductLookup({
  slug,
}: DynamicProductLookupProps) {
  const { getProductBySlug, isLoading } = useCatalog();
  const contextProduct = getProductBySlug(slug);
  const [freshProduct, setFreshProduct] = useState<Product | undefined>(undefined);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadFresh() {
      try {
        const supabase = createClient();
        const rows = await fetchProducts(supabase);
        if (cancelled) return;
        const found = rows.find((item) => item.slug === slug);
        if (found) {
          setFreshProduct(found);
        }
      } catch (error) {
        console.error("[product-page] Failed to load fresh product from Supabase:", error);
      } finally {
        if (!cancelled) setFetching(false);
      }
    }

    loadFresh();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const activeProduct = freshProduct ?? contextProduct;
  const loading = !activeProduct && (isLoading || fetching);



  /*
   * Important:
   * Don't show "Product not found" immediately.
   *
   * CatalogContext loads products from Supabase asynchronously,
   * so the product may not exist during the first render.
   */
  if (loading) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center px-5 py-16 text-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-ink/20 border-t-ink" />

        <h1 className="mt-5 font-display text-xl font-bold text-ink">
          Loading product...
        </h1>

        <p className="mt-1.5 text-sm text-ink-dim">
          Please wait while we load this product.
        </p>
      </div>
    );
  }

  if (!activeProduct) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center px-5 py-16 text-center">
        <PackageSearch className="h-10 w-10 text-ink-faint" />

        <h1 className="mt-4 font-display text-xl font-bold text-ink">
          Product not found
        </h1>

        <p className="mt-1.5 text-sm text-ink-dim">
          This product doesn&apos;t exist or is no longer available.
        </p>

        <Button
          asChild
          variant="accent"
          size="md"
          className="mt-6"
        >
          <Link href="/shop">
            Browse the shop
          </Link>
        </Button>
      </div>
    );
  }

  return <ProductPageContent product={activeProduct} />;
}