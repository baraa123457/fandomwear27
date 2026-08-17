"use client";

import { useEffect, useRef, useState } from "react";
import { useCatalog } from "@/context/catalog-context";
import type { UniverseInfo } from "@/lib/types";

// Shared so the hidden measuring copy and the two visible groups render
// byte-for-byte identical markup — if they ever drifted, the seam between
// the two groups would be visible as a jump instead of a seamless loop.
function MarqueeItem({ universe }: { universe: UniverseInfo }) {
  return (
    <span className="flex shrink-0 items-center gap-2 font-display text-sm font-semibold uppercase tracking-widest text-ink-faint">
      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: universe.color }} />
      {universe.label}
    </span>
  );
}

export function UniverseMarquee() {
  const { universes } = useCatalog();
  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);

  // How many times a single pass over `universes` needs to repeat so that
  // ONE of the two marquee groups is at least as wide as the container.
  // Not hardcoded: measured from the real rendered width, so it adapts to
  // any viewport width and any number of universes (5 universes on a
  // 1920px screen need far more repeats than on a 390px screen).
  const [repeat, setRepeat] = useState(1);

  useEffect(() => {
    if (universes.length === 0) return;

    const container = containerRef.current;
    const measure = measureRef.current;
    if (!container || !measure) return;

    const recompute = () => {
      const containerWidth = container.offsetWidth;
      const singleSetWidth = measure.scrollWidth;
      if (singleSetWidth === 0 || containerWidth === 0) return;

      // Enough copies of the full universe list to cover the container,
      // plus one extra as a buffer so sub-pixel rounding (or a resize
      // mid-animation) never leaves a hairline gap at the track's edge.
      const needed = Math.ceil(containerWidth / singleSetWidth) + 1;
      setRepeat(Math.max(needed, 1));
    };

    recompute();

    // Viewport width and universe count (and therefore singleSetWidth)
    // can both change after mount — re-measure whenever either does.
    const observer = new ResizeObserver(recompute);
    observer.observe(container);
    observer.observe(measure);
    return () => observer.disconnect();
  }, [universes]);

  if (universes.length === 0) return null;

  // One "group" = the universe list repeated `repeat` times, guaranteed
  // to be at least as wide as the container. The track holds two
  // identical groups back to back; animating by exactly the width of one
  // group (via the `marquee` keyframes' -50% on a track made of two
  // equal halves) loops seamlessly with no gap and no arbitrary width.
  const group = Array.from({ length: repeat }, () => universes).flat();

  return (
    <div ref={containerRef} className="relative w-full overflow-hidden border-b border-line bg-surface py-4">
      {/* Hidden, unrepeated copy used only to measure the real rendered
          width of a single pass over `universes` (see recompute above).
          Not part of the visible marquee. */}
      <div
        ref={measureRef}
        aria-hidden="true"
        className="pointer-events-none invisible absolute left-0 top-0 flex items-center gap-10"
      >
        {universes.map((u) => (
          <MarqueeItem key={u.id} universe={u} />
        ))}
      </div>

      <div className="flex w-max animate-marquee gap-10">
        {[0, 1].map((set) => (
          <div key={set} className="flex shrink-0 items-center gap-10" aria-hidden={set === 1}>
            {group.map((u, i) => (
              <MarqueeItem key={`${set}-${i}-${u.id}`} universe={u} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
