import "server-only";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Plan = "STARTER" | "GROWTH" | "ENTERPRISE";
export type Feature = "csv_import" | "scheduled_reports";

interface PlanConfig {
  /** Max clients. -1 = unlimited. */
  clients: number;
  /** Max devices across all clients. -1 = unlimited. */
  devices: number;
  features: Feature[];
}

// ---------------------------------------------------------------------------
// Limits table
// ---------------------------------------------------------------------------

export const PLAN_LIMITS: Record<Plan, PlanConfig> = {
  STARTER: {
    clients: 10,
    devices: 50,
    features: [],
  },
  GROWTH: {
    clients: 50,
    devices: 500,
    features: ["csv_import", "scheduled_reports"],
  },
  ENTERPRISE: {
    clients: -1,
    devices: -1,
    features: ["csv_import", "scheduled_reports"],
  },
};

function getConfig(plan: string): PlanConfig {
  return PLAN_LIMITS[plan as Plan] ?? PLAN_LIMITS.STARTER;
}

// ---------------------------------------------------------------------------
// Guards
// ---------------------------------------------------------------------------

export function canAddClient(
  org: { plan: string },
  currentClientCount: number,
): boolean {
  const { clients } = getConfig(org.plan);
  return clients === -1 || currentClientCount < clients;
}

export function canAddDevice(
  org: { plan: string },
  currentDeviceCount: number,
): boolean {
  const { devices } = getConfig(org.plan);
  return devices === -1 || currentDeviceCount < devices;
}

export function canUseFeature(org: { plan: string }, feature: Feature): boolean {
  return getConfig(org.plan).features.includes(feature);
}
