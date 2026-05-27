import type { TicketPriority, TicketSource, TicketStatus } from "@prisma/client";

export const TICKET_SOURCE_LABELS: Record<TicketSource, string> = {
  CONNECTWISE: "ConnectWise",
  AUTOTASK: "Autotask",
};

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  NEW: "New",
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  WAITING: "Waiting",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

export const TICKET_PRIORITY_LABELS: Record<TicketPriority, string> = {
  UNKNOWN: "Unknown",
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
};

export const TICKET_STATUS_VARIANTS: Record<
  TicketStatus,
  "default" | "blue" | "green" | "orange" | "purple"
> = {
  NEW: "purple",
  OPEN: "blue",
  IN_PROGRESS: "orange",
  WAITING: "default",
  RESOLVED: "green",
  CLOSED: "default",
};

export const TICKET_PRIORITY_VARIANTS: Record<
  TicketPriority,
  "default" | "blue" | "orange" | "red"
> = {
  UNKNOWN: "default",
  LOW: "default",
  MEDIUM: "blue",
  HIGH: "orange",
  URGENT: "red",
};

export const OPEN_TICKET_STATUSES: TicketStatus[] = [
  "NEW",
  "OPEN",
  "IN_PROGRESS",
  "WAITING",
];

