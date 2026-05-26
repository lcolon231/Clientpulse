"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireAuth, requireOwner } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";

export type ActionResult = { success: true } | { success: false; error: string };

// ---------------------------------------------------------------------------
// General tab
// ---------------------------------------------------------------------------

export async function updateOrgNameAction(name: string): Promise<ActionResult> {
  const { dbUser } = await requireOwner();

  const trimmed = name.trim();
  if (!trimmed) return { success: false, error: "Name is required." };

  await prisma.organization.update({
    where: { id: dbUser.organizationId },
    data: { name: trimmed },
  });

  await logAudit({
    action: "ORG_NAME_UPDATE",
    entityType: "Organization",
    entityId: dbUser.organizationId,
    organizationId: dbUser.organizationId,
    userId: dbUser.id,
    metadata: { name: trimmed },
  });

  revalidatePath("/settings");
  return { success: true };
}

export async function updateTimezoneAction(timezone: string): Promise<ActionResult> {
  const { dbUser } = await requireOwner();

  await prisma.organization.update({
    where: { id: dbUser.organizationId },
    data: { timezone },
  });

  revalidatePath("/settings");
  return { success: true };
}

export async function uploadLogoAction(formData: FormData): Promise<ActionResult> {
  const { dbUser } = await requireOwner();

  const file = formData.get("logo") as File | null;
  if (!file || file.size === 0) return { success: false, error: "No file selected." };
  if (file.size > 500 * 1024) return { success: false, error: "File must be under 500 KB." };
  if (!["image/png", "image/jpeg"].includes(file.type)) {
    return { success: false, error: "Only PNG and JPG files are accepted." };
  }

  const ext = file.type === "image/png" ? "png" : "jpg";
  const path = `${dbUser.organizationId}/logo.${ext}`;

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const admin = createAdminSupabaseClient();
  const { error: uploadError } = await admin.storage
    .from("org-logos")
    .upload(path, buffer, { contentType: file.type, upsert: true });

  if (uploadError) {
    console.error("[uploadLogoAction]", uploadError);
    return { success: false, error: "Upload failed. Check that the org-logos bucket exists." };
  }

  const { data: { publicUrl } } = admin.storage.from("org-logos").getPublicUrl(path);

  await prisma.organization.update({
    where: { id: dbUser.organizationId },
    data: { logoUrl: publicUrl },
  });

  revalidatePath("/settings");
  return { success: true };
}

// ---------------------------------------------------------------------------
// Team tab
// ---------------------------------------------------------------------------

const roleSchema = z.enum(["OWNER", "TECHNICIAN", "READONLY"]);

export async function updateMemberRoleAction(
  memberId: string,
  role: string,
): Promise<ActionResult> {
  const { dbUser } = await requireOwner();

  const parsed = roleSchema.safeParse(role);
  if (!parsed.success) return { success: false, error: "Invalid role." };

  // Prevent owner from removing their own owner role.
  if (memberId === dbUser.id && parsed.data !== "OWNER") {
    return { success: false, error: "You cannot remove your own owner role." };
  }

  const member = await prisma.user.findFirst({
    where: { id: memberId, organizationId: dbUser.organizationId },
    select: { id: true },
  });
  if (!member) return { success: false, error: "Member not found." };

  await prisma.user.update({
    where: { id: memberId },
    data: { role: parsed.data },
  });

  revalidatePath("/settings");
  return { success: true };
}

export async function removeMemberAction(memberId: string): Promise<ActionResult> {
  const { dbUser } = await requireOwner();

  if (memberId === dbUser.id) {
    return { success: false, error: "You cannot remove yourself." };
  }

  const member = await prisma.user.findFirst({
    where: { id: memberId, organizationId: dbUser.organizationId },
    select: { id: true },
  });
  if (!member) return { success: false, error: "Member not found." };

  await prisma.user.delete({ where: { id: memberId } });

  revalidatePath("/settings");
  return { success: true };
}

// ---------------------------------------------------------------------------
// Account tab
// ---------------------------------------------------------------------------

export async function updateDisplayNameAction(name: string): Promise<ActionResult> {
  const { dbUser } = await requireAuth();

  const trimmed = name.trim();
  if (!trimmed) return { success: false, error: "Name is required." };

  await prisma.user.update({
    where: { id: dbUser.id },
    data: { name: trimmed },
  });

  revalidatePath("/settings");
  return { success: true };
}

export async function changePasswordAction(
  currentPassword: string,
  newPassword: string,
): Promise<ActionResult> {
  await requireAuth();

  if (newPassword.length < 8) {
    return { success: false, error: "New password must be at least 8 characters." };
  }

  const supabase = await createServerSupabaseClient();

  // Re-authenticate with current password first.
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return { success: false, error: "Session error. Please log in again." };

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });
  if (signInError) {
    return { success: false, error: "Current password is incorrect." };
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function deleteOrganizationAction(confirmName: string): Promise<ActionResult> {
  const { dbUser } = await requireOwner();

  if (confirmName.trim() !== dbUser.organization.name) {
    return { success: false, error: "Organization name does not match." };
  }

  await prisma.organization.delete({ where: { id: dbUser.organizationId } });

  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();

  redirect("/login");
}
