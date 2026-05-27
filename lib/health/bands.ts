import type { HealthResult } from "@/lib/health/score";

export type HealthBand = HealthResult["band"];

export const BAND_LABELS: Record<HealthBand, string> = {
  HEALTHY: "Healthy",
  FAIR: "Fair",
  AT_RISK: "At Risk",
  CRITICAL: "Critical",
};

export const BAND_HEX: Record<HealthBand, string> = {
  HEALTHY: "#22c55e",
  FAIR: "#3b82f6",
  AT_RISK: "#f59e0b",
  CRITICAL: "#ef4444",
};

export const BAND_BADGE_CLASSES: Record<HealthBand, string> = {
  HEALTHY: "bg-green-50 text-green-700 ring-green-600/20",
  FAIR: "bg-blue-50 text-blue-700 ring-blue-600/20",
  AT_RISK: "bg-amber-50 text-amber-700 ring-amber-600/20",
  CRITICAL: "bg-red-50 text-red-700 ring-red-600/20",
};

export const BAND_SCORE_COLOR: Record<HealthBand, string> = {
  HEALTHY: "text-green-600",
  FAIR: "text-blue-600",
  AT_RISK: "text-amber-600",
  CRITICAL: "text-red-600",
};

