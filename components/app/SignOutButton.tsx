"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  async function handleSignOut() {
    setIsPending(true);
    const supabase = createBrowserSupabaseClient();
    await supabase.auth.signOut();
    // refresh() clears the cached server components that still hold the old
    // session; replace() navigates without adding /dashboard to history so
    // the back button doesn't return to a now-protected page.
    router.refresh();
    router.replace("/login");
  }

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={isPending}
      onClick={handleSignOut}
    >
      {isPending ? "Signing out…" : "Sign out"}
    </Button>
  );
}
