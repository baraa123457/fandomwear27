"use client";

import { useState } from "react";
import { Star, CheckCircle } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/context/toast-context";
import { createClient } from "@/lib/supabase/client";
import { insertReview, type CreateReviewInput } from "@/lib/supabase/queries/reviews";
import { cn, getErrorMessage } from "@/lib/utils";

interface WriteReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: {
    id: string;
    name: string;
    size?: string;
  };
  defaultAuthor?: string;
  onReviewSubmitted?: () => void;
}

export function WriteReviewDialog({
  open,
  onOpenChange,
  product,
  defaultAuthor = "",
  onReviewSubmitted,
}: WriteReviewDialogProps) {
  const { toast } = useToast();
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [author, setAuthor] = useState(defaultAuthor);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast({ variant: "error", title: "Please enter a review headline" });
      return;
    }
    if (!body.trim()) {
      toast({ variant: "error", title: "Please write your review feedback" });
      return;
    }

    setSubmitting(true);
    try {
      const supabase = createClient();
      const input: CreateReviewInput = {
        productId: product.id,
        author: author.trim() || "Verified Buyer",
        rating,
        title: title.trim(),
        body: body.trim(),
        size: product.size || "M",
        verified: true,
      };

      await insertReview(supabase, input);
      toast({
        variant: "success",
        title: "Review submitted!",
        description: "Thank you for sharing your feedback on this product.",
      });

      onOpenChange(false);
      setTitle("");
      setBody("");
      onReviewSubmitted?.();
    } catch (err) {
      toast({
        variant: "error",
        title: "Couldn't submit review",
        description: getErrorMessage(err),
      });
    } finally {
      setSubmitting(false);
    }
  };

  const activeRating = hoverRating ?? rating;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={`Write a Review — ${product.name}`}
        className="max-w-lg bg-surface border-line"
      >
        <p className="text-xs text-ink-faint">
          Sharing your verified buyer experience for <strong className="text-ink">{product.name}</strong>
          {product.size && <span> (Size: {product.size})</span>}
        </p>

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
          {/* Star Rating Selector */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-ink-faint">
              Rating
            </label>
            <div className="mt-1.5 flex items-center gap-1.5">
              {[1, 2, 3, 4, 5].map((star) => {
                const filled = star <= activeRating;
                return (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(null)}
                    aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
                    className="p-1 transition-transform hover:scale-110 focus:outline-none"
                  >
                    <Star
                      className={cn(
                        "h-6 w-6 transition-colors",
                        filled
                          ? "fill-amber-400 text-amber-400"
                          : "fill-transparent text-ink-faint/40 hover:text-amber-400"
                      )}
                    />
                  </button>
                );
              })}
              <span className="ml-2 text-xs font-medium text-ink-dim">
                {activeRating === 5 && "5 / 5 - Excellent"}
                {activeRating === 4 && "4 / 5 - Very Good"}
                {activeRating === 3 && "3 / 5 - Average"}
                {activeRating === 2 && "2 / 5 - Below Average"}
                {activeRating === 1 && "1 / 5 - Poor"}
              </span>
            </div>
          </div>

          {/* Review Title */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-ink-faint">
              Headline
            </label>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Great quality and comfortable fit!"
              className="mt-1.5 h-11 w-full rounded-xl border border-line bg-void px-4 text-sm text-ink focus:border-accent-cyan focus:outline-none"
            />
          </div>

          {/* Review Body */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-ink-faint">
              Your Review
            </label>
            <textarea
              required
              rows={4}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="What did you like or dislike about this product? How is the material and sizing?"
              className="mt-1.5 w-full rounded-xl border border-line bg-void p-3 text-sm text-ink focus:border-accent-cyan focus:outline-none resize-y"
            />
          </div>

          {/* Reviewer Name */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-ink-faint">
              Display Name
            </label>
            <input
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="e.g. Baraa A."
              className="mt-1.5 h-11 w-full rounded-xl border border-line bg-void px-4 text-sm text-ink focus:border-accent-cyan focus:outline-none"
            />
          </div>

          {/* Verified Buyer Note */}
          <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs text-emerald-400">
            <CheckCircle className="h-4 w-4 shrink-0" />
            <span>This review will be published with a Verified Buyer badge.</span>
          </div>

          {/* Actions */}
          <div className="mt-2 flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="accent"
              size="sm"
              disabled={submitting}
            >
              {submitting ? "Submitting..." : "Submit Review"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
