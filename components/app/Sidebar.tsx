"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Users,
  Monitor,
  BarChart3,
  Settings,
  Gauge,
} from "lucide-react";

import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Nav items
// ---------------------------------------------------------------------------

const navItems = [
  { label: "Clients", href: "/coming-soon", icon: Users },
  { label: "Devices", href: "/coming-soon", icon: Monitor },
  { label: "Reports", href: "/coming-soon", icon: BarChart3 },
  { label: "Settings", href: "/coming-soon", icon: Settings },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface SidebarNavProps {
  className?: string;
}

/**
 * The sidebar nav links. Rendered both inside the desktop sidebar and inside
 * the Sheet drawer for mobile. Accepts a className so the parent can control
 * padding / width.
 */
export function SidebarNav({ className }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <nav className={cn("flex flex-col gap-0.5", className)}>
      {/* Logo area — visible in the Sheet drawer; hidden on desktop (the top nav shows it there) */}
      <div className="mb-4 flex items-center gap-2 px-2 md:hidden">
        <Gauge className="text-primary h-5 w-5" />
        <span className="font-semibold tracking-tight">ClientPulse</span>
      </div>

      {navItems.map(({ label, href, icon: Icon }) => {
        const isActive = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={label}
            href={href}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
