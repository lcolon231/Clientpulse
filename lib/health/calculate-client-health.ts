import "server-only";

import { cache } from "react";

import { prisma } from "@/lib/db/prisma";
import { calculateHealth, type HealthResult } from "@/lib/health/score";

const DEVICE_HEALTH_SELECT = {
  patchAgeDays: true,
  lastSeen: true,
} as const;

import type { TicketStatus } from "@prisma/client";

const OPEN_STATUSES: TicketStatus[] = ["NEW", "OPEN", "IN_PROGRESS", "WAITING"];

type DeviceHealthRow = { patchAgeDays: number; lastSeen: Date };

function toHealthResult(devices: DeviceHealthRow[], openTicketCount = 0): HealthResult {
  return calculateHealth({
    deviceCount: devices.length,
    devices: devices.map((d) => ({
      patchAgeDays: d.patchAgeDays,
      lastSeen: d.lastSeen,
    })),
    openTicketCount,
  });
}

/**
 * Compute the health score for a single client.
 * Double-scoped where clause prevents cross-org access even with a valid clientId.
 */
export const getClientHealth = cache(
  async (clientId: string, organizationId: string): Promise<HealthResult> => {
    const [devices, openTicketCount] = await Promise.all([
      prisma.device.findMany({
        where: {
          clientId,
          client: { organizationId },
        },
        select: DEVICE_HEALTH_SELECT,
      }),
      prisma.ticket.count({
        where: {
          clientId,
          organizationId,
          status: { in: OPEN_STATUSES },
        },
      }),
    ]);

    return toHealthResult(devices, openTicketCount);
  },
);

/**
 * Compute health scores for every client in the org in two DB round-trips.
 * Returns a Map<clientId, HealthResult>.
 */
export const getOrgHealth = cache(
  async (organizationId: string): Promise<Map<string, HealthResult>> => {
    const [clients, openTickets] = await Promise.all([
      prisma.client.findMany({
        where: { organizationId },
        select: {
          id: true,
          devices: { select: DEVICE_HEALTH_SELECT },
        },
      }),
      prisma.ticket.findMany({
        where: {
          organizationId,
          clientId: { not: null },
          status: { in: OPEN_STATUSES },
        },
        select: { clientId: true },
      }),
    ]);

    const openCountByClient = new Map<string, number>();
    for (const t of openTickets) {
      if (t.clientId) {
        openCountByClient.set(t.clientId, (openCountByClient.get(t.clientId) ?? 0) + 1);
      }
    }

    const scores = new Map<string, HealthResult>();
    for (const client of clients) {
      const openTicketCount = openCountByClient.get(client.id) ?? 0;
      scores.set(client.id, toHealthResult(client.devices, openTicketCount));
    }
    return scores;
  },
);
