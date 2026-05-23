import type { HealthResult } from "@/lib/health/score";

export type Band = HealthResult["band"];

/** Human-readable label for each health band. */
export const BAND_LABELS: Record<Band, string> = {
  HEALTHY: "Healthy",
  FAIR: "Fair",
  AT_RISK: "At Risk",
  CRITICAL: "Critical",
};

/**
 * Hex fill colors for recharts and SVG renderers.
 * Match Tailwind green-600 / blue-600 / amber-600 / red-600.
 * Import this — do not hardcode hex values elsewhere.
 */
export const BAND_HEX: Record<Band, string> = {
  HEALTHY: "#16a34a",
  FAIR: "#2563eb",
  AT_RISK: "#d97706",
  CRITICAL: "#dc2626",
};

/** Tailwind classes for badge pill: background, text, ring. */
export const BAND_BADGE_CLASSES: Record<Band, string> = {
  HEALTHY: "bg-green-50 text-green-700 ring-green-600/20",
  FAIR: "bg-blue-50 text-blue-700 ring-blue-600/20",
  AT_RISK: "bg-amber-50 text-amber-700 ring-amber-600/20",
  CRITICAL: "bg-red-50 text-red-700 ring-red-600/20",
};

/** Tailwind text-color for large score numerals in detail cards. */
export const BAND_SCORE_TEXT_CLASS: Record<Band, string> = {
  HEALTHY: "text-green-600",
  FAIR: "text-blue-600",
  AT_RISK: "text-amber-600",
  CRITICAL: "text-red-600",
};
