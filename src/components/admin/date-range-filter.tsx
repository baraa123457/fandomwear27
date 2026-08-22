"use client";

import { Calendar } from "lucide-react";
import { Dropdown } from "@/components/shared/dropdown";
import { DATE_RANGE_PRESETS, type DateRangePreset } from "@/lib/admin/dashboard-metrics";

interface DateRangeFilterProps {
  preset: DateRangePreset;
  customStart: string;
  customEnd: string;
  onPresetChange: (preset: DateRangePreset) => void;
  onCustomChange: (range: { start: string; end: string }) => void;
  /** Which presets to show in the dropdown. Defaults to the full dashboard set. */
  presets?: { value: DateRangePreset; label: string }[];
}

export function DateRangeFilter({
  preset,
  customStart,
  customEnd,
  onPresetChange,
  onCustomChange,
  presets = DATE_RANGE_PRESETS,
}: DateRangeFilterProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="hidden items-center gap-1.5 text-xs text-ink-faint sm:flex">
        <Calendar className="h-3.5 w-3.5" />
      </span>
      <Dropdown
        value={preset}
        options={presets}
        onChange={onPresetChange}
        ariaLabel="Filter dashboard by date range"
      />
      {preset === "custom" && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={customStart}
            max={customEnd || undefined}
            onChange={(e) => onCustomChange({ start: e.target.value, end: customEnd })}
            className="h-11 rounded-full border border-line bg-surface px-3 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan"
            aria-label="Custom range start date"
          />
          <span className="text-xs text-ink-faint">to</span>
          <input
            type="date"
            value={customEnd}
            min={customStart || undefined}
            onChange={(e) => onCustomChange({ start: customStart, end: e.target.value })}
            className="h-11 rounded-full border border-line bg-surface px-3 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan"
            aria-label="Custom range end date"
          />
        </div>
      )}
    </div>
  );
}
