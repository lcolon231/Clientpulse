import "server-only";

import { serverEnv } from "@/lib/env";
import {
  asDate,
  asRecord,
  asString,
  cleanBaseUrl,
  getPath,
  normalizePriority,
  normalizeStatus,
} from "@/lib/integrations/psa/normalization";
import type { PsaSyncProvider, PsaTicketInput } from "@/lib/integrations/psa/types";

const CONNECTWISE_TICKETS_PATH = "/v4_6_release/apis/3.0/service/tickets";

function hasConnectWiseConfig() {
  return Boolean(
    serverEnv.CONNECTWISE_BASE_URL &&
      serverEnv.CONNECTWISE_COMPANY_ID &&
      serverEnv.CONNECTWISE_PUBLIC_KEY &&
      serverEnv.CONNECTWISE_PRIVATE_KEY &&
      serverEnv.CONNECTWISE_CLIENT_ID,
  );
}

function connectWiseAuthHeader() {
  const token = Buffer.from(
    `${serverEnv.CONNECTWISE_COMPANY_ID}+${serverEnv.CONNECTWISE_PUBLIC_KEY}:${serverEnv.CONNECTWISE_PRIVATE_KEY}`,
  ).toString("base64");

  return `Basic ${token}`;
}

function buildTicketUrl(ticket: Record<string, unknown>): string | null {
  const href = asString(getPath(ticket, ["_info", "ticket_href"]));
  if (href) return href;

  const id = asString(ticket.id);
  if (!id || !serverEnv.CONNECTWISE_BASE_URL) return null;

  return `${cleanBaseUrl(serverEnv.CONNECTWISE_BASE_URL)}${CONNECTWISE_TICKETS_PATH}/${id}`;
}

function mapTicket(ticket: Record<string, unknown>): PsaTicketInput | null {
  const externalId = asString(ticket.id);
  const title = asString(ticket.summary) ?? asString(ticket.title);
  const externalCreatedAt = asDate(ticket.dateEntered) ?? asDate(ticket.dateCreated);

  if (!externalId || !title || !externalCreatedAt) return null;

  const companyId = asString(getPath(ticket, ["company", "id"]));
  const companyName =
    asString(getPath(ticket, ["company", "name"])) ??
    asString(getPath(ticket, ["company", "identifier"]));
  const status =
    getPath(ticket, ["status", "name"]) ??
    getPath(ticket, ["status", "id"]) ??
    ticket.status;
  const priority =
    getPath(ticket, ["priority", "name"]) ??
    getPath(ticket, ["priority", "id"]) ??
    ticket.priority;
  const assignee =
    asString(getPath(ticket, ["owner", "name"])) ??
    asString(getPath(ticket, ["owner", "identifier"]));

  return {
    source: "CONNECTWISE",
    externalId,
    externalCompanyId: companyId,
    externalCompanyName: companyName,
    number: asString(ticket.id),
    title,
    description: asString(ticket.initialDescription) ?? asString(ticket.description),
    status: normalizeStatus(status),
    priority: normalizePriority(priority),
    assignee,
    url: buildTicketUrl(ticket),
    externalCreatedAt,
    externalUpdatedAt: asDate(ticket.lastUpdated),
    resolvedAt: asDate(ticket.closedDate),
  };
}

export function createConnectWiseProvider(): PsaSyncProvider {
  return {
    source: "CONNECTWISE",
    enabled: hasConnectWiseConfig(),
    async fetchTickets(since: Date) {
      if (!serverEnv.CONNECTWISE_BASE_URL || !serverEnv.CONNECTWISE_CLIENT_ID) {
        return [];
      }

      const url = new URL(
        `${cleanBaseUrl(serverEnv.CONNECTWISE_BASE_URL)}${CONNECTWISE_TICKETS_PATH}`,
      );
      url.searchParams.set(
        "conditions",
        `dateEntered >= [${since.toISOString()}]`,
      );
      url.searchParams.set("pageSize", "1000");
      url.searchParams.set("orderBy", "dateEntered desc");

      const response = await fetch(url, {
        headers: {
          Authorization: connectWiseAuthHeader(),
          clientId: serverEnv.CONNECTWISE_CLIENT_ID,
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(
          `ConnectWise ticket fetch failed: ${response.status} ${response.statusText}`,
        );
      }

      const body: unknown = await response.json();
      if (!Array.isArray(body)) return [];

      return body
        .map(asRecord)
        .filter((ticket): ticket is Record<string, unknown> => ticket !== null)
        .map(mapTicket)
        .filter((ticket): ticket is PsaTicketInput => ticket !== null);
    },
  };
}

