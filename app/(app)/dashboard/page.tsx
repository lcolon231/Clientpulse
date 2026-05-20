import { requireAuth } from "@/lib/auth";

import { SignOutButton } from "@/components/app/SignOutButton";

export const metadata = {
  title: "Dashboard — ClientPulse",
};

export default async function DashboardPage() {
  // requireAuth() redirects to /login if there is no valid session.
  // After this line, both authUser and dbUser are guaranteed non-null.
  const { dbUser } = await requireAuth();

  return (
    <div className="flex min-h-svh flex-col">
      {/* ------------------------------------------------------------------ */}
      {/* Header                                                               */}
      {/* ------------------------------------------------------------------ */}
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <span className="font-semibold tracking-tight">ClientPulse</span>
          <SignOutButton />
        </div>
      </header>

      {/* ------------------------------------------------------------------ */}
      {/* Main                                                                 */}
      {/* ------------------------------------------------------------------ */}
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 py-12">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-sm">
            Week 1 placeholder — features coming soon.
          </p>
        </div>

        {/* User + org identity card */}
        <div className="rounded-xl border bg-background p-6 shadow-sm">
          <dl className="space-y-4">
            <div>
              <dt className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                Signed in as
              </dt>
              <dd className="mt-1 font-medium">
                {/* TODO (Week 2): replace with dbUser.name once a name field
                    is added to the User model. */}
                {dbUser.email}
              </dd>
            </div>

            <div>
              <dt className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                Organization
              </dt>
              <dd className="mt-1 font-medium">{dbUser.organization.name}</dd>
            </div>

            <div>
              <dt className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                Role
              </dt>
              <dd className="mt-1">
                <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium">
                  {dbUser.role}
                </span>
              </dd>
            </div>
          </dl>
        </div>
      </main>
    </div>
  );
}
