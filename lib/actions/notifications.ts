"use server";

import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";

export type NotificationRow = {
  id: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: Date;
  linkHref: string | null;
};

export async function getNotificationsAction(): Promise<NotificationRow[]> {
  const { dbUser } = await requireAuth();

  return prisma.notification.findMany({
    where: { organizationId: dbUser.organizationId },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      title: true,
      body: true,
      read: true,
      createdAt: true,
      linkHref: true,
    },
  });
}

export async function markNotificationReadAction(id: string): Promise<void> {
  const { dbUser } = await requireAuth();

  await prisma.notification.updateMany({
    where: { id, organizationId: dbUser.organizationId },
    data: { read: true },
  });
}

export async function markAllNotificationsReadAction(): Promise<void> {
  const { dbUser } = await requireAuth();

  await prisma.notification.updateMany({
    where: { organizationId: dbUser.organizationId, read: false },
    data: { read: true },
  });
}
