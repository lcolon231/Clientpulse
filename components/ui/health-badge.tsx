import type { HealthResult } from "@/lib/health/score";
import {
  BAND_BADGE_CLASSES,
  BAND_LABELS,
  BAND_SCORE_COLOR,
} from "@/lib/health/bands";

import { cn } from "@/lib/utils";

export { BAND_LABELS, BAND_SCORE_COLOR };

export function HealthBadge({ health }: { health: HealthResult }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        BAND_BADGE_CLASSES[health.band],
      )}
    >
      <span className="tabular-nums">{health.score}</span>
      <span aria-hidden="true">·</span>
      <span>{BAND_LABELS[health.band]}</span>
    </span>
  );
}
