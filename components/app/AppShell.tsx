"use client";

import { Gauge, Menu } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { SignOutButton } from "@/components/app/SignOutButton";
import { SidebarNav } from "@/components/app/Sidebar";
import { NotificationBell } from "@/components/app/NotificationBell";
import { Toaster } from "@/components/ui/toast";
import { Toaster as SonnerToaster } from "sonner";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getInitials(name: string | null, email: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0][0].toUpperCase();
  }
  return email[0].toUpperCase();
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface AppShellProps {
  orgName: string;
  userName: string | null;
  userEmail: string;
  initialUnreadCount: number;
  children: React.ReactNode;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * The authenticated app shell: top nav + desktop sidebar + mobile Sheet drawer.
 *
 * This is a Client Component because:
 *   - Sheet (mobile drawer) manages open/close state
 *
 * It receives only serializable primitives from the Server Component layout
 * (orgName, userName, userEmail), so the Server → Client boundary is clean.
 *
 * Role-gated UI (e.g. InviteModal) is NOT rendered here — it lives in the
 * individual page (dashboard/page.tsx) where it receives the role directly
 * from requireAuth(). That keeps the shell generic and role logic co-located
 * with the feature that uses it.
 */
export function AppShell({
  orgName,
  userName,
  userEmail,
  initialUnreadCount,
  children,
}: AppShellProps) {
  const initials = getInitials(userName, userEmail);
  const displayName = userName ?? userEmail;

  return (
    <>
    <Toaster>
    <div className="flex min-h-svh flex-col">
      {/* ------------------------------------------------------------------ */}
      {/* Top navigation                                                       */}
      {/* ------------------------------------------------------------------ */}
      <header className="bg-background sticky top-0 z-40 flex h-14 items-center gap-3 border-b px-4">
        {/* Mobile hamburger — opens the Sheet drawer */}
        <Sheet>
          <SheetTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                className="md:hidden"
                aria-label="Open navigation"
              />
            }
          >
            <Menu className="h-5 w-5" />
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-4" showCloseButton>
            <SidebarNav />
          </SheetContent>
        </Sheet>

        {/* Logo — visible on desktop; on mobile the Sheet has its own logo */}
        <div className="hidden items-center gap-2 md:flex">
          <Gauge className="text-primary h-5 w-5" />
          <span className="font-semibold tracking-tight">ClientPulse</span>
        </div>

        {/* Org name — center-ish on desktop, right-of-hamburger on mobile */}
        <span className="text-muted-foreground text-sm font-medium">
          {orgName}
        </span>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Notification bell + user avatar + logout */}
        <div className="flex items-center gap-2">
          <NotificationBell initialUnreadCount={initialUnreadCount} />
          <Avatar size="sm">
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium max-w-[120px] truncate hidden sm:block">
            {displayName}
          </span>
          <SignOutButton />
        </div>
      </header>

      {/* ------------------------------------------------------------------ */}
      {/* Body: sidebar (desktop) + main content                              */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex flex-1">
        {/* Desktop sidebar — hidden on mobile (Sheet covers that) */}
        <aside className="bg-background hidden w-56 shrink-0 flex-col border-r p-4 md:flex">
          <SidebarNav />
        </aside>

        {/* Main content */}
        <main className="flex flex-1 flex-col overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
    </Toaster>
    <SonnerToaster richColors position="top-right" />
    </>
  );
}
