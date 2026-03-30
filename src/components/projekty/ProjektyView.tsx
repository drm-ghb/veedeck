"use client";

import { useState } from "react";
import Link from "next/link";
import { Briefcase, Image as ImageIcon, ShoppingCart, ChevronRight, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import NewProjectDialog from "@/components/dashboard/NewProjectDialog";
import ProjektyMenu from "@/components/projekty/ProjektyMenu";

interface Project {
  id: string;
  title: string;
  clientName: string | null;
  clientEmail: string | null;
  description: string | null;
  renderCount: number;
  roomCount: number;
  createdAt: string;
}

interface ProjektyViewProps {
  projects: Project[];
}

type SortOption = "newest" | "oldest" | "az" | "za" | "renders";

export default function ProjektyView({ projects }: ProjektyViewProps) {
  const [sort, setSort] = useState<SortOption>("newest");

  const sorted = [...projects].sort((a, b) => {
    switch (sort) {
      case "oldest": return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case "az":     return a.title.localeCompare(b.title, "pl");
      case "za":     return b.title.localeCompare(a.title, "pl");
      case "renders": return b.renderCount - a.renderCount;
      default:       return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-8">
        <div>
          <h1 className="text-2xl font-bold">Projekty</h1>
          <p className="text-gray-500 mt-1">
            {projects.length === 0
              ? "Nie masz jeszcze żadnych projektów"
              : `${projects.length} projekt${projects.length === 1 ? "" : projects.length < 5 ? "y" : "ów"}`}
          </p>
        </div>
        <div className="flex items-center gap-2 sm:self-start">
          {projects.length > 0 && (
            <>
              {/* Mobile: icon-only */}
              <div className={`relative sm:hidden w-8 h-8 flex items-center justify-center rounded-md border ${sort !== "newest" ? "border-gray-900 bg-gray-900" : "border-gray-200 bg-white dark:border-gray-700 dark:bg-card"}`}>
                <SlidersHorizontal size={14} className={`pointer-events-none ${sort !== "newest" ? "text-white" : "text-gray-500"}`} />
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortOption)}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  aria-label="Sortowanie"
                >
                  <option value="newest">Najnowsze</option>
                  <option value="oldest">Najstarsze</option>
                  <option value="az">A–Z</option>
                  <option value="za">Z–A</option>
                  <option value="renders">Najwięcej renderów</option>
                </select>
              </div>
              {/* Desktop: full select */}
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortOption)}
                className="hidden sm:block text-xs border border-gray-200 dark:border-gray-700 rounded-md px-2 py-1.5 bg-white dark:bg-card text-gray-600 dark:text-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300"
              >
                <option value="newest">Najnowsze</option>
                <option value="oldest">Najstarsze</option>
                <option value="az">A–Z</option>
                <option value="za">Z–A</option>
                <option value="renders">Najwięcej renderów</option>
              </select>
            </>
          )}
          <NewProjectDialog />
        </div>
      </div>

      {/* Empty state */}
      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#4f46e5]/10 flex items-center justify-center mb-4">
            <Briefcase size={28} className="text-[#4f46e5]" />
          </div>
          <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-1">
            Brak projektów
          </h2>
          <p className="text-sm text-gray-400 max-w-xs">
            Kliknij „Nowy projekt" aby stworzyć pierwszy projekt i podpiąć do niego zasoby z modułów.
          </p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {/* Table header */}
          <div className="hidden sm:grid grid-cols-[1fr_140px_200px_96px] gap-4 px-5 py-3 bg-muted/50 border-b border-border text-xs font-medium text-muted-foreground uppercase tracking-wide">
            <span>Projekt</span>
            <span>Data</span>
            <span>Moduły</span>
            <span className="text-right">Akcje</span>
          </div>

          {/* Rows */}
          {sorted.map((p, i) => (
            <div
              key={p.id}
              className={`grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_140px_200px_96px] gap-4 px-5 py-4 items-center hover:bg-muted/30 transition-colors ${
                i !== sorted.length - 1 ? "border-b border-border" : ""
              }`}
            >
              {/* Title + client */}
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">{p.title}</p>
                {p.clientName && (
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{p.clientName}</p>
                )}
                {p.description && (
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{p.description}</p>
                )}
              </div>

              {/* Date */}
              <p className="hidden sm:block text-sm text-muted-foreground whitespace-nowrap">
                {new Date(p.createdAt).toLocaleDateString("pl-PL", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </p>

              {/* Module badges */}
              <div className="hidden sm:flex items-center gap-2 flex-wrap">
                <Link
                  href={`/projects/${p.id}`}
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-md bg-[#19213D]/10 text-[#19213D] dark:bg-white/10 dark:text-white hover:bg-[#19213D]/20 dark:hover:bg-white/20 transition-colors"
                >
                  <ImageIcon size={11} />
                  RenderFlow
                  {p.renderCount > 0 && (
                    <span className="text-[10px] opacity-60">({p.renderCount})</span>
                  )}
                </Link>
                <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-md bg-[#0f766e]/10 text-[#0f766e] cursor-default">
                  <ShoppingCart size={11} />
                  Listy
                </span>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-1">
                <Link href={`/projects/${p.id}`}>
                  <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-foreground gap-1">
                    <span className="hidden sm:inline text-xs">Otwórz</span>
                    <ChevronRight size={14} />
                  </Button>
                </Link>
                <ProjektyMenu project={p} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
