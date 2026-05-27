import "server-only";

import { prisma } from "@/lib/db/prisma";
import { serverEnv } from "@/lib/env";
import { createAutotaskProvider } from "@/lib/integrations/psa/autotask";
import { createConnectWiseProvider } from "@/lib/integrations/psa/connectwise";
import { normalizeName } from "@/lib/integrations/psa/normalization";
import type { PsaSyncProvider, PsaSyncSummary, PsaTicketInput } from "@/lib/integrations/psa/types";

function getProviders(): PsaSyncProvider[] {
  return [createConnectWiseProvider(), createAutotaskProvider()];
}

async function getSyncOrganizationId(): Promise<string | null> {
  if (serverEnv.PSA_SYNC_ORGANIZATION_ID) {
    const org = await prisma.organization.findUnique({
      where: { id: serverEnv.PSA_SYNC_ORGANIZATION_ID },
      select: { id: true },
    });
    return org?.id ?? null;
  }

  const orgs = await prisma.organization.findMany({
    select: { id: true },
    take: 2,
    orderBy: { createdAt: "asc" },
  });

  return orgs.length === 1 ? orgs[0].id : null;
}

async function buildClientNameMap(organizationId: string) {
  const clients = await prisma.client.findMany({
    where: { organizationId },
    select: { id: true, name: true },
  });

  const byName = new Map<string, string>();
  for (const client of clients) {
    byName.set(normalizeName(client.name), client.id);
  }
  return byName;
}

function resolveClientId(
  ticket: PsaTicketInput,
  clientIdByName: Map<string, string>,
): string | null {
  if (!ticket.externalCompanyName) return null;
  return clientIdByName.get(normalizeName(ticket.externalCompanyName)) ?? null;
}

async function upsertTickets(
  organizationId: string,
  tickets: PsaTicketInput[],
) {
  const clientIdByName = await buildClientNameMap(organizationId);
  let upserted = 0;

  for (const ticket of tickets) {
    const clientId = resolveClientId(ticket, clientIdByName);

    await prisma.ticket.upsert({
      where: {
        organizationId_source_externalId: {
          organizationId,
          source: ticket.source,
          externalId: ticket.externalId,
        },
      },
      create: {
        organizationId,
        clientId,
        source: ticket.source,
        externalId: ticket.externalId,
        externalCompanyId: ticket.externalCompanyId,
        externalCompanyName: ticket.externalCompanyName,
        number: ticket.number,
        title: ticket.title,
        description: ticket.description,
        status: ticket.status,
        priority: ticket.priority,
        assignee: ticket.assignee,
        url: ticket.url,
        externalCreatedAt: ticket.externalCreatedAt,
        externalUpdatedAt: ticket.externalUpdatedAt,
        resolvedAt: ticket.resolvedAt,
        syncedAt: new Date(),
      },
      update: {
        clientId,
        externalCompanyId: ticket.externalCompanyId,
        externalCompanyName: ticket.externalCompanyName,
        number: ticket.number,
        title: ticket.title,
        description: ticket.description,
        status: ticket.status,
        priority: ticket.priority,
        assignee: ticket.assignee,
        url: ticket.url,
        externalCreatedAt: ticket.externalCreatedAt,
        externalUpdatedAt: ticket.externalUpdatedAt,
        resolvedAt: ticket.resolvedAt,
        syncedAt: new Date(),
      },
    });

    upserted++;
  }

  return upserted;
}

export async function syncPsaTickets(): Promise<{
  ok: boolean;
  organizationId: string | null;
  since: string;
  summaries: PsaSyncSummary[];
}> {
  const organizationId = await getSyncOrganizationId();
  const since = new Date(
    Date.now() - serverEnv.TICKET_SYNC_LOOKBACK_DAYS * 86_400_000,
  );
  const summaries: PsaSyncSummary[] = [];

  if (!organizationId) {
    return {
      ok: false,
      organizationId: null,
      since: since.toISOString(),
      summaries: getProviders().map((provider) => ({
        source: provider.source,
        enabled: provider.enabled,
        fetched: 0,
        upserted: 0,
        errors: [
          "Set PSA_SYNC_ORGANIZATION_ID when more than one organization exists.",
        ],
      })),
    };
  }

  for (const provider of getProviders()) {
    if (!provider.enabled) {
      summaries.push({
        source: provider.source,
        enabled: false,
        fetched: 0,
        upserted: 0,
        errors: [],
      });
      continue;
    }

    try {
      const tickets = await provider.fetchTickets(since);
      const upserted = await upsertTickets(organizationId, tickets);
      summaries.push({
        source: provider.source,
        enabled: true,
        fetched: tickets.length,
        upserted,
        errors: [],
      });
    } catch (error) {
      summaries.push({
        source: provider.source,
        enabled: true,
        fetched: 0,
        upserted: 0,
        errors: [error instanceof Error ? error.message : String(error)],
      });
    }
  }

  return {
    ok: summaries.every((summary) => summary.errors.length === 0),
    organizationId,
    since: since.toISOString(),
    summaries,
  };
}

