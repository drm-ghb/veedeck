"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Interests, LayoutGrid, List, Search, MoreVertical, Trash2, Share2, Users, Edit2, Pin, PinOff, ArrowDownUp, ChangeHistory, Favorite, Circle, Square } from "@/components/ui/icons";
import { accentColors } from "@/lib/accent-color";
import NewMoodboardDialog from "./NewMoodboardDialog";
import EditMoodboardDialog from "./EditMoodboardDialog";
import { showConfirm } from "@/lib/confirm";
import { useT } from "@/lib/i18n";

type Client = {
  id: string;
  name: string;
  projects: { id: string; title: string }[];
};

type SortOption = "newest" | "oldest" | "az" | "za";

type Moodboard = {
  id: string;
  title: string;
  slug: string | null;
  isSharedWithClient: boolean;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
  client: { id: string; name: string; accentColor?: string | null } | null;
  project: { id: string; title: string } | null;
};

interface Props {
  moodboards: Moodboard[];
  clients: Client[];
}

function timeAgo(dateStr: string, t: ReturnType<typeof useT>) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return t.common.justNow;
  if (mins < 60) return `${mins} ${t.common.minutesAgo}`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ${t.common.hoursAgo}`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} ${t.common.daysAgo}`;
  return new Date(dateStr).toLocaleDateString("pl-PL", { day: "numeric", month: "short" });
}

export default function MoodboardList({ moodboards: initial, clients }: Props) {
  const t = useT();
  const router = useRouter();
  const [moodboards, setMoodboards] = useState(initial);
  const [view, setView] = useState<"grid" | "list">(() => {
    if (typeof window !== "undefined") {
      const s = localStorage.getItem("moodboard-view");
      if (s === "list" || s === "grid") return s;
    }
    return "grid";
  });
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortOption>(() => {
    if (typeof window !== "undefined") {
      const s = localStorage.getItem("moodboard-sort");
      if (s === "newest" || s === "oldest" || s === "az" || s === "za") return s;
    }
    return "newest";
  });
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [editingMoodboard, setEditingMoodboard] = useState<Moodboard | null>(null);

  function setViewMode(v: "grid" | "list") {
    setView(v);
    localStorage.setItem("moodboard-view", v);
  }

  async function handleDelete(id: string) {
    if (!await showConfirm(t.moodboard.deleteConfirm)) return;
    const res = await fetch(`/api/moodboards/${id}`, { method: "DELETE" });
    if (res.ok) {
      setMoodboards((prev) => prev.filter((m) => m.id !== id));
      toast.success(t.moodboard.deleted);
    } else {
      toast.error(t.moodboard.deleteError);
    }
  }

  async function handleTogglePin(id: string, current: boolean) {
    const res = await fetch(`/api/moodboards/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pinned: !current }),
    });
    if (res.ok) {
      setMoodboards((prev) => prev.map((m) => m.id === id ? { ...m, pinned: !current } : m));
      toast.success(!current ? t.moodboard.pinSuccess : t.moodboard.unpinSuccess);
    }
    setMenuOpen(null);
  }

  async function handleToggleShare(id: string, current: boolean) {
    const res = await fetch(`/api/moodboards/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isSharedWithClient: !current }),
    });
    if (res.ok) {
      setMoodboards((prev) => prev.map((m) => m.id === id ? { ...m, isSharedWithClient: !current } : m));
      toast.success(!current ? t.moodboard.sharedSuccess : t.moodboard.unsharedSuccess);
    }
    setMenuOpen(null);
  }

  function handleEditSave(id: string, updated: { title: string; client: { id: string; name: string } | null; project: { id: string; title: string } | null }) {
    setMoodboards((prev) => prev.map((m) => m.id === id ? { ...m, ...updated } : m));
  }

  const filtered = moodboards
    .filter((m) =>
      m.title.toLowerCase().includes(query.toLowerCase()) ||
      (m.client?.name ?? "").toLowerCase().includes(query.toLowerCase())
    )
    .sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      switch (sort) {
        case "oldest": return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case "az": return a.title.localeCompare(b.title, "pl");
        case "za": return b.title.localeCompare(a.title, "pl");
        default: return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
    });

  return (
    <div>
      {editingMoodboard && (
        <EditMoodboardDialog
          moodboard={editingMoodboard}
          clients={clients}
          onClose={() => setEditingMoodboard(null)}
          onSave={(updated) => handleEditSave(editingMoodboard.id, updated)}
        />
      )}
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t.moodboard.title}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{t.moodboard.subtitle}</p>
        </div>
        <NewMoodboardDialog clients={clients} />
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-5">
        <div className="relative w-full max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.moodboard.searchPlaceholder}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div className="ml-auto flex items-center gap-2">
          {/* Sort — mobile icon */}
          <div className={`relative sm:hidden w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-md border ${sort !== "newest" ? "border-primary/30 bg-primary/10" : "border-border bg-background"}`}>
            <ArrowDownUp size={14} className={`pointer-events-none ${sort !== "newest" ? "text-primary" : "text-muted-foreground"}`} />
            <select
              value={sort}
              onChange={(e) => { const v = e.target.value as SortOption; setSort(v); localStorage.setItem("moodboard-sort", v); }}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              aria-label={t.moodboard.sortLabel}
            >
              <option value="newest">{t.common.newest}</option>
              <option value="oldest">{t.common.oldest}</option>
              <option value="az">{t.common.az}</option>
              <option value="za">{t.common.za}</option>
            </select>
          </div>
          {/* Sort — desktop select */}
          <select
            value={sort}
            onChange={(e) => { const v = e.target.value as SortOption; setSort(v); localStorage.setItem("moodboard-sort", v); }}
            className="hidden sm:block flex-shrink-0 text-xs border border-border rounded-md px-2 py-2 bg-background text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
          >
            <option value="newest">{t.common.newest}</option>
            <option value="oldest">{t.common.oldest}</option>
            <option value="az">{t.common.az}</option>
            <option value="za">{t.common.za}</option>
          </select>
          {/* View toggle */}
          <div className="flex items-center gap-0.5 bg-muted rounded-md p-0.5 flex-shrink-0">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded transition-colors ${view === "grid" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              title={t.moodboard.gridView}
            >
              <LayoutGrid size={15} />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded transition-colors ${view === "list" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              title={t.moodboard.listViewBtn}
            >
              <List size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <Interests size={24} className="text-primary" />
          </div>
          <p className="text-sm font-medium text-foreground mb-1">
            {query ? t.moodboard.noResults : t.moodboard.empty}
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            {query ? t.moodboard.noResultsHint : t.moodboard.emptyHint}
          </p>
          {!query && <NewMoodboardDialog clients={clients} />}
        </div>
      )}

      {/* Grid view */}
      {filtered.length > 0 && view === "grid" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((m) => {
            const accent = m.client ? accentColors(m.client.accentColor) : { bar: "#94a3b8", tint: "#F1F2F5", deep: "#64748b" };
            return (
              <div key={m.id} className="group relative rounded-xl bg-card border border-border overflow-hidden transition-all hover:shadow-[0_10px_26px_-14px_rgba(24,24,50,.2)] hover:-translate-y-0.5"
              >
                {/* Accent bar */}
                <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: accent.bar, zIndex: 2 }} />
                {m.pinned && (
                  <div className="absolute top-2 left-3 z-[4]">
                    <Pin size={13} className="text-primary drop-shadow" />
                  </div>
                )}
                <Link href={`/moodboardy/${m.id}`} className="block">
                  <div className="w-full flex items-center justify-center" style={{ aspectRatio: "16/11", background: accent.tint }}>
                    <div className="grid grid-cols-2 gap-2" style={{ opacity: 0.55, color: accent.deep }}>
                      <ChangeHistory size={22} />
                      <Favorite size={22} />
                      <Circle size={22} />
                      <Square size={22} />
                    </div>
                  </div>
                  <div className="px-3 pt-3 pb-3">
                    <p className="text-[14px] font-semibold truncate">{m.title}</p>
                    {m.client && (
                      <p className="text-[12px] text-muted-foreground truncate mt-[3px] flex items-center gap-1.5">
                        <span className="w-4 h-4 rounded-full shrink-0 inline-block" style={{ background: accent.bar }} />
                        {m.client.name}{m.project ? ` · ${m.project.title}` : ""}
                      </p>
                    )}
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[11.5px] text-muted-foreground">{timeAgo(m.updatedAt, t)}</span>
                      {m.isSharedWithClient && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                          {t.moodboard.shared}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
                {/* Menu */}
                <div className="absolute top-2 right-2">
                  <button
                    onClick={(e) => { e.preventDefault(); setMenuOpen(menuOpen === m.id ? null : m.id); }}
                    className="w-7 h-7 rounded-lg bg-card/80 backdrop-blur-sm border border-border flex items-center justify-center text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <MoreVertical size={14} />
                  </button>
                  {menuOpen === m.id && (
                    <>
                      <div className="fixed inset-0 z-[5]" onClick={() => setMenuOpen(null)} />
                      <div className="absolute right-0 top-[calc(100%+4px)] z-10 w-44 bg-card border border-border rounded-xl shadow-lg overflow-hidden p-1">
                        <button
                          onClick={() => { setEditingMoodboard(m); setMenuOpen(null); }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-muted transition-colors text-left"
                        >
                          <Edit2 size={14} /> {t.common.edit}
                        </button>
                        <button
                          onClick={() => handleTogglePin(m.id, m.pinned)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-muted transition-colors text-left"
                        >
                          {m.pinned ? <PinOff size={14} /> : <Pin size={14} />}
                          {m.pinned ? t.common.unpin : t.common.pin}
                        </button>
                        {m.client && (
                          <button
                            onClick={() => handleToggleShare(m.id, m.isSharedWithClient)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-muted transition-colors text-left"
                          >
                            <Share2 size={14} />
                            {m.isSharedWithClient ? t.moodboard.unshare : t.moodboard.share}
                          </button>
                        )}
                        <button
                          onClick={() => { handleDelete(m.id); setMenuOpen(null); }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 text-red-600 transition-colors text-left"
                        >
                          <Trash2 size={14} /> {t.moodboard.delete}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* List view */}
      {filtered.length > 0 && view === "list" && (
        <div className="rounded-2xl border border-border bg-card overflow-hidden divide-y divide-border">
          {filtered.map((m) => (
            <div key={m.id} className="group flex items-center gap-4 px-5 py-3.5 hover:bg-muted/50 transition-colors">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 relative">
                <Interests size={18} className="text-primary" />
                {m.pinned && <Pin size={10} className="absolute -top-1 -right-1 text-primary" />}
              </div>
              <Link href={`/moodboardy/${m.id}`} className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{m.title}</p>
                {m.client && (
                  <p className="text-xs text-muted-foreground truncate">
                    {m.client.name}{m.project ? ` · ${m.project.title}` : ""}
                  </p>
                )}
              </Link>
              {m.isSharedWithClient && (
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 shrink-0">
                  {t.moodboard.shared}
                </span>
              )}
              <span className="text-xs text-muted-foreground shrink-0">{timeAgo(m.updatedAt, t)}</span>
              <div className="relative">
                <button
                  onClick={() => setMenuOpen(menuOpen === m.id ? null : m.id)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors opacity-0 group-hover:opacity-100"
                >
                  <MoreVertical size={14} />
                </button>
                {menuOpen === m.id && (
                  <>
                    <div className="fixed inset-0 z-[5]" onClick={() => setMenuOpen(null)} />
                    <div className="absolute right-0 top-[calc(100%+4px)] z-10 w-44 bg-card border border-border rounded-xl shadow-lg overflow-hidden p-1">
                      <button
                        onClick={() => { setEditingMoodboard(m); setMenuOpen(null); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-muted transition-colors text-left"
                      >
                        <Edit2 size={14} /> {t.common.edit}
                      </button>
                      <button
                        onClick={() => handleTogglePin(m.id, m.pinned)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-muted transition-colors text-left"
                      >
                        {m.pinned ? <PinOff size={14} /> : <Pin size={14} />}
                        {m.pinned ? t.common.unpin : t.common.pin}
                      </button>
                      {m.client && (
                        <button
                          onClick={() => handleToggleShare(m.id, m.isSharedWithClient)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-muted transition-colors text-left"
                        >
                          <Share2 size={14} />
                          {m.isSharedWithClient ? t.moodboard.unshare : t.moodboard.share}
                        </button>
                      )}
                      <button
                        onClick={() => { handleDelete(m.id); setMenuOpen(null); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 text-red-600 transition-colors text-left"
                      >
                        <Trash2 size={14} /> {t.moodboard.delete}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
