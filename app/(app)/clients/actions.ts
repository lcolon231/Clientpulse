"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { logAudit } from "@/lib/audit";

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const clientSchema = z.object({
  name: z.string().min(1, "Name is required"),
  industry: z.string().optional(),
  primaryContact: z.string().min(1, "Primary contact name is required"),
  primaryContactEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  slaTier: z.enum(["BASIC", "STANDARD", "PREMIUM"]),
  notes: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Return type
// ---------------------------------------------------------------------------

export type ClientActionResult =
  | { success: true; clientId?: string }
  | { success: false; error: string };

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

export async function createClientAction(
  rawData: unknown
): Promise<ClientActionResult> {
  const { dbUser } = await requireAuth();

  if (dbUser.role === "READONLY") {
    return { success: false, error: "You do not have permission to create clients." };
  }

  const parsed = clientSchema.safeParse(rawData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid data." };
  }

  const data = parsed.data;

  const client = await prisma.client.create({
    data: {
      name: data.name,
      industry: data.industry || null,
      primaryContact: data.primaryContact || null,
      primaryContactEmail: data.primaryContactEmail || null,
      slaTier: data.slaTier,
      notes: data.notes || null,
      organizationId: dbUser.organizationId,
    },
  });

  await logAudit({
    action: "client_created",
    entityType: "client",
    entityId: client.id,
    organizationId: dbUser.organizationId,
    userId: dbUser.id,
    metadata: { client_name: client.name },
  });

  revalidatePath("/clients");
  return { success: true, clientId: client.id };
}

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------

export async function updateClientAction(
  clientId: string,
  rawData: unknown
): Promise<ClientActionResult> {
  const { dbUser } = await requireAuth();

  if (dbUser.role === "READONLY") {
    return { success: false, error: "You do not have permission to edit clients." };
  }

  const parsed = clientSchema.safeParse(rawData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid data." };
  }

  // Verify ownership — the client must belong to this org
  const existing = await prisma.client.findFirst({
    where: { id: clientId, organizationId: dbUser.organizationId },
    select: { id: true, name: true, industry: true, primaryContact: true, primaryContactEmail: true, slaTier: true, notes: true },
  });

  if (!existing) {
    return { success: false, error: "Client not found." };
  }

  const data = parsed.data;

  // Track which fields changed for the audit log
  const changedFields: string[] = [];
  if (data.name !== existing.name) changedFields.push("name");
  if ((data.industry || null) !== existing.industry) changedFields.push("industry");
  if ((data.primaryContact || null) !== existing.primaryContact) changedFields.push("primaryContact");
  if ((data.primaryContactEmail || null) !== existing.primaryContactEmail) changedFields.push("primaryContactEmail");
  if (data.slaTier !== existing.slaTier) changedFields.push("slaTier");
  if ((data.notes || null) !== existing.notes) changedFields.push("notes");

  const updated = await prisma.client.update({
    where: { id: clientId },
    data: {
      name: data.name,
      industry: data.industry || null,
      primaryContact: data.primaryContact || null,
      primaryContactEmail: data.primaryContactEmail || null,
      slaTier: data.slaTier,
      notes: data.notes || null,
    },
  });

  await logAudit({
    action: "client_updated",
    entityType: "client",
    entityId: clientId,
    organizationId: dbUser.organizationId,
    userId: dbUser.id,
    metadata: { client_name: updated.name, changed_fields: changedFields },
  });

  revalidatePath("/clients");
  revalidatePath(`/clients/${clientId}`);
  return { success: true };
}

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------

export async function deleteClientAction(
  clientId: string
): Promise<ClientActionResult> {
  const { dbUser } = await requireAuth();

  // Only OWNER can delete clients
  if (dbUser.role !== "OWNER") {
    return { success: false, error: "Only owners can delete clients." };
  }

  // Verify ownership
  const existing = await prisma.client.findFirst({
    where: { id: clientId, organizationId: dbUser.organizationId },
    select: { id: true, name: true },
  });

  if (!existing) {
    return { success: false, error: "Client not found." };
  }

  // Cascade delete of devices is handled by the DB foreign key (onDelete: Cascade)
  await prisma.client.delete({ where: { id: clientId } });

  await logAudit({
    action: "client_deleted",
    entityType: "client",
    entityId: clientId,
    organizationId: dbUser.organizationId,
    userId: dbUser.id,
    metadata: { client_name: existing.name },
  });

  revalidatePath("/clients");
  return { success: true };
}
