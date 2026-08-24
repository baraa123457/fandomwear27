import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/supabase/database.types";
import type { Product } from "@/lib/types";

type Client = SupabaseClient<Database>;
type ProductRow = Database["public"]["Tables"]["products"]["Row"];
type ProductInsert = Database["public"]["Tables"]["products"]["Insert"];

function safeParseJson<T>(val: unknown): T | undefined {
  if (val === null || val === undefined) return undefined;
  if (typeof val === "object") return val as T;
  if (typeof val === "string") {
    try {
      return JSON.parse(val) as T;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

function rowToProduct(row: ProductRow): Product {

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    universe: row.universe,
    category: row.category,
    price: Number(row.price),
    compareAtPrice:
      row.compare_at_price !== null
        ? Number(row.compare_at_price)
        : undefined,
    description: row.description,
    material: row.material,
    sizes: row.sizes as Product["sizes"],
    colors: row.colors as Product["colors"],
    rating: Number(row.rating),
    reviewCount: row.review_count,
    stock: row.stock,
    tags: row.tags as Product["tags"],
    artIcon: row.art_icon,
    image: row.image ?? undefined,
    images: row.images ?? [],
    colorImages: safeParseJson<Record<string, string[]>>(row.color_images),
    colorVideos: safeParseJson<Record<string, string>>(row.color_videos),
    mainColor: (row.main_color as string) ?? undefined,
    variants: safeParseJson<Product["variants"]>(row.variants),
    video: row.video ?? undefined,

    createdAt: row.created_at,
    updatedAt: row.updated_at,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    status: (row as any).is_active ? "active" : "draft",
    sku: undefined,
    lowStockThreshold: 10,
    featured: false,
    seoTitle: undefined,
    seoDescription: undefined,
    costPrice: undefined,
  };
}


function productToRow(product: Product): ProductInsert {
  const primaryColor = product.mainColor || product.colors?.[0]?.name;
  const primaryColorImages = primaryColor && product.colorImages?.[primaryColor] ? product.colorImages[primaryColor] : [];
  const primaryColorVideo = primaryColor && product.colorVideos?.[primaryColor] ? product.colorVideos[primaryColor] : product.video;

  const fallbackImage = primaryColorImages[0] ?? product.images?.[0] ?? product.image ?? null;
  const fallbackImages = primaryColorImages.length > 0 ? primaryColorImages : product.images ?? (product.image ? [product.image] : []);

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    universe: product.universe,
    category: product.category,
    price: product.price,
    compare_at_price: product.compareAtPrice ?? null,
    description: product.description,
    material: product.material,
    sizes: product.sizes,
    colors: product.colors,
    rating: product.rating,
    review_count: product.reviewCount,
    stock: product.stock,
    tags: product.tags,
    art_icon: product.artIcon,
    image: fallbackImage,
    images: fallbackImages,
    color_images: product.colorImages ?? {},
    color_videos: product.colorVideos ?? {},
    main_color: primaryColor ?? null,
    variants: (product.variants ?? []) as unknown as Json,
    video: primaryColorVideo ?? null,
    created_at: product.createdAt,
    is_active: product.status === "active",
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;

}





/**
 * Fetch real units-sold-per-product, from the `product_sales_counts` view
 * (migration 20260816000015). The view already excludes cancelled orders
 * and aggregates every order_items row server-side — this just reshapes
 * it into a lookup map keyed by product id for getBestSellers().
 *
 * Products with zero sales simply don't appear as a key here; callers
 * should treat a missing id as 0, not as "unknown".
 */
export async function fetchProductSalesCounts(
  client: Client
): Promise<Record<string, number>> {
  const { data, error } = await client
    .from("product_sales_counts")
    .select("product_id, total_sold");

  if (error) throw error;

  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    if (!row.product_id) continue;
    counts[row.product_id] = row.total_sold ?? 0;
  }
  return counts;
}

/**
 * Fetch only active products. Draft and archived products are hidden from
 * the storefront and every customer-facing catalog view — this is what
 * powers the shared `products` list in catalog-context.tsx.
 */
export async function fetchProducts(client: Client): Promise<Product[]> {
  const { data, error } = await client
    .from("products")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }


  return (data ?? []).map(rowToProduct);
}


/**
 * Fetch every product regardless of status, for the admin Products page —
 * an admin needs to see and manage drafts and archived products too, not
 * just what's currently live on the storefront.
 */
export async function fetchAllProductsAdmin(client: Client): Promise<Product[]> {
  const { data, error } = await client
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map(rowToProduct);
}

/**
 * How many order_items rows reference this product. Used to decide
 * whether a hard delete is safe (see deleteProductRow's caller in the
 * admin Products page) — a product with real order history should be
 * archived, not deleted, or the delete will fail the DB's foreign key
 * constraint (order_items.product_id references products(id), no
 * cascade) anyway.
 */
export async function countProductOrderItems(client: Client, id: string): Promise<number> {
  const { count, error } = await client
    .from("order_items")
    .select("id", { count: "exact", head: true })
    .eq("product_id", id);

  if (error) throw error;
  return count ?? 0;
}

export async function insertProduct(
  client: Client,
  product: Product
): Promise<Product> {
  const row = productToRow(product);
  // 1. Try server-side admin products API route (uses service role key to guarantee write)
  if (typeof window !== "undefined") {
    try {
      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(row),
      });
      if (res.ok) {
        const data = await res.json();
        return rowToProduct(data);
      }
    } catch {
      // fallback below
    }
  }

  const { data, error } = await client
    .from("products")
    .insert(row)
    .select()
    .single();

  if (error) throw error;

  return rowToProduct(data);
}

export async function updateProductRow(
  client: Client,
  id: string,
  patch: Partial<Product>
): Promise<Product> {
  const rowPatch: Database["public"]["Tables"]["products"]["Update"] = {};

  if (patch.slug !== undefined) rowPatch.slug = patch.slug;
  if (patch.name !== undefined) rowPatch.name = patch.name;
  if (patch.universe !== undefined) rowPatch.universe = patch.universe;
  if (patch.category !== undefined) rowPatch.category = patch.category;
  if (patch.price !== undefined) rowPatch.price = patch.price;

  if (patch.compareAtPrice !== undefined) {
    rowPatch.compare_at_price = patch.compareAtPrice ?? null;
  }

  if (patch.description !== undefined) {
    rowPatch.description = patch.description;
  }

  if (patch.material !== undefined) {
    rowPatch.material = patch.material;
  }

  if (patch.sizes !== undefined) {
    rowPatch.sizes = patch.sizes;
  }

  if (patch.colors !== undefined) {
    rowPatch.colors = patch.colors;
  }

  if (patch.rating !== undefined) {
    rowPatch.rating = patch.rating;
  }

  if (patch.reviewCount !== undefined) {
    rowPatch.review_count = patch.reviewCount;
  }

  if (patch.stock !== undefined) {
    rowPatch.stock = patch.stock;
  }

  if (patch.tags !== undefined) {
    rowPatch.tags = patch.tags;
  }

  if (patch.artIcon !== undefined) {
    rowPatch.art_icon = patch.artIcon;
  }

  if (patch.images !== undefined) {
    rowPatch.images = patch.images ?? [];
    // Keep the legacy single-image column in sync so components that
    // still read `image` directly (product cards, gallery, etc.) don't
    // fall out of sync with the new media the admin just saved.
    rowPatch.image = patch.images?.[0] ?? null;
  } else if (patch.image !== undefined) {
    rowPatch.image = patch.image ?? null;
  }

  if (patch.video !== undefined) {
    rowPatch.video = patch.video ?? null;
  }

  if (patch.status !== undefined) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (rowPatch as any).is_active = patch.status === "active";
  }


  if (patch.colorImages !== undefined) {
    rowPatch.color_images = patch.colorImages ?? {};
  }

  if (patch.colorVideos !== undefined) {
    rowPatch.color_videos = patch.colorVideos ?? {};
  }

  if (patch.mainColor !== undefined) {
    rowPatch.main_color = patch.mainColor ?? null;
  }

  if (patch.variants !== undefined) {
    rowPatch.variants = (patch.variants ?? []) as unknown as Json;

  }

  // 1. Try server-side admin products API route (uses service role key to guarantee write)
  if (typeof window !== "undefined") {
    try {
      const res = await fetch("/api/admin/products", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, patch: rowPatch }),
      });
      if (res.ok) {
        const data = await res.json();
        return rowToProduct(data);
      }
    } catch {
      // fallback below
    }
  }

  const { data, error } = await client
    .from("products")
    .update(rowPatch)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return rowToProduct(data);
}


/**
 * Permanently delete a product.
 *
 * This should only be used for products that are not referenced by
 * existing order_items — callers should check countProductOrderItems()
 * first and offer Archive instead when it's > 0. The DB itself also
 * enforces this (order_items.product_id references products(id) with no
 * cascade), so a delete against a referenced product fails with a
 * Postgres foreign-key-violation error (code 23503) rather than silently
 * orphaning order history; that error is re-thrown as-is for the caller
 * to handle as a defense-in-depth fallback.
 */
export async function deleteProductRow(
  client: Client,
  id: string
): Promise<void> {
  if (typeof window !== "undefined") {
    try {
      const res = await fetch(`/api/admin/products?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (res.ok) return;
    } catch {
      // fallback
    }
  }

  const { error } = await client
    .from("products")
    .delete()
    .eq("id", id);

  if (error) throw error;
}


/**
 * Archive a product instead of permanently deleting it.
 * This keeps existing orders and order_items intact, and hides the
 * product from the storefront (fetchProducts only returns status='active').
 */
export async function archiveProductRow(
  client: Client,
  id: string
): Promise<void> {
  const { error } = await client
    .from("products")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .update({ is_active: false } as any)
    .eq("id", id);

  if (error) throw error;
}

/**
 * Restore an archived (or draft) product back to active.
 */
export async function restoreProductRow(
  client: Client,
  id: string
): Promise<void> {
  const { error } = await client
    .from("products")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .update({ is_active: true } as any)
    .eq("id", id);

  if (error) throw error;
}

/**
 * Insert-or-update by id, used by the admin CSV importer.
 */
export async function upsertProducts(
  client: Client,
  products: Product[]
): Promise<Product[]> {
  const { data, error } = await client
    .from("products")
    .upsert(products.map(productToRow), {
      onConflict: "id",
    })
    .select();

  if (error) throw error;

  return (data ?? []).map(rowToProduct);
}