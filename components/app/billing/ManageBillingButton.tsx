"use client";

import * as React from "react";
import { Loader2Icon, ExternalLinkIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export function ManageBillingButton() {
  const [loading, setLoading] = React.useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        toast.error(data.error ?? "Failed to open billing portal.");
        return;
      }
      window.location.href = data.url;
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button variant="outline" onClick={handleClick} disabled={loading} className="gap-2">
      {loading ? (
        <Loader2Icon className="h-4 w-4 animate-spin" />
      ) : (
        <ExternalLinkIcon className="h-4 w-4" />
      )}
      {loading ? "Opening…" : "Manage Billing"}
    </Button>
  );
}
