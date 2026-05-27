import "server-only";

import { serverEnv } from "@/lib/env";
import {
  asDate,
  asRecord,
  asString,
  cleanBaseUrl,
  normalizePriority,
  normalizeStatus,
} from "@/lib/integrations/psa/normalization";
import type { PsaSyncProvider, PsaTicketInput } from "@/lib/integrations/psa/types";

const AUTOTASK_TICKETS_PATH = "/Tickets/query";

function hasAutotaskConfig() {
  return Boolean(
    serverEnv.AUTOTASK_BASE_URL &&
      serverEnv.AUTOTASK_USERNAME &&
      serverEnv.AUTOTASK_SECRET &&
      serverEnv.AUTOTASK_INTEGRATION_CODE,
  );
}

function mapTicket(ticket: Record<string, unknown>): PsaTicketInput | null {
  const externalId = asString(ticket.id);
  const title = asString(ticket.title);
  const externalCreatedAt =
    asDate(ticket.createDate) ??
    asDate(ticket.createdDate) ??
    asDate(ticket.createDateTime);

  if (!externalId || !title || !externalCreatedAt) return null;

  const externalCompanyId =
    asString(ticket.companyID) ??
    asString(ticket.accountID) ??
    asString(ticket.companyId) ??
    asString(ticket.accountId);
  const externalCompanyName =
    asString(ticket.companyName) ?? asString(ticket.accountName);
  const status = ticket.statusLabel ?? ticket.status;
  const priority = ticket.priorityLabel ?? ticket.priority;

  return {
    source: "AUTOTASK",
    externalId,
    externalCompanyId,
    externalCompanyName,
    number: asString(ticket.ticketNumber) ?? externalId,
    title,
    description: asString(ticket.description),
    status: normalizeStatus(status),
    priority: normalizePriority(priority),
    assignee:
      asString(ticket.assignedResourceName) ??
      asString(ticket.assignedResourceID),
    url: null,
    externalCreatedAt,
    externalUpdatedAt:
      asDate(ticket.lastActivityDate) ??
      asDate(ticket.lastModifiedDateTime) ??
      asDate(ticket.modifyDate),
    resolvedAt:
      asDate(ticket.completedDate) ??
      asDate(ticket.resolvedDateTime) ??
      asDate(ticket.closedDate),
  };
}

function extractItems(body: unknown): Record<string, unknown>[] {
  if (Array.isArray(body)) {
    return body
      .map(asRecord)
      .filter((item): item is Record<string, unknown> => item !== null);
  }

  const record = asRecord(body);
  const items = record?.items;
  if (!Array.isArray(items)) return [];

  return items
    .map(asRecord)
    .filter((item): item is Record<string, unknown> => item !== null);
}

export function createAutotaskProvider(): PsaSyncProvider {
  return {
    source: "AUTOTASK",
    enabled: hasAutotaskConfig(),
    async fetchTickets(since: Date) {
      if (!serverEnv.AUTOTASK_BASE_URL) return [];

      const response = await fetch(
        `${cleanBaseUrl(serverEnv.AUTOTASK_BASE_URL)}${AUTOTASK_TICKETS_PATH}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            ApiIntegrationCode: serverEnv.AUTOTASK_INTEGRATION_CODE ?? "",
            UserName: serverEnv.AUTOTASK_USERNAME ?? "",
            Secret: serverEnv.AUTOTASK_SECRET ?? "",
          },
          body: JSON.stringify({
            filter: [
              {
                op: "gte",
                field: "createDate",
                value: since.toISOString(),
              },
            ],
          }),
        },
      );

      if (!response.ok) {
        throw new Error(
          `Autotask ticket fetch failed: ${response.status} ${response.statusText}`,
        );
      }

      const body: unknown = await response.json();
      return extractItems(body)
        .map(mapTicket)
        .filter((ticket): ticket is PsaTicketInput => ticket !== null);
    },
  };
}

