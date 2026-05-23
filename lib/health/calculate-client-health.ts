import "server-only";

import { cache } from "react";

import { prisma } from "@/lib/db/prisma";
import { calculateHealth, type HealthResult } from "@/lib/health/score";

// Select only the two fields the scoring engine needs — no over-fetching.
const DEVICE_HEALTH_SELECT = {
  patchAgeDays: true,
  lastSeen: true,
} as const;

type DeviceHealthRow = { patchAgeDays: number; lastSeen: Date };

function toHealthResult(devices: DeviceHealthRow[]): HealthResult {
  return calculateHealth({
    deviceCount: devices.length,
    devices: devices.map((d) => ({
      patchAgeDays: d.patchAgeDays,
      lastSeen: d.lastSeen,
    })),
  });
}

/**
 * Compute the health score for a single client.
 *
 * The double-scoped where clause (clientId + client.organizationId) means a
 * caller cannot score a client from another org even if they supply a valid
 * clientId — the org check is enforced in the DB query, not just at the call
 * site.
 *
 * Memoised with React cache() so repeated calls within the same render tree
 * (e.g. layout + page both needing the same score) hit the DB only once.
 */
export const getClientHealth = cache(
  async (clientId: string, organizationId: string): Promise<HealthResult> => {
    const devices = await prisma.device.findMany({
      where: {
        clientId,
        client: { organizationId },
      },
      select: DEVICE_HEALTH_SELECT,
    });

    return toHealthResult(devices);
  },
);

/**
 * Compute health scores for every client in the org in a single DB round-trip.
 *
 * Loads all clients with their devices in one query (avoids N+1), then scores
 * entirely in memory. Returns a Map<clientId, HealthResult> so callers can
 * look up any client's score in O(1).
 *
 * Memoised with React cache() — safe to call from both layout and page without
 * doubling the query.
 */
export const getOrgHealth = cache(
  async (organizationId: string): Promise<Map<string, HealthResult>> => {
    const clients = await prisma.client.findMany({
      where: { organizationId },
      select: {
        id: true,
        devices: { select: DEVICE_HEALTH_SELECT },
      },
    });

    const scores = new Map<string, HealthResult>();
    for (const client of clients) {
      scores.set(client.id, toHealthResult(client.devices));
    }
    return scores;
  },
);
