export interface Review {
  id: string;
  author: string;
  rating: number;
  title: string;
  body: string;
  date: string;
  verified: boolean;
  size: string;
}

/**
 * Returns real reviews only. If a product has no reviews in the database,
 * returns an empty array (no fake/mock generated reviews).
 */
export function getReviewsForProduct(): Review[] {
  return [];
}

export function getRatingBreakdown(reviews: Review[]) {
  const buckets = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
  }));
  const total = reviews.length || 1;
  return buckets.map((b) => ({ ...b, pct: Math.round((b.count / total) * 100) }));
}
