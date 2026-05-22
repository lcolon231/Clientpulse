"use server";

import { revalidatePath } from "next/cache";

import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { clientSchema } from "@/types";
import type { Client } from "@prisma/client";

export type CreateClientResult =
  | { success: true; client: Client }
  | { success: false; error: string };

export async function createClient(rawData: unknown): Promise<CreateClientResult> {
  const { dbUser } = await requireAuth();

  if (dbUser.role === "READONLY") {
    return { success: false, error: "You do not have permission to create clients." };
  }

  const parsed = clientSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid data.",
    };
  }

  const { name, industry, slaTier, primaryContact, notes } = parsed.data;

  const client = await prisma.client.create({
    data: {
      name,
      industry,
      slaTier,
      primaryContact: primaryContact?.trim() || null,
      notes: notes?.trim() || null,
      organizationId: dbUser.organizationId,
    },
  });

  revalidatePath("/clients");
  return { success: true, client };
}

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------

export type UpdateClientResult =
  | { success: true }
  | { success: false; error: string };

export async function updateClient(
  clientId: string,
  rawData: unknown
): Promise<UpdateClientResult> {
  const { dbUser } = await requireAuth();

  if (dbUser.role === "READONLY") {
    return { success: false, error: "You do not have permission to edit clients." };
  }

  const parsed = clientSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid data.",
    };
  }

  const existing = await prisma.client.findFirst({
    where: { id: clientId, organizationId: dbUser.organizationId },
    select: { id: true },
  });

  if (!existing) {
    return { success: false, error: "Client not found." };
  }

  const { name, industry, slaTier, primaryContact, notes } = parsed.data;

  await prisma.client.update({
    where: { id: clientId },
    data: {
      name,
      industry,
      slaTier,
      primaryContact: primaryContact?.trim() || null,
      notes: notes?.trim() || null,
    },
  });

  revalidatePath("/clients");
  revalidatePath(`/clients/${clientId}`);
  return { success: true };
}

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------

export type DeleteClientResult =
  | { success: true }
  | { success: false; error: string };

export async function deleteClient(clientId: string): Promise<DeleteClientResult> {
  const { dbUser } = await requireAuth();

  if (dbUser.role !== "OWNER") {
    return { success: false, error: "Only owners can delete clients." };
  }

  const existing = await prisma.client.findFirst({
    where: { id: clientId, organizationId: dbUser.organizationId },
    select: { id: true },
  });

  if (!existing) {
    return { success: false, error: "Client not found." };
  }

  await prisma.client.delete({ where: { id: clientId } });

  revalidatePath("/clients");
  return { success: true };
}
