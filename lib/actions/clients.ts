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
