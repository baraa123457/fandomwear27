import { BadgeCheck } from "lucide-react";
import { Review, getRatingBreakdown } from "@/lib/data/reviews";
import { StarRating } from "@/components/shared/star-rating";

export function Reviews({
  reviews,
  averageRating,
}: {
  reviews: Review[];
  averageRating: number;
}) {
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
