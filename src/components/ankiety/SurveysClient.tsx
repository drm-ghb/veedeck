"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Search, Plus, LayoutGrid, List, MoreVertical, Archive, ArchiveRestore, Trash2, Edit2, Copy, Pin, PinOff, BarChart2, Eye, ArrowDownUp,
} from "@/components/ui/icons";
import NewSurveyDialog from "./NewSurveyDialog";
import TemplatesTab from "./TemplatesTab";
import { useT } from "@/lib/i18n";

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
  hasCompletedResponse: boolean;
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

function StatusBadge({ status, completed }: { status: string; completed?: boolean }) {
  const t = useT();
  if (status === "ACTIVE" && completed) return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
      {t.ankiety.statusActiveCompleted}
    </span>
  );
  if (status === "ACTIVE") return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
      {t.ankiety.statusActive}
    </span>
  );
  if (status === "CLOSED") return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
      {t.ankiety.statusClosed}
    </span>
  );
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
      {t.ankiety.statusDraft}
    </span>
  );
}

export default function SurveysClient({ surveys: initial, clients, customTemplates }: Props) {
  const router = useRouter();
  const t = useT();
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
    if (!res.ok) { toast.error(t.ankiety.archiveError); return; }
    const updated = await res.json();
    setSurveys((prev) => prev.map((s) => s.id === survey.id ? { ...s, archived: updated.archived } : s));
    toast.success(updated.archived ? t.ankiety.surveyArchived : t.ankiety.surveyRestored);
  }

  async function handlePin(survey: Survey) {
    setOpenMenuId(null);
    const res = await fetch(`/api/surveys/${survey.id}/pin`, { method: "POST" });
    if (!res.ok) { toast.error(t.ankiety.pinError); return; }
    const updated = await res.json();
    setSurveys((prev) => prev.map((s) => s.id === survey.id ? { ...s, pinned: updated.pinned } : s));
    toast.success(updated.pinned ? t.ankiety.surveyPinned : t.ankiety.surveyUnpinned);
  }

  async function handleDelete(survey: Survey) {
    setOpenMenuId(null);
    if (!confirm(t.ankiety.confirmDelete)) return;
    const res = await fetch(`/api/surveys/${survey.id}`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error(body.error ?? t.ankiety.deleteError);
      return;
    }
    setSurveys((prev) => prev.filter((s) => s.id !== survey.id));
    toast.success(t.ankiety.surveyDeleted);
  }

  function handleCopyLink(survey: Survey) {
    setOpenMenuId(null);
    const url = `${window.location.origin}/share/survey/${survey.shareToken}`;
    navigator.clipboard.writeText(url);
    toast.success(t.common.linkCopied);
  }

  function handleCreated(survey: Survey) {
    setSurveys((prev) => [survey, ...prev]);
    setNewOpen(false);
    router.push(`/ankiety/${survey.id}/edytuj`);
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString();
  }

  const activeCount = surveys.filter((s) => !s.archived).length;
  const archivedCount = surveys.filter((s) => s.archived).length;

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4">
        <h1 className="text-xl font-semibold">{t.ankiety.title}</h1>
        <button
          onClick={() => setNewOpen(true)}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
        >
          <Plus size={16} />
          {t.ankiety.newSurvey}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 px-4 sm:px-6 pt-3 border-b border-border overflow-x-auto overflow-y-hidden scrollbar-none">
        <button
          onClick={() => setTab("active")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap ${tab === "active" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          {t.ankiety.statusActivePlural} <span className="ml-1 text-xs text-muted-foreground">({activeCount})</span>
        </button>
        <button
          onClick={() => setTab("archived")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap ${tab === "archived" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          {t.common.archived} <span className="ml-1 text-xs text-muted-foreground">({archivedCount})</span>
        </button>
        <button
          onClick={() => setTab("templates")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap ${tab === "templates" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          {t.ankiety.templatesTab}
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
            placeholder={t.ankiety.searchPlaceholder}
            className="w-full pl-9 pr-4 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-transparent"
          />
        </div>

        {/* Sort — mobile icon button */}
        <div className={`relative sm:hidden w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-md border ${sort !== "manual" ? "border-foreground bg-foreground" : "border-border bg-background"}`}>
          <ArrowDownUp size={14} className={`pointer-events-none ${sort !== "manual" ? "text-background" : "text-muted-foreground"}`} />
          <select
            value={sort}
            onChange={(e) => { const v = e.target.value as SortMode; setSort(v); localStorage.setItem("ankiety-sort", v); }}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          >
            <option value="manual">{t.ankiety.sortManual}</option>
            <option value="az">{t.common.az}</option>
            <option value="date">{t.common.newest}</option>
            <option value="status">{t.ankiety.sortStatus}</option>
          </select>
        </div>

        {/* Sort — desktop select */}
        <select
          value={sort}
          onChange={(e) => { const v = e.target.value as SortMode; setSort(v); localStorage.setItem("ankiety-sort", v); }}
          className="hidden sm:block flex-shrink-0 text-xs border border-gray-200 dark:border-gray-700 rounded-md px-2 py-2 bg-white dark:bg-card text-gray-600 dark:text-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300"
        >
          <option value="manual">{t.ankiety.sortManual}</option>
          <option value="az">{t.common.az}</option>
          <option value="date">{t.common.newest}</option>
          <option value="status">{t.ankiety.sortStatus}</option>
        </select>

        {/* Group — desktop only */}
        <select
          value={group}
          onChange={(e) => { const v = e.target.value as GroupMode; setGroup(v); localStorage.setItem("ankiety-group", v); }}
          className="hidden sm:block flex-shrink-0 text-xs border border-gray-200 dark:border-gray-700 rounded-md px-2 py-2 bg-white dark:bg-card text-gray-600 dark:text-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300"
        >
          <option value="none">{t.ankiety.groupBy}</option>
          <option value="status">{t.ankiety.groupByStatus}</option>
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
                <p className="text-sm">{tab === "archived" ? t.ankiety.noArchived : t.ankiety.noActive}</p>
                {tab === "active" && (
                  <button
                    onClick={() => setNewOpen(true)}
                    className="mt-3 text-sm text-primary hover:underline"
                  >
                    {t.ankiety.createFirst}
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
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{status === "ACTIVE" ? t.ankiety.statusActivePlural : status === "DRAFT" ? t.ankiety.statusDraftPlural : t.ankiety.statusClosedPlural}</span>
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
  const t = useT();
  const router = useRouter();
  const open = openMenuId === survey.id;

  return (
    <div
      onClick={() => router.push(`/ankiety/${survey.id}/edytuj`)}
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
        <div className="relative flex-shrink-0 flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          {survey.hasCompletedResponse && (
            <a
              href={`/ankiety/${survey.id}/odpowiedzi`}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-primary/10 text-primary rounded-md hover:bg-primary/20 transition-colors"
            >
              <BarChart2 size={13} />
              {t.ankiety.responses}
            </a>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); setOpenMenuId(open ? null : survey.id); }}
            className="p-1 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <MoreVertical size={16} />
          </button>
          {open && (
            <SurveyMenu survey={survey} onClose={() => setOpenMenuId(null)} onArchive={onArchive} onPin={onPin} onDelete={onDelete} onCopyLink={onCopyLink} />
          )}
        </div>
      </div>

      <StatusBadge status={survey.status} completed={survey.hasCompletedResponse} />

      <div className="mt-3 space-y-1 text-xs text-muted-foreground">
        {survey.assignedClient && <p>{t.ankiety.clientLabel} {survey.assignedClient.name}</p>}
        <div className="flex items-center justify-between pt-1">
          <p>{formatDate(survey.createdAt)} · {survey._count?.responses ?? 0} {t.ankiety.responses}</p>
          {survey.status === "ACTIVE" && (survey.viewCount ?? 0) > 0 && (
            <span className="flex items-center gap-1 text-muted-foreground" title={t.ankiety.viewCountTitle}>
              <Eye size={12} />
              {survey.viewCount}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Survey Table (list view) ───────────────────────────────────────────────

function SurveyTable({ surveys, openMenuId, setOpenMenuId, onArchive, onPin, onDelete, onCopyLink, formatDate }: Omit<CardProps, "survey"> & { surveys: Survey[] }) {
  const t = useT();
  return (
    <div className="border border-border rounded-xl overflow-visible">
      <table className="w-full text-sm table-fixed">
        <thead>
          <tr className="bg-muted/50 border-b border-border">
            <th className="text-left px-3 sm:px-4 py-3 font-medium text-muted-foreground rounded-tl-xl w-full">{t.ankiety.colName}</th>
            <th className="text-left px-3 sm:px-4 py-3 font-medium text-muted-foreground w-28 sm:w-32">{t.ankiety.colStatus}</th>
            <th className="text-left px-3 sm:px-4 py-3 font-medium text-muted-foreground hidden md:table-cell w-36">{t.ankiety.colClient}</th>
            <th className="text-left px-3 sm:px-4 py-3 font-medium text-muted-foreground hidden md:table-cell w-32">{t.ankiety.colDate}</th>
            <th className="text-left px-3 sm:px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell w-24">{t.ankiety.colResponses}</th>
            <th className="px-3 sm:px-4 py-3 rounded-tr-xl w-16 sm:w-28" />
          </tr>
        </thead>
        <tbody>
          {surveys.map((survey, i) => {
            const open = openMenuId === survey.id;
            return (
              <tr key={survey.id} className={`border-b border-border last:border-0 ${i % 2 === 0 ? "" : "bg-muted/20"} ${openMenuId === survey.id ? "relative z-10" : ""}`}>
                <td className="px-3 sm:px-4 py-3 min-w-0">
                  <a href={`/ankiety/${survey.id}/edytuj`} className="font-medium hover:text-primary transition-colors truncate block">
                    {survey.name}
                  </a>
                </td>
                <td className="px-3 sm:px-4 py-3 whitespace-nowrap"><StatusBadge status={survey.status} completed={survey.hasCompletedResponse} /></td>
                <td className="px-3 sm:px-4 py-3 hidden md:table-cell text-muted-foreground">{survey.assignedClient?.name ?? "—"}</td>
                <td className="px-3 sm:px-4 py-3 hidden md:table-cell text-muted-foreground">{formatDate(survey.createdAt)}</td>
                <td className="px-3 sm:px-4 py-3 text-muted-foreground hidden sm:table-cell">
                  <div className="flex items-center gap-3">
                    <span>{survey._count?.responses ?? 0}</span>
                    {survey.status === "ACTIVE" && (survey.viewCount ?? 0) > 0 && (
                      <span className="flex items-center gap-1" title={t.ankiety.viewCountTitle}>
                        <Eye size={12} />
                        {survey.viewCount}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-3 sm:px-4 py-3 whitespace-nowrap">
                  <div className="relative flex items-center justify-end gap-1">
                    {survey.hasCompletedResponse && (
                      <a
                        href={`/ankiety/${survey.id}/odpowiedzi`}
                        className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-primary/10 text-primary rounded-md hover:bg-primary/20 transition-colors"
                      >
                        <BarChart2 size={13} />
                        {t.ankiety.responses}
                      </a>
                    )}
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
  const t = useT();
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
        {t.ankiety.responses}
      </a>
      <a
        href={`/ankiety/${survey.id}/edytuj`}
        className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors"
      >
        <Edit2 size={14} />
        {t.common.edit}
      </a>
      {survey.status === "ACTIVE" && (
        <button
          onClick={() => { onCopyLink(survey); onClose(); }}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors"
        >
          <Copy size={14} />
          {t.common.copyLink}
        </button>
      )}
      <button
        onClick={() => onPin(survey)}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors"
      >
        {survey.pinned ? <PinOff size={14} /> : <Pin size={14} />}
        {survey.pinned ? t.common.unpinAction : t.common.pinAction}
      </button>
      <button
        onClick={() => onArchive(survey)}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors"
      >
        {survey.archived ? <ArchiveRestore size={14} /> : <Archive size={14} />}
        {survey.archived ? t.common.restore : t.common.archive}
      </button>
      <div className="border-t border-border my-1" />
      <button
        onClick={() => { onDelete(survey); onClose(); }}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
      >
        <Trash2 size={14} />
        {t.common.delete}
      </button>
    </div>
  );
}
