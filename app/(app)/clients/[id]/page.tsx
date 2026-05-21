import { notFound } from "next/navigation";

import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { ClientDetailPage } from "@/components/app/clients/ClientDetailPage";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const client = await prisma.client.findUnique({
    where: { id },
    select: { name: true },
  });
  return { title: client ? `${client.name} — ClientPulse` : "Client — ClientPulse" };
}

export default async function ClientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { dbUser } = await requireAuth();

  const client = await prisma.client.findFirst({
    where: { id, organizationId: dbUser.organizationId },
    include: {
      devices: {
        orderBy: { createdAt: "desc" },
      },
      _count: { select: { devices: true } },
    },
  });

  if (!client) notFound();

  return (
    <ClientDetailPage
      client={client}
      devices={client.devices}
      deviceCount={client._count.devices}
      role={dbUser.role}
      dbUserId={dbUser.id}
      organizationId={dbUser.organizationId}
    />
  );
}
