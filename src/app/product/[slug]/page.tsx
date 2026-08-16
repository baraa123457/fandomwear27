import type { Metadata } from "next";
import { getProductBySlug, products } from "@/lib/data/products";
import { ProductPageContent } from "@/components/product/product-page-content";
import { DynamicProductLookup } from "@/app/product/[slug]/dynamic-product-lookup";

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) return {};

  return {
    title: product.name,
    description: product.description,
    openGraph: {
      title: `${product.name} · FandomWear`,
      description: product.description,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${product.name} · FandomWear`,
      description: product.description,
    },
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = getProductBySlug(slug);

  // Known at build time — render straight away, no client round-trip needed.
  if (product) return <ProductPageContent product={product} />;

  // Not part of the static seed catalog — it may still exist in this
  // browser's CatalogContext (e.g. a product created via the admin panel,
  // which has no real backend to build a static page from). Check there
  // client-side instead of 404ing immediately.
  return <DynamicProductLookup slug={slug} />;
}
