"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  RotateCw,
} from "lucide-react";
import { Product } from "@/lib/types";
import { ProductVisual } from "@/components/shared/product-visual";
import { cn } from "@/lib/utils";

type MediaItem =
  | { type: "image"; src: string; label: string }
  | { type: "video"; src: string; label: string };

function formatTime(seconds: number) {

  if (isNaN(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

function ProductVideoPlayer({ src, poster }: { src: string; poster?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Auto-play immediately when mounted
    video.muted = true;
    video.play().catch(() => {
      setIsPlaying(false);
    });

    const onTimeUpdate = () => {
      if (!video.duration) return;
      setCurrentTime(video.currentTime);
      setProgress((video.currentTime / video.duration) * 100);
    };

    const onLoadedMetadata = () => {
      setDuration(video.duration);
    };

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("loadedmetadata", onLoadedMetadata);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);

    return () => {
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("loadedmetadata", onLoadedMetadata);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
    };
  }, [src]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      void video.play();
    } else {
      video.pause();
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  const toggleFullscreen = (e: React.MouseEvent) => {
    e.stopPropagation();
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      void container.requestFullscreen().then(() => setIsFullscreen(true));
    } else {
      void document.exitFullscreen().then(() => setIsFullscreen(false));
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    video.currentTime = pos * duration;
  };

  const handleUserInteraction = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 2800);
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleUserInteraction}
      onClick={togglePlay}
      className="group relative h-full w-full select-none overflow-hidden bg-void flex items-center justify-center cursor-pointer"
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        playsInline
        loop
        muted={isMuted}
        className="h-full w-full object-contain"
      />

      {/* Center Big Play Button (When Paused) */}
      <AnimatePresence>
        {!isPlaying && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="pointer-events-none absolute inset-0 flex items-center justify-center bg-void/30 backdrop-blur-[2px]"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/20 bg-void/80 text-white shadow-2xl backdrop-blur-md">
              <Play className="h-7 w-7 translate-x-0.5 fill-white" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Floating Badge */}
      <div className="absolute top-4 left-4 flex items-center gap-2 rounded-full border border-line/60 bg-void/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-ink backdrop-blur-md">
        <span className="h-2 w-2 rounded-full bg-accent-red animate-pulse" />
        Video Preview
      </div>

      {/* Custom Bottom Luxury Control Bar */}
      <div
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "absolute inset-x-0 bottom-0 flex flex-col gap-2 bg-gradient-to-t from-void/90 via-void/50 to-transparent p-4 transition-opacity duration-300",
          showControls || !isPlaying ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      >
        {/* Progress Bar */}
        <div
          onClick={handleSeek}
          className="group/seek relative flex h-3 w-full cursor-pointer items-center"
        >
          <div className="h-1 w-full rounded-full bg-white/20 transition-all group-hover/seek:h-1.5">
            <div
              className="h-full rounded-full bg-accent-cyan"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Controls Row */}
        <div className="flex items-center justify-between text-xs text-white">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={togglePlay}
              aria-label={isPlaying ? "Pause" : "Play"}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition-all hover:bg-white/25 active:scale-95"
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 fill-white" />}
            </button>

            <button
              type="button"
              onClick={toggleMute}
              aria-label={isMuted ? "Unmute" : "Mute"}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition-all hover:bg-white/25 active:scale-95"
            >
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>

            <span className="font-mono text-[11px] text-white/80">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <button
            type="button"
            onClick={toggleFullscreen}
            aria-label="Toggle Fullscreen"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition-all hover:bg-white/25 active:scale-95"
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}

function getColorMedia<T>(
  dict: Record<string, T> | undefined,
  colorName: string | undefined
): T | undefined {
  if (!dict || !colorName) return undefined;
  if (dict[colorName] !== undefined) return dict[colorName];
  const target = colorName.trim().toLowerCase();
  const foundKey = Object.keys(dict).find(
    (k) => k.trim().toLowerCase() === target
  );
  return foundKey !== undefined ? dict[foundKey] : undefined;
}

export function ProductGallery({
  product,
  color,
  selectedColor,
}: {
  product: Product;
  color: string;
  selectedColor?: string;
}) {
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState(false);
  const [origin, setOrigin] = useState("50% 50%");
  const [spinning, setSpinning] = useState(false);
  const frameRef = useRef<HTMLDivElement>(null);

  // Switch to the first photo whenever customer selects a different color
  useEffect(() => {
    setActive(0);
  }, [selectedColor]);

  const photos = useMemo(() => {
    // 1. Color-specific photos for currently selected color
    const colorImgs = getColorMedia(product.colorImages, selectedColor);
    if (Array.isArray(colorImgs) && colorImgs.length > 0) {
      return colorImgs.filter(Boolean);
    }

    // 2. Main color gallery photos
    const mainImgs = getColorMedia(product.colorImages, product.mainColor);
    if (Array.isArray(mainImgs) && mainImgs.length > 0) {
      return mainImgs.filter(Boolean);
    }

    // 3. First available color gallery with photos
    if (product.colorImages) {
      for (const key of Object.keys(product.colorImages)) {
        const arr = product.colorImages[key];
        if (Array.isArray(arr) && arr.length > 0) {
          return arr.filter(Boolean);
        }
      }
    }

    // 4. General product images array
    if (Array.isArray(product.images) && product.images.length > 0) {
      return product.images.filter(Boolean);
    }

    // 5. Single image column fallback
    if (product.image) {
      return [product.image];
    }

    return [];
  }, [product.images, product.image, product.colorImages, product.mainColor, selectedColor]);

  const activeVideo = useMemo(() => {
    const colorVid = getColorMedia(product.colorVideos, selectedColor);
    if (colorVid) return colorVid;
    const mainVid = getColorMedia(product.colorVideos, product.mainColor);
    if (mainVid) return mainVid;
    if (product.colorVideos) {
      for (const key of Object.keys(product.colorVideos)) {
        if (product.colorVideos[key]) return product.colorVideos[key];
      }
    }
    return product.video || null;
  }, [selectedColor, product.colorVideos, product.mainColor, product.video]);


  const activeColorHex = useMemo(() => {
    const found = product.colors?.find(
      (c) => c.name.trim().toLowerCase() === selectedColor?.trim().toLowerCase()
    );
    return found?.hex || color;
  }, [product.colors, selectedColor, color]);

  const media: MediaItem[] = useMemo(() => {
    const items: MediaItem[] = photos.map((src, i) => ({
      type: "image",
      src,
      label: `Photo ${i + 1}`,
    }));
    if (activeVideo) {
      items.push({ type: "video", src: activeVideo, label: "Video Preview" });
    }
    return items;
  }, [photos, activeVideo]);

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
          "relative aspect-square w-full overflow-hidden rounded-3xl border border-line bg-surface shadow-lg",
          !isVideoActive && "cursor-zoom-in"
        )}
      >
        {isVideoActive ? (
          <ProductVideoPlayer src={activeItem.src} poster={heroImage} />
        ) : (
          <motion.div
            animate={spinning ? { rotateY: 360 } : { rotateY: 0 }}
            transition={{ duration: 1.1, ease: "easeInOut" }}
            className="h-full w-full"
            style={{ transformStyle: "preserve-3d" }}
          >
            <ProductVisual
              image={heroImage}
              color={activeColorHex}
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
              className="absolute bottom-4 right-4 flex items-center gap-1.5 rounded-full bg-void/70 px-3.5 py-2 text-xs font-medium text-ink backdrop-blur transition-colors hover:bg-void/90 border border-line/60 shadow-lg"
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
                "relative aspect-square flex-1 overflow-hidden rounded-xl border transition-all duration-200",
                activeIndex === i
                  ? "border-accent-cyan ring-2 ring-accent-cyan/30 scale-[1.02]"
                  : "border-line opacity-80 hover:opacity-100 hover:border-ink-faint"
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
                  <span className="absolute inset-0 flex items-center justify-center bg-void/60 backdrop-blur-[1px]">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-cyan text-void shadow-lg">
                      <Play className="h-4 w-4 translate-x-0.5 fill-current" />
                    </div>
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
              <span className="absolute bottom-1.5 left-1.5 rounded-full bg-void/80 px-2 py-0.5 text-[10px] font-semibold text-ink backdrop-blur">
                {item.label}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
