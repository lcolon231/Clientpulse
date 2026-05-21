import { requireAuth } from "@/lib/auth";
import { AppShell } from "@/components/app/AppShell";

/**
 * Layout for all authenticated pages (the `(app)` route group).
 *
 * requireAuth() is called here — not in every individual page — so every
 * child page in this group is automatically protected with one call.
 * The Server → Client boundary is clean: we pass only serializable primitives
 * to AppShell (strings), never the full dbUser object.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { dbUser } = await requireAuth();

  return (
    <AppShell
      orgName={dbUser.organization.name}
      userName={dbUser.name ?? null}
      userEmail={dbUser.email}
    >
      {children}
    </AppShell>
  );
}
