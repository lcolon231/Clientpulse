import { Badge } from "@/components/ui/badge";

// ---------------------------------------------------------------------------
// Tag color map — deterministic per well-known tag, gray for free-form
// ---------------------------------------------------------------------------

const TAG_VARIANTS: Record<
  string,
  "blue" | "green" | "purple" | "indigo" | "orange" | "yellow" | "default"
> = {
  Server: "blue",
  Workstation: "purple",
  Laptop: "indigo",
  Network: "green",
  Firewall: "orange",
  NAS: "yellow",
};

interface TagBadgeProps {
  tag: string;
}

export function TagBadge({ tag }: TagBadgeProps) {
  const variant = TAG_VARIANTS[tag] ?? "default";
  return <Badge variant={variant}>{tag}</Badge>;
}

// Exposed so DevicesTab can use it for the filter UI
export { TAG_VARIANTS };
