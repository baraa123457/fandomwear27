"use client";

import { useEffect, useState } from "react";
import type { Product } from "@/lib/types";
import { useCatalog } from "@/context/catalog-context";
import { Review, getReviewsForProduct } from "@/lib/data/reviews";
import { createClient } from "@/lib/supabase/client";
import { fetchReviewsForProduct } from "@/lib/supabase/queries/reviews";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { ProductGallery } from "@/components/product/gallery";
import { PurchasePanel } from "@/components/product/purchase-panel";
import { Reviews } from "@/components/product/reviews";
import { RelatedProducts } from "@/components/product/related-products";
import { RecentlyViewed } from "@/components/product/recently-viewed";
import { ViewTracker } from "@/components/product/view-tracker";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";

function getSafeUniverse(
  getUniverse: (id: string) => ReturnType<
    ReturnType<typeof useCatalog>["getUniverse"]
  >,
  universeId: string
) {
  try {
    const result = getUniverse(universeId);

    if (
      result &&
      typeof result === "object" &&
      typeof result.label === "string"
    ) {
      return result;
    }
  } catch (error) {
    console.warn(
      "[product-page] Failed to resolve universe:",
      universeId,
      error
    );
  }

  return {
    id: universeId || "other",
    label: universeId
      ? universeId.charAt(0).toUpperCase() + universeId.slice(1)
      : "Other",
    tagline: "",
    color: "#7C5CFF",
    icon: "Sparkles",
    productCount: 0,
  };
}

/**
 * Shared product detail page.
 *
 * Supports both:
 * - Static products from the original catalog
 * - Products created through the admin panel and stored in Supabase
 *
 * The universe lookup is defensive so a missing universe
 * cannot crash the product page.
 */
export function ProductPageContent({
  product,
}: {
  product: Product;
}) {
  const { getUniverse } = useCatalog();

  const universe = getSafeUniverse(
    getUniverse,
    product.universe
  );

  const [reviews, setReviews] = useState<Review[]>(() =>
    getReviewsForProduct(product.id, product.rating)
  );

  useEffect(() => {
    let cancelled = false;

    setReviews(
      getReviewsForProduct(product.id, product.rating)
    );

    async function loadReviews() {
      try {
        const supabase = createClient();

        const rows = await fetchReviewsForProduct(
          supabase,
          product.id
        );

        if (!cancelled && rows.length > 0) {
          setReviews(rows);
        }
      } catch (error) {
        console.warn(
          "[reviews] Falling back to generated reviews — Supabase fetch failed:",
          error
        );
      }
    }

    loadReviews();

    return () => {
      cancelled = true;
    };
  }, [product.id, product.rating]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    category: product.category,
    offers: {
      "@type": "Offer",
      price: product.price.toFixed(2),
      priceCurrency: "USD",
      availability:
        product.stock > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
    },
    ...(product.reviewCount > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: product.rating.toFixed(1),
            reviewCount: product.reviewCount,
          },
        }
      : {}),
  };

  return (
    <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd),
        }}
      />

      <ViewTracker productId={product.id} />

      <Breadcrumbs
        items={[
          {
            label: "Shop",
            href: "/shop",
          },
          {
            label: universe.label,
            href: `/shop?universe=${encodeURIComponent(
              universe.id
            )}`,
          },
          {
            label: product.name,
          },
        ]}
      />

      <div className="mt-6 grid grid-cols-1 gap-12 lg:grid-cols-2">
        <ProductGallery
          product={product}
          color={universe.color}
        />

        <div>
          <p
            className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: universe.color }}
          >
            {universe.label}
          </p>

          <h1 className="mt-2 text-balance font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            {product.name}
          </h1>

          <div className="mt-6">
            <PurchasePanel product={product} />
          </div>
        </div>
      </div>

      <div className="mt-16">
        <Tabs defaultValue="description">
          <TabsList>
            <TabsTrigger value="description">
              Description
            </TabsTrigger>

            <TabsTrigger value="material">
              Material & care
            </TabsTrigger>

            <TabsTrigger value="shipping">
              Shipping & returns
            </TabsTrigger>

            <TabsTrigger value="reviews">
              Reviews ({reviews.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="description">
            <p className="max-w-2xl text-sm leading-relaxed text-ink-dim">
              {product.description}
            </p>

            <ul className="mt-4 flex max-w-2xl flex-col gap-2 text-sm text-ink-dim">
              <li>
                · Original fan-inspired graphic, screen printed
              </li>
              <li>
                · Oversized, boxy fit with a dropped shoulder
              </li>
              <li>
                · Pre-shrunk fabric to hold its shape wash after wash
              </li>
            </ul>
          </TabsContent>

          <TabsContent value="material">
            <p className="max-w-2xl text-sm leading-relaxed text-ink-dim">
              Made from {product.material}. Machine wash cold,
              inside out, with like colors. Tumble dry low or hang
              dry to protect the print. Do not iron directly on the
              graphic.
            </p>
          </TabsContent>

          <TabsContent value="shipping">
            <Accordion
              type="single"
              collapsible
              className="max-w-2xl"
            >
              <AccordionItem value="shipping">
                <AccordionTrigger>
                  Shipping timelines
                </AccordionTrigger>

                <AccordionContent>
                  Standard shipping takes 3–6 business days. Orders
                  over $75 ship free; orders under $75 have a flat
                  $5.99 shipping fee. Express shipping (1–2 days)
                  is available at checkout.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="returns">
                <AccordionTrigger>
                  Returns & exchanges
                </AccordionTrigger>

                <AccordionContent>
                  30 days from delivery to return unworn items with
                  tags attached. Exchanges for a different size ship
                  free — start a return from your account&apos;s
                  Orders page.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="international">
                <AccordionTrigger>
                  International orders
                </AccordionTrigger>

                <AccordionContent>
                  We ship to most countries. Customs fees and import
                  duties, if any, are the responsibility of the
                  recipient and are collected on delivery.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </TabsContent>

          <TabsContent value="reviews">
            <Reviews
              reviews={reviews}
              averageRating={product.rating}
            />
          </TabsContent>
        </Tabs>
      </div>

      <RelatedProducts current={product} />

      <RecentlyViewed excludeId={product.id} />
    </div>
  );
}