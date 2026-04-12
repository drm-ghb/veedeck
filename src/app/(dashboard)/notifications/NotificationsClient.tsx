"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Bell, ExternalLink, Circle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { pusherClient } from "@/lib/pusher";

interface Notification {
  id: string;
  message: string;
  link: string;
  read: boolean;
  type?: string | null;
  requestId?: string | null;
  createdAt: string;
  projectId?: string | null;
  projectTitle?: string | null;
}

function dispatchUpdate() {
  window.dispatchEvent(new Event("notifications-updated"));
}

function getProjectTitle(n: Notification): string {
  if (n.projectTitle) return n.projectTitle;
  const match = n.message.match(/w projekcie "(.+)"$/);
  return match ? match[1] : "Inne";
}

function getProjectKey(n: Notification): string {
  return getProjectTitle(n);
}

function NotificationRow({
  n,
  selected,
  onToggle,
  onSee,
  onConfirm,
  onReject,
  requestResolved,
}: {
  n: Notification;
  selected: boolean;
  onToggle: () => void;
  onSee: () => void;
  onConfirm?: () => Promise<void>;
  onReject?: () => Promise<void>;
  requestResolved?: boolean;
}) {
  const [acting, setActing] = useState<"confirm" | "reject" | null>(null);

  async function handleAction(type: "confirm" | "reject") {
    setActing(type);
    try {
      if (type === "confirm") await onConfirm?.();
      else await onReject?.();
    } finally {
      setActing(null);
    }
  }

  const isStatusRequest = n.type === "status_request";
  const isVersionRestoreRequest = n.type === "version_restore_request";

  return (
    <div className={`flex items-start gap-3 px-4 py-3.5 ${!n.read ? "bg-primary/5" : ""}`}>
      <input
        type="checkbox"
        checked={selected}
        onChange={onToggle}
        className="w-4 h-4 rounded mt-0.5 flex-shrink-0 cursor-pointer"
      />
      <div className="flex items-start gap-2 flex-1 min-w-0">
        {!n.read ? (
          <Circle size={7} className="text-blue-500 fill-blue-500 mt-1.5 flex-shrink-0" />
        ) : (
          <span className="w-[7px] flex-shrink-0" />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm text-gray-800">{n.message}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {new Date(n.createdAt).toLocaleString("pl-PL")}
          </p>
          {(isStatusRequest || isVersionRestoreRequest) && !requestResolved && (
            <div className="flex gap-2 mt-2">
              <Button
                size="sm"
                className="h-7 text-xs bg-green-600 hover:bg-green-700 text-white"
                disabled={acting !== null}
                onClick={() => handleAction("confirm")}
              >
                {acting === "confirm" ? "..." : "Potwierdź"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs text-red-600 border-red-200 hover:bg-red-50"
                disabled={acting !== null}
                onClick={() => handleAction("reject")}
              >
                {acting === "reject" ? "..." : "Odrzuć"}
              </Button>
            </div>
          )}
          {(isStatusRequest || isVersionRestoreRequest) && requestResolved && (
            <p className="text-xs text-gray-400 mt-1 italic">Prośba rozpatrzona</p>
          )}
        </div>
      </div>
      {!isStatusRequest && (
        <Link
          href={n.link}
          onClick={onSee}
          className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 flex-shrink-0 mt-0.5 whitespace-nowrap"
        >
          Zobacz
          <ExternalLink size={12} />
        </Link>
      )}
    </div>
  );
}

export default function NotificationsClient({ userId }: { userId: string }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());
  const [resolvedRequests, setResolvedRequests] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/notifications")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Notification[]) => setNotifications(data))
      .catch(() => {});

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
      pusherClient.unsubscribe(`user-${userId}`);
    };
  }, [userId]);

  const projects = useMemo(() => {
    const map: Record<string, string> = {};
    notifications.forEach((n) => {
      const key = getProjectKey(n);
      map[key] = getProjectTitle(n);
    });
    return Object.entries(map).map(([key, label]) => ({ key, label }));
  }, [notifications]);

  const filtered = useMemo(() => {
    if (activeFilters.size === 0) return notifications;
    return notifications.filter((n) => activeFilters.has(getProjectKey(n)));
  }, [notifications, activeFilters]);

  function toggleFilter(key: string) {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
    setSelected(new Set());
  }

  function clearFilters() {
    setActiveFilters(new Set());
    setSelected(new Set());
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((n) => n.id)));
    }
  }

  async function handleSee(id: string) {
    await fetch(`/api/notifications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ read: true }),
    });
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    dispatchUpdate();
  }

  async function handleBulk(read: boolean) {
    const ids = Array.from(selected);
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids, read }),
    });
    setNotifications((prev) => prev.map((n) => (selected.has(n.id) ? { ...n, read } : n)));
    setSelected(new Set());
    dispatchUpdate();
  }

  async function handleStatusRequestAction(notifId: string, requestId: string, action: "confirm" | "reject") {
    const res = await fetch(`/api/status-requests/${requestId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (res.ok) {
      setResolvedRequests((prev) => new Set([...prev, requestId]));
      setNotifications((prev) => prev.map((n) => (n.id === notifId ? { ...n, read: true } : n)));
      dispatchUpdate();
    }
  }

  async function handleVersionRestoreRequestAction(notifId: string, requestId: string, action: "confirm" | "reject") {
    const res = await fetch(`/api/version-restore-requests/${requestId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (res.ok) {
      setResolvedRequests((prev) => new Set([...prev, requestId]));
      setNotifications((prev) => prev.map((n) => (n.id === notifId ? { ...n, read: true } : n)));
      dispatchUpdate();
    }
  }

  const allSelected = filtered.length > 0 && selected.size === filtered.length;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Powiadomienia</h1>
        {notifications.length > 0 && (
          <label className="flex items-center gap-2 text-sm text-gray-500 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleSelectAll}
              className="w-4 h-4 rounded"
            />
            Zaznacz wszystkie
          </label>
        )}
      </div>

      {/* Project filters */}
      {projects.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={clearFilters}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              activeFilters.size === 0
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Wszystkie
          </button>
          {projects.map(({ key, label }) => {
            const isActive = activeFilters.has(key);
            const unreadCount = notifications.filter(
              (n) => getProjectKey(n) === key && !n.read
            ).length;
            return (
              <button
                key={key}
                onClick={() => toggleFilter(key)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-gray-900 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {label}
                {unreadCount > 0 && (
                  <span
                    className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold leading-none ${
                      isActive ? "bg-white text-gray-900" : "bg-primary text-white"
                    }`}
                  >
                    {unreadCount}
                  </span>
                )}
                {isActive && <X size={11} className="ml-0.5" />}
              </button>
            );
          })}
        </div>
      )}

      {/* Bulk bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 mb-4 px-4 py-2.5 bg-muted border border-border rounded-lg text-sm">
          <span className="text-gray-500">Zaznaczono: <strong>{selected.size}</strong></span>
          <div className="flex gap-2 ml-auto">
            <Button size="sm" variant="outline" onClick={() => handleBulk(true)}>Przeczytane</Button>
            <Button size="sm" variant="outline" onClick={() => handleBulk(false)}>Nieprzeczytane</Button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {notifications.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <Bell className="mx-auto mb-3 text-gray-300" size={48} />
          <p className="text-lg font-medium">Brak powiadomień</p>
          <p className="text-sm mt-1">Gdy klient zostawi komentarz, zobaczysz to tutaj.</p>
        </div>
      )}

      {/* Empty filter state */}
      {notifications.length > 0 && filtered.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-sm">Brak powiadomień dla wybranych projektów.</p>
        </div>
      )}

      {/* Notifications list */}
      {filtered.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden divide-y divide-border">
          {filtered.map((n) => (
            <NotificationRow
              key={n.id}
              n={n}
              selected={selected.has(n.id)}
              onToggle={() => toggleSelect(n.id)}
              onSee={() => handleSee(n.id)}
              onConfirm={
                n.requestId
                  ? n.type === "version_restore_request"
                    ? () => handleVersionRestoreRequestAction(n.id, n.requestId!, "confirm")
                    : () => handleStatusRequestAction(n.id, n.requestId!, "confirm")
                  : undefined
              }
              onReject={
                n.requestId
                  ? n.type === "version_restore_request"
                    ? () => handleVersionRestoreRequestAction(n.id, n.requestId!, "reject")
                    : () => handleStatusRequestAction(n.id, n.requestId!, "reject")
                  : undefined
              }
              requestResolved={n.requestId ? resolvedRequests.has(n.requestId) : false}
            />
          ))}
        </div>
      )}
    </div>
  );
}
