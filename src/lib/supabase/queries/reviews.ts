import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { Review } from "@/lib/data/reviews";

type Client = SupabaseClient<Database>;
type ReviewRow = Database["public"]["Tables"]["reviews"]["Row"];

const REVIEWS_STORAGE_PREFIX = "fandomwear:reviews:";

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
  try {
    const { data, error } = await client
      .from("reviews")
      .select("*")
      .eq("product_id", productId)
      .order("review_date", { ascending: false });

    if (error) {
      if (error.code === "PGRST205" || error.message?.includes("schema cache") || error.message?.includes("reviews")) {
        if (typeof window !== "undefined") {
          const raw = localStorage.getItem(REVIEWS_STORAGE_PREFIX + productId);
          if (raw) return JSON.parse(raw);
        }
        return [];
      }
      throw error;
    }

    const reviews = (data ?? []).map(rowToReview);

    // Merge with any locally stored reviews if table was empty
    if (typeof window !== "undefined") {
      const raw = localStorage.getItem(REVIEWS_STORAGE_PREFIX + productId);
      if (raw) {
        const localReviews: Review[] = JSON.parse(raw);
        const existingIds = new Set(reviews.map((r) => r.id));
        for (const lr of localReviews) {
          if (!existingIds.has(lr.id)) reviews.push(lr);
        }
        reviews.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      }
    }

    return reviews;
  } catch {
    if (typeof window !== "undefined") {
      const raw = localStorage.getItem(REVIEWS_STORAGE_PREFIX + productId);
      if (raw) return JSON.parse(raw);
    }
    return [];
  }
}

export interface CreateReviewInput {
  productId: string;
  author: string;
  rating: number;
  title: string;
  body: string;
  size?: string;
  verified?: boolean;
}

/** Inserts a new customer review into Supabase. */
export async function insertReview(
  client: Client,
  input: CreateReviewInput
): Promise<Review> {
  const reviewId = `rev-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const now = new Date().toISOString();

  const newReview: Review = {
    id: reviewId,
    author: input.author.trim() || "Verified Buyer",
    rating: input.rating,
    title: input.title.trim(),
    body: input.body.trim(),
    date: now,
    verified: input.verified ?? true,
    size: input.size ?? "M",
  };

  try {
    const { error } = await client.from("reviews").insert({
      id: reviewId,
      product_id: input.productId,
      author: newReview.author,
      rating: newReview.rating,
      title: newReview.title,
      body: newReview.body,
      verified: newReview.verified,
      size: (newReview.size as Database["public"]["Enums"]["product_size"]) || "M",
      review_date: now,
    });

    if (error) {
      console.warn("[reviews] Supabase insert error, saving locally:", error);
    }
  } catch (err) {
    console.warn("[reviews] Supabase connection error, saving locally:", err);
  }

  // Always save locally as fallback and immediate cache
  if (typeof window !== "undefined") {
    const raw = localStorage.getItem(REVIEWS_STORAGE_PREFIX + input.productId);
    const list: Review[] = raw ? JSON.parse(raw) : [];
    list.unshift(newReview);
    localStorage.setItem(REVIEWS_STORAGE_PREFIX + input.productId, JSON.stringify(list));
  }

  // Recalculate average rating & review count for the product in Supabase
  try {
    const all = await fetchReviewsForProduct(client, input.productId);
    const avg = all.length > 0 ? all.reduce((sum, r) => sum + r.rating, 0) / all.length : input.rating;
    await client
      .from("products")
      .update({
        rating: Math.round(avg * 10) / 10,
        review_count: all.length,
      })
      .eq("id", input.productId);
  } catch {
    /* best effort */
  }

  return newReview;
}
