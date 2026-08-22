import { BadgeCheck, MessageSquare, Star } from "lucide-react";
import { Review, getRatingBreakdown } from "@/lib/data/reviews";
import { StarRating } from "@/components/shared/star-rating";
import { Button } from "@/components/ui/button";

export function Reviews({
  reviews,
  averageRating,
  onWriteReview,
}: {
  reviews: Review[];
  averageRating: number;
  onWriteReview?: () => void;
}) {
  if (reviews.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-line bg-surface/50 py-12 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-void border border-line text-ink-faint">
          <MessageSquare className="h-5 w-5" />
        </div>
        <p className="mt-3 font-display text-base font-semibold text-ink">No customer reviews yet</p>
        <p className="mt-1 text-xs text-ink-faint max-w-sm">
          {onWriteReview
            ? "You received this item! Be the first to share your experience with other shoppers."
            : "Only verified buyers can leave a review once their order has been delivered."}
        </p>
        {onWriteReview && (
          <Button
            variant="outline"
            size="sm"
            onClick={onWriteReview}
            className="mt-4 gap-1.5"
          >
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            Write the First Review
          </Button>
        )}
      </div>
    );
  }


  const breakdown = getRatingBreakdown(reviews);

  return (
    <div className="grid grid-cols-1 gap-10 md:grid-cols-[240px_1fr]">
      <div>
        <p className="font-display text-4xl font-bold text-ink">{averageRating.toFixed(1)}</p>
        <StarRating rating={averageRating} size="md" />
        <p className="mt-1.5 text-xs text-ink-faint">Based on {reviews.length} reviews</p>

        <div className="mt-5 flex flex-col gap-1.5">
          {breakdown.map((b) => (
            <div key={b.star} className="flex items-center gap-2 text-xs text-ink-faint">
              <span className="w-3">{b.star}</span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                <div className="h-full rounded-full bg-accent-cyan" style={{ width: `${b.pct}%` }} />
              </div>
              <span className="w-7 text-right">{b.count}</span>
            </div>
          ))}
        </div>

        {onWriteReview && (
          <Button
            variant="outline"
            size="sm"
            onClick={onWriteReview}
            className="mt-6 w-full gap-1.5"
          >
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            Write a Review
          </Button>
        )}
      </div>

      <ul className="flex flex-col gap-6">
        {reviews.map((r) => (
          <li key={r.id} className="border-b border-line pb-6 last:border-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <StarRating rating={r.rating} />
                {r.verified && (
                  <span className="flex items-center gap-1 text-[11px] text-accent-cyan">
                    <BadgeCheck className="h-3.5 w-3.5" /> Verified
                  </span>
                )}
              </div>
              <time className="text-xs text-ink-faint" dateTime={r.date}>
                {new Date(r.date).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
              </time>
            </div>
            <p className="mt-2 text-sm font-semibold text-ink">{r.title}</p>
            <p className="mt-1 text-sm leading-relaxed text-ink-dim">{r.body}</p>
            <p className="mt-2 text-xs text-ink-faint">
              {r.author} · Size {r.size}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
