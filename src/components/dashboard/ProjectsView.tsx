"use client";

import { useState, useEffect } from "react";
import { LayoutGrid, List, Search, ArchiveRestore, Trash2 } from "lucide-react";
import ProjectCard from "./ProjectCard";
import ProjectMenu from "./ProjectMenu";
import NewProjectDialog from "./NewProjectDialog";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface Project {
  id: string;
  title: string;
  clientName: string | null;
  clientEmail: string | null;
  description: string | null;
  renderCount: number;
  createdAt: string;
  shareToken: string;
}

interface ProjectsViewProps {
  projects: Project[];
  archivedProjects: Project[];
}

export default function ProjectsView({ projects, archivedProjects }: ProjectsViewProps) {
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
      toast.success("Projekt przywrócony");
      router.refresh();
    } else {
      toast.error("Błąd przywracania");
    }
  }

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Usunąć projekt "${title}"?`)) return;
    const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Projekt usunięty");
      router.refresh();
    } else {
      toast.error("Błąd usuwania");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Moje projekty</h1>
          <p className="text-gray-500 mt-1">
            {projects.length === 0
              ? "Nie masz jeszcze żadnych projektów"
              : `${projects.length} projekt${projects.length === 1 ? "" : projects.length < 5 ? "y" : "ów"}`}
          </p>
        </div>
        <NewProjectDialog />
      </div>

      {/* Tabs + view toggle */}
      <div className="flex items-center justify-between border-b border-gray-200 mb-6">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setTab("active")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === "active"
                ? "border-gray-900 text-gray-900"
                : "border-transparent text-gray-400 hover:text-gray-600"
            }`}
          >
            Aktywne
            {projects.length > 0 && (
              <span className="ml-1.5 text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
                {projects.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab("archived")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === "archived"
                ? "border-gray-900 text-gray-900"
                : "border-transparent text-gray-400 hover:text-gray-600"
            }`}
          >
            Zarchiwizowane
            {archivedProjects.length > 0 && (
              <span className="ml-1.5 text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
                {archivedProjects.length}
              </span>
            )}
          </button>
        </div>
        {projects.length > 0 && (
          <div className="flex items-center gap-2 mb-1">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as typeof sort)}
              className="text-xs border border-gray-200 rounded-md px-2 py-1.5 bg-white text-gray-600 focus:outline-none focus:ring-1 focus:ring-gray-300"
            >
              <option value="newest">Najnowsze</option>
              <option value="oldest">Najstarsze</option>
              <option value="az">A–Z</option>
              <option value="za">Z–A</option>
              <option value="renders">Najwięcej renderów</option>
            </select>
            {tab === "active" && (
              <div className="flex items-center gap-0.5 bg-gray-100 rounded-md p-0.5">
                <button
                  onClick={() => toggleView("grid")}
                  className={`p-1.5 rounded transition-colors ${view === "grid" ? "bg-white shadow-sm text-gray-900" : "text-gray-400 hover:text-gray-600"}`}
                >
                  <LayoutGrid size={15} />
                </button>
                <button
                  onClick={() => toggleView("list")}
                  className={`p-1.5 rounded transition-colors ${view === "list" ? "bg-white shadow-sm text-gray-900" : "text-gray-400 hover:text-gray-600"}`}
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
          placeholder="Szukaj projektu..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
        />
      </div>

      {tab === "active" ? (
        projects.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-4">🏗️</p>
            <p className="text-lg">Stwórz pierwszy projekt aby zacząć</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-4">🔍</p>
            <p className="text-lg">Brak projektów pasujących do &quot;{search}&quot;</p>
          </div>
        ) : view === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((p) => (
              <ProjectCard key={p.id} {...p} />
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
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            {filtered.map((p, i) => (
              <div
                key={p.id}
                className={`flex items-center justify-between px-5 py-4 ${
                  i !== filtered.length - 1 ? "border-b border-gray-100" : ""
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
  function copyShareLink(shareToken: string) {
    const url = `${window.location.origin}/share/${shareToken}`;
    navigator.clipboard.writeText(url);
    toast.success("Link skopiowany do schowka");
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-[1fr_180px_160px_80px] gap-4 px-5 py-3 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-400 uppercase tracking-wide">
        <span>Projekt</span>
        <span>Klient</span>
        <span>Data</span>
        <span className="text-right">Akcje</span>
      </div>

      {/* Rows */}
      {projects.map((p, i) => (
        <div
          key={p.id}
          className={`grid grid-cols-[1fr_180px_160px_80px] gap-4 px-5 py-4 items-center hover:bg-gray-50 transition-colors ${i !== projects.length - 1 ? "border-b border-gray-100" : ""}`}
        >
          {/* Title + description */}
          <div className="min-w-0">
            <Link href={`/projects/${p.id}`} className="font-semibold text-gray-900 hover:text-blue-600 transition-colors truncate block">
              {p.title}
            </Link>
            {p.description && (
              <p className="text-xs text-gray-400 truncate mt-0.5">{p.description}</p>
            )}
            <Badge variant="secondary" className="text-xs mt-1">{p.renderCount} renderów</Badge>
          </div>

          {/* Client */}
          <div className="min-w-0">
            {p.clientName ? (
              <>
                <p className="text-sm text-gray-700 truncate">{p.clientName}</p>
                {p.clientEmail && <p className="text-xs text-gray-400 truncate">{p.clientEmail}</p>}
              </>
            ) : (
              <span className="text-xs text-gray-300">—</span>
            )}
          </div>

          {/* Date */}
          <p className="text-sm text-gray-400">
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
              className="text-xs text-gray-400 hover:text-blue-600"
              onClick={() => copyShareLink(p.shareToken)}
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
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
