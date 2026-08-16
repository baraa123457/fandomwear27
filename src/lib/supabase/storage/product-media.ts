import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

/**
 * Bucket created in supabase/migrations/20260816000014_product_media_storage.sql.
 * Public read, admin-only write (enforced by Storage RLS, not by this
 * client-side helper — this module never bypasses RLS).
 */
export const PRODUCT_MEDIA_BUCKET = "product-media";

function fileExtension(filename: string, fallback: string) {
  const match = /\.([a-zA-Z0-9]+)$/.exec(filename);
  return (match?.[1] || fallback).toLowerCase();
}

// Unique per upload (not per slot) so a "replace" never overwrites the
// still-live old file in place — the old and new objects briefly coexist,
// which is what lets the save flow upload-then-write-db-then-delete-old
// without ever leaving the product pointing at a half-replaced file if the
// DB write fails partway through.
function uniqueSuffix() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function isBucketMissingError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const message = "message" in error && typeof (error as { message?: unknown }).message === "string"
    ? (error as { message: string }).message
    : "";
  return message.toLowerCase().includes("bucket not found");
}

async function uploadToProductMedia(
  client: Client,
  path: string,
  file: File
): Promise<string> {
  const { error } = await client.storage
    .from(PRODUCT_MEDIA_BUCKET)
    .upload(path, file, {
      contentType: file.type || undefined,
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    // The bucket is created by supabase/migrations/20260816000014_product_media_storage.sql
    // (infrastructure, not app code — we deliberately never create it from
    // the client). If that migration hasn't been pushed to this project's
    // remote database yet, Storage returns a generic "Bucket not found"
    // that's meaningless to an admin filling out the product form. Surface
    // something actionable instead, while preserving the original error
    // as `cause` for anyone debugging from the console.
    if (isBucketMissingError(error)) {
      throw new Error(
        "Product media storage bucket is missing. Apply the Supabase storage migration (supabase db push) and try again.",
        { cause: error }
      );
    }
    throw error;
  }

  const { data } = client.storage.from(PRODUCT_MEDIA_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/** Uploads one product photo for the given slot (0 = main/front, 1, 2). */
export async function uploadProductImage(
  client: Client,
  productId: string,
  slot: 0 | 1 | 2,
  file: File
): Promise<string> {
  const ext = fileExtension(file.name, "jpg");
  const path = `products/${productId}/image-${slot + 1}-${uniqueSuffix()}.${ext}`;
  return uploadToProductMedia(client, path, file);
}

/** Uploads the (single, optional) product video. */
export async function uploadProductVideo(
  client: Client,
  productId: string,
  file: File
): Promise<string> {
  const ext = fileExtension(file.name, "mp4");
  const path = `products/${productId}/video-${uniqueSuffix()}.${ext}`;
  return uploadToProductMedia(client, path, file);
}

/**
 * Recovers the Storage object path from one of our own public URLs, e.g.
 * `https://<ref>.supabase.co/storage/v1/object/public/product-media/products/p1/image-1-xyz.jpg`
 * -> `products/p1/image-1-xyz.jpg`.
 * Returns null for anything that isn't one of our own public URLs —
 * legacy Base64 data URLs, hand-entered external URLs, etc. — so we never
 * attempt (and fail) to delete something we don't own.
 */
export function productMediaPathFromUrl(url: string): string | null {
  const marker = `/object/public/${PRODUCT_MEDIA_BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return decodeURIComponent(url.slice(idx + marker.length));
}

/**
 * Best-effort delete of a single product-media object, identified by its
 * public URL. Never throws — a failed cleanup should never surface as a
 * failed save when the database write it's cleaning up after already
 * succeeded (or, on the rollback path, is about to be reported some other
 * way). Failures are logged so they're not silently lost.
 */
export async function deleteProductMediaByUrl(
  client: Client,
  url: string | null | undefined
): Promise<void> {
  if (!url) return;
  const path = productMediaPathFromUrl(url);
  if (!path) return;

  const { error } = await client.storage.from(PRODUCT_MEDIA_BUCKET).remove([path]);
  if (error) {
    console.error("[product-media] Failed to delete storage object:", path, error);
  }
}

export async function deleteProductMediaMany(
  client: Client,
  urls: Array<string | null | undefined>
): Promise<void> {
  await Promise.all(urls.map((url) => deleteProductMediaByUrl(client, url)));
}
