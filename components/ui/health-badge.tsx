import type { HealthResult } from "@/lib/health/score";

import { cn } from "@/lib/utils";

// Matches the ring-inset pattern used by the existing Badge component.
const BAND_CLASSES: Record<HealthResult["band"], string> = {
  HEALTHY: "bg-green-50 text-green-700 ring-green-600/20",
  FAIR: "bg-blue-50 text-blue-700 ring-blue-600/20",
  AT_RISK: "bg-amber-50 text-amber-700 ring-amber-600/20",
  CRITICAL: "bg-red-50 text-red-700 ring-red-600/20",
};

export const BAND_LABELS: Record<HealthResult["band"], string> = {
  HEALTHY: "Healthy",
  FAIR: "Fair",
  AT_RISK: "At Risk",
  CRITICAL: "Critical",
};

// Used for the large score number in the detail card.
export const BAND_SCORE_COLOR: Record<HealthResult["band"], string> = {
  HEALTHY: "text-green-600",
  FAIR: "text-blue-600",
  AT_RISK: "text-amber-600",
  CRITICAL: "text-red-600",
};

export function HealthBadge({ health }: { health: HealthResult }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        BAND_CLASSES[health.band],
      )}
    >
      <span className="tabular-nums">{health.score}</span>
      <span aria-hidden="true">·</span>
      <span>{BAND_LABELS[health.band]}</span>
    </span>
  );
}
