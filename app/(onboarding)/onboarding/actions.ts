"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { logAudit } from "@/lib/audit";
import { canAddClient } from "@/lib/plans";
import { clientSchema } from "@/types";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { clientEnv } from "@/lib/env";

// ---------------------------------------------------------------------------
// Step 1 — Org name
// ---------------------------------------------------------------------------

export type OrgNameResult = { success: true } | { success: false; error: string };

export async function updateOrgNameAction(name: string): Promise<OrgNameResult> {
  const { dbUser } = await requireAuth();

  const trimmed = name.trim();
  if (!trimmed) return { success: false, error: "Organization name is required." };

  await prisma.organization.update({
    where: { id: dbUser.organizationId },
    data: { name: trimmed },
  });

  return { success: true };
}

// ---------------------------------------------------------------------------
// Step 2 — Invite team member
// ---------------------------------------------------------------------------

const inviteSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.enum(["TECHNICIAN", "READONLY"]),
});

export type InviteResult = { success: true } | { success: false; error: string };

export async function onboardingInviteAction(
  email: string,
  role: "TECHNICIAN" | "READONLY",
): Promise<InviteResult> {
  const { dbUser } = await requireAuth();

  const parsed = inviteSchema.safeParse({ email, role });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const admin = createAdminSupabaseClient();
  const redirectTo = `${clientEnv.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/accept-invite`;

  const { error } = await admin.auth.admin.inviteUserByEmail(parsed.data.email, {
    redirectTo,
    data: { org_id: dbUser.organizationId, invited_role: parsed.data.role },
  });

  if (error) {
    if (error.message.toLowerCase().includes("already")) {
      return { success: false, error: "That email already has an account." };
    }
    if (error.status === 429 || error.message.toLowerCase().includes("rate limit")) {
      return { success: false, error: "Email rate limit reached. Try again in a few minutes." };
    }
    return { success: false, error: "Failed to send invite. Please try again." };
  }

  await logAudit({
    action: "invite_sent",
    entityType: "user",
    entityId: dbUser.organizationId,
    organizationId: dbUser.organizationId,
    userId: dbUser.id,
    metadata: { invited_email: parsed.data.email, role: parsed.data.role },
  });

  return { success: true };
}

// ---------------------------------------------------------------------------
// Step 3 — Add first client
// ---------------------------------------------------------------------------

export type AddClientResult =
  | { success: true }
  | { success: false; error: string };

export async function addFirstClientAction(rawData: unknown): Promise<AddClientResult> {
  const { dbUser } = await requireAuth();

  const clientCount = await prisma.client.count({
    where: { organizationId: dbUser.organizationId },
  });
  if (!canAddClient(dbUser.organization, clientCount)) {
    return { success: false, error: "Client limit reached for your plan." };
  }

  const parsed = clientSchema.safeParse(rawData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid data." };
  }

  const { name, industry, slaTier, primaryContact, notes } = parsed.data;

  await prisma.client.create({
    data: {
      name,
      industry,
      slaTier,
      primaryContact: primaryContact?.trim() || null,
      notes: notes?.trim() || null,
      organizationId: dbUser.organizationId,
    },
  });

  return { success: true };
}

// ---------------------------------------------------------------------------
// Step 4 — Complete onboarding
// ---------------------------------------------------------------------------

export async function completeOnboardingAction(): Promise<void> {
  const { dbUser } = await requireAuth();

  await prisma.organization.update({
    where: { id: dbUser.organizationId },
    data: { onboardingComplete: true },
  });

  redirect("/dashboard");
}
