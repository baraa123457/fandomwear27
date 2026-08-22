"use client";

import { useState } from "react";
import { Ruler } from "lucide-react";
import { Dialog, DialogTrigger, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface SizeRow {
  size: string;
  chestIn: string;
  chestCm: string;
  lengthIn: string;
  lengthCm: string;
  sleeveIn: string;
  sleeveCm: string;
}

const chart: SizeRow[] = [
  { size: "S", chestCm: "96 – 102", chestIn: "38 – 40", lengthCm: "69", lengthIn: "27", sleeveCm: "22", sleeveIn: "8.5" },
  { size: "M", chestCm: "104 – 110", chestIn: "41 – 43", lengthCm: "71", lengthIn: "28", sleeveCm: "23", sleeveIn: "9" },
  { size: "L", chestCm: "112 – 118", chestIn: "44 – 46", lengthCm: "74", lengthIn: "29", sleeveCm: "24", sleeveIn: "9.5" },
  { size: "XL", chestCm: "120 – 126", chestIn: "47 – 49", lengthCm: "76", lengthIn: "30", sleeveCm: "25.5", sleeveIn: "10" },
  { size: "XXL", chestCm: "127 – 133", chestIn: "50 – 52", lengthCm: "79", lengthIn: "31", sleeveCm: "27", sleeveIn: "10.5" },
];

export function SizeGuideDialog() {
  const [unit, setUnit] = useState<"cm" | "in">("cm");

  return (
    <Dialog>
      <DialogTrigger className="flex items-center gap-1.5 text-xs font-medium text-ink-dim underline underline-offset-4 hover:text-ink transition-colors">
        <Ruler className="h-3.5 w-3.5" /> Size guide
      </DialogTrigger>
      <DialogContent title="Size Guide">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-ink-dim leading-relaxed">
              All measurements taken flat. FandomWear tees are cut for an oversized fit — if you prefer a tighter fit, consider sizing down.
            </p>

            {/* Unit Switcher: CM / IN */}
            <div className="inline-flex shrink-0 items-center rounded-xl border border-line bg-void p-1">
              <button
                type="button"
                onClick={() => setUnit("cm")}
                className={cn(
                  "rounded-lg px-2.5 py-1 text-xs font-semibold transition-all",
                  unit === "cm"
                    ? "bg-accent-cyan text-void shadow-sm"
                    : "text-ink-faint hover:text-ink"
                )}
              >
                CM
              </button>
              <button
                type="button"
                onClick={() => setUnit("in")}
                className={cn(
                  "rounded-lg px-2.5 py-1 text-xs font-semibold transition-all",
                  unit === "in"
                    ? "bg-accent-cyan text-void shadow-sm"
                    : "text-ink-faint hover:text-ink"
                )}
              >
                INCHES
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-line bg-surface">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-line bg-surface-raised/60 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
                  <th className="py-3 px-4">Size</th>
                  <th className="py-3 px-4">Chest ({unit === "cm" ? "cm" : "in"})</th>
                  <th className="py-3 px-4">Length ({unit === "cm" ? "cm" : "in"})</th>
                  <th className="py-3 px-4">Sleeve ({unit === "cm" ? "cm" : "in"})</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {chart.map((row) => (
                  <tr key={row.size} className="hover:bg-surface-raised/40 transition-colors">
                    <td className="py-3 px-4 font-bold text-ink">{row.size}</td>
                    <td className="py-3 px-4 font-mono text-ink-dim">
                      {unit === "cm" ? `${row.chestCm} cm` : `${row.chestIn}"`}
                    </td>
                    <td className="py-3 px-4 font-mono text-ink-dim">
                      {unit === "cm" ? `${row.lengthCm} cm` : `${row.lengthIn}"`}
                    </td>
                    <td className="py-3 px-4 font-mono text-ink-dim">
                      {unit === "cm" ? `${row.sleeveCm} cm` : `${row.sleeveIn}"`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rounded-xl border border-line/80 bg-surface-raised/40 p-3 text-[11px] text-ink-faint">
            💡 <strong className="text-ink">Pro tip:</strong> Measure your favorite oversized tee laid flat from armpit to armpit to find your perfect chest match.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
