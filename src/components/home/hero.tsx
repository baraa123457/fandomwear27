"use client";

import { useMemo, useRef } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { ArrowRight, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductVisual } from "@/components/shared/product-visual";
import { useCatalog } from "@/context/catalog-context";
import { useHomepageSettings } from "@/context/homepage-settings-context";
import type { Product } from "@/lib/types";

export function Hero() {
  const { products, universes, getUniverse } = useCatalog();
  const { heroProductIds } = useHomepageSettings();


  // Resolve the admin's 3 picks, in order (hero_product_1/2/3), from the
  // real catalog — NOT from Best Sellers and NOT from fixed array
  // indexes. A slot falls back to the next catalog product not already
  // used elsewhere in the Hero whenever it's unpicked or its product no
  // longer exists (e.g. deleted), so the homepage never crashes and
  // never shows the same product twice.
  const heroTees = useMemo(() => {
    const byId = new Map(products.map((p) => [p.id, p]));
    const used = new Set<string>();
    const fallbackPool = [...products].sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));

    const nextFallback = (): Product | undefined => {
      while (fallbackPool.length > 0) {
        const candidate = fallbackPool.shift()!;
        if (!used.has(candidate.id)) return candidate;
      }
      return undefined;
    };

    const resolved: Product[] = [];
    for (const id of heroProductIds) {
      if (id && byId.has(id) && !used.has(id)) {
        const p = byId.get(id)!;
        resolved.push(p);
        used.add(p.id);
      }
    }

    while (resolved.length < 3) {
      const fb = nextFallback();
      if (!fb) break;
      resolved.push(fb);
      used.add(fb.id);
    }

    return resolved;
  }, [products, heroProductIds]);


  const sectionRef = useRef<HTMLElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });

  // Subtle parallax: very slight drift so the hero feels alive without
  // looking broken on mobile. Keep values small so cards don't scroll
  // out of view on smaller screens.
  const bgY = useTransform(scrollYProgress, [0, 1], prefersReducedMotion ? [0, 0] : [0, 15]);
  const teesY = useTransform(scrollYProgress, [0, 1], prefersReducedMotion ? [0, 0] : [0, 30]);


  const ratedProducts = useMemo(() => products.filter((p) => (p.reviewCount ?? 0) > 0 || p.rating > 0), [products]);
  const avgRating = useMemo(() => {
    if (ratedProducts.length === 0) return "5.0";
    const sum = ratedProducts.reduce((acc, p) => acc + p.rating, 0);
    return (sum / ratedProducts.length).toFixed(1);
  }, [ratedProducts]);

  const heroStats = useMemo(
    () => [
      [`${products.length}${products.length >= 10 ? "+" : ""}`, "Designs"],
      [avgRating, "Avg. rating"],
      [String(universes.length), "Universes"],
    ],
    [products.length, avgRating, universes.length]
  );

  return (
    <section ref={sectionRef} className="relative overflow-hidden border-b border-line noise-veil">
      <motion.div
        style={{ y: bgY }}
        className="pointer-events-none absolute inset-0 grid-veil opacity-30"
        aria-hidden
      />
      <div className="relative z-10 mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-5 pb-16 pt-14 sm:px-8 lg:grid-cols-2 lg:pb-28 lg:pt-20">


        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-1.5 text-xs font-medium text-ink-dim">
            <span className="h-1.5 w-1.5 rounded-full bg-accent-cyan animate-glow-pulse" />
            {products.length} original designs · {universes.length} universes
          </span>

          <h1 className="mt-6 text-balance font-display text-5xl font-extrabold leading-[1.02] tracking-tight text-ink sm:text-6xl lg:text-[4.2rem]">
            Wear your favorite
            <br />
            <span className="bg-gradient-to-r from-accent-purple via-accent-purple to-accent-cyan bg-clip-text text-transparent">
              universes.
            </span>
          </h1>

          <p className="mt-6 max-w-md text-balance text-lg leading-relaxed text-ink-dim">
            Premium oversized T-shirts inspired by the games, movies, and legends
            you never grew out of. Original graphics, heavyweight cotton, cut to sit right.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Button asChild size="lg" variant="accent">
              <Link href="/shop">
                Shop Now <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="#collections">
                <Compass className="h-4 w-4" /> Explore Collections
              </Link>
            </Button>
          </div>

          <div className="mt-12 flex items-center gap-8">
            {heroStats.map(([stat, label]) => (
              <div key={label}>
                <p className="font-display text-2xl font-bold text-ink">{stat}</p>
                <p className="text-xs text-ink-faint">{label}</p>
              </div>
            ))}
          </div>
        </motion.div>


        <motion.div
          style={{ y: teesY }}
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, ease: "easeOut", delay: 0.15 }}
          className="relative mx-auto h-[420px] w-full max-w-md sm:h-[520px]"
        >
          {heroTees.length === 0 ? (
            <div className="relative h-full w-full">
              <div className="absolute left-2 top-6 h-64 w-52 rotate-[-9deg] rounded-3xl border border-line/40 bg-surface/40 animate-pulse" />
              <div className="absolute right-0 top-0 h-72 w-56 rotate-[7deg] rounded-3xl border border-line/40 bg-surface/60 animate-pulse" />
              <div className="absolute left-10 bottom-0 h-64 w-52 rotate-[4deg] rounded-3xl border border-line/40 bg-surface/80 animate-pulse" />
            </div>
          ) : (
            heroTees.map((p, i) => {
              const universe = getUniverse(p.universe)!;
              const positions = [
                "left-2 top-6 h-64 w-52 rotate-[-9deg] z-10",
                "right-0 top-0 h-72 w-56 rotate-[7deg] z-20",
                "left-10 bottom-0 h-64 w-52 rotate-[4deg] z-30",
              ];
              return (
                <motion.div
                  key={p.id}
                  className={`absolute ${positions[i]}`}
                  animate={prefersReducedMotion ? undefined : { y: [0, -14, 0] }}
                  transition={{
                    duration: 5 + i,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: i * 0.4,
                  }}
                >
                  <Link
                    href={`/product/${p.slug}`}
                    aria-label={`View ${p.name}`}
                    className="group block h-full w-full rounded-3xl transition-transform duration-300 hover:scale-105 cursor-pointer outline-none focus:outline-none focus-visible:outline-none"
                  >
                    <ProductVisual
                      image={p.image}
                      color={universe.color}
                      icon={p.artIcon}
                      label={p.name}
                      variant="hero"
                      className="h-full w-full border border-line/80 shadow-2xl transition-all duration-300 outline-none"
                    />
                  </Link>

                </motion.div>
              );
            })
          )}
        </motion.div>

      </div>
    </section>
  );
}
