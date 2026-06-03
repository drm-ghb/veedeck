"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { useViewPreference } from "@/hooks/useViewPreference";
import { LayoutGrid, List, Search, ArrowDownUp, Engineering, Plus, Edit2, Trash2 } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ContractorCard from "./ContractorCard";
import AddContractorDialog from "./AddContractorDialog";

interface Contractor {
  id: string;
  name: string;
  company: string | null;
  trade: string | null;
  _count: { assignments: number };
}

type SortOption = "newest" | "oldest" | "az" | "za";

export default function WykonawcyView({ contractors }: { contractors: Contractor[] }) {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("newest");
  const [view, setView] = useViewPreference("wykonawcy", "list");

  const filtered = [...contractors]
    .filter((c) => {
      const q = search.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        (c.company?.toLowerCase().includes(q) ?? false) ||
        (c.trade?.toLowerCase().includes(q) ?? false)
      );
    })
    .sort((a, b) => {
      switch (sort) {
        case "oldest": return 0; // no createdAt on client — keep server order reversed
        case "az": return (a.company ?? a.name).localeCompare(b.company ?? b.name, "pl");
        case "za": return (b.company ?? b.name).localeCompare(a.company ?? a.name, "pl");
        default: return 0;
      }
    });

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-4 gap-3">
        <div>
          <h1 className="text-2xl font-bold">Wykonawcy</h1>
          <p className="text-gray-500 mt-1">
            {contractors.length === 0
              ? "Brak wykonawców"
              : `${contractors.length} wykonawc${contractors.length === 1 ? "a" : contractors.length < 5 ? "ów" : "ów"}`}
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="gap-2 self-start">
          <Plus size={16} />
          Dodaj wykonawcę
        </Button>
      </div>

      {/* Search + controls */}
      <div className="flex items-center gap-2 mb-6">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Szukaj wykonawcy…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-transparent"
          />
        </div>
        {contractors.length > 0 && (
          <>
            <div className={`relative sm:hidden w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-md border ${sort !== "newest" ? "border-gray-900 bg-gray-900" : "border-gray-200 bg-white dark:border-gray-700 dark:bg-card"}`}>
              <ArrowDownUp size={14} className={`pointer-events-none ${sort !== "newest" ? "text-white" : "text-gray-500"}`} />
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortOption)}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                aria-label="Sortuj"
              >
                <option value="newest">Najnowsze</option>
                <option value="oldest">Najstarsze</option>
                <option value="az">A–Z</option>
                <option value="za">Z–A</option>
              </select>
            </div>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortOption)}
              className="hidden sm:block flex-shrink-0 text-xs border border-gray-200 dark:border-gray-700 rounded-md px-2 py-2 bg-white dark:bg-card text-gray-600 dark:text-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300"
            >
              <option value="newest">Najnowsze</option>
              <option value="oldest">Najstarsze</option>
              <option value="az">A–Z</option>
              <option value="za">Z–A</option>
            </select>
            <div className="flex items-center gap-0.5 bg-muted rounded-md p-0.5 flex-shrink-0">
              <button
                onClick={() => setView("grid")}
                className={`p-1.5 rounded transition-colors ${view === "grid" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                <LayoutGrid size={15} />
              </button>
              <button
                onClick={() => setView("list")}
                className={`p-1.5 rounded transition-colors ${view === "list" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                <List size={15} />
              </button>
            </div>
          </>
        )}
      </div>

      {/* Empty state */}
      {contractors.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <Engineering size={28} className="text-primary" />
          </div>
          <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-1">Brak wykonawców</h2>
          <p className="text-sm text-gray-400 max-w-xs">Dodaj pierwszego wykonawcę, aby przypisać go do projektów.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-4">🔍</p>
          <p className="text-lg">Brak wykonawców pasujących do &quot;{search}&quot;</p>
        </div>
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c) => (
            <ContractorCard
              key={c.id}
              id={c.id}
              name={c.name}
              company={c.company}
              trade={c.trade}
              activeAssignments={c._count.assignments}
            />
          ))}
        </div>
      ) : (
        <ContractorListView contractors={filtered} onDeleted={() => router.refresh()} />
      )}

      <AddContractorDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onCreated={() => router.refresh()}
      />
    </div>
  );
}

function ContractorListView({ contractors, onDeleted }: { contractors: Contractor[]; onDeleted: () => void }) {
  const router = useRouter();

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Usunąć wykonawcę "${name}"? Spowoduje to usunięcie wszystkich przypisań i plików.`)) return;
    const res = await fetch(`/api/contractors/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Wykonawca usunięty");
      onDeleted();
    } else {
      toast.error("Błąd podczas usuwania wykonawcy");
    }
  }

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="hidden sm:grid grid-cols-[1fr_160px_140px_80px] gap-4 px-5 py-3 bg-muted/50 border-b border-border text-xs font-medium text-muted-foreground uppercase tracking-wide">
        <span>Firma / Wykonawca</span>
        <span>Specjalność</span>
        <span>Projekty</span>
        <span className="text-right">Akcje</span>
      </div>
      {contractors.map((c, i) => (
        <div
          key={c.id}
          onClick={() => router.push(`/wykonawcy/${c.id}`)}
          className={`grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_160px_140px_80px] gap-4 px-5 py-4 items-center hover:bg-muted/30 transition-colors cursor-pointer ${i !== contractors.length - 1 ? "border-b border-border" : ""}`}
        >
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">
              {c.company ?? c.name}
            </p>
            {c.company && c.name && (
              <p className="text-xs text-muted-foreground truncate mt-0.5">{c.name}</p>
            )}
          </div>
          <div className="hidden sm:block">
            {c.trade
              ? <Badge variant="secondary" className="text-xs">{c.trade}</Badge>
              : <span className="text-xs text-muted-foreground">—</span>
            }
          </div>
          <div className="hidden sm:block">
            <Badge
              variant={c._count.assignments > 0 ? "default" : "secondary"}
              className="text-xs"
            >
              {c._count.assignments === 1 ? "1 projekt" : `${c._count.assignments} projektów`}
            </Badge>
          </div>
          <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
            <Link href={`/wykonawcy/${c.id}`}>
              <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-foreground gap-1">
                <Edit2 size={14} />
              </Button>
            </Link>
            <Button
              size="sm"
              variant="ghost"
              className="text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
              onClick={() => handleDelete(c.id, c.company ?? c.name)}
            >
              <Trash2 size={14} />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
