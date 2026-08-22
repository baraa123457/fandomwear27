"use client";

import { useState } from "react";
import Link from "next/link";
import { Ruler, ArrowRight } from "lucide-react";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { Button } from "@/components/ui/button";

import { cn } from "@/lib/utils";

interface SizeRow {
  size: string;
  chestIn: string;
  chestCm: string;
  lengthIn: string;
  lengthCm: string;
  sleeveIn: string;
  sleeveCm: string;
  recommendedWeight: string;
  recommendedHeight: string;
}

const chart: SizeRow[] = [
  { size: "S", chestCm: "96 – 102", chestIn: "38 – 40", lengthCm: "69", lengthIn: "27", sleeveCm: "22", sleeveIn: "8.5", recommendedWeight: "55 – 68 kg", recommendedHeight: "160 – 172 cm" },
  { size: "M", chestCm: "104 – 110", chestIn: "41 – 43", lengthCm: "71", lengthIn: "28", sleeveCm: "23", sleeveIn: "9", recommendedWeight: "68 – 80 kg", recommendedHeight: "170 – 180 cm" },
  { size: "L", chestCm: "112 – 118", chestIn: "44 – 46", lengthCm: "74", lengthIn: "29", sleeveCm: "24", sleeveIn: "9.5", recommendedWeight: "80 – 92 kg", recommendedHeight: "175 – 186 cm" },
  { size: "XL", chestCm: "120 – 126", chestIn: "47 – 49", lengthCm: "76", lengthIn: "30", sleeveCm: "25.5", sleeveIn: "10", recommendedWeight: "92 – 105 kg", recommendedHeight: "180 – 192 cm" },
  { size: "XXL", chestCm: "127 – 133", chestIn: "50 – 52", lengthCm: "79", lengthIn: "31", sleeveCm: "27", sleeveIn: "10.5", recommendedWeight: "105+ kg", recommendedHeight: "185+ cm" },
];

export default function SizeGuidePage() {
  const [unit, setUnit] = useState<"cm" | "in">("cm");

  return (
    <div className="min-h-screen bg-void pb-24">
      <div className="mx-auto max-w-5xl px-5 pt-8 sm:px-8">
        <Breadcrumbs
          items={[
            { label: "Help Center", href: "/help/contact" },
            { label: "Size Guide" },
          ]}
        />

        {/* Hero Header */}
        <div className="mt-8">
          <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-1 text-xs font-semibold text-accent-cyan">
            <Ruler className="h-3.5 w-3.5" /> Official Size & Fit Guide
          </span>
          <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-5xl">
            Find Your Perfect Oversized Fit
          </h1>
          <p className="mt-3 max-w-2xl text-base text-ink-dim sm:text-lg leading-relaxed">
            All FandomWear tees and hoodies are specifically engineered with a modern streetwear oversized silhouette — dropped shoulders, relaxed boxy drape, and heavyweight combed cotton.
          </p>
        </div>

        {/* Size Chart Card */}
        <div className="mt-10 rounded-3xl border border-line bg-surface p-6 sm:p-8 shadow-xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-line pb-6">
            <div>
              <h2 className="font-display text-lg font-bold text-ink sm:text-xl">
                Oversized T-Shirts & Hoodies Chart
              </h2>
              <p className="mt-1 text-xs text-ink-faint">
                Measurements are taken with the garment laid flat.
              </p>
            </div>

            {/* Unit Switcher */}
            <div className="inline-flex items-center rounded-xl border border-line bg-void p-1 shrink-0">
              <button
                type="button"
                onClick={() => setUnit("cm")}
                className={cn(
                  "rounded-lg px-4 py-1.5 text-xs font-bold transition-all",
                  unit === "cm"
                    ? "bg-accent-cyan text-void shadow-sm"
                    : "text-ink-faint hover:text-ink"
                )}
              >
                Centimeters (CM)
              </button>
              <button
                type="button"
                onClick={() => setUnit("in")}
                className={cn(
                  "rounded-lg px-4 py-1.5 text-xs font-bold transition-all",
                  unit === "in"
                    ? "bg-accent-cyan text-void shadow-sm"
                    : "text-ink-faint hover:text-ink"
                )}
              >
                Inches (IN)
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line bg-surface-raised/60 text-xs font-bold uppercase tracking-wider text-ink-dim">
                  <th className="py-3.5 px-4">Size</th>
                  <th className="py-3.5 px-4">Chest ({unit === "cm" ? "cm" : "in"})</th>
                  <th className="py-3.5 px-4">Length ({unit === "cm" ? "cm" : "in"})</th>
                  <th className="py-3.5 px-4">Sleeve ({unit === "cm" ? "cm" : "in"})</th>
                  <th className="py-3.5 px-4">Est. Weight</th>
                  <th className="py-3.5 px-4">Est. Height</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {chart.map((row) => (
                  <tr key={row.size} className="hover:bg-surface-raised/40 transition-colors">
                    <td className="py-4 px-4 font-extrabold text-ink font-mono text-base">{row.size}</td>
                    <td className="py-4 px-4 font-mono text-ink-dim">
                      {unit === "cm" ? `${row.chestCm} cm` : `${row.chestIn}"`}
                    </td>
                    <td className="py-4 px-4 font-mono text-ink-dim">
                      {unit === "cm" ? `${row.lengthCm} cm` : `${row.lengthIn}"`}
                    </td>
                    <td className="py-4 px-4 font-mono text-ink-dim">
                      {unit === "cm" ? `${row.sleeveCm} cm` : `${row.sleeveIn}"`}
                    </td>
                    <td className="py-4 px-4 text-xs text-ink-faint">{row.recommendedWeight}</td>
                    <td className="py-4 px-4 text-xs text-ink-faint">{row.recommendedHeight}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Measurement Guide & Tips */}
        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          <div className="rounded-2xl border border-line bg-surface p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-purple/15 text-accent-purple font-bold">
              1
            </div>
            <h3 className="mt-4 font-display text-base font-bold text-ink">Chest Width</h3>
            <p className="mt-2 text-xs leading-relaxed text-ink-dim">
              Lay your best-fitting tee flat. Measure straight across from armpit to armpit, then double that number to get your total chest circumference.
            </p>
          </div>

          <div className="rounded-2xl border border-line bg-surface p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-cyan/15 text-accent-cyan font-bold">
              2
            </div>
            <h3 className="mt-4 font-display text-base font-bold text-ink">Total Length</h3>
            <p className="mt-2 text-xs leading-relaxed text-ink-dim">
              Measure from the highest point of the shoulder seam right next to the collar straight down to the bottom hemline.
            </p>
          </div>

          <div className="rounded-2xl border border-line bg-surface p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-red/15 text-accent-red font-bold">
              3
            </div>
            <h3 className="mt-4 font-display text-base font-bold text-ink">Fit Preference</h3>
            <p className="mt-2 text-xs leading-relaxed text-ink-dim">
              Our tees are already cut oversized. Order your standard true size for a relaxed drop-shoulder look, or size down if you prefer a standard tailored fit.
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 rounded-2xl border border-line bg-surface-raised/40 p-6 sm:flex-row sm:p-8">
          <div>
            <h3 className="font-display text-lg font-bold text-ink">Still unsure about your size?</h3>
            <p className="mt-1 text-xs text-ink-dim">
              Contact our team via WhatsApp or email — we reply within minutes with personalized fit advice!
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button asChild variant="outline">
              <Link href="/help/contact">Contact Support</Link>
            </Button>
            <Button asChild variant="accent">
              <Link href="/shop">
                Shop Collection <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
