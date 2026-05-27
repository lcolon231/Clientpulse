import type { TicketPriority, TicketSource, TicketStatus } from "@prisma/client";

export interface PsaTicketInput {
  source: TicketSource;
  externalId: string;
  externalCompanyId: string | null;
  externalCompanyName: string | null;
  number: string | null;
  title: string;
  description: string | null;
  status: TicketStatus;
  priority: TicketPriority;
  assignee: string | null;
  url: string | null;
  externalCreatedAt: Date;
  externalUpdatedAt: Date | null;
  resolvedAt: Date | null;
}

export interface PsaSyncProvider {
  source: TicketSource;
  enabled: boolean;
  fetchTickets(since: Date): Promise<PsaTicketInput[]>;
}

export interface PsaSyncSummary {
  source: TicketSource;
  enabled: boolean;
  fetched: number;
  upserted: number;
  errors: string[];
}

