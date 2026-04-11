"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Briefcase, Image as ImageIcon, ShoppingCart, ChevronRight, SlidersHorizontal, Search, ArchiveRestore, Trash2, Pin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import NewProjectDialog from "@/components/dashboard/NewProjectDialog";
import ProjektyMenu from "@/components/projekty/ProjektyMenu";
import { useT } from "@/lib/i18n";

interface Project {
  id: string;
  slug: string | null;
  title: string;
  clientName: string | null;
  clientEmail: string | null;
  description: string | null;
  renderCount: number;
  roomCount: number;
  listCount: number;
  createdAt: string;
  pinned: boolean;
  clientCanUpload?: boolean;
}

interface ProjektyViewProps {
  projects: Project[];
  archivedProjects: Project[];
}

type SortOption = "newest" | "oldest" | "az" | "za" | "renders";
type Tab = "active" | "archived";

export default function ProjektyView({ projects, archivedProjects }: ProjektyViewProps) {
  const t = useT();
  const [tab, setTab] = useState<Tab>("active");
  const [sort, setSort] = useState<SortOption>("newest");
  const [search, setSearch] = useState("");
  const router = useRouter();

  function sortProjects(list: Project[]) {
    return [...list]
      .filter((p) => p.title.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        switch (sort) {
          case "oldest":  return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          case "az":      return a.title.localeCompare(b.title, "pl");
          case "za":      return b.title.localeCompare(a.title, "pl");
          case "renders": return b.renderCount - a.renderCount;
          default:        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
      });
  }

  async function handleRestore(id: string) {
    const res = await fetch(`/api/projects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived: false }),
    });
    if (res.ok) { toast.success(t.projekty.projectRestored); router.refresh(); }
    else toast.error(t.projekty.projectRestoreError);
  }

  async function handleDelete(id: string, title: string) {
    if (!confirm(t.projekty.confirmDeleteProject.replace("{title}", title))) return;
    const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
    if (res.ok) { toast.success(t.projekty.projectDeleted); router.refresh(); }
    else toast.error(t.projekty.projectDeleteError);
  }

  const filtered = sortProjects(tab === "active" ? projects : archivedProjects);
  const currentList = tab === "active" ? projects : archivedProjects;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-bold">{t.projekty.title}</h1>
          <p className="text-gray-500 mt-1">
            {projects.length === 0
              ? t.projekty.noProjectsEmpty
              : `${projects.length} projekt${projects.length === 1 ? "" : projects.length < 5 ? "y" : "ów"}`}
          </p>
        </div>
        <NewProjectDialog />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-4 border-b border-border">
        <button
          onClick={() => setTab("active")}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
            tab === "active"
              ? "border-foreground text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          {t.common.active}
          <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${tab === "active" ? "bg-foreground text-background" : "bg-muted text-muted-foreground"}`}>
            {projects.length}
          </span>
        </button>
        <button
          onClick={() => setTab("archived")}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
            tab === "archived"
              ? "border-foreground text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          {t.common.archived}
          <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${tab === "archived" ? "bg-foreground text-background" : "bg-muted text-muted-foreground"}`}>
            {archivedProjects.length}
          </span>
        </button>
      </div>

      {/* Toolbar: search + sort */}
      {currentList.length > 0 && (
        <div className="flex items-center gap-2 mb-6">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder={t.projekty.searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-card focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            />
          </div>
          <div className={`relative sm:hidden w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-md border ${sort !== "newest" ? "border-gray-900 bg-gray-900" : "border-gray-200 bg-white dark:border-gray-700 dark:bg-card"}`}>
            <SlidersHorizontal size={14} className={`pointer-events-none ${sort !== "newest" ? "text-white" : "text-gray-500"}`} />
            <select value={sort} onChange={(e) => setSort(e.target.value as SortOption)} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" aria-label={t.common.sort}>
              <option value="newest">{t.common.newest}</option>
              <option value="oldest">{t.common.oldest}</option>
              <option value="az">{t.common.az}</option>
              <option value="za">{t.common.za}</option>
              <option value="renders">{t.projekty.mostRenders}</option>
            </select>
          </div>
          <select value={sort} onChange={(e) => setSort(e.target.value as SortOption)} className="hidden sm:block flex-shrink-0 text-xs border border-gray-200 dark:border-gray-700 rounded-md px-2 py-2 bg-white dark:bg-card text-gray-600 dark:text-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300">
            <option value="newest">{t.common.newest}</option>
            <option value="oldest">{t.common.oldest}</option>
            <option value="az">{t.common.az}</option>
            <option value="za">{t.common.za}</option>
            <option value="renders">{t.projekty.mostRenders}</option>
          </select>
        </div>
      )}

      {/* Active tab */}
      {tab === "active" && (
        <>
          {projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-16 h-16 rounded-2xl bg-[#C45824]/10 flex items-center justify-center mb-4">
                <Briefcase size={28} className="text-[#C45824]" />
              </div>
              <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-1">{t.projekty.noProjects}</h2>
              <p className="text-sm text-gray-400 max-w-xs">{t.projekty.noProjectsHint}</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="text-4xl mb-4">🔍</p>
              <p className="text-lg">{t.projekty.noProjectsActive.replace("{search}", search)}</p>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="hidden sm:grid grid-cols-[1fr_140px_200px_96px] gap-4 px-5 py-3 bg-muted/50 border-b border-border text-xs font-medium text-muted-foreground uppercase tracking-wide">
                <span>{t.projekty.colProject}</span>
                <span>{t.projekty.colDate}</span>
                <span>{t.projekty.colModules}</span>
                <span className="text-right">{t.projekty.colActions}</span>
              </div>
              {filtered.map((p, i) => (
                <div key={p.id} className={`grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_140px_200px_96px] gap-4 px-5 py-4 items-center hover:bg-muted/30 transition-colors ${i !== filtered.length - 1 ? "border-b border-border" : ""}`}>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-gray-100 truncate flex items-center gap-1.5">
                      {p.pinned && <Pin size={12} className="text-red-500 fill-red-500 flex-shrink-0" />}
                      {p.title}
                    </p>
                    {p.clientName && <p className="text-xs text-muted-foreground truncate mt-0.5">{p.clientName}</p>}
                    {p.description && <p className="text-xs text-muted-foreground truncate mt-0.5">{p.description}</p>}
                  </div>
                  <p className="hidden sm:block text-sm text-muted-foreground whitespace-nowrap">
                    {new Date(p.createdAt).toLocaleDateString("pl-PL", { day: "2-digit", month: "short", year: "numeric" })}
                  </p>
                  <div className="hidden sm:flex items-center gap-2 flex-wrap">
                    <Link href={`/projects/${p.id}`} onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-md bg-[#C45824]/10 text-[#C45824] dark:bg-white/10 dark:text-white hover:bg-[#C45824]/20 dark:hover:bg-white/20 transition-colors">
                      <ImageIcon size={11} />
                      {t.nav.renderflow}
                      {p.renderCount > 0 && <span className="text-[10px] opacity-60">({p.renderCount} {t.projekty.renders})</span>}
                    </Link>
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-md bg-[#0f766e]/10 text-[#0f766e] cursor-default">
                      <ShoppingCart size={11} />
                      {t.nav.lists}
                      {p.listCount > 0 && <span className="text-[10px] opacity-60">({p.listCount})</span>}
                    </span>
                  </div>
                  <div className="flex items-center justify-end gap-1">
                    <Link href={`/projekty/${p.slug ?? p.id}`}>
                      <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-foreground gap-1">
                        <span className="hidden sm:inline text-xs">{t.common.open}</span>
                        <ChevronRight size={14} />
                      </Button>
                    </Link>
                    <ProjektyMenu project={p} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Archived tab */}
      {tab === "archived" && (
        <>
          {archivedProjects.length === 0 ? (
            <div className="text-center py-24 text-muted-foreground">
              <p className="text-sm">{t.projekty.noProjectsArchived}</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="text-4xl mb-4">🔍</p>
              <p className="text-lg">{t.projekty.noProjectsActive.replace("{search}", search)}</p>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              {filtered.map((p, i) => (
                <div key={p.id} className={`flex items-center gap-4 px-5 py-4 hover:bg-muted/30 transition-colors ${i !== filtered.length - 1 ? "border-b border-border" : ""}`}>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-700 dark:text-gray-300 truncate">{p.title}</p>
                    {p.clientName && <p className="text-xs text-muted-foreground mt-0.5">{p.clientName}</p>}
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(p.createdAt).toLocaleDateString("pl-PL", { day: "2-digit", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={() => handleRestore(p.id)}>
                      <ArchiveRestore size={14} />
                      <span className="hidden sm:inline">{t.common.restore}</span>
                    </Button>
                    <Button size="sm" variant="ghost" className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete(p.id, p.title)}>
                      <Trash2 size={14} />
                      <span className="hidden sm:inline">{t.common.delete}</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
