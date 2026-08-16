import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { Product } from "@/lib/types";

type Client = SupabaseClient<Database>;
type ProductRow = Database["public"]["Tables"]["products"]["Row"];
type ProductInsert = Database["public"]["Tables"]["products"]["Insert"];

function rowToProduct(row: ProductRow): Product {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    universe: row.universe,
    category: row.category,
    price: Number(row.price),
    compareAtPrice: row.compare_at_price !== null ? Number(row.compare_at_price) : undefined,
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
    createdAt: row.created_at,
  };
}

function productToRow(product: Product): ProductInsert {
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
    image: product.image ?? null,
    created_at: product.createdAt,
  };
}

/**
 * Fetch only active products.
 * Archived products (is_active = false) are hidden from the storefront
 * and normal catalog views.
 */
export async function fetchProducts(client: Client): Promise<Product[]> {
  const { data, error } = await client
    .from("products")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map(rowToProduct);
}

export async function insertProduct(client: Client, product: Product): Promise<Product> {
  const { data, error } = await client
    .from("products")
    .insert(productToRow(product))
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
  if (patch.description !== undefined) rowPatch.description = patch.description;
  if (patch.material !== undefined) rowPatch.material = patch.material;
  if (patch.sizes !== undefined) rowPatch.sizes = patch.sizes;
  if (patch.colors !== undefined) rowPatch.colors = patch.colors;
  if (patch.rating !== undefined) rowPatch.rating = patch.rating;
  if (patch.reviewCount !== undefined) rowPatch.review_count = patch.reviewCount;
  if (patch.stock !== undefined) rowPatch.stock = patch.stock;
  if (patch.tags !== undefined) rowPatch.tags = patch.tags;
  if (patch.artIcon !== undefined) rowPatch.art_icon = patch.artIcon;
  if (patch.image !== undefined) rowPatch.image = patch.image ?? null;

  const { data, error } = await client
    .from("products")
    .update(rowPatch)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return rowToProduct(data);
}

/**
 * Permanently delete a product.
 * This should only be used for products that are not referenced
 * by existing order_items.
 */
export async function deleteProductRow(client: Client, id: string): Promise<void> {
  const { error } = await client
    .from("products")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

/**
 * Archive a product instead of permanently deleting it.
 * This keeps existing orders and order_items intact.
 */
export async function archiveProductRow(client: Client, id: string): Promise<void> {
  const { error } = await client
    .from("products")
    .update({ is_active: false })
    .eq("id", id);

  if (error) throw error;
}

/**
 * Restore an archived product.
 */
export async function restoreProductRow(client: Client, id: string): Promise<void> {
  const { error } = await client
    .from("products")
    .update({ is_active: true })
    .eq("id", id);

  if (error) throw error;
}

/** Insert-or-update by id, used by the admin CSV importer. */
export async function upsertProducts(
  client: Client,
  products: Product[]
): Promise<Product[]> {
  const { data, error } = await client
    .from("products")
    .upsert(products.map(productToRow), { onConflict: "id" })
    .select();

  if (error) throw error;
  return (data ?? []).map(rowToProduct);
}