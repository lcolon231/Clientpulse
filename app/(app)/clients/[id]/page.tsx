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
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const { dbUser } = await requireAuth();

  const client = await prisma.client.findFirst({
    where: { id, organizationId: dbUser.organizationId },
    include: {
      devices: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!client) notFound();

  return (
    <ClientDetailPage
      client={client}
      devices={client.devices}
      role={dbUser.role}
      activeTab={sp.tab ?? "overview"}
    />
  );
}
