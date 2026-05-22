import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { ClientListPage } from "@/components/app/clients/ClientListPage";

export const metadata = {
  title: "Clients — ClientPulse",
};

export default async function ClientsPage() {
  const { dbUser } = await requireAuth();

  const clients = await prisma.client.findMany({
    where: { organizationId: dbUser.organizationId },
    include: {
      _count: { select: { devices: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const canWrite = dbUser.role !== "READONLY";

  return (
    <ClientListPage
      clients={clients}
      canWrite={canWrite}
    />
  );
}
