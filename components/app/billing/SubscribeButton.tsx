"use client";

import * as React from "react";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

interface SubscribeButtonProps {
  priceId: string;
  label?: string;
  disabled?: boolean;
}

export function SubscribeButton({
  priceId,
  label = "Subscribe",
  disabled = false,
}: SubscribeButtonProps) {
  const [loading, setLoading] = React.useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        toast.error(data.error ?? "Failed to start checkout.");
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
    <Button
      onClick={handleClick}
      disabled={disabled || loading}
      className="w-full gap-2"
    >
      {loading && <Loader2Icon className="h-4 w-4 animate-spin" />}
      {loading ? "Redirecting…" : label}
    </Button>
  );
}
