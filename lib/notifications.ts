import "server-only";

import { prisma } from "@/lib/db/prisma";
import { logger } from "@/lib/logger";

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
    logger.error({ err }, "[createNotification] failed");
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AlertType = "patch_age" | "health_critical";
export type EntityType = "device" | "client";

// ---------------------------------------------------------------------------
// Dedup helpers
// ---------------------------------------------------------------------------

export async function wasAlertSentRecently(params: {
  organizationId: string;
  entityType: EntityType;
  entityId: string;
  alertType: AlertType;
}): Promise<boolean> {
  const { organizationId, entityType, entityId, alertType } = params;
  const since = new Date(Date.now() - 7 * 86_400_000);

  const existing = await prisma.auditLog.findFirst({
    where: {
      organizationId,
      entityType,
      entityId,
      action: `alert_sent:${alertType}`,
      createdAt: { gte: since },
    },
    select: { id: true },
  });

  return existing !== null;
}

export async function recordAlertSent(params: {
  organizationId: string;
  entityType: EntityType;
  entityId: string;
  alertType: AlertType;
}): Promise<void> {
  const { organizationId, entityType, entityId, alertType } = params;

  try {
    await prisma.auditLog.create({
      data: {
        action: `alert_sent:${alertType}`,
        entityType,
        entityId,
        organizationId,
        userId: null,
        metadata: {},
      },
    });
    logger.info(
      { organizationId, entityType, entityId, alertType },
      "Alert dedup record written",
    );
  } catch (err) {
    logger.error({ err, ...params }, "Failed to write alert dedup record");
  }
}

export async function sendThresholdAlertIfNeeded(params: {
  organizationId: string;
  entityType: EntityType;
  entityId: string;
  alertType: AlertType;
  recipientEmail: string;
  subject: string;
  body: string;
}): Promise<void> {
  const { organizationId, entityType, entityId, alertType, recipientEmail, subject } =
    params;

  const alreadySent = await wasAlertSentRecently({
    organizationId,
    entityType,
    entityId,
    alertType,
  });

  if (alreadySent) {
    logger.info(
      { organizationId, entityId, alertType },
      "Alert suppressed — already sent within 7 days",
    );
    return;
  }

  try {
    logger.info(
      { recipientEmail, subject, organizationId, entityId, alertType },
      "Sending threshold alert email",
    );
    await recordAlertSent({ organizationId, entityType, entityId, alertType });
  } catch (err) {
    logger.error({ err, recipientEmail, subject }, "Failed to send threshold alert");
  }
}
