import type { Metadata } from "next";
import { products, getProductBySlug } from "@/lib/data/products";
import { DynamicProductLookup } from "@/app/product/[slug]/dynamic-product-lookup";

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

/**
 * generateStaticParams is a BUILD-TIME function. Using the seed product list
 * here is intentional and correct — it pre-renders the slugs we know at build
 * time. Products added via the admin after the build are handled by
 * DynamicProductLookup at request time (see below).
 */
export function generateStaticParams() {
  return products.map((p) => ({ slug: p.slug }));
}

/**
 * generateMetadata: for slugs known at build time we can use the seed data
 * for the title/description (these fields don't change often). For slugs NOT
 * in the seed (admin-created products), we return minimal metadata — the
 * product content itself is fetched client-side by DynamicProductLookup.
 */
export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  // Seed lookup is acceptable in metadata — it's build-time and the product
  // name/description rarely changes post-creation.
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

  // Products created via the admin panel after the build won't be in the
  // seed list. Always defer to DynamicProductLookup which reads from
  // CatalogContext (Supabase-backed) at runtime — it handles both known
  // and unknown slugs correctly.
  return <DynamicProductLookup slug={slug} />;
}
