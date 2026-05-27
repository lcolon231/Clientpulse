import type { TicketPriority, TicketStatus } from "@prisma/client";

export function cleanBaseUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

export function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function asString(value: unknown): string | null {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return null;
}

export function asDate(value: unknown): Date | null {
  const raw = asString(value);
  if (!raw) return null;

  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

export function getPath(
  record: Record<string, unknown>,
  path: string[],
): unknown {
  let current: unknown = record;
  for (const segment of path) {
    const currentRecord = asRecord(current);
    if (!currentRecord) return undefined;
    current = currentRecord[segment];
  }
  return current;
}

export function normalizeStatus(value: unknown): TicketStatus {
  const status = asString(value)?.toLowerCase() ?? "";

  if (status.includes("new")) return "NEW";
  if (status.includes("progress")) return "IN_PROGRESS";
  if (
    status.includes("wait") ||
    status.includes("hold") ||
    status.includes("pending")
  ) {
    return "WAITING";
  }
  if (
    status.includes("resolved") ||
    status.includes("complete") ||
    status.includes("done")
  ) {
    return "RESOLVED";
  }
  if (status.includes("closed") || status.includes("cancel")) return "CLOSED";

  return "OPEN";
}

export function normalizePriority(value: unknown): TicketPriority {
  const priority = asString(value)?.toLowerCase() ?? "";

  if (priority.includes("urgent") || priority.includes("critical")) return "URGENT";
  if (priority.includes("high")) return "HIGH";
  if (priority.includes("medium") || priority.includes("normal")) return "MEDIUM";
  if (priority.includes("low")) return "LOW";

  return "UNKNOWN";
}

