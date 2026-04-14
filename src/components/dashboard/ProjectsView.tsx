"use client";

import { useState, useEffect } from "react";
import { LayoutGrid, List, Search, ArchiveRestore, Trash2, SlidersHorizontal, Pin, AlertTriangle, Check } from "lucide-react";
import ProjectCard from "./ProjectCard";
import ProjectMenu from "./ProjectMenu";
import NewProjectDialog from "./NewProjectDialog";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useT } from "@/lib/i18n";

interface Project {
  id: string;
  title: string;
  clientName: string | null;
  clientEmail: string | null;
  description: string | null;
  renderCount: number;
  createdAt: string;
  shareToken: string;
  pinned: boolean;
  hiddenModules: string[];
  clientCanUpload?: boolean;
}

interface ProjectsViewProps {
  projects: Project[];
  archivedProjects: Project[];
}

export default function ProjectsView({ projects, archivedProjects }: ProjectsViewProps) {
  const t = useT();
  const [tab, setTab] = useState<"active" | "archived">("active");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"newest" | "oldest" | "az" | "za" | "renders">("newest");
  const router = useRouter();

  useEffect(() => {
    const saved = localStorage.getItem("dashboard-view");
    if (saved === "grid" || saved === "list") setView(saved);
  }, []);

  function toggleView(v: "grid" | "list") {
    setView(v);
    localStorage.setItem("dashboard-view", v);
  }

  const filtered = (tab === "active" ? projects : archivedProjects)
    .filter((p) => {
      const q = search.toLowerCase();
      return (
        p.title.toLowerCase().includes(q) ||
        (p.clientName?.toLowerCase().includes(q) ?? false) ||
        (p.description?.toLowerCase().includes(q) ?? false)
      );
    })
    .sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      switch (sort) {
        case "oldest": return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case "az": return a.title.localeCompare(b.title, "pl");
        case "za": return b.title.localeCompare(a.title, "pl");
        case "renders": return b.renderCount - a.renderCount;
        default: return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

  async function handleRestore(id: string) {
    const res = await fetch(`/api/projects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived: false }),
    });
    if (res.ok) {
      toast.success(t.projekty.projectRestored);
      router.refresh();
    } else {
      toast.error(t.projekty.projectRestoreError);
    }
  }

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Usunąć projekt "${title}" z RenderFlow?`)) return;
    const res = await fetch(`/api/projects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ removeModule: "renderflow" }),
    });
    if (res.ok) {
      toast.success(t.projekty.projectDeleted);
      router.refresh();
    } else {
      toast.error(t.projekty.projectDeleteError);
    }
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-4 gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t.dashboard.myProjects}</h1>
          <p className="text-gray-500 mt-1">
            {projects.length === 0
              ? t.projekty.noProjectsEmpty
              : `${projects.length} projekt${projects.length === 1 ? "" : projects.length < 5 ? "y" : "ów"}`}
          </p>
        </div>
        <NewProjectDialog module="renderflow" />
      </div>

      {/* Tabs + view toggle */}
      <div className="flex items-center justify-between border-b border-border mb-6">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setTab("active")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === "active"
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.common.active}
            {projects.length > 0 && (
              <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${tab === "active" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                {projects.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab("archived")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === "archived"
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.common.archived}
            {archivedProjects.length > 0 && (
              <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${tab === "archived" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                {archivedProjects.length}
              </span>
            )}
          </button>
        </div>
        {projects.length > 0 && (
          <div className="flex items-center gap-2 mb-1">
            {/* Mobile: icon-only, native picker on tap */}
            <div className={`relative sm:hidden w-8 h-8 flex items-center justify-center rounded-md border ${sort !== "newest" ? "border-primary bg-primary" : "border-border bg-card"}`}>
              <SlidersHorizontal size={14} className={`pointer-events-none ${sort !== "newest" ? "text-white" : "text-muted-foreground"}`} />
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as typeof sort)}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                aria-label={t.common.sort}
              >
                <option value="newest">{t.common.newest}</option>
                <option value="oldest">{t.common.oldest}</option>
                <option value="az">{t.common.az}</option>
                <option value="za">{t.common.za}</option>
                <option value="renders">{t.projekty.mostRenders}</option>
              </select>
            </div>
            {/* Desktop: full select */}
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as typeof sort)}
              className="hidden sm:block text-xs border border-border rounded-md px-2 py-1.5 bg-card text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
            >
              <option value="newest">{t.common.newest}</option>
              <option value="oldest">{t.common.oldest}</option>
              <option value="az">{t.common.az}</option>
              <option value="za">{t.common.za}</option>
              <option value="renders">{t.projekty.mostRenders}</option>
            </select>
            {tab === "active" && (
              <div className="flex items-center gap-0.5 bg-muted rounded-md p-0.5">
                <button
                  onClick={() => toggleView("grid")}
                  className={`p-1.5 rounded transition-colors ${view === "grid" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  <LayoutGrid size={15} />
                </button>
                <button
                  onClick={() => toggleView("list")}
                  className={`p-1.5 rounded transition-colors ${view === "list" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  <List size={15} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          type="text"
          placeholder={t.projekty.searchPlaceholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 border border-border rounded-lg text-sm bg-card focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-transparent"
        />
      </div>

      {tab === "active" ? (
        projects.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-4">🏗️</p>
            <p className="text-lg">{t.projekty.noProjectsHint}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-4">🔍</p>
            <p className="text-lg">{t.projekty.noProjectsActive.replace("{search}", search)}</p>
          </div>
        ) : view === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
            {filtered.map((p) => (
              <ProjectCard key={p.id} {...p} pinned={p.pinned} />
            ))}
          </div>
        ) : (
          <ProjectListView projects={filtered} />
        )
      ) : (
        archivedProjects.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-4">📦</p>
            <p className="text-lg">Brak zarchiwizowanych projektów</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-4">🔍</p>
            <p className="text-lg">Brak projektów pasujących do &quot;{search}&quot;</p>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            {filtered.map((p, i) => (
              <div
                key={p.id}
                className={`flex items-center justify-between px-5 py-4 ${
                  i !== filtered.length - 1 ? "border-b border-border" : ""
                }`}
              >
                <div className="min-w-0">
                  <p className="font-semibold text-gray-700 truncate">{p.title}</p>
                  {p.clientName && (
                    <p className="text-xs text-gray-400 truncate">{p.clientName}</p>
                  )}
                  <Badge variant="secondary" className="text-xs mt-1">{p.renderCount} renderów</Badge>
                </div>
                <div className="flex gap-2 ml-4 flex-shrink-0">
                  <Button size="sm" variant="outline" onClick={() => handleRestore(p.id)}>
                    <ArchiveRestore size={14} />
                    Przywróć
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-400 hover:text-red-600"
                    onClick={() => handleDelete(p.id, p.title)}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}

function ProjectListView({ projects }: { projects: Project[] }) {
  const [warningLink, setWarningLink] = useState<string | null>(null);

  function handleCopyLink(p: Project) {
    const url = `${window.location.origin}/share/${p.shareToken}`;
    if (p.hiddenModules.includes("renderflow")) {
      setWarningLink(url);
      return;
    }
    navigator.clipboard.writeText(url);
    toast.success("Link skopiowany do schowka");
  }

  return (
    <>
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-[1fr_80px] sm:grid-cols-[1fr_180px_160px_80px] gap-4 px-5 py-3 bg-muted/50 border-b border-border text-xs font-medium text-muted-foreground uppercase tracking-wide">
        <span>Projekt</span>
        <span className="hidden sm:block">Klient</span>
        <span className="hidden sm:block">Data</span>
        <span className="text-right">Akcje</span>
      </div>

      {/* Rows */}
      {projects.map((p, i) => (
        <div
          key={p.id}
          className={`grid grid-cols-[1fr_80px] sm:grid-cols-[1fr_180px_160px_80px] gap-4 px-5 py-4 items-center hover:bg-muted/30 transition-colors ${i !== projects.length - 1 ? "border-b border-border" : ""}`}
        >
          {/* Title + description */}
          <div className="min-w-0">
            <Link href={`/projects/${p.id}`} className="font-semibold text-foreground truncate flex items-center gap-1.5">
              {p.pinned && <Pin size={12} className="text-red-500 fill-red-500 flex-shrink-0" />}
              {p.title}
            </Link>
            {p.description && (
              <p className="text-xs text-gray-400 truncate mt-0.5">{p.description}</p>
            )}
            <Badge variant="secondary" className="text-xs mt-1">{p.renderCount} renderów</Badge>
          </div>

          {/* Client */}
          <div className="hidden sm:block min-w-0">
            {p.clientName ? (
              <>
                <p className="text-sm text-foreground truncate">{p.clientName}</p>
                {p.clientEmail && <p className="text-xs text-muted-foreground truncate">{p.clientEmail}</p>}
              </>
            ) : (
              <span className="text-xs text-gray-300">—</span>
            )}
          </div>

          {/* Date */}
          <p className="hidden sm:block text-sm text-gray-400">
            {new Date(p.createdAt).toLocaleDateString("pl-PL", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </p>

          {/* Actions */}
          <div className="flex gap-1 justify-end items-center">
            <Button
              size="sm"
              variant="ghost"
              className="text-xs text-muted-foreground hover:text-primary"
              onClick={() => handleCopyLink(p)}
              title="Skopiuj link"
            >
              🔗
            </Button>
            <ProjectMenu
              project={{
                id: p.id,
                title: p.title,
                clientName: p.clientName,
                clientEmail: p.clientEmail,
                description: p.description,
                pinned: p.pinned,
                clientCanUpload: p.clientCanUpload,
              }}
            />
          </div>
        </div>
      ))}
    </div>

      <Dialog open={!!warningLink} onOpenChange={(open) => { if (!open) setWarningLink(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle size={18} className="text-amber-500" />
              Moduł jest ukryty dla klienta
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Moduł <strong>RenderFlow</strong> jest oznaczony jako <strong>NIE WIDOCZNY</strong> dla klienta. Przed udostępnieniem linku zmień to w ustawieniach projektu.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setWarningLink(null)}>Zamknij</Button>
            <Button variant="ghost" className="gap-1.5" onClick={() => {
              if (warningLink) navigator.clipboard.writeText(warningLink);
              setWarningLink(null);
              toast.success("Link skopiowany do schowka");
            }}>
              <Check size={14} />
              Mimo to skopiuj
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
