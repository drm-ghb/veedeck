"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Interests, LayoutGrid, List, Search, MoreVertical, Trash2, Share2, Users, Edit2 } from "@/components/ui/icons";
import NewMoodboardDialog from "./NewMoodboardDialog";
import EditMoodboardDialog from "./EditMoodboardDialog";

type Client = {
  id: string;
  name: string;
  projects: { id: string; title: string }[];
};

type Moodboard = {
  id: string;
  title: string;
  slug: string | null;
  isSharedWithClient: boolean;
  createdAt: string;
  updatedAt: string;
  client: { id: string; name: string } | null;
  project: { id: string; title: string } | null;
};

interface Props {
  moodboards: Moodboard[];
  clients: Client[];
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "przed chwilą";
  if (mins < 60) return `${mins} min temu`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} godz. temu`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} d. temu`;
  return new Date(dateStr).toLocaleDateString("pl-PL", { day: "numeric", month: "short" });
}

export default function MoodboardList({ moodboards: initial, clients }: Props) {
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
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [editingMoodboard, setEditingMoodboard] = useState<Moodboard | null>(null);

  function setViewMode(v: "grid" | "list") {
    setView(v);
    localStorage.setItem("moodboard-view", v);
  }

  async function handleDelete(id: string) {
    if (!confirm("Usunąć tę tablicę? Tej operacji nie można cofnąć.")) return;
    const res = await fetch(`/api/moodboards/${id}`, { method: "DELETE" });
    if (res.ok) {
      setMoodboards((prev) => prev.filter((m) => m.id !== id));
      toast.success("Tablica usunięta");
    } else {
      toast.error("Błąd podczas usuwania");
    }
  }

  async function handleToggleShare(id: string, current: boolean) {
    const res = await fetch(`/api/moodboards/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isSharedWithClient: !current }),
    });
    if (res.ok) {
      setMoodboards((prev) => prev.map((m) => m.id === id ? { ...m, isSharedWithClient: !current } : m));
      toast.success(!current ? "Tablica udostępniona klientowi" : "Cofnięto udostępnianie");
    }
    setMenuOpen(null);
  }

  function handleEditSave(id: string, updated: { title: string; client: { id: string; name: string } | null; project: { id: string; title: string } | null }) {
    setMoodboards((prev) => prev.map((m) => m.id === id ? { ...m, ...updated } : m));
  }

  const filtered = moodboards.filter((m) =>
    m.title.toLowerCase().includes(query.toLowerCase()) ||
    (m.client?.name ?? "").toLowerCase().includes(query.toLowerCase())
  );

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
          <h1 className="text-2xl font-bold tracking-tight">Moodboardy</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Tablice inspiracji dla projektów</p>
        </div>
        <NewMoodboardDialog clients={clients} />
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Szukaj tablic..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div className="flex items-center border border-border rounded-lg overflow-hidden">
          <button
            onClick={() => setViewMode("grid")}
            className={`px-2.5 py-2 transition-colors ${view === "grid" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"}`}
            title="Widok kafelkowy"
          >
            <LayoutGrid size={16} />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`px-2.5 py-2 transition-colors ${view === "list" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"}`}
            title="Widok listowy"
          >
            <List size={16} />
          </button>
        </div>
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <Interests size={24} className="text-primary" />
          </div>
          <p className="text-sm font-medium text-foreground mb-1">
            {query ? "Brak wyników" : "Brak tablic"}
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            {query ? "Spróbuj innej frazy" : "Utwórz pierwszą tablicę moodboard"}
          </p>
          {!query && <NewMoodboardDialog clients={clients} />}
        </div>
      )}

      {/* Grid view */}
      {filtered.length > 0 && view === "grid" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((m) => (
            <div key={m.id} className="group relative rounded-2xl border border-border bg-card overflow-hidden hover:border-primary/30 hover:shadow-md transition-all">
              <Link href={`/moodboardy/${m.id}`} className="block">
                <div className="aspect-video bg-gradient-to-br from-primary/5 to-primary/15 flex items-center justify-center">
                  <Interests size={36} className="text-primary/30" />
                </div>
                <div className="p-4">
                  <p className="text-sm font-semibold truncate">{m.title}</p>
                  {m.client && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5 flex items-center gap-1">
                      <Users size={11} /> {m.client.name}{m.project ? ` · ${m.project.title}` : ""}
                    </p>
                  )}
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-muted-foreground">{timeAgo(m.updatedAt)}</span>
                    {m.isSharedWithClient && (
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        Udostępnione
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
                        <Edit2 size={14} /> Edytuj
                      </button>
                      {m.client && (
                        <button
                          onClick={() => handleToggleShare(m.id, m.isSharedWithClient)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-muted transition-colors text-left"
                        >
                          <Share2 size={14} />
                          {m.isSharedWithClient ? "Cofnij udostępnianie" : "Udostępnij klientowi"}
                        </button>
                      )}
                      <button
                        onClick={() => { handleDelete(m.id); setMenuOpen(null); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 text-red-600 transition-colors text-left"
                      >
                        <Trash2 size={14} /> Usuń
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* List view */}
      {filtered.length > 0 && view === "list" && (
        <div className="rounded-2xl border border-border bg-card overflow-hidden divide-y divide-border">
          {filtered.map((m) => (
            <div key={m.id} className="group flex items-center gap-4 px-5 py-3.5 hover:bg-muted/50 transition-colors">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Interests size={18} className="text-primary" />
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
                  Udostępnione
                </span>
              )}
              <span className="text-xs text-muted-foreground shrink-0">{timeAgo(m.updatedAt)}</span>
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
                        <Edit2 size={14} /> Edytuj
                      </button>
                      {m.client && (
                        <button
                          onClick={() => handleToggleShare(m.id, m.isSharedWithClient)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-muted transition-colors text-left"
                        >
                          <Share2 size={14} />
                          {m.isSharedWithClient ? "Cofnij udostępnianie" : "Udostępnij klientowi"}
                        </button>
                      )}
                      <button
                        onClick={() => { handleDelete(m.id); setMenuOpen(null); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 text-red-600 transition-colors text-left"
                      >
                        <Trash2 size={14} /> Usuń
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
