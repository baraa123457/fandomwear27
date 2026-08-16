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
  const { getProductBySlug } = useCatalog();

  const contextProduct = getProductBySlug(slug);

  const [product, setProduct] = useState<Product | undefined>(
    contextProduct
  );

  const [loading, setLoading] = useState(!contextProduct);

  useEffect(() => {
    // If CatalogContext already has the product,
    // use it immediately.
    if (contextProduct) {
      setProduct(contextProduct);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadProduct() {
      try {
        const supabase = createClient();

        const products = await fetchProducts(supabase);

        if (cancelled) return;

        const found = products.find((item) => item.slug === slug);

        setProduct(found);
      } catch (error) {
        console.error(
          "[product-page] Failed to load product from Supabase:",
          error
        );

        if (!cancelled) {
          setProduct(undefined);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadProduct();

    return () => {
      cancelled = true;
    };
  }, [slug, contextProduct]);

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

  if (!product) {
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

  return <ProductPageContent product={product} />;
}