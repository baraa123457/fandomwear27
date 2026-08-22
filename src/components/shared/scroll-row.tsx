"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface ScrollRowProps {
  children: React.ReactNode;
  className?: string;
}

const TRACK_GAP_PX = 16;

export function ScrollRow({ children, className }: ScrollRowProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const update = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    setCanScrollLeft(el.scrollLeft > 6);
    setCanScrollRight(el.scrollLeft < maxScroll - 6);
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
    const firstCard = el.firstElementChild as HTMLElement | null;
    const cardWidth = firstCard?.getBoundingClientRect().width ?? 240;
    const step = (cardWidth + TRACK_GAP_PX) * Math.max(1, Math.floor(el.clientWidth / (cardWidth + TRACK_GAP_PX)));
    el.scrollBy({ left: direction === "left" ? -step : step, behavior: "smooth" });
  };

  return (
    <div className="group/scroll relative w-full">
      {/* Scrollable Track - No negative margins, no card clipping */}
      <div
        ref={trackRef}
        className={cn(
          "flex snap-x snap-mandatory gap-4 overflow-x-auto p-1 pb-4 scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          className
        )}
      >
        {children}
      </div>

      {/* Left Navigation Arrow */}
      <button
        type="button"
        aria-label="Previous products"
        onClick={() => scrollByPage("left")}
        className={cn(
          "absolute -left-3.5 top-1/3 z-30 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-surface/90 text-ink shadow-2xl backdrop-blur-md transition-all duration-300 hover:scale-110 hover:border-accent-cyan hover:text-accent-cyan active:scale-95 md:flex",
          canScrollLeft
            ? "opacity-100 cursor-pointer"
            : "opacity-0 pointer-events-none -translate-x-2"
        )}
      >
        <ChevronLeft className="h-5 w-5" />
      </button>

      {/* Right Navigation Arrow */}
      <button
        type="button"
        aria-label="Next products"
        onClick={() => scrollByPage("right")}
        className={cn(
          "absolute -right-3.5 top-1/3 z-30 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-surface/90 text-ink shadow-2xl backdrop-blur-md transition-all duration-300 hover:scale-110 hover:border-accent-cyan hover:text-accent-cyan active:scale-95 md:flex",
          canScrollRight
            ? "opacity-100 cursor-pointer"
            : "opacity-0 pointer-events-none translate-x-2"
        )}
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}
