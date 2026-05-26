"use client";

import * as React from "react";
import Link from "next/link";
import { Bell } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  getNotificationsAction,
  markNotificationReadAction,
  markAllNotificationsReadAction,
  type NotificationRow,
} from "@/lib/actions/notifications";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface NotificationBellProps {
  initialUnreadCount: number;
}

export function NotificationBell({ initialUnreadCount }: NotificationBellProps) {
  const [open, setOpen] = React.useState(false);
  const [notifications, setNotifications] = React.useState<NotificationRow[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(initialUnreadCount);
  const [loading, setLoading] = React.useState(false);

  async function loadNotifications() {
    setLoading(true);
    try {
      const rows = await getNotificationsAction();
      setNotifications(rows);
      setUnreadCount(rows.filter((n) => !n.read).length);
    } finally {
      setLoading(false);
    }
  }

  async function handleOpen(isOpen: boolean) {
    setOpen(isOpen);
    if (isOpen) await loadNotifications();
  }

  async function handleMarkRead(id: string) {
    await markNotificationReadAction(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  }

  async function handleMarkAllRead() {
    await markAllNotificationsReadAction();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  }

  const displayCount = unreadCount > 9 ? "9+" : unreadCount > 0 ? String(unreadCount) : null;

  return (
    <Popover open={open} onOpenChange={handleOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Notifications"
            className="relative"
          />
        }
      >
        <Bell className="h-4 w-4" />
        {displayCount && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-0.5 text-[10px] font-bold text-destructive-foreground leading-none">
            {displayCount}
          </span>
        )}
      </PopoverTrigger>

      <PopoverContent
        className="w-80 p-0"
        align="end"
        side="bottom"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-3 py-2.5">
          <span className="text-sm font-semibold">Notifications</span>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Mark all read
            </button>
          )}
        </div>

        {/* List */}
        <div className="max-h-[360px] overflow-y-auto">
          {loading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Loading…
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No notifications yet.
            </div>
          ) : (
            notifications.map((n) => (
              <NotificationItem
                key={n.id}
                notification={n}
                onMarkRead={handleMarkRead}
              />
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ---------------------------------------------------------------------------
// Single notification row
// ---------------------------------------------------------------------------

function NotificationItem({
  notification: n,
  onMarkRead,
}: {
  notification: NotificationRow;
  onMarkRead: (id: string) => void;
}) {
  const content = (
    <div
      className={`flex flex-col gap-0.5 px-3 py-2.5 text-sm transition-colors hover:bg-muted/60 cursor-pointer ${
        !n.read ? "bg-primary/5" : ""
      }`}
      onClick={() => { if (!n.read) onMarkRead(n.id); }}
    >
      <span className={`font-medium leading-snug ${!n.read ? "text-foreground" : "text-foreground/80"}`}>
        {n.title}
      </span>
      <span className="text-muted-foreground text-xs leading-snug line-clamp-2">
        {n.body}
      </span>
      <span className="text-muted-foreground/70 text-xs mt-0.5">
        {timeAgo(n.createdAt)}
      </span>
    </div>
  );

  if (n.linkHref) {
    return (
      <Link href={n.linkHref} className="block border-b last:border-0">
        {content}
      </Link>
    );
  }

  return <div className="border-b last:border-0">{content}</div>;
}
