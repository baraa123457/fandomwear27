"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ScrollRowProps {
  children: React.ReactNode;
  className?: string;
}

// Matches the track's `gap-4` below — used to size a scroll step off the
// actual rendered card width instead of a hardcoded pixel guess.
const TRACK_GAP_PX = 16;

export function ScrollRow({ children, className }: ScrollRowProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const update = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < maxScroll - 4);
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;

    update();
    el.addEventListener("scroll", update, { passive: true });
    const resizeObserver = new ResizeObserver(update);
    resizeObserver.observe(el);
    window.addEventListener("resize", update);

    return () => {
      el.removeEventListener("scroll", update);
      resizeObserver.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [update]);

  const scrollByPage = (direction: "left" | "right") => {
    const el = trackRef.current;
    if (!el) return;
    // Step by however many cards actually fit in the visible track at the
    // current viewport width (minimum 1), so this adapts automatically to
    // the existing responsive card sizing instead of a fixed pixel jump.
    const firstCard = el.firstElementChild as HTMLElement | null;
    const cardWidth = firstCard?.getBoundingClientRect().width ?? el.clientWidth;
    const step = (cardWidth + TRACK_GAP_PX) * Math.max(1, Math.floor(el.clientWidth / (cardWidth + TRACK_GAP_PX)));
    el.scrollBy({ left: direction === "left" ? -step : step, behavior: "smooth" });
  };

  return (
    <div className="relative -mx-5 sm:-mx-8">
      <div
        ref={trackRef}
        className={cn(
          "flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2 sm:px-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          className
        )}
      >
        {children}
      </div>
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-surface to-transparent transition-opacity duration-300 sm:w-16",
          canScrollLeft ? "opacity-100" : "opacity-0"
        )}
      />
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-surface to-transparent transition-opacity duration-300 sm:w-16",
          canScrollRight ? "opacity-100" : "opacity-0"
        )}
      />

      {/* Desktop-only nav arrows, positioned over the row's edges. Touch
          devices keep using native swipe/scroll on the track above — these
          are an addition, not a replacement. */}
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label="Previous products"
        onClick={() => scrollByPage("left")}
        disabled={!canScrollLeft}
        className="absolute left-2 top-1/2 hidden -translate-y-1/2 rounded-full bg-void/90 backdrop-blur sm:left-4 sm:flex"
      >
        <ChevronLeft className="h-4.5 w-4.5" />
      </Button>
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label="Next products"
        onClick={() => scrollByPage("right")}
        disabled={!canScrollRight}
        className="absolute right-2 top-1/2 hidden -translate-y-1/2 rounded-full bg-void/90 backdrop-blur sm:right-4 sm:flex"
      >
        <ChevronRight className="h-4.5 w-4.5" />
      </Button>
    </div>
  );
}
