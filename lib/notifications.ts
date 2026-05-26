import "server-only";

import { prisma } from "@/lib/db/prisma";

export async function createNotification(
  organizationId: string,
  title: string,
  body: string,
  linkHref?: string,
): Promise<void> {
  try {
    await prisma.notification.create({
      data: { organizationId, title, body, linkHref: linkHref ?? null },
    });
  } catch (err) {
    // Non-fatal — never let notification failures break the caller.
    console.error("[createNotification]", err);
  }
}
