"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { TicketPriority, TicketStatus } from "@prisma/client";

import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { logAudit } from "@/lib/audit";

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const createSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().optional(),
  priority: z.enum(["UNKNOWN", "LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  assigneeId: z.string().optional(),
  dueDate: z.string().optional(),
});

const updateSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").optional(),
  description: z.string().optional(),
  priority: z.enum(["UNKNOWN", "LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  status: z.enum(["NEW", "OPEN", "IN_PROGRESS", "WAITING", "RESOLVED", "CLOSED"]).optional(),
  assigneeId: z.string().optional(),
  dueDate: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Return types
// ---------------------------------------------------------------------------

export type TicketActionResult = { success: true } | { success: false; error: string };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function verifyTicketOwnership(ticketId: string, organizationId: string) {
  return prisma.ticket.findFirst({
    where: { id: ticketId, organizationId },
    select: { id: true, clientId: true },
  });
}

// ---------------------------------------------------------------------------
// Queries (used by server components)
// ---------------------------------------------------------------------------

export async function getTickets(clientId: string) {
  const { dbUser } = await requireAuth();
  return prisma.ticket.findMany({
    where: { clientId, organizationId: dbUser.organizationId },
    include: {
      comments: {
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: "asc" },
      },
      assigneeUser: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

export async function getTicket(ticketId: string) {
  const { dbUser } = await requireAuth();
  return prisma.ticket.findFirst({
    where: { id: ticketId, organizationId: dbUser.organizationId },
    include: {
      comments: {
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: "asc" },
      },
      assigneeUser: { select: { id: true, name: true, email: true } },
    },
  });
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export async function createTicketAction(
  clientId: string,
  rawData: unknown,
): Promise<TicketActionResult> {
  const { dbUser } = await requireAuth();

  if (dbUser.role === "READONLY") {
    return { success: false, error: "You do not have permission to create tickets." };
  }

  const client = await prisma.client.findFirst({
    where: { id: clientId, organizationId: dbUser.organizationId },
    select: { id: true },
  });
  if (!client) return { success: false, error: "Client not found." };

  const parsed = createSchema.safeParse(rawData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid data." };
  }

  const { title, description, priority, assigneeId, dueDate } = parsed.data;

  const ticket = await prisma.ticket.create({
    data: {
      organizationId: dbUser.organizationId,
      clientId,
      title,
      description: description?.trim() || null,
      priority: priority as TicketPriority,
      assigneeId: assigneeId || null,
      dueDate: dueDate ? new Date(dueDate) : null,
    },
  });

  await logAudit({
    action: "TICKET_CREATE",
    entityType: "Ticket",
    entityId: ticket.id,
    organizationId: dbUser.organizationId,
    userId: dbUser.id,
    metadata: { title, clientId },
  });

  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateTicketAction(
  ticketId: string,
  rawData: unknown,
): Promise<TicketActionResult> {
  const { dbUser } = await requireAuth();

  if (dbUser.role === "READONLY") {
    return { success: false, error: "You do not have permission to edit tickets." };
  }

  const existing = await verifyTicketOwnership(ticketId, dbUser.organizationId);
  if (!existing) return { success: false, error: "Ticket not found." };

  const parsed = updateSchema.safeParse(rawData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid data." };
  }

  const { title, description, priority, status, assigneeId, dueDate } = parsed.data;

  await prisma.ticket.update({
    where: { id: ticketId },
    data: {
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description: description.trim() || null }),
      ...(priority !== undefined && { priority: priority as TicketPriority }),
      ...(status !== undefined && { status: status as TicketStatus }),
      ...(assigneeId !== undefined && { assigneeId: assigneeId || null }),
      ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
    },
  });

  await logAudit({
    action: "TICKET_UPDATE",
    entityType: "Ticket",
    entityId: ticketId,
    organizationId: dbUser.organizationId,
    userId: dbUser.id,
    metadata: { title },
  });

  revalidatePath(`/clients/${existing.clientId ?? ""}`);
  revalidatePath("/dashboard");
  return { success: true };
}

export async function closeTicketAction(ticketId: string): Promise<TicketActionResult> {
  const { dbUser } = await requireAuth();

  if (dbUser.role === "READONLY") {
    return { success: false, error: "You do not have permission to close tickets." };
  }

  const existing = await verifyTicketOwnership(ticketId, dbUser.organizationId);
  if (!existing) return { success: false, error: "Ticket not found." };

  await prisma.ticket.update({
    where: { id: ticketId },
    data: { status: "CLOSED" },
  });

  await logAudit({
    action: "TICKET_CLOSE",
    entityType: "Ticket",
    entityId: ticketId,
    organizationId: dbUser.organizationId,
    userId: dbUser.id,
  });

  revalidatePath(`/clients/${existing.clientId ?? ""}`);
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteTicketAction(ticketId: string): Promise<TicketActionResult> {
  const { dbUser } = await requireAuth();

  if (dbUser.role !== "OWNER") {
    return { success: false, error: "Only owners can delete tickets." };
  }

  const existing = await verifyTicketOwnership(ticketId, dbUser.organizationId);
  if (!existing) return { success: false, error: "Ticket not found." };

  await prisma.ticket.delete({ where: { id: ticketId } });

  await logAudit({
    action: "TICKET_DELETE",
    entityType: "Ticket",
    entityId: ticketId,
    organizationId: dbUser.organizationId,
    userId: dbUser.id,
  });

  revalidatePath(`/clients/${existing.clientId ?? ""}`);
  revalidatePath("/dashboard");
  return { success: true };
}

export async function addCommentAction(
  ticketId: string,
  body: string,
): Promise<TicketActionResult> {
  const { dbUser } = await requireAuth();

  if (dbUser.role === "READONLY") {
    return { success: false, error: "You do not have permission to add comments." };
  }

  const existing = await verifyTicketOwnership(ticketId, dbUser.organizationId);
  if (!existing) return { success: false, error: "Ticket not found." };

  const trimmed = body.trim();
  if (!trimmed) return { success: false, error: "Comment cannot be empty." };

  const comment = await prisma.ticketComment.create({
    data: {
      ticketId,
      userId: dbUser.id,
      body: trimmed,
    },
  });

  await logAudit({
    action: "TICKET_COMMENT",
    entityType: "TicketComment",
    entityId: comment.id,
    organizationId: dbUser.organizationId,
    userId: dbUser.id,
    metadata: { ticketId },
  });

  revalidatePath(`/clients/${existing.clientId ?? ""}`);
  return { success: true };
}
