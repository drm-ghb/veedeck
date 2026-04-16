"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import {
  Briefcase,
  PictureInPicture,
  ShoppingCart,
  Package,
  MapPin,
  Pin,
  Bell,
  RotateCcw,
  MessageSquare,
  HelpCircle,
  ChevronRight,
  Layers,
  CheckCircle2,
  Check,
  X,
  CalendarDays,
} from "lucide-react";
import NewProjectDialog from "./NewProjectDialog";
import { useT } from "@/lib/i18n";

interface Stats {
  projects: number;
  renders: number;
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
  updatedAt: string;
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

interface RecentList {
  id: string;
  slug: string | null;
  name: string;
  pinned: boolean;
  projectTitle: string | null;
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

interface DashboardViewProps {
  displayName: string | null;
  navMode: string;
  hiddenModules: string[];
  stats: Stats;
  recentProjects: RecentProject[];
  recentLists: RecentList[];
  pins: Pin[];
  statusRequests: StatusRequest[];
  versionRequests: VersionRequest[];
  renderDiscussions: RenderDiscussion[];
  listMessages: ListMessage[];
  todayEvents: TodayEvent[];
}

function InfoTooltip({ items }: { items: string[] }) {
  return (
    <div className="relative group/tip inline-flex items-center">
      <HelpCircle size={13} className="text-muted-foreground/50 hover:text-muted-foreground cursor-help transition-colors" />
      <div className="pointer-events-none absolute top-full right-0 mt-1.5 z-50 hidden group-hover/tip:block w-68 rounded-lg border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
        <p className="font-medium mb-1">W tej sekcji wyświetlają się:</p>
        <ul className="space-y-0.5">
          {items.map((item, i) => (
            <li key={i} className="flex gap-1.5"><span className="shrink-0">–</span>{item}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor(diff / 60000);
  if (days >= 7) return new Date(dateStr).toLocaleDateString("pl-PL", { day: "numeric", month: "short" });
  if (days > 0) return `${days} ${days === 1 ? "dzień" : "dni"} temu`;
  if (hours > 0) return `${hours} godz. temu`;
  if (minutes > 0) return `${minutes} min. temu`;
  return "Przed chwilą";
}

const EVENT_TYPE_COLORS: Record<string, { bar: string; bg: string; text: string }> = {
  WYDARZENIE:    { bar: "bg-blue-400 dark:bg-blue-500",   bg: "bg-blue-50 dark:bg-blue-900/30",   text: "text-blue-700 dark:text-blue-300" },
  ZADANIE:       { bar: "bg-violet-400 dark:bg-violet-500", bg: "bg-violet-50 dark:bg-violet-900/30", text: "text-violet-700 dark:text-violet-300" },
  PRZYPOMNIENIE: { bar: "bg-amber-400 dark:bg-amber-500", bg: "bg-amber-50 dark:bg-amber-900/30", text: "text-amber-700 dark:text-amber-300" },
};

export default function DashboardView({
  displayName,
  navMode,
  hiddenModules,
  stats,
  recentProjects,
  recentLists,
  pins,
  statusRequests,
  versionRequests,
  renderDiscussions,
  listMessages,
  todayEvents,
}: DashboardViewProps) {
  const t = useT();

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

  type TodoItem =
    | { type: "pin"; data: Pin }
    | { type: "status"; data: StatusRequest }
    | { type: "version"; data: VersionRequest };

  const allTodoItems: TodoItem[] = [
    ...pins.filter((p) => !viewedPinIds.has(p.id)).map((p) => ({ type: "pin" as const, data: p })),
    ...statusRequests
      .filter((r) => !resolvedIds.has(r.id))
      .map((r) => ({ type: "status" as const, data: r })),
    ...versionRequests
      .filter((r) => !resolvedIds.has(r.id))
      .map((r) => ({ type: "version" as const, data: r })),
  ].sort((a, b) => new Date(b.data.createdAt).getTime() - new Date(a.data.createdAt).getTime());

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">
            {displayName
              ? t.home.welcome.replace("{name}", displayName)
              : t.home.welcomeDefault}
          </h1>
        </div>
        <NewProjectDialog />
      </div>

      {/* Module tiles — only in dashboard mode */}
      {navMode === "dashboard" && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
            {t.home.modules}
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            <Link
              href="/projekty"
              className="group flex flex-col items-center gap-2 p-3 rounded-xl bg-card border border-border hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 transition-all"
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform bg-primary">
                <Briefcase size={24} className="text-white" />
              </div>
              <p className="text-xs font-medium text-foreground text-center leading-tight">{t.nav.projects}</p>
            </Link>

            {!hiddenModules.includes("renderflow") && (
              <Link
                href="/renderflow"
                className="group flex flex-col items-center gap-2 p-3 rounded-xl bg-card border border-border hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 transition-all"
              >
                <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform bg-primary">
                  <Image src="/logo-dark.svg" alt="RenderFlow" width={36} height={36} />
                </div>
                <p className="text-xs font-medium text-foreground text-center leading-tight">{t.nav.renderflow}</p>
              </Link>
            )}

            {!hiddenModules.includes("listy") && (
              <Link
                href="/listy"
                className="group flex flex-col items-center gap-2 p-3 rounded-xl bg-card border border-border hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 transition-all"
              >
                <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform bg-primary">
                  <ShoppingCart size={24} className="text-white" />
                </div>
                <p className="text-xs font-medium text-foreground text-center leading-tight">{t.nav.lists}</p>
              </Link>
            )}

            {!hiddenModules.includes("produkty") && (
              <Link
                href="/produkty"
                className="group flex flex-col items-center gap-2 p-3 rounded-xl bg-card border border-border hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 transition-all"
              >
                <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform bg-[#7c3aed]">
                  <Package size={24} className="text-white" />
                </div>
                <p className="text-xs font-medium text-foreground text-center leading-tight">{t.nav.products}</p>
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Main grid — two independent flex columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left column: Stats → Projekty → Listy */}
        <div className="contents lg:col-span-2 lg:flex lg:flex-col lg:gap-6">

        {/* Stats */}
        <div className="order-1">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Link
              href="/projekty"
              className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:border-primary/30 hover:bg-primary/5 transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Briefcase size={16} className="text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-xl font-bold leading-none">{stats.projects}</p>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">Projektów</p>
              </div>
            </Link>

            {!hiddenModules.includes("renderflow") && (
              <Link
                href="/renderflow"
                className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:border-primary/30 hover:bg-primary/5 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <PictureInPicture size={16} className="text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xl font-bold leading-none">{stats.renders}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">Renderów</p>
                </div>
              </Link>
            )}

            {!hiddenModules.includes("listy") && (
              <Link
                href="/listy"
                className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:border-primary/30 hover:bg-primary/5 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <ShoppingCart size={16} className="text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xl font-bold leading-none">{stats.lists}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">List zakupowych</p>
                </div>
              </Link>
            )}

            <Link
              href="/notifications"
              className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                stats.notificationCount > 0
                  ? "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800 hover:border-amber-300 dark:hover:border-amber-700"
                  : "bg-card border-border hover:border-primary/30 hover:bg-primary/5"
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${stats.notificationCount > 0 ? "bg-amber-100 dark:bg-amber-900/40" : "bg-muted"}`}>
                {stats.notificationCount > 0
                  ? <Bell size={16} className="text-amber-600 dark:text-amber-400" />
                  : <CheckCircle2 size={16} className="text-muted-foreground" />}
              </div>
              <div className="min-w-0">
                <p className="text-xl font-bold leading-none">{stats.notificationCount}</p>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">Powiadomień</p>
              </div>
            </Link>
          </div>
        </div>{/* end stats */}

        {/* Projekty */}
        <div className="order-6 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">Ostatnie projekty RenderFlow</h2>
              <Link href="/renderflow" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-0.5 transition-colors">
                Wszystkie <ChevronRight size={13} />
              </Link>
            </div>
            {recentProjects.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
                <Layers size={32} className="mx-auto mb-3 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground mb-3">Nie masz jeszcze żadnych projektów</p>
                <NewProjectDialog />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {recentProjects.map((project, i) => (
                  <Link
                    key={project.id}
                    href={`/projects/${project.id}`}
                    className={`group flex flex-col rounded-xl border border-border bg-card overflow-hidden hover:border-primary/30 hover:shadow-md transition-all${i > 0 ? " hidden sm:flex" : ""}`}
                  >
                    <div className="w-full aspect-[4/3] bg-muted flex items-center justify-center overflow-hidden">
                      {project.lastRenderUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={project.lastRenderUrl} alt={project.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <PictureInPicture size={28} className="text-muted-foreground/30" />
                      )}
                    </div>
                    <div className="p-3">
                      <p className="text-sm font-medium truncate flex items-center gap-1.5">
                        {project.pinned && <Pin size={11} className="text-red-500 fill-red-500 shrink-0" />}
                        {project.title}
                      </p>
                      {project.clientName && <p className="text-xs text-muted-foreground truncate mt-0.5">{project.clientName}</p>}
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-muted-foreground">
                          {project.renderCount > 0 ? `${project.renderCount} render${project.renderCount === 1 ? "" : "y"}` : "Brak renderów"}
                        </span>
                        <span className="text-xs text-muted-foreground">{timeAgo(project.updatedAt)}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
        </div>{/* end Projekty */}

        {/* Listy */}
        <div className="order-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">Ostatnie listy zakupowe</h2>
              <Link href="/listy" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-0.5 transition-colors">
                Wszystkie <ChevronRight size={13} />
              </Link>
            </div>
            {recentLists.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-card p-6 text-center">
                <ShoppingCart size={28} className="mx-auto mb-2 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">Brak list zakupowych</p>
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden">
                {recentLists.map((list) => (
                  <Link key={list.id} href={`/listy/${list.slug ?? list.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors">
                    <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0">
                      <ShoppingCart size={18} className="text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate flex items-center gap-1.5">
                        {list.pinned && <Pin size={10} className="text-red-500 fill-red-500 shrink-0" />}
                        {list.name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {list.projectTitle ? `${list.projectTitle} · ` : ""}
                        {list.sectionCount > 0 ? `${list.sectionCount} sekcj${list.sectionCount === 1 ? "a" : list.sectionCount < 5 ? "e" : "i"}` : "Brak sekcji"}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(list.updatedAt)}</span>
                  </Link>
                ))}
              </div>
            )}
        </div>{/* end Listy */}

        </div>{/* end left column */}

        {/* Right column: Kalendarz → Nieprzeczytane → Do zrobienia */}
        <div className="contents lg:flex lg:flex-col lg:gap-6">

        {/* Kalendarz dziś */}
        <div className="order-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Kalendarz — dziś</h2>
            <Link href="/kalendarz" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-0.5 transition-colors">
              Otwórz <ChevronRight size={13} />
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
                <p className="text-sm text-muted-foreground">Brak wydarzeń na dziś</p>
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
                        {ev.type === "WYDARZENIE" ? "Wydarzenie" : ev.type === "ZADANIE" ? "Zadanie" : "Przyp."}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>{/* end Kalendarz */}

        {/* Nieprzeczytane */}
        <div className="order-3 space-y-3">
            <div className="flex items-center gap-1.5">
              <h2 className="text-sm font-semibold text-foreground">Nieprzeczytane wiadomości</h2>
              <InfoTooltip items={["Nieprzeczytane wiadomości z dyskusji w projektach RenderFlow", "Nieprzeczytane komentarze na listach zakupowych"]} />
            </div>

            {(() => {
              const visibleD = renderDiscussions.filter((c) => !viewedMessageIds.has(c.id));
              const visibleL = listMessages.filter((c) => !viewedMessageIds.has(c.id));
              type MI = { type: "discussion"; data: RenderDiscussion } | { type: "list"; data: ListMessage };
              const msgs: MI[] = [
                ...visibleD.map((d) => ({ type: "discussion" as const, data: d })),
                ...visibleL.map((m) => ({ type: "list" as const, data: m })),
              ].sort((a, b) => new Date(b.data.createdAt).getTime() - new Date(a.data.createdAt).getTime());
              if (msgs.length === 0) return (
                <div className="rounded-xl border border-border bg-card p-6 text-center">
                  <CheckCircle2 size={28} className="mx-auto mb-2 text-green-500" />
                  <p className="text-sm font-medium text-foreground">Jesteś na bieżąco!</p>
                  <p className="text-xs text-muted-foreground mt-1">Brak nieprzeczytanych wiadomości</p>
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
                            <Link href={`/projects/${d.projectId}/renders/${d.renderId}`} onClick={() => markDiscussionViewed(d.id)} className="flex items-start gap-3 px-4 py-3 flex-1 min-w-0">
                              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5"><MessageSquare size={15} className="text-primary" /></div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium truncate">{d.content}</p>
                                <p className="text-xs text-muted-foreground truncate">{d.author} · {d.renderName} · {d.projectTitle}</p>
                              </div>
                              <span className="shrink-0 text-xs text-muted-foreground mr-2">{timeAgo(d.createdAt)}</span>
                            </Link>
                            <button onClick={() => markDiscussionViewed(d.id)} title="Oznacz jako przeczytane" className="shrink-0 mr-3 p-1 rounded-md text-muted-foreground/40 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-950/30 transition-colors"><CheckCircle2 size={16} /></button>
                          </div>
                        );
                      }
                      const m = item.data;
                      return (
                        <div key={m.id} className="flex items-center hover:bg-muted/50 transition-colors">
                          <Link href={`/listy/${m.listSlug ?? m.listId}?product=${m.productId}`} onClick={() => markListMessageViewed(m.id)} className="flex items-start gap-3 px-4 py-3 flex-1 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0 mt-0.5"><ShoppingCart size={15} className="text-emerald-600 dark:text-emerald-400" /></div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium truncate">{m.content}</p>
                              <p className="text-xs text-muted-foreground truncate">{m.author} · {m.productName} · {m.listName}</p>
                            </div>
                            <span className="shrink-0 text-xs text-muted-foreground mr-2">{timeAgo(m.createdAt)}</span>
                          </Link>
                          <button onClick={() => markListMessageViewed(m.id)} title="Oznacz jako przeczytane" className="shrink-0 mr-3 p-1 rounded-md text-muted-foreground/40 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-950/30 transition-colors"><CheckCircle2 size={16} /></button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
        </div>{/* end Nieprzeczytane */}

        {/* Do zrobienia */}
        <div className="order-4 space-y-3">
            <div className="flex items-center gap-1.5">
              <h2 className="text-sm font-semibold text-foreground">Do zrobienia</h2>
              <InfoTooltip items={[
                "Niewyświetlone piny od klientów",
                "Prośby o zmianę statusu renderu",
                "Prośby o przywrócenie wersji pliku",
              ]} />
            </div>

          {todoCount === 0 ? (
            <div className="rounded-xl border border-border bg-card p-6 text-center">
              <CheckCircle2 size={28} className="mx-auto mb-2 text-green-500" />
              <p className="text-sm font-medium text-foreground">Jesteś na bieżąco!</p>
              <p className="text-xs text-muted-foreground mt-1">Brak oczekujących działań</p>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="divide-y divide-border max-h-[192px] overflow-y-auto">

              {allTodoItems.map((item) => {
                if (item.type === "pin") {
                  const pin = item.data;
                  return (
                    <div key={pin.id} className="flex items-center hover:bg-muted/50 transition-colors">
                      <Link
                        href={`/projects/${pin.projectId}/renders/${pin.renderId}?pinId=${pin.id}`}
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
                        <span className="shrink-0 text-xs text-muted-foreground mr-2">{timeAgo(pin.createdAt)}</span>
                      </Link>
                      <button
                        onClick={() => markPinViewed(pin.id)}
                        title="Oznacz jako przejrzane"
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
                          {req.clientName ? `${req.clientName} · ` : ""}Zmiana statusu · {req.projectTitle}
                        </p>
                        <div className="flex gap-1.5 mt-2">
                          <button
                            onClick={() => handleRequest(req.id, "status", "confirm")}
                            disabled={actingOn !== null}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 transition-colors"
                          >
                            <Check size={11} />
                            Potwierdź
                          </button>
                          <button
                            onClick={() => handleRequest(req.id, "status", "reject")}
                            disabled={actingOn !== null}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border border-red-200 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 disabled:opacity-50 transition-colors"
                          >
                            <X size={11} />
                            Odrzuć
                          </button>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="text-xs text-muted-foreground">{timeAgo(req.createdAt)}</span>
                        <button
                          onClick={() => setResolvedIds((prev) => new Set([...prev, req.id]))}
                          title="Usuń z listy"
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
                        {req.clientName ? `${req.clientName} · ` : ""}Przywrócenie wersji · {req.projectTitle}
                      </p>
                      <div className="flex gap-1.5 mt-2">
                        <button
                          onClick={() => handleRequest(req.id, "version", "confirm")}
                          disabled={actingOn !== null}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 transition-colors"
                        >
                          <Check size={11} />
                          Przywróć
                        </button>
                        <button
                          onClick={() => handleRequest(req.id, "version", "reject")}
                          disabled={actingOn !== null}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border border-red-200 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 disabled:opacity-50 transition-colors"
                        >
                          <X size={11} />
                          Odrzuć
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-xs text-muted-foreground">{timeAgo(req.createdAt)}</span>
                      <button
                        onClick={() => setResolvedIds((prev) => new Set([...prev, req.id]))}
                        title="Usuń z listy"
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
        </div>{/* end Do zrobienia */}

        </div>{/* end right column */}

      </div>{/* end main grid */}
    </div>
  );
}
