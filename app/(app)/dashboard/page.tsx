import Link from "next/link";
import { Users } from "lucide-react";

import { requireAuth } from "@/lib/auth";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { InviteModal } from "@/components/app/InviteModal";

export const metadata = {
  title: "Dashboard — ClientPulse",
};

export default async function DashboardPage() {
  // requireAuth() is also called by the layout, but calling it again here is
  // cheap (result is cached for the request) and gives us direct access to role
  // without prop-drilling through the Client Component shell.
  const { dbUser } = await requireAuth();

  const isOwner = dbUser.role === "OWNER";

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-sm">
            {dbUser.organization.name}
          </p>
        </div>

        {/* Invite button — only rendered for OWNER role.
            The InviteModal server action has its own requireOwner() check,
            so this is a UX convenience, not the security gate. */}
        {isOwner && <InviteModal />}
      </div>

      {/* Empty state card */}
      <Card>
        <CardHeader>
          <CardTitle>No clients yet</CardTitle>
          <CardDescription>
            Add your first client to start monitoring their devices and health
            metrics.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button render={<Link href="/clients" />} nativeButton={false} className="gap-1.5">
            <Users className="h-4 w-4" />
            Go to Clients
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
