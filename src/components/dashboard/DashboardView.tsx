"use client";

import Link from "next/link";
import { useState, useEffect, type ReactNode } from "react";
import { pusherClient } from "@/lib/pusher";
import {
  Users,
  LocalMall,
  Package,
  MapPin,
  Pin,
  Bell,
  RotateCcw,
  ChatBubble,
  Comment,
  PushPin,
  HelpCircle,
  ChevronRight,
  Layers,
  CheckCircle2,
  Check,
  X,
  CalendarDays,
  CheckSquare,
  MoreVertical,
} from "@/components/ui/icons";
import NewProjectDialog from "./NewProjectDialog";
import NewListDialog from "@/components/listy/NewListDialog";
import PdfThumbnail from "@/components/render/PdfThumbnail";
import { useT } from "@/lib/i18n";

interface Stats {
  clients: number;
  projects: number;
  renderflowProjects: number;
  lists: number;
  notificationCount: number;
}

interface RecentProject {
  id: string;
  slug: string | null;
  title: string;
  clientName: string | null;
  pinned: boolean;
  renderCount: number;
  lastRenderUrl: string | null;
  lastRenderFileType: string | null;
  updatedAt: string;
  unreadPins: number;
  unreadChat: number;
}

interface Pin {
  id: string;
  title: string | null;
  content: string;
  author: string;
  createdAt: string;
  renderId: string;
  renderName: string;
  projectId: string;
  projectTitle: string;
  projectSlug: string | null;
}

interface StatusRequest {
  id: string;
  renderName: string;
  clientName: string | null;
  projectId: string;
  projectTitle: string;
  projectSlug: string | null;
  createdAt: string;
}

interface VersionRequest {
  id: string;
  renderName: string;
  clientName: string | null;
  projectId: string;
  projectTitle: string;
  projectSlug: string | null;
  createdAt: string;
}

interface RenderDiscussion {
  id: string;
  content: string;
  author: string;
  createdAt: string;
  renderId: string;
  renderName: string;
  projectId: string;
  projectTitle: string;
}

interface ListMessage {
  id: string;
  content: string;
  author: string;
  createdAt: string;
  productId: string;
  productName: string;
  listId: string;
  listName: string;
  listSlug: string | null;
}

interface RenderReply {
  id: string;
  content: string;
  author: string;
  createdAt: string;
  commentId: string;
  renderId: string;
  renderName: string;
  projectId: string;
  projectTitle: string;
}

interface ListReply {
  id: string;
  content: string;
  author: string;
  createdAt: string;
  commentId: string;
  productId: string;
  productName: string;
  listId: string;
  listName: string;
  listSlug: string | null;
}

interface RecentList {
  id: string;
  slug: string | null;
  name: string;
  pinned: boolean;
  projectTitle: string | null;
  clientName: string | null;
  sectionCount: number;
  updatedAt: string;
}

interface TodayEvent {
  id: string;
  title: string;
  type: string;
  startAt: string;
  endAt: string | null;
}

interface DueTask {
  id: string;
  title: string;
  dueDate: string;
  status: string;
  projectTitle: string | null;
}

interface DashboardViewProps {
  displayName: string | null;
  userId: string;
  hiddenModules: string[];
  stats: Stats;
  recentProjects: RecentProject[];
  recentLists: RecentList[];
  pins: Pin[];
  statusRequests: StatusRequest[];
  versionRequests: VersionRequest[];
  renderDiscussions: RenderDiscussion[];
  listMessages: ListMessage[];
  renderReplies: RenderReply[];
  listReplies: ListReply[];
  todayEvents: TodayEvent[];
  dueTasks: DueTask[];
}

function MobileDiscussionsBubble() {
  const t = useT();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetch("/api/discussions")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: { unreadCount: number }[]) => {
        const total = data.reduce((sum, d) => sum + (d.unreadCount ?? 0), 0);
        setUnreadCount(total);
      })
      .catch(() => {});
  }, []);

  const hasUnread = unreadCount > 0;

  return (
    <Link
      href="/dyskusje"
      className="sm:hidden flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border transition-colors bg-violet-500/10 border-violet-300/20 hover:bg-violet-500/15"
    >
      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-violet-500/10">
        <ChatBubble size={14} className="text-violet-400 dark:text-violet-500" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-violet-500/70 dark:text-violet-400/60 leading-tight">
          {hasUnread ? <span className="font-semibold text-violet-600 dark:text-violet-400">{t.home.unreadDiscussions}</span> : t.home.noNewMessages}
        </p>
      </div>
      {hasUnread && (
        <span className="shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-violet-600 text-white text-[11px] font-semibold flex items-center justify-center">
          {unreadCount}
        </span>
      )}
      <ChevronRight size={14} className="shrink-0 text-violet-400" />
    </Link>
  );
}

function InfoTooltip({ items }: { items: string[] }) {
  const t = useT();
  return (
    <div className="relative group/tip inline-flex items-center">
      <HelpCircle size={13} className="text-muted-foreground/50 hover:text-muted-foreground cursor-help transition-colors" />
      <div className="pointer-events-none absolute top-full right-0 mt-1.5 z-50 hidden group-hover/tip:block w-68 rounded-lg border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
        <p className="font-medium mb-1">{t.home.tooltipSection}</p>
        <ul className="space-y-0.5">
          {items.map((item, i) => (
            <li key={i} className="flex gap-1.5"><span className="shrink-0">–</span>{item}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function timeAgo(dateStr: string, t: ReturnType<typeof useT>): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor(diff / 60000);
  if (days >= 7) return new Date(dateStr).toLocaleDateString("pl-PL", { day: "numeric", month: "short" });
  if (days > 0) return `${days} ${days === 1 ? t.home.dayAgo : t.home.daysAgo}`;
  if (hours > 0) return `${hours} ${t.home.hoursAgo}`;
  if (minutes > 0) return `${minutes} ${t.home.minutesAgo}`;
  return t.home.justNow;
}

const EVENT_TYPE_COLORS: Record<string, { bar: string; bg: string; text: string }> = {
  WYDARZENIE:    { bar: "bg-blue-400 dark:bg-blue-500",   bg: "bg-blue-50 dark:bg-blue-900/30",   text: "text-blue-700 dark:text-blue-300" },
  ZADANIE:       { bar: "bg-violet-400 dark:bg-violet-500", bg: "bg-violet-50 dark:bg-violet-900/30", text: "text-violet-700 dark:text-violet-300" },
  PRZYPOMNIENIE: { bar: "bg-amber-400 dark:bg-amber-500", bg: "bg-amber-50 dark:bg-amber-900/30", text: "text-amber-700 dark:text-amber-300" },
};

function SectionCollapse({ hidden, children }: { hidden: boolean; children: ReactNode }) {
  return (
    <div style={{
      display: "grid",
      gridTemplateRows: hidden ? "0fr" : "1fr",
      transition: "grid-template-rows 0.3s ease, opacity 0.2s ease",
      opacity: hidden ? 0 : 1,
      pointerEvents: hidden ? "none" : undefined,
    }}>
      <div className="min-h-0 overflow-hidden">
        {children}
      </div>
    </div>
  );
}

const SECTION_CONFIG = [
  { key: "projekty", label: "Projekty" },
  { key: "listy", label: "Listy" },
  { key: "kalendarz", label: "Kalendarz" },
  { key: "wiadomosci", label: "Wiadomości" },
  { key: "zadania", label: "Zadania" },
] as const;

export default function DashboardView({
  displayName,
  userId,
  hiddenModules,
  stats,
  recentProjects,
  recentLists,
  pins,
  statusRequests,
  versionRequests,
  renderDiscussions,
  listMessages,
  renderReplies,
  listReplies,
  todayEvents,
  dueTasks,
}: DashboardViewProps) {
  const t = useT();

  const [notifCount, setNotifCount] = useState(stats.notificationCount);
  const [hiddenSections, setHiddenSections] = useState<string[]>([]);
  const [sectionMenuOpen, setSectionMenuOpen] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("dashboard-hidden-sections");
      if (stored) setHiddenSections(JSON.parse(stored));
    } catch {}
  }, []);

  function toggleSection(key: string) {
    setHiddenSections((prev) => {
      const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key];
      try { localStorage.setItem("dashboard-hidden-sections", JSON.stringify(next)); } catch {}
      return next;
    });
  }

  const isSectionHidden = (key: string) => hiddenSections.includes(key);

  useEffect(() => {
    function onUpdated() {
      fetch("/api/notifications")
        .then((r) => (r.ok ? r.json() : []))
        .then((data: { read: boolean }[]) => setNotifCount(data.filter((n) => !n.read).length))
        .catch(() => {});
    }
    // Fresh fetch on every mount — overrides potentially stale server-rendered count from router cache
    onUpdated();
    window.addEventListener("notifications-updated", onUpdated);

    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel("notifications");
      bc.onmessage = (e) => { if (e.data?.type === "mark-read") onUpdated(); };
    } catch {}

    const channel = pusherClient.subscribe(`user-${userId}`);
    channel.bind("new-notification", () => setNotifCount((c) => c + 1));

    return () => {
      window.removeEventListener("notifications-updated", onUpdated);
      bc?.close();
      channel.unbind("new-notification");
      pusherClient.unsubscribe(`user-${userId}`);
    };
  }, [userId]);

  const [resolvedIds, setResolvedIds] = useState<Set<string>>(new Set());
  const [viewedPinIds, setViewedPinIds] = useState<Set<string>>(new Set());
  const [actingOn, setActingOn] = useState<string | null>(null);

  const [viewedMessageIds, setViewedMessageIds] = useState<Set<string>>(new Set());

  // Filter to client's local "today" (server sends ±1 day to cover all timezones)
  const localToday = new Date();
  const localTodayEvents = todayEvents.filter((ev) => {
    const d = new Date(ev.startAt);
    return d.getFullYear() === localToday.getFullYear() &&
      d.getMonth() === localToday.getMonth() &&
      d.getDate() === localToday.getDate();
  });

  function markPinViewed(pinId: string) {
    setViewedPinIds((prev) => new Set([...prev, pinId]));
    fetch(`/api/comments/${pinId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ viewedByDesigner: true }),
    });
  }

  function markDiscussionViewed(commentId: string) {
    setViewedMessageIds((prev) => new Set([...prev, commentId]));
    fetch(`/api/comments/${commentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ viewedByDesigner: true }),
    });
  }

  function markListMessageViewed(commentId: string) {
    setViewedMessageIds((prev) => new Set([...prev, commentId]));
    fetch(`/api/list-comments/${commentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ viewedByDesigner: true }),
    });
  }

  function markRenderReplyViewed(reply: RenderReply) {
    setViewedMessageIds((prev) => new Set([...prev, reply.id]));
    fetch(`/api/comments/${reply.commentId}/replies/${reply.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ viewedByDesigner: true }),
    });
  }

  function markListReplyViewed(reply: ListReply) {
    setViewedMessageIds((prev) => new Set([...prev, reply.id]));
    fetch(`/api/list-comments/${reply.commentId}/replies/${reply.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ viewedByDesigner: true }),
    });
  }

  type TodoItem =
    | { type: "pin"; data: Pin }
    | { type: "status"; data: StatusRequest }
    | { type: "version"; data: VersionRequest }
    | { type: "task"; data: DueTask };

  const sortedTasks = [...dueTasks].sort(
    (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
  );

  const allTodoItems: TodoItem[] = [
    ...sortedTasks.map((t) => ({ type: "task" as const, data: t })),
    ...[
      ...pins.filter((p) => !viewedPinIds.has(p.id)).map((p) => ({ type: "pin" as const, data: p })),
      ...statusRequests
        .filter((r) => !resolvedIds.has(r.id))
        .map((r) => ({ type: "status" as const, data: r })),
      ...versionRequests
        .filter((r) => !resolvedIds.has(r.id))
        .map((r) => ({ type: "version" as const, data: r })),
    ].sort((a, b) => new Date(b.data.createdAt).getTime() - new Date(a.data.createdAt).getTime()),
  ];

  const todoCount = allTodoItems.length;

  async function handleRequest(
    id: string,
    type: "status" | "version",
    action: "confirm" | "reject"
  ) {
    setActingOn(`${id}-${action}`);
    const endpoint =
      type === "status"
        ? `/api/status-requests/${id}`
        : `/api/version-restore-requests/${id}`;
    try {
      const res = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        setResolvedIds((prev) => new Set([...prev, id]));
      }
    } finally {
      setActingOn(null);
    }
  }

  return (
    <div>
      {/* Welcome row */}
      <div className="flex items-center justify-between gap-3 mb-5 lg:mb-[22px]">
        <h1 className="text-2xl font-bold lg:text-[23px] lg:tracking-tight">
          {displayName
            ? t.home.welcome.replace("{name}", displayName.split(" ")[0])
            : t.home.welcomeDefault}
        </h1>
        <div className="flex items-center gap-2 shrink-0">
          <div className="lg:hidden">
            <NewProjectDialog clientMode iconOnly />
          </div>
          <div className="hidden lg:block">
            <NewProjectDialog label={t.projekty.newClient} clientMode />
          </div>
          <div className="relative">
            <button
              onClick={() => setSectionMenuOpen((v) => !v)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Dostosuj panel"
            >
              <MoreVertical size={16} />
            </button>
            {sectionMenuOpen && (
              <>
                <div className="fixed inset-0 z-[5]" onClick={() => setSectionMenuOpen(false)} />
                <div className="absolute right-0 top-[calc(100%+6px)] z-10 w-52 bg-card border border-border rounded-xl shadow-lg overflow-hidden p-1.5">
                  {SECTION_CONFIG.map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => toggleSection(key)}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-left hover:bg-muted transition-colors"
                    >
                      <div className={`w-4 h-4 rounded flex items-center justify-center border-2 shrink-0 transition-colors ${
                        !hiddenSections.includes(key)
                          ? "bg-primary border-primary"
                          : "border-muted-foreground/40"
                      }`}>
                        {!hiddenSections.includes(key) && <Check size={10} className="text-primary-foreground" />}
                      </div>
                      <span className="text-foreground">{label}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="mb-4 lg:hidden">
        <MobileDiscussionsBubble />
      </div>

      {/* Stats — full width */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6 lg:mb-5">
        <Link
          href="/klienci"
          className="min-w-0 flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:border-primary/30 hover:bg-primary/5 transition-colors"
        >
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Users size={16} className="text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-xl font-bold leading-none">{stats.clients}</p>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{t.home.statsClients}</p>
          </div>
        </Link>

        {!hiddenModules.includes("renderflow") && (
          <Link
            href="/projectflow"
            className="min-w-0 flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:border-primary/30 hover:bg-primary/5 transition-colors"
          >
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <PushPin size={16} className="text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-xl font-bold leading-none">{stats.renderflowProjects}</p>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{t.home.statsProjects}</p>
            </div>
          </Link>
        )}

        {!hiddenModules.includes("listy") && (
          <Link
            href="/listy-zakupowe"
            className="min-w-0 flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:border-primary/30 hover:bg-primary/5 transition-colors"
          >
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <LocalMall size={16} className="text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-xl font-bold leading-none">{stats.lists}</p>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{t.home.statsLists}</p>
            </div>
          </Link>
        )}

        <Link
          href="/notifications"
          className={`min-w-0 flex items-center gap-3 p-3 rounded-xl border transition-colors ${
            notifCount > 0
              ? "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800 hover:border-amber-300 dark:hover:border-amber-700"
              : "bg-card border-border hover:border-primary/30 hover:bg-primary/5"
          }`}
        >
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${notifCount > 0 ? "bg-amber-100 dark:bg-amber-900/40" : "bg-muted"}`}>
            {notifCount > 0
              ? <Bell size={16} className="text-amber-600 dark:text-amber-400" />
              : <CheckCircle2 size={16} className="text-muted-foreground" />}
          </div>
          <div className="min-w-0">
            <p className="text-xl font-bold leading-none">{notifCount}</p>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{t.home.statsNotifications}</p>
          </div>
        </Link>
      </div>

      {/* Main grid — 50/50 on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:items-start">

        {/* Left column: Projekty → Listy */}
        <div className="contents lg:flex lg:flex-col">

        {/* Projekty */}
        <div className="order-5 lg:order-1">
        <SectionCollapse hidden={isSectionHidden("projekty")}>
        <div className="space-y-3 lg:space-y-0 lg:pb-[22px]">
            <div className="flex items-center justify-between mb-0 lg:mb-[10px]">
              <h2 className="text-sm lg:text-[13px] font-semibold lg:font-bold text-foreground">{t.home.recentProjectsTitle}</h2>
              <Link href="/projectflow" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-0.5 transition-colors">
                {t.home.allLabel} <ChevronRight size={13} />
              </Link>
            </div>
            {recentProjects.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
                <Layers size={32} className="mx-auto mb-3 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground mb-3">{t.home.noProjectsYet}</p>
                <NewProjectDialog module="renderflow" />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {recentProjects.map((project, i) => (
                  <Link
                    key={project.id}
                    href={`/projekty/${project.id}`}
                    className={`group flex flex-col rounded-xl border border-border bg-card overflow-hidden hover:border-primary/30 hover:shadow-md transition-all${i > 0 ? " hidden sm:flex" : ""}`}
                  >
                    <div className="w-full aspect-[4/3] bg-muted flex items-center justify-center overflow-hidden">
                      {project.lastRenderUrl ? (
                        project.lastRenderFileType === "pdf" ? (
                          <PdfThumbnail fileUrl={project.lastRenderUrl} className="w-full h-full group-hover:scale-105 transition-transform duration-300" />
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={project.lastRenderUrl} alt={project.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        )
                      ) : (
                        <PushPin size={28} className="text-muted-foreground/30" />
                      )}
                    </div>
                    <div className="p-3">
                      <p className="text-sm font-medium truncate flex items-center gap-1.5">
                        {project.pinned && <Pin size={11} className="text-red-500 fill-red-500 shrink-0" />}
                        {project.title}
                      </p>
                      {project.clientName && <p className="text-xs text-muted-foreground truncate mt-0.5">{t.home.clientPrefix} {project.clientName}</p>}
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-muted-foreground">
                          {project.renderCount > 0 ? `${project.renderCount} ${project.renderCount === 1 ? t.home.renderSg : t.home.renderPl}` : t.home.noRenders}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {project.unreadPins > 0 && (
                            <span className="flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">
                              <MapPin size={9} />
                              {project.unreadPins}
                            </span>
                          )}
                          {project.unreadChat > 0 && (
                            <span className="flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                              <ChatBubble size={9} />
                              {project.unreadChat}
                            </span>
                          )}
                          {project.unreadPins === 0 && project.unreadChat === 0 && (
                            <span className="text-xs text-muted-foreground">{timeAgo(project.updatedAt, t)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
        </div>
        </SectionCollapse>
        </div>{/* end Projekty */}

        {/* Listy */}
        <div className="order-4 lg:order-2">
        <SectionCollapse hidden={isSectionHidden("listy")}>
        <div className="space-y-3 lg:space-y-0">
            <div className="flex items-center justify-between mb-0 lg:mb-[10px]">
              <h2 className="text-sm lg:text-[13px] font-semibold lg:font-bold text-foreground">{t.home.recentListsTitle}</h2>
              <Link href="/listy-zakupowe" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-0.5 transition-colors">
                {t.home.allLabel} <ChevronRight size={13} />
              </Link>
            </div>
            {recentLists.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
                <LocalMall size={32} className="mx-auto mb-3 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground mb-3">{t.home.noListsYet}</p>
                <NewListDialog />
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden">
                {recentLists.map((list) => (
                  <Link key={list.id} href={`/listy-zakupowe/${list.slug ?? list.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <LocalMall size={18} className="text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate flex items-center gap-1.5">
                        {list.pinned && <Pin size={10} className="text-red-500 fill-red-500 shrink-0" />}
                        {list.name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {list.clientName ? `${t.home.clientPrefix} ${list.clientName}` : list.projectTitle ?? (list.sectionCount > 0 ? `${list.sectionCount} ${list.sectionCount === 1 ? t.home.sectionSg : list.sectionCount < 5 ? t.home.sectionFw : t.home.sectionPl}` : t.home.noSections)}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(list.updatedAt, t)}</span>
                  </Link>
                ))}
              </div>
            )}
        </div>
        </SectionCollapse>
        </div>{/* end Listy */}

        </div>{/* end left column */}

        {/* Right column: Kalendarz → Nieprzeczytane → Do zrobienia */}
        <div className="contents lg:flex lg:flex-col">

        {/* Kalendarz dziś */}
        <div className="order-1">
        <SectionCollapse hidden={isSectionHidden("kalendarz")}>
        <div className="space-y-3 lg:space-y-0 lg:pb-5">
          <div className="flex items-center justify-between mb-0 lg:mb-[10px]">
            <h2 className="text-sm lg:text-[13px] font-semibold lg:font-bold text-foreground">{t.home.calendarTitle}</h2>
            <Link href="/kalendarz" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-0.5 transition-colors">
              {t.home.openLabel} <ChevronRight size={13} />
            </Link>
          </div>
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            {/* Date header */}
            <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-primary/5">
              <div>
                <p className="text-[11px] text-muted-foreground capitalize">
                  {new Date().toLocaleDateString("pl-PL", { weekday: "long" })}
                </p>
                <p className="text-base font-bold leading-tight">
                  {new Date().toLocaleDateString("pl-PL", { day: "numeric", month: "long" })}
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shrink-0">
                <span className="text-primary-foreground text-sm font-bold">{new Date().getDate()}</span>
              </div>
            </div>
            {/* Events list */}
            {localTodayEvents.length === 0 ? (
              <div className="px-4 py-5 flex flex-col items-center gap-1.5 text-center">
                <CalendarDays size={24} className="text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">{t.home.noEvents}</p>
                <Link href="/kalendarz" className="text-xs text-primary hover:underline">{t.home.scheduleEvent}</Link>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {localTodayEvents.map((ev) => {
                  const c = EVENT_TYPE_COLORS[ev.type] ?? EVENT_TYPE_COLORS["WYDARZENIE"];
                  const timeStr = new Date(ev.startAt).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" });
                  return (
                    <div key={ev.id} className="flex items-center gap-3 px-4 py-2.5">
                      <div className={`w-1 h-8 rounded-full shrink-0 ${c.bar}`} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{ev.title}</p>
                        <p className="text-xs text-muted-foreground">{timeStr}</p>
                      </div>
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md ${c.bg} ${c.text} shrink-0`}>
                        {ev.type === "WYDARZENIE" ? t.home.eventTypeEvent : ev.type === "ZADANIE" ? t.home.eventTypeTask : t.home.eventTypeReminder}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        </SectionCollapse>
        </div>{/* end Kalendarz */}

        {/* Nieprzeczytane */}
        <div className="order-3">
        <SectionCollapse hidden={isSectionHidden("wiadomosci")}>
        <div className="space-y-3 lg:space-y-0 lg:pb-5">
            <div className="flex items-center gap-1.5 mb-0 lg:mb-[10px]">
              <h2 className="text-sm lg:text-[13px] font-semibold lg:font-bold text-foreground">{t.home.unreadMessages}</h2>
              <InfoTooltip items={[t.home.unreadTip1, t.home.unreadTip2]} />
            </div>

            {(() => {
              const visibleD = renderDiscussions.filter((c) => !viewedMessageIds.has(c.id));
              const visibleL = listMessages.filter((c) => !viewedMessageIds.has(c.id));
              const visibleRR = renderReplies.filter((r) => !viewedMessageIds.has(r.id));
              const visibleLR = listReplies.filter((r) => !viewedMessageIds.has(r.id));
              type MI =
                | { type: "discussion"; data: RenderDiscussion }
                | { type: "list"; data: ListMessage }
                | { type: "renderReply"; data: RenderReply }
                | { type: "listReply"; data: ListReply };
              const msgs: MI[] = [
                ...visibleD.map((d) => ({ type: "discussion" as const, data: d })),
                ...visibleL.map((m) => ({ type: "list" as const, data: m })),
                ...visibleRR.map((r) => ({ type: "renderReply" as const, data: r })),
                ...visibleLR.map((r) => ({ type: "listReply" as const, data: r })),
              ].sort((a, b) => new Date(b.data.createdAt).getTime() - new Date(a.data.createdAt).getTime());
              if (msgs.length === 0) return (
                <div className="rounded-xl border border-border bg-card p-6 text-center">
                  <CheckCircle2 size={28} className="mx-auto mb-2 text-green-500" />
                  <p className="text-sm font-medium text-foreground">{t.home.upToDate}</p>
                  <p className="text-xs text-muted-foreground mt-1">{t.home.noUnread}</p>
                </div>
              );
              return (
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                  <div className="divide-y divide-border max-h-[260px] overflow-y-auto">
                    {msgs.map((item) => {
                      if (item.type === "discussion") {
                        const d = item.data;
                        return (
                          <div key={d.id} className="flex items-center hover:bg-muted/50 transition-colors">
                            <Link href={`/projekty/${d.projectId}/renders/${d.renderId}`} onClick={() => markDiscussionViewed(d.id)} className="flex items-start gap-3 px-4 py-3 flex-1 min-w-0">
                              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5"><Comment size={15} className="text-primary" /></div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium truncate">{d.content}</p>
                                <p className="text-xs text-muted-foreground truncate">{d.author} · {d.renderName} · {d.projectTitle}</p>
                              </div>
                              <span className="shrink-0 text-xs text-muted-foreground mr-2">{timeAgo(d.createdAt, t)}</span>
                            </Link>
                            <button onClick={() => markDiscussionViewed(d.id)} title={t.home.markAsRead} className="shrink-0 mr-3 p-1 rounded-md text-muted-foreground/40 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-950/30 transition-colors"><CheckCircle2 size={16} /></button>
                          </div>
                        );
                      }
                      if (item.type === "listReply") {
                        const r = item.data;
                        return (
                          <div key={r.id} className="flex items-center hover:bg-muted/50 transition-colors">
                            <Link href={`/listy-zakupowe/${r.listSlug ?? r.listId}?product=${r.productId}`} onClick={() => markListReplyViewed(r)} className="flex items-start gap-3 px-4 py-3 flex-1 min-w-0">
                              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5"><Comment size={15} className="text-primary" /></div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium truncate">{r.content}</p>
                                <p className="text-xs text-muted-foreground truncate">{r.author} · {r.productName} · {r.listName}</p>
                              </div>
                              <span className="shrink-0 text-xs text-muted-foreground mr-2">{timeAgo(r.createdAt, t)}</span>
                            </Link>
                            <button onClick={() => markListReplyViewed(r)} title={t.home.markAsRead} className="shrink-0 mr-3 p-1 rounded-md text-muted-foreground/40 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-950/30 transition-colors"><CheckCircle2 size={16} /></button>
                          </div>
                        );
                      }
                      if (item.type === "renderReply") {
                        const r = item.data;
                        return (
                          <div key={r.id} className="flex items-center hover:bg-muted/50 transition-colors">
                            <Link href={`/projekty/${r.projectId}/renders/${r.renderId}`} onClick={() => markRenderReplyViewed(r)} className="flex items-start gap-3 px-4 py-3 flex-1 min-w-0">
                              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5"><Comment size={15} className="text-primary" /></div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium truncate">{r.content}</p>
                                <p className="text-xs text-muted-foreground truncate">{r.author} · {r.renderName} · {r.projectTitle}</p>
                              </div>
                              <span className="shrink-0 text-xs text-muted-foreground mr-2">{timeAgo(r.createdAt, t)}</span>
                            </Link>
                            <button onClick={() => markRenderReplyViewed(r)} title={t.home.markAsRead} className="shrink-0 mr-3 p-1 rounded-md text-muted-foreground/40 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-950/30 transition-colors"><CheckCircle2 size={16} /></button>
                          </div>
                        );
                      }
                      const m = item.data;
                      return (
                        <div key={m.id} className="flex items-center hover:bg-muted/50 transition-colors">
                          <Link href={`/listy-zakupowe/${m.listSlug ?? m.listId}?product=${m.productId}`} onClick={() => markListMessageViewed(m.id)} className="flex items-start gap-3 px-4 py-3 flex-1 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5"><Comment size={15} className="text-primary" /></div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium truncate">{m.content}</p>
                              <p className="text-xs text-muted-foreground truncate">{m.author} · {m.productName} · {m.listName}</p>
                            </div>
                            <span className="shrink-0 text-xs text-muted-foreground mr-2">{timeAgo(m.createdAt, t)}</span>
                          </Link>
                          <button onClick={() => markListMessageViewed(m.id)} title={t.home.markAsRead} className="shrink-0 mr-3 p-1 rounded-md text-muted-foreground/40 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-950/30 transition-colors"><CheckCircle2 size={16} /></button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
        </div>
        </SectionCollapse>
        </div>{/* end Nieprzeczytane */}

        {/* Do zrobienia */}
        <div className="order-4">
        <SectionCollapse hidden={isSectionHidden("zadania")}>
        <div className="space-y-3 lg:space-y-0">
            <div className="flex items-center gap-1.5 mb-0 lg:mb-[10px]">
              <h2 className="text-sm lg:text-[13px] font-semibold lg:font-bold text-foreground">{t.home.todoTitle}</h2>
              <InfoTooltip items={[t.home.todoTip1, t.home.todoTip2, t.home.todoTip3, t.home.todoTip4]} />
            </div>

          {todoCount === 0 ? (
            <div className="rounded-xl border border-border bg-card p-6 text-center">
              <CheckCircle2 size={28} className="mx-auto mb-2 text-green-500" />
              <p className="text-sm font-medium text-foreground">{t.home.upToDate}</p>
              <p className="text-xs text-muted-foreground mt-1">{t.home.noTodo}</p>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="divide-y divide-border max-h-[192px] overflow-y-auto">

              {allTodoItems.map((item) => {
                if (item.type === "task") {
                  const task = item.data;
                  const due = new Date(task.dueDate);
                  const todayDate = new Date();
                  const isToday =
                    due.getFullYear() === todayDate.getFullYear() &&
                    due.getMonth() === todayDate.getMonth() &&
                    due.getDate() === todayDate.getDate();
                  const isOverdue = due < todayDate && !isToday;
                  const dueDateLabel = due.toLocaleDateString("pl-PL", { day: "numeric", month: "short" });
                  return (
                    <Link
                      key={task.id}
                      href="/zadania"
                      className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center shrink-0">
                        <CheckSquare size={15} className="text-violet-600 dark:text-violet-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{task.title}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {task.projectTitle ? `${task.projectTitle} · ` : ""}{t.home.todoTaskLabel}
                        </p>
                      </div>
                      {(isToday || isOverdue) && (
                        <span className="shrink-0 text-xs font-medium px-1.5 py-0.5 rounded-md bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400">
                          {dueDateLabel}
                        </span>
                      )}
                    </Link>
                  );
                }

                if (item.type === "pin") {
                  const pin = item.data;
                  return (
                    <div key={pin.id} className="flex items-center hover:bg-muted/50 transition-colors">
                      <Link
                        href={`/projekty/${pin.projectId}/renders/${pin.renderId}?pinId=${pin.id}`}
                        onClick={() => markPinViewed(pin.id)}
                        className="flex items-start gap-3 px-4 py-3 flex-1 min-w-0"
                      >
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                          <MapPin size={15} className="text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{pin.title ?? pin.content}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {pin.author} · {pin.renderName}
                          </p>
                        </div>
                        <span className="shrink-0 text-xs text-muted-foreground mr-2">{timeAgo(pin.createdAt, t)}</span>
                      </Link>
                      <button
                        onClick={() => markPinViewed(pin.id)}
                        title={t.home.markAsViewed}
                        className="shrink-0 mr-3 p-1 rounded-md text-muted-foreground/40 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-950/30 transition-colors"
                      >
                        <CheckCircle2 size={16} />
                      </button>
                    </div>
                  );
                }

                if (item.type === "status") {
                  const req = item.data;
                  return (
                    <div key={req.id} className="flex items-start gap-3 px-4 py-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0 mt-0.5">
                        <Bell size={15} className="text-amber-600 dark:text-amber-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{req.renderName}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {req.clientName ? `${req.clientName} · ` : ""}{t.home.statusChangeLabel} · {req.projectTitle}
                        </p>
                        <div className="flex gap-1.5 mt-2">
                          <button
                            onClick={() => handleRequest(req.id, "status", "confirm")}
                            disabled={actingOn !== null}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 transition-colors"
                          >
                            <Check size={11} />
                            {t.common.confirm}
                          </button>
                          <button
                            onClick={() => handleRequest(req.id, "status", "reject")}
                            disabled={actingOn !== null}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border border-red-200 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 disabled:opacity-50 transition-colors"
                          >
                            <X size={11} />
                            {t.home.rejectBtn}
                          </button>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="text-xs text-muted-foreground">{timeAgo(req.createdAt, t)}</span>
                        <button
                          onClick={() => setResolvedIds((prev) => new Set([...prev, req.id]))}
                          title={t.home.removeFromList}
                          className="p-1 rounded-md text-muted-foreground/40 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-950/30 transition-colors"
                        >
                          <CheckCircle2 size={16} />
                        </button>
                      </div>
                    </div>
                  );
                }

                const req = item.data;
                return (
                  <div key={req.id} className="flex items-start gap-3 px-4 py-3">
                    <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center shrink-0 mt-0.5">
                      <RotateCcw size={15} className="text-purple-600 dark:text-purple-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{req.renderName}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {req.clientName ? `${req.clientName} · ` : ""}{t.home.versionRestoreLabel} · {req.projectTitle}
                      </p>
                      <div className="flex gap-1.5 mt-2">
                        <button
                          onClick={() => handleRequest(req.id, "version", "confirm")}
                          disabled={actingOn !== null}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 transition-colors"
                        >
                          <Check size={11} />
                          {t.common.restore}
                        </button>
                        <button
                          onClick={() => handleRequest(req.id, "version", "reject")}
                          disabled={actingOn !== null}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border border-red-200 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 disabled:opacity-50 transition-colors"
                        >
                          <X size={11} />
                          {t.home.rejectBtn}
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-xs text-muted-foreground">{timeAgo(req.createdAt, t)}</span>
                      <button
                        onClick={() => setResolvedIds((prev) => new Set([...prev, req.id]))}
                        title={t.home.removeFromList}
                        className="p-1 rounded-md text-muted-foreground/40 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-950/30 transition-colors"
                      >
                        <CheckCircle2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}

            </div>
            </div>
          )}
        </div>
        </SectionCollapse>
        </div>{/* end Do zrobienia */}

        </div>{/* end right column */}

      </div>{/* end main grid */}
    </div>
  );
}
