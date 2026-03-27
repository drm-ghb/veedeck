"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { pusherClient } from "@/lib/pusher";

interface NotificationBellProps {
  userId: string;
  iconOnly?: boolean;
}

export default function NotificationBell({ userId, iconOnly }: NotificationBellProps) {
  const [unread, setUnread] = useState(0);

  const refetch = useCallback(() => {
    fetch("/api/notifications")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: { read: boolean }[]) => {
        setUnread(data.filter((n) => !n.read).length);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    refetch();

    window.addEventListener("notifications-updated", refetch);

    const channel = pusherClient.subscribe(`user-${userId}`);
    channel.unbind_all();
    channel.bind("new-notification", () => {
      setUnread((prev) => prev + 1);
    });

    return () => {
      channel.unbind_all();
      window.removeEventListener("notifications-updated", refetch);
      pusherClient.unsubscribe(`user-${userId}`);
    };
  }, [userId, refetch]);

  return (
    <Link
      href="/notifications"
      className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors relative"
    >
      <Bell size={16} />
      {!iconOnly && "Powiadomienia"}
      {unread > 0 && (
        <span className="absolute -top-1.5 -right-3 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </Link>
  );
}
