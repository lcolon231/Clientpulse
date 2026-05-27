import { notFound } from "next/navigation";

import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { getClientHealth } from "@/lib/health/calculate-client-health";
import { canUseFeature } from "@/lib/plans";
import { ClientDetailPage } from "@/components/app/clients/ClientDetailPage";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { dbUser } = await requireAuth();
  const client = await prisma.client.findFirst({
    where: { id, organizationId: dbUser.organizationId },
    select: { name: true },
  });
  return { title: client ? `${client.name} — ClientPulse` : "Client — ClientPulse" };
}

export default async function ClientPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const { dbUser } = await requireAuth();

  const [client, health, tickets, orgMembers] = await Promise.all([
    prisma.client.findFirst({
      where: { id, organizationId: dbUser.organizationId },
      include: { devices: { orderBy: { createdAt: "desc" } } },
    }),
    getClientHealth(id, dbUser.organizationId),
    prisma.ticket.findMany({
      where: { clientId: id, organizationId: dbUser.organizationId },
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
    }),
    prisma.user.findMany({
      where: { organizationId: dbUser.organizationId },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!client) notFound();

  return (
    <ClientDetailPage
      client={client}
      devices={client.devices}
      role={dbUser.role}
      activeTab={sp.tab ?? "overview"}
      health={health}
      canUseCsvImport={canUseFeature(dbUser.organization, "csv_import")}
      tickets={tickets}
      orgMembers={orgMembers}
    />
  );
}
