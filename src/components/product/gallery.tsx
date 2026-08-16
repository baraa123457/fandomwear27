"use client";

import { useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Play, RotateCw } from "lucide-react";
import { Product } from "@/lib/types";
import { ProductVisual } from "@/components/shared/product-visual";
import { cn } from "@/lib/utils";

type MediaItem =
  | { type: "image"; src: string; label: string }
  | { type: "video"; src: string; label: string };

const ANGLE_LABELS = ["Front", "Back", "Detail"];

export function ProductGallery({ product, color }: { product: Product; color: string }) {
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState(false);
  const [origin, setOrigin] = useState("50% 50%");
  const [spinning, setSpinning] = useState(false);
  const frameRef = useRef<HTMLDivElement>(null);

  // Up to 3 product photos. Falls back to the legacy single `image` field
  // for products saved before the `images` array existed, and safely
  // handles it being missing, empty, or containing fewer than 3 entries.
  const photos = useMemo(() => {
    if (Array.isArray(product.images) && product.images.length > 0) {
      return product.images.filter(Boolean).slice(0, 3);
    }
    return product.image ? [product.image] : [];
  }, [product.images, product.image]);

  // Media slots shown as thumbnails: real photos first, then a video slot
  // only if the product actually has one. No placeholder/unused slots.
  const media: MediaItem[] = useMemo(() => {
    const items: MediaItem[] = photos.map((src, i) => ({
      type: "image",
      src,
      label: ANGLE_LABELS[i] ?? `Photo ${i + 1}`,
    }));
    if (product.video) {
      items.push({ type: "video", src: product.video, label: "Video" });
    }
    return items;
  }, [photos, product.video]);

  // Guard against `active` pointing past the end (e.g. media shrank).
  const activeIndex = active < media.length ? active : 0;
  const activeItem = media[activeIndex];
  const isVideoActive = activeItem?.type === "video";
  const heroImage = activeItem?.type === "image" ? activeItem.src : photos[0];

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isVideoActive) return;
    const rect = frameRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setOrigin(`${x}% ${y}%`);
  };

  return (
    <div>
      <div
        ref={frameRef}
        onMouseEnter={() => !isVideoActive && setZoom(true)}
        onMouseLeave={() => setZoom(false)}
        onMouseMove={handleMouseMove}
        className={cn(
          "relative aspect-square w-full overflow-hidden rounded-3xl border border-line bg-surface",
          !isVideoActive && "cursor-zoom-in"
        )}
      >
        {isVideoActive ? (
          // Only mounted while the video slide is active, so the browser
          // never fetches video data for products without one (or for
          // products that have one, until the person picks the tab).
          <video
            key={activeItem.src}
            src={activeItem.src}
            poster={heroImage}
            controls
            playsInline
            preload="none"
            className="h-full w-full object-contain bg-void"
          >
            Your browser does not support embedded video.
          </video>
        ) : (
          <motion.div
            animate={spinning ? { rotateY: 360 } : { rotateY: 0 }}
            transition={{ duration: 1.1, ease: "easeInOut" }}
            className="h-full w-full"
            style={{ transformStyle: "preserve-3d" }}
          >
            <ProductVisual
              image={heroImage}
              color={color}
              icon={product.artIcon}
              label={`${product.name}${activeItem ? ` — ${activeItem.label}` : ""}`}
              variant="hero"
              className={cn(
                "h-full w-full transition-transform duration-300 ease-out",
                zoom && "scale-[1.6]"
              )}
            />
          </motion.div>
        )}

        {!isVideoActive && (
          <>
            <div
              className="pointer-events-none absolute inset-0"
              style={{ transformOrigin: origin }}
            />
            <button
              onClick={() => setSpinning(true)}
              onAnimationEnd={() => setSpinning(false)}
              className="absolute bottom-4 right-4 flex items-center gap-1.5 rounded-full bg-void/70 px-3.5 py-2 text-xs font-medium text-ink backdrop-blur transition-colors hover:bg-void/90"
            >
              <RotateCw className={cn("h-3.5 w-3.5", spinning && "animate-spin")} />
              360° preview
            </button>
          </>
        )}
      </div>

      {media.length > 1 && (
        <div className="mt-4 flex gap-3">
          {media.map((item, i) => (
            <button
              key={`${item.type}-${i}`}
              onClick={() => setActive(i)}
              className={cn(
                "relative aspect-square flex-1 overflow-hidden rounded-xl border transition-colors",
                activeIndex === i ? "border-accent-cyan" : "border-line hover:border-ink-faint"
              )}
            >
              {item.type === "video" ? (
                <div className="relative h-full w-full">
                  <ProductVisual
                    image={photos[0]}
                    color={color}
                    icon={product.artIcon}
                    label="Video"
                    className="h-full w-full"
                  />
                  <span className="absolute inset-0 flex items-center justify-center bg-void/50">
                    <Play className="h-5 w-5 fill-ink text-ink" />
                  </span>
                </div>
              ) : (
                <ProductVisual
                  image={item.src}
                  color={color}
                  icon={product.artIcon}
                  label={item.label}
                  className="h-full w-full"
                />
              )}
              <span className="absolute bottom-1.5 left-1.5 rounded-full bg-void/70 px-2 py-0.5 text-[10px] font-medium text-ink backdrop-blur">
                {item.label}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
