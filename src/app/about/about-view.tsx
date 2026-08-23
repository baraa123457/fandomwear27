"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Feather, Recycle, Ruler, Sparkles, ShieldCheck, HeartHandshake } from "lucide-react";
import { resolveIcon } from "@/lib/icon-map";
import { useCatalog } from "@/context/catalog-context";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { Reveal } from "@/components/shared/reveal";
import { Button } from "@/components/ui/button";
import { fadeInUp, staggerContainer, revealOnScroll } from "@/lib/motion";

const values = [
  {
    icon: Sparkles,
    title: "100% Original Artwork",
    body: "Every graphic is designed in-house, inspired by the worlds and characters we grew up loving — never a straight lift, never a generic bootleg print.",
  },
  {
    icon: Ruler,
    title: "Tailored Oversized Streetwear Fit",
    body: "Boxy shoulders, dropped hems, and structured drape. Cut specifically for a modern oversized streetwear silhouette, not merely upsized from a standard tee.",
  },
  {
    icon: Recycle,
    title: "Heavyweight 260GSM Cotton",
    body: "Made with premium heavyweight combed cotton that holds its density, comfort, and shape after dozens of washes.",
  },
  {
    icon: Feather,
    title: "Pre-Shrunk & Garment-Washed",
    body: "Garment-washed and pre-shrunk so what you order is exactly what fits and stays comfortable year after year.",
  },
  {
    icon: ShieldCheck,
    title: "High-Density Screen Printing",
    body: "Printed with durable, fade-resistant inks designed to withstand wash cycles without cracking or peeling.",
  },
  {
    icon: HeartHandshake,
    title: "Customer Satisfaction First",
    body: "Fast reliable delivery across Egypt, hassle-free returns, and dedicated customer support whenever you need help.",
  },
];

export default function AboutView() {
  const { universes, products } = useCatalog();

  const stats = [
    { value: `${products.length}${products.length >= 10 ? "+" : ""}`, label: "Original Designs" },
    { value: String(universes.length), label: "Fandom Universes" },
    { value: "260 GSM", label: "Heavyweight Cotton" },
    { value: "100%", label: "Original Artwork" },
  ];

  return (
    <div>
      {/* Hero */}
      <section id="story" className="relative overflow-hidden border-b border-line pb-16 pt-8 sm:pb-24 sm:pt-10">
        <div
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{ background: "radial-gradient(circle at 20% 20%, #7c5cff22, transparent 55%)" }}
          aria-hidden
        />


        <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
          <Breadcrumbs items={[{ label: "About Us" }]} />

          <motion.div
            variants={fadeInUp}
            initial="hidden"
            animate="show"
            className="mt-8 max-w-3xl"
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-1.5 text-xs font-medium text-ink-dim">
              <span className="h-1.5 w-1.5 rounded-full bg-accent-cyan animate-glow-pulse" />
              Our Story & Craftsmanship
            </span>

            <h1 className="mt-6 text-balance font-display text-4xl font-extrabold tracking-tight text-ink sm:text-5xl lg:text-6xl">
              Wear your favorite universes as{" "}
              <span className="bg-gradient-to-r from-accent-purple via-accent-purple to-accent-cyan bg-clip-text text-transparent">
                premium streetwear.
              </span>
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-relaxed text-ink-dim sm:text-lg">
              FandomWear was created with a clear vision: fandom apparel should never feel cheap, generic, or poorly fitting.
              We blend deep love for iconic anime, gaming, and cinematic universes with premium streetwear design — giving you
              heavyweight cotton, bespoke oversized cuts, and original in-house artwork you can wear anywhere with pride.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" variant="accent">
                <Link href="/shop">
                  Explore The Collection <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/help/contact">Contact Us</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>


      {/* Stats */}
      <Reveal className="border-b border-line bg-surface/40 py-12">
        <motion.div
          variants={staggerContainer}
          {...revealOnScroll}
          className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-5 sm:grid-cols-4 sm:px-8"
        >
          {stats.map((s) => (
            <motion.div key={s.label} variants={fadeInUp} className="text-center sm:text-left">
              <p className="font-display text-3xl font-bold text-ink sm:text-4xl">{s.value}</p>
              <p className="mt-1 text-xs uppercase tracking-wider text-ink-faint">{s.label}</p>
            </motion.div>
          ))}
        </motion.div>
      </Reveal>

      {/* Values */}
      <section id="values" className="border-b border-line py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <Reveal>
            <p className="font-mono text-xs uppercase tracking-widest text-accent-purple">
              Quality & Commitment
            </p>
            <h2 className="mt-3 max-w-lg text-balance font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
              Crafted with intention, built to last.
            </h2>
            <p className="mt-3 max-w-xl text-sm text-ink-dim">
              Every detail — from the weight of the cotton to the precision of the print — is engineered for comfort and longevity.
            </p>
          </Reveal>
          <motion.div
            variants={staggerContainer}
            {...revealOnScroll}
            className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
          >
            {values.map(({ icon: Icon, title, body }) => (
              <motion.div
                key={title}
                variants={fadeInUp}
                className="rounded-2xl border border-line bg-surface p-6 transition-colors hover:border-ink-faint"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-purple/15 text-accent-purple">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-ink">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-dim">{body}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Universes */}
      <section className="border-b border-line bg-surface/40 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <Reveal>
            <p className="font-mono text-xs uppercase tracking-widest text-accent-cyan">
              Explore By Universe
            </p>
            <h2 className="mt-3 max-w-lg text-balance font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
              The worlds we design for
            </h2>
            <p className="mt-3 max-w-md text-sm text-ink-dim">
              From anime legends to gaming icons, find the world that speaks to you.
            </p>
          </Reveal>
          <motion.div
            variants={staggerContainer}
            {...revealOnScroll}
            className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6"
          >
            {universes.map((u) => {
              const Icon = resolveIcon(u.icon);
              return (
                <motion.div key={u.id} variants={fadeInUp}>
                  <Link
                    href={`/shop?universe=${u.id}`}
                    className="group flex flex-col items-center gap-3 rounded-2xl border border-line bg-surface p-5 text-center transition-all hover:border-ink-faint hover:-translate-y-1"
                  >
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-110"
                      style={{ backgroundColor: `${u.color}20`, color: u.color }}
                    >
                      <Icon className="h-6 w-6" />
                    </div>
                    <p className="text-sm font-semibold text-ink">{u.label}</p>
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <Reveal className="py-20 sm:py-28">
        <div className="mx-auto flex max-w-3xl flex-col items-center px-5 text-center sm:px-8">
          <h2 className="text-balance font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Find your next favorite fit.
          </h2>
          <p className="mt-3 max-w-md text-sm text-ink-dim">
            Explore our curated oversized drops, or drop us a line if you have a universe you would like to see next.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Button asChild size="lg" variant="accent">
              <Link href="/shop">
                Shop Collection <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/help/contact">
                Contact Support
              </Link>
            </Button>
          </div>
        </div>
      </Reveal>
    </div>
  );
}
