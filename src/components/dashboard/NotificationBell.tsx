"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { Bell, Circle, ExternalLink } from "lucide-react";
import { pusherClient } from "@/lib/pusher";
import { useT } from "@/lib/i18n";

interface Notification {
  id: string;
  message: string;
  link: string;
  read: boolean;
  createdAt: string;
}

interface NotificationBellProps {
  userId: string;
  iconOnly?: boolean;
}

export default function NotificationBell({ userId }: NotificationBellProps) {
  const t = useT();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const unread = notifications.filter((n) => !n.read).length;
  const preview = notifications.filter((n) => !n.read).slice(0, 5);

  const refetch = useCallback(() => {
    fetch("/api/notifications")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Notification[]) => setNotifications(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    refetch();
    window.addEventListener("notifications-updated", refetch);

    const channel = pusherClient.subscribe(`user-${userId}`);
    channel.unbind_all();
    channel.bind("new-notification", (notif: Notification) => {
      setNotifications((prev) => {
        if (prev.some((n) => n.id === notif.id)) return prev;
        return [notif, ...prev];
      });
    });

    return () => {
      channel.unbind_all();
      window.removeEventListener("notifications-updated", refetch);
      pusherClient.unsubscribe(`user-${userId}`);
    };
  }, [userId, refetch]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  async function markRead(id: string) {
    await fetch(`/api/notifications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ read: true }),
    });
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    window.dispatchEvent(new Event("notifications-updated"));
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-muted"
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <span className="text-sm font-semibold">{t.dashboard.notifications}</span>
            {unread > 0 && (
              <span className="text-xs bg-red-500 text-white rounded-full px-2 py-0.5 font-medium">
                {unread} nowych
              </span>
            )}
          </div>

          {preview.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              {t.dashboard.noNewNotifications}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {preview.map((n) => (
                <Link
                  key={n.id}
                  href={n.link}
                  onClick={() => { markRead(n.id); setOpen(false); }}
                  className="flex items-start gap-2.5 px-4 py-3 bg-primary/5 dark:bg-primary/10 hover:bg-primary/10 dark:hover:bg-primary/15 transition-colors cursor-pointer"
                >
                  <Circle size={7} className="text-blue-500 fill-blue-500 mt-1.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-foreground leading-snug line-clamp-2">{n.message}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {new Date(n.createdAt).toLocaleString("pl-PL")}
                    </p>
                  </div>
                  <ExternalLink size={13} className="shrink-0 text-muted-foreground mt-0.5" />
                </Link>
              ))}
            </div>
          )}

          <div className="border-t border-border">
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="flex items-center justify-center w-full py-2.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              {t.dashboard.seeAll}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
