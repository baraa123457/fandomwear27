import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

export async function fetchWishlistIds(client: Client, userId: string): Promise<string[]> {
  const { data, error } = await client.from("wishlist_items").select("product_id").eq("user_id", userId);
  if (error) throw error;
  return (data ?? []).map((row) => row.product_id);
}

export async function addWishlistItem(client: Client, userId: string, productId: string): Promise<void> {
  const { error } = await client
    .from("wishlist_items")
    .insert({ user_id: userId, product_id: productId });
  if (error) throw error;
}

export async function removeWishlistItem(client: Client, userId: string, productId: string): Promise<void> {
  const { error } = await client
    .from("wishlist_items")
    .delete()
    .eq("user_id", userId)
    .eq("product_id", productId);
  if (error) throw error;
}
