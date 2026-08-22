import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  trend?: { value: string; positive: boolean };
}) {
  const len = value.length;

  return (
    <div className="flex flex-col justify-between rounded-2xl border border-line bg-surface p-3.5 sm:p-4.5">
      <div className="flex items-center justify-between gap-2">
        <span className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg bg-accent-purple/15 text-accent-purple">
          <Icon className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
        </span>
        {trend && (
          <span
            className={cn(
              "text-[10px] sm:text-xs font-semibold whitespace-nowrap",
              trend.positive ? "text-emerald-400" : "text-accent-red"
            )}
          >
            {trend.positive ? "+" : ""}
            {trend.value}
          </span>
        )}
      </div>
      <div className="mt-3">
        <p
          className={cn(
            "font-display font-bold tracking-tight text-ink whitespace-nowrap leading-none",
            len <= 6
              ? "text-2xl sm:text-3xl"
              : len <= 10
              ? "text-base sm:text-lg xl:text-base 2xl:text-lg"
              : len <= 14
              ? "text-sm sm:text-base xl:text-[13px] 2xl:text-base"
              : "text-xs sm:text-sm"
          )}
        >
          {value}
        </p>
        <p className="mt-1 text-[11px] sm:text-xs text-ink-faint leading-tight">{label}</p>
      </div>
    </div>
  );
}
