"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { useViewPreference } from "@/hooks/useViewPreference";
import { useT } from "@/lib/i18n";
import { LayoutGrid, List, Search, ArrowDownUp, Engineering, Plus, Edit2, Trash2 } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ContractorCard from "./ContractorCard";
import AddContractorDialog from "./AddContractorDialog";
import TrialGate from "@/components/ui/TrialGate";
import { useIsTrialExpired } from "@/lib/trial-context";

interface Contractor {
  id: string;
  name: string;
  company: string | null;
  trade: string | null;
  _count: { assignments: number };
}

type SortOption = "newest" | "oldest" | "az" | "za";

export default function WykonawcyView({ contractors, unreadPerContractor = {} }: { contractors: Contractor[]; unreadPerContractor?: Record<string, number> }) {
  const t = useT();
  const router = useRouter();
  const expired = useIsTrialExpired();
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
          <h1 className="text-2xl font-bold">{t.wykonawcy.title}</h1>
          <p className="text-gray-500 mt-1">
            {contractors.length === 0
              ? t.wykonawcy.noContractors
              : `${contractors.length} ${contractors.length === 1 ? t.wykonawcy.contractorCountUnit : contractors.length < 5 ? t.wykonawcy.contractorCountUnitFew : t.wykonawcy.contractorCountUnitMany}`}
          </p>
        </div>
        <TrialGate>
          <Button onClick={() => setAddOpen(true)} className="gap-2 sm:self-start">
            <Plus size={16} />
            {t.wykonawcy.addBtn}
          </Button>
        </TrialGate>
      </div>

      {/* Search + controls */}
      <div className="flex items-center gap-2 mb-6">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder={t.wykonawcy.searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-transparent"
          />
        </div>
        {contractors.length > 0 && (
          <>
            <div className={`relative sm:hidden w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-md border ${sort !== "newest" ? "border-primary/30 bg-primary/10" : "border-border bg-background"}`}>
              <ArrowDownUp size={14} className={`pointer-events-none ${sort !== "newest" ? "text-primary" : "text-muted-foreground"}`} />
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortOption)}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                aria-label="Sortuj"
              >
                <option value="newest">{t.common.newest}</option>
                <option value="oldest">{t.common.oldest}</option>
                <option value="az">A–Z</option>
                <option value="za">Z–A</option>
              </select>
            </div>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortOption)}
              className="hidden sm:block flex-shrink-0 text-xs border border-gray-200 dark:border-gray-700 rounded-md px-2 py-2 bg-white dark:bg-card text-gray-600 dark:text-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300"
            >
              <option value="newest">{t.common.newest}</option>
              <option value="oldest">{t.common.oldest}</option>
              <option value="az">A–Z</option>
              <option value="za">Z–A</option>
            </select>
            <div className="flex items-center gap-0.5 bg-muted rounded-md p-0.5 flex-shrink-0">
              <button
                onClick={() => setView("grid")}
                className={`p-1.5 rounded transition-colors ${view === "grid" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                <LayoutGrid size={15} />
              </button>
              <button
                onClick={() => setView("list")}
                className={`p-1.5 rounded transition-colors ${view === "list" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
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
          <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-1">{t.wykonawcy.noContractors}</h2>
          <p className="text-sm text-gray-400 max-w-xs">{t.wykonawcy.noContractorsHint}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-4">🔍</p>
          <p className="text-lg">{t.wykonawcy.noSearchResults} &quot;{search}&quot;</p>
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
              unreadCount={unreadPerContractor[c.id] ?? 0}
            />
          ))}
        </div>
      ) : (
        <ContractorListView contractors={filtered} unreadPerContractor={unreadPerContractor} onDeleted={() => router.refresh()} />
      )}

      <AddContractorDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onCreated={() => router.refresh()}
      />
    </div>
  );
}

function ContractorListView({ contractors, unreadPerContractor = {}, onDeleted }: { contractors: Contractor[]; unreadPerContractor?: Record<string, number>; onDeleted: () => void }) {
  const t = useT();
  const router = useRouter();
  const expired = useIsTrialExpired();

  async function handleDelete(id: string, name: string) {
    if (!confirm(`${t.common.delete} "${name}"? ${t.wykonawcy.deleteConfirmMsg}`)) return;
    const res = await fetch(`/api/contractors/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success(t.wykonawcy.deletedOk);
      onDeleted();
    } else {
      toast.error(t.wykonawcy.deleteError);
    }
  }

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="hidden sm:grid grid-cols-[1fr_140px_80px] lg:grid-cols-[1fr_180px_160px_140px_80px] gap-4 px-5 py-3 bg-muted/50 border-b border-border text-xs font-medium text-muted-foreground uppercase tracking-wide">
        <span>{t.wykonawcy.colCompanyContractor}</span>
        <span className="hidden lg:block"></span>
        <span className="hidden lg:block">{t.wykonawcy.colSpecialization}</span>
        <span>{t.wykonawcy.colProjects}</span>
        <span className="text-right">{t.wykonawcy.colActions}</span>
      </div>
      {contractors.map((c, i) => (
        <div
          key={c.id}
          onClick={() => router.push(`/wykonawcy/${c.id}`)}
          className={`grid grid-cols-[1fr_140px_80px] lg:grid-cols-[1fr_180px_160px_140px_80px] gap-4 px-5 py-4 items-center hover:bg-muted/30 transition-colors cursor-pointer ${i !== contractors.length - 1 ? "border-b border-border" : ""}`}
        >
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">
              {c.company ?? c.name}
            </p>
            {c.company && c.name && (
              <p className="text-xs text-muted-foreground truncate mt-0.5">{c.name}</p>
            )}
          </div>
          <div className="hidden lg:block">
            {(unreadPerContractor[c.id] ?? 0) > 0 && (
              <Badge variant="default" className="text-xs whitespace-nowrap">
                {t.wykonawcy.unread} {unreadPerContractor[c.id]}
              </Badge>
            )}
          </div>
          <div className="hidden lg:block">
            {c.trade
              ? <Badge variant="secondary" className="text-xs">{c.trade}</Badge>
              : <span className="text-xs text-muted-foreground">—</span>
            }
          </div>
          <div>
            <Badge variant="secondary" className="text-xs">
              {c._count.assignments === 1
                ? t.wykonawcy.project1
                : (c._count.assignments % 10 >= 2 && c._count.assignments % 10 <= 4 && !(c._count.assignments % 100 >= 12 && c._count.assignments % 100 <= 14))
                ? `${c._count.assignments} ${t.wykonawcy.projectFew}`
                : `${c._count.assignments} ${t.wykonawcy.projectMany}`}
            </Badge>
          </div>
          <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
            <Link href={`/wykonawcy/${c.id}`}>
              <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-foreground gap-1">
                <Edit2 size={14} />
              </Button>
            </Link>
            <TrialGate>
              <Button
                size="sm"
                variant="ghost"
                className="text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                onClick={() => handleDelete(c.id, c.company ?? c.name)}
              >
                <Trash2 size={14} />
              </Button>
            </TrialGate>
          </div>
        </div>
      ))}
    </div>
  );
}
