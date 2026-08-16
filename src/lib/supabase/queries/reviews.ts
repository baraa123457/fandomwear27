import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { Review } from "@/lib/data/reviews";

type Client = SupabaseClient<Database>;
type ReviewRow = Database["public"]["Tables"]["reviews"]["Row"];

function rowToReview(row: ReviewRow): Review {
  return {
    id: row.id,
    author: row.author,
    rating: row.rating,
    title: row.title,
    body: row.body,
    date: row.review_date,
    verified: row.verified,
    size: row.size ?? "M",
  };
}

/** Reviews for a single product, newest first. */
export async function fetchReviewsForProduct(client: Client, productId: string): Promise<Review[]> {
  const { data, error } = await client
    .from("reviews")
    .select("*")
    .eq("product_id", productId)
    .order("review_date", { ascending: false });

  if (error) throw error;
  return (data ?? []).map(rowToReview);
}
