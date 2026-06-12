"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Search, Plus, LayoutGrid, List, MoreVertical, Archive, ArchiveRestore, Trash2, Edit2, Copy, Pin, PinOff, BarChart2, Eye, ArrowDownUp,
} from "@/components/ui/icons";
import NewSurveyDialog from "./NewSurveyDialog";
import TemplatesTab from "./TemplatesTab";

type Client = { id: string; name: string };
type Survey = {
  id: string;
  name: string;
  slug: string;
  shareToken: string;
  status: string;
  archived: boolean;
  pinned: boolean;
  order: number;
  assignedClientId: string | null;
  createdAt: string;
  assignedClient: { id: string; name: string } | null;
  _count: { responses: number };
  viewCount: number;
};

interface CustomTemplate {
  id: string;
  name: string;
  createdAt: string;
  _count: { questions: number };
}

interface Props {
  surveys: Survey[];
  clients: Client[];
  customTemplates: CustomTemplate[];
}

type SortMode = "manual" | "az" | "date" | "status";
type GroupMode = "none" | "status";
type ViewMode = "grid" | "list";
type Tab = "active" | "archived" | "templates";

const STATUS_ORDER: Survey["status"][] = ["ACTIVE", "DRAFT", "CLOSED"];
const STATUS_LABELS: Record<string, string> = { ACTIVE: "Aktywne", DRAFT: "Szkice", CLOSED: "Zamknięte" };

function StatusBadge({ status }: { status: string }) {
  if (status === "ACTIVE") return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
      Aktywna
    </span>
  );
  if (status === "CLOSED") return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
      Zamknięta
    </span>
  );
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
      Szkic
    </span>
  );
}

export default function SurveysClient({ surveys: initial, clients, customTemplates }: Props) {
  const router = useRouter();
  const [surveys, setSurveys] = useState<Survey[]>(initial);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortMode>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("ankiety-sort");
      if (saved === "manual" || saved === "az" || saved === "date" || saved === "status") return saved;
    }
    return "manual";
  });
  const [group, setGroup] = useState<GroupMode>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("ankiety-group");
      if (saved === "none" || saved === "status") return saved;
    }
    return "none";
  });
  const [view, setView] = useState<ViewMode>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("ankiety-view");
      if (saved === "list" || saved === "grid") return saved;
    }
    return "grid";
  });

  function handleSetView(v: ViewMode) {
    setView(v);
    localStorage.setItem("ankiety-view", v);
  }
  const [tab, setTab] = useState<Tab>("active");
  const [newOpen, setNewOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list = surveys.filter((s) => s.archived === (tab === "archived"));
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((s) =>
        s.name.toLowerCase().includes(q) ||
        s.assignedClient?.name.toLowerCase().includes(q)
      );
    }
    if (sort === "az") list = [...list].sort((a, b) => a.name.localeCompare(b.name, "pl"));
    if (sort === "date") list = [...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    if (sort === "status") list = [...list].sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status));
    return list;
  }, [surveys, query, sort, tab]);

  async function handleArchive(survey: Survey) {
    setOpenMenuId(null);
    const res = await fetch(`/api/surveys/${survey.id}/archive`, { method: "POST" });
    if (!res.ok) { toast.error("Błąd archiwizacji"); return; }
    const updated = await res.json();
    setSurveys((prev) => prev.map((s) => s.id === survey.id ? { ...s, archived: updated.archived } : s));
    toast.success(updated.archived ? "Ankieta zarchiwizowana" : "Ankieta przywrócona");
  }

  async function handlePin(survey: Survey) {
    setOpenMenuId(null);
    const res = await fetch(`/api/surveys/${survey.id}/pin`, { method: "POST" });
    if (!res.ok) { toast.error("Błąd przypinania"); return; }
    const updated = await res.json();
    setSurveys((prev) => prev.map((s) => s.id === survey.id ? { ...s, pinned: updated.pinned } : s));
    toast.success(updated.pinned ? "Ankieta przypięta" : "Ankieta odpięta");
  }

  async function handleDelete(survey: Survey) {
    setOpenMenuId(null);
    if (!confirm(`Czy na pewno chcesz usunąć ankietę "${survey.name}"?`)) return;
    const res = await fetch(`/api/surveys/${survey.id}`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error(body.error ?? "Błąd usuwania ankiety");
      return;
    }
    setSurveys((prev) => prev.filter((s) => s.id !== survey.id));
    toast.success("Ankieta usunięta");
  }

  function handleCopyLink(survey: Survey) {
    setOpenMenuId(null);
    const url = `${window.location.origin}/share/survey/${survey.shareToken}`;
    navigator.clipboard.writeText(url);
    toast.success("Link skopiowany");
  }

  function handleCreated(survey: Survey) {
    setSurveys((prev) => [survey, ...prev]);
    setNewOpen(false);
    router.push(`/ankiety/${survey.id}/edytuj`);
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("pl-PL", { day: "numeric", month: "short", year: "numeric" });
  }

  const activeCount = surveys.filter((s) => !s.archived).length;
  const archivedCount = surveys.filter((s) => s.archived).length;

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4">
        <h1 className="text-xl font-semibold">Ankiety</h1>
        <button
          onClick={() => setNewOpen(true)}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
        >
          <Plus size={16} />
          Nowa ankieta
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 px-4 sm:px-6 pt-3 border-b border-border overflow-x-auto overflow-y-hidden scrollbar-none">
        <button
          onClick={() => setTab("active")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap ${tab === "active" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          Aktywne <span className="ml-1 text-xs text-muted-foreground">({activeCount})</span>
        </button>
        <button
          onClick={() => setTab("archived")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap ${tab === "archived" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          Zarchiwizowane <span className="ml-1 text-xs text-muted-foreground">({archivedCount})</span>
        </button>
        <button
          onClick={() => setTab("templates")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap ${tab === "templates" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          Szablony
        </button>
      </div>

      {/* Toolbar */}
      <div className="px-4 sm:px-6 py-3 flex items-center gap-2">
        <div className="relative flex-1 min-w-0">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Szukaj ankiet..."
            className="w-full pl-9 pr-4 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-transparent"
          />
        </div>

        {/* Sort — mobile icon button */}
        <div className={`relative sm:hidden w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-md border ${sort !== "manual" ? "border-gray-900 bg-gray-900 dark:border-gray-100 dark:bg-gray-100" : "border-gray-200 bg-white dark:border-gray-700 dark:bg-card"}`}>
          <ArrowDownUp size={14} className={`pointer-events-none ${sort !== "manual" ? "text-white dark:text-gray-900" : "text-gray-500"}`} />
          <select
            value={sort}
            onChange={(e) => { const v = e.target.value as SortMode; setSort(v); localStorage.setItem("ankiety-sort", v); }}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          >
            <option value="manual">Ręcznie</option>
            <option value="az">A–Z</option>
            <option value="date">Najnowsze</option>
            <option value="status">Status</option>
          </select>
        </div>

        {/* Sort — desktop select */}
        <select
          value={sort}
          onChange={(e) => { const v = e.target.value as SortMode; setSort(v); localStorage.setItem("ankiety-sort", v); }}
          className="hidden sm:block flex-shrink-0 text-xs border border-gray-200 dark:border-gray-700 rounded-md px-2 py-2 bg-white dark:bg-card text-gray-600 dark:text-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300"
        >
          <option value="manual">Ręcznie</option>
          <option value="az">A–Z</option>
          <option value="date">Najnowsze</option>
          <option value="status">Status</option>
        </select>

        {/* Group — desktop only */}
        <select
          value={group}
          onChange={(e) => { const v = e.target.value as GroupMode; setGroup(v); localStorage.setItem("ankiety-group", v); }}
          className="hidden sm:block flex-shrink-0 text-xs border border-gray-200 dark:border-gray-700 rounded-md px-2 py-2 bg-white dark:bg-card text-gray-600 dark:text-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300"
        >
          <option value="none">Grupowanie</option>
          <option value="status">Wg statusu</option>
        </select>

        <div className="flex items-center gap-0.5 bg-muted rounded-md p-0.5 flex-shrink-0">
          <button
            onClick={() => handleSetView("grid")}
            className={`p-1.5 rounded transition-colors ${view === "grid" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            <LayoutGrid size={15} />
          </button>
          <button
            onClick={() => handleSetView("list")}
            className={`p-1.5 rounded transition-colors ${view === "list" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            <List size={15} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div>
        {tab === "templates" ? (
          <TemplatesTab customTemplates={customTemplates} clients={clients} />
        ) : (
          <div className="p-3 sm:p-6">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
                <p className="text-sm">{tab === "archived" ? "Brak zarchiwizowanych ankiet." : "Brak aktywnych ankiet."}</p>
                {tab === "active" && (
                  <button
                    onClick={() => setNewOpen(true)}
                    className="mt-3 text-sm text-primary hover:underline"
                  >
                    Utwórz pierwszą ankietę
                  </button>
                )}
              </div>
            ) : group === "status" ? (
              <div className="space-y-8">
                {STATUS_ORDER.map((status) => {
                  const items = filtered.filter((s) => s.status === status);
                  if (items.length === 0) return null;
                  return (
                    <div key={status}>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{STATUS_LABELS[status]}</span>
                        <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">{items.length}</span>
                      </div>
                      {view === "grid" ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {items.map((survey) => (
                            <SurveyCard key={survey.id} survey={survey} openMenuId={openMenuId} setOpenMenuId={setOpenMenuId} onArchive={handleArchive} onPin={handlePin} onDelete={handleDelete} onCopyLink={handleCopyLink} formatDate={formatDate} />
                          ))}
                        </div>
                      ) : (
                        <SurveyTable surveys={items} openMenuId={openMenuId} setOpenMenuId={setOpenMenuId} onArchive={handleArchive} onPin={handlePin} onDelete={handleDelete} onCopyLink={handleCopyLink} formatDate={formatDate} />
                      )}
                    </div>
                  );
                })}
              </div>
            ) : view === "grid" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map((survey) => (
                  <SurveyCard
                    key={survey.id}
                    survey={survey}
                    openMenuId={openMenuId}
                    setOpenMenuId={setOpenMenuId}
                    onArchive={handleArchive}
                    onPin={handlePin}
                    onDelete={handleDelete}
                    onCopyLink={handleCopyLink}
                    formatDate={formatDate}
                  />
                ))}
              </div>
            ) : (
              <SurveyTable
                surveys={filtered}
                openMenuId={openMenuId}
                setOpenMenuId={setOpenMenuId}
                onArchive={handleArchive}
                onPin={handlePin}
                onDelete={handleDelete}
                onCopyLink={handleCopyLink}
                formatDate={formatDate}
              />
            )}
          </div>
        )}
      </div>

      <NewSurveyDialog
        open={newOpen}
        onClose={() => setNewOpen(false)}
        onCreated={handleCreated}
        clients={clients}
        customTemplates={customTemplates}
      />
    </div>
  );
}

// ── Survey Card (grid view) ────────────────────────────────────────────────

interface CardProps {
  survey: Survey;
  openMenuId: string | null;
  setOpenMenuId: (id: string | null) => void;
  onArchive: (s: Survey) => void;
  onPin: (s: Survey) => void;
  onDelete: (s: Survey) => void;
  onCopyLink: (s: Survey) => void;
  formatDate: (d: string) => string;
}

function SurveyCard({ survey, openMenuId, setOpenMenuId, onArchive, onPin, onDelete, onCopyLink, formatDate }: CardProps) {
  const open = openMenuId === survey.id;

  return (
    <a
      href={`/ankiety/${survey.id}/edytuj`}
      className={`relative block bg-card border border-border rounded-xl p-4 hover:shadow-sm hover:border-primary/30 transition-all cursor-pointer ${open ? "z-10" : ""}`}
    >
      {survey.pinned && (
        <span className="absolute top-3 right-10 text-primary opacity-60">
          <Pin size={14} />
        </span>
      )}

      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="font-semibold text-sm text-foreground line-clamp-2 flex-1">
          {survey.name}
        </span>
        <div className="relative flex-shrink-0" onClick={(e) => e.preventDefault()}>
          <button
            onClick={(e) => { e.preventDefault(); setOpenMenuId(open ? null : survey.id); }}
            className="p-1 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <MoreVertical size={16} />
          </button>
          {open && (
            <SurveyMenu survey={survey} onClose={() => setOpenMenuId(null)} onArchive={onArchive} onPin={onPin} onDelete={onDelete} onCopyLink={onCopyLink} />
          )}
        </div>
      </div>

      <StatusBadge status={survey.status} />

      <div className="mt-3 space-y-1 text-xs text-muted-foreground">
        {survey.assignedClient && <p>Klient: {survey.assignedClient.name}</p>}
        <div className="flex items-center justify-between pt-1">
          <p>{formatDate(survey.createdAt)} · {survey._count?.responses ?? 0} odpowiedzi</p>
          {survey.status === "ACTIVE" && (survey.viewCount ?? 0) > 0 && (
            <span className="flex items-center gap-1 text-muted-foreground" title="Liczba wyświetleń ankiety przez klienta">
              <Eye size={12} />
              {survey.viewCount}
            </span>
          )}
        </div>
      </div>
    </a>
  );
}

// ── Survey Table (list view) ───────────────────────────────────────────────

function SurveyTable({ surveys, openMenuId, setOpenMenuId, onArchive, onPin, onDelete, onCopyLink, formatDate }: Omit<CardProps, "survey"> & { surveys: Survey[] }) {
  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-muted/50 border-b border-border">
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Nazwa</th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Klient</th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Data</th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Odpowiedzi</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {surveys.map((survey, i) => {
            const open = openMenuId === survey.id;
            return (
              <tr key={survey.id} className={`border-b border-border last:border-0 ${i % 2 === 0 ? "" : "bg-muted/20"} ${openMenuId === survey.id ? "relative z-10" : ""}`}>
                <td className="px-4 py-3">
                  <a href={`/ankiety/${survey.id}/edytuj`} className="font-medium hover:text-primary transition-colors">
                    {survey.name}
                  </a>
                </td>
                <td className="px-4 py-3"><StatusBadge status={survey.status} /></td>
                <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{survey.assignedClient?.name ?? "—"}</td>
                <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{formatDate(survey.createdAt)}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  <div className="flex items-center gap-3">
                    <span>{survey._count?.responses ?? 0}</span>
                    {survey.status === "ACTIVE" && (survey.viewCount ?? 0) > 0 && (
                      <span className="flex items-center gap-1" title="Liczba wyświetleń ankiety przez klienta">
                        <Eye size={12} />
                        {survey.viewCount}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="relative flex justify-end">
                    <button
                      onClick={() => setOpenMenuId(open ? null : survey.id)}
                      className="p-1 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    >
                      <MoreVertical size={16} />
                    </button>
                    {open && (
                      <SurveyMenu survey={survey} onClose={() => setOpenMenuId(null)} onArchive={onArchive} onPin={onPin} onDelete={onDelete} onCopyLink={onCopyLink} />
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Survey Menu ────────────────────────────────────────────────────────────

function SurveyMenu({ survey, onClose, onArchive, onPin, onDelete, onCopyLink }: {
  survey: Survey;
  onClose: () => void;
  onArchive: (s: Survey) => void;
  onPin: (s: Survey) => void;
  onDelete: (s: Survey) => void;
  onCopyLink: (s: Survey) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [above, setAbove] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    if (rect.bottom > window.innerHeight) setAbove(true);
    setVisible(true);
  }, []);

  return (
    <div
      ref={ref}
      className={`absolute right-0 ${above ? "bottom-full mb-1" : "top-full mt-1"} z-20 bg-card border border-border rounded-xl shadow-lg py-1 min-w-44 transition-none ${visible ? "" : "opacity-0"}`}
    >
      <a
        href={`/ankiety/${survey.id}/odpowiedzi`}
        className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors"
      >
        <BarChart2 size={14} />
        Odpowiedzi
      </a>
      <a
        href={`/ankiety/${survey.id}/edytuj`}
        className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors"
      >
        <Edit2 size={14} />
        Edytuj
      </a>
      {survey.status === "ACTIVE" && (
        <button
          onClick={() => { onCopyLink(survey); onClose(); }}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors"
        >
          <Copy size={14} />
          Kopiuj link
        </button>
      )}
      <button
        onClick={() => onPin(survey)}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors"
      >
        {survey.pinned ? <PinOff size={14} /> : <Pin size={14} />}
        {survey.pinned ? "Odepnij" : "Przypnij"}
      </button>
      <button
        onClick={() => onArchive(survey)}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors"
      >
        {survey.archived ? <ArchiveRestore size={14} /> : <Archive size={14} />}
        {survey.archived ? "Przywróć" : "Archiwizuj"}
      </button>
      <div className="border-t border-border my-1" />
      <button
        onClick={() => { onDelete(survey); onClose(); }}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
      >
        <Trash2 size={14} />
        Usuń
      </button>
    </div>
  );
}
