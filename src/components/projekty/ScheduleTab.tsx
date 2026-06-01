"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ChevronDown, ChevronRight, Plus, Trash2, Pencil, Check, X,
  GripVertical, Eye, EyeOff, Loader2, Users, Download,
} from "@/components/ui/icons";
import DatePicker from "@/components/ui/DatePicker";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// ── Types ──────────────────────────────────────────────────────────────────

interface RfProject {
  id: string;
  title: string;
}

interface ScheduleItem {
  id: string;
  phaseId: string;
  name: string;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  done: boolean;
  hidden: boolean;
  isSection: boolean;
  order: number;
}

interface SchedulePhase {
  id: string;
  clientId: string;
  rfProjectId: string | null;
  rfProject: RfProject | null;
  name: string;
  startDate: string | null;
  endDate: string | null;
  done: boolean;
  hidden: boolean;
  order: number;
  items: ScheduleItem[];
}

interface Props {
  clientId: string;
  projectId: string;
  scheduleSharedWithClient: boolean;
}

// ── Date helpers ───────────────────────────────────────────────────────────

function toDateStr(d: string | null): string {
  if (!d) return "";
  return d.slice(0, 10);
}

function formatDate(d: string | null): string {
  if (!d) return "";
  return new Date(d).toLocaleDateString("pl-PL", { day: "numeric", month: "short", year: "numeric" });
}

type DateStatus = "none" | "normal" | "warning" | "danger" | "overdue";

function getDateStatus(endDate: string | null, done: boolean): DateStatus {
  if (done || !endDate) return "none";
  const diff = Math.ceil((new Date(endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return "overdue";
  if (diff < 7) return "danger";
  if (diff < 14) return "warning";
  return "normal";
}

function DateBadge({ startDate, endDate, done, variant = "pill" }: { startDate: string | null; endDate: string | null; done: boolean; variant?: "pill" | "plain" }) {
  if (!startDate && !endDate) return null;
  const status = getDateStatus(endDate, done);

  const label = startDate && endDate
    ? `${formatDate(startDate)} — ${formatDate(endDate)}`
    : startDate
    ? `od ${formatDate(startDate)}`
    : `do ${formatDate(endDate)}`;

  if (variant === "plain") {
    return (
      <span className="text-[11px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap border border-border text-muted-foreground">
        {label}
      </span>
    );
  }

  const colorClass =
    status === "overdue" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
    status === "danger"  ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" :
    status === "warning" ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" :
    "bg-muted text-muted-foreground";

  return (
    <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${colorClass}`}>
      {label}
    </span>
  );
}

// ── Section date range helper ──────────────────────────────────────────────

function computeSectionRanges(items: ScheduleItem[]): Map<string, { startDate: string | null; endDate: string | null }> {
  const map = new Map<string, { startDate: string | null; endDate: string | null }>();
  let currentId: string | null = null;
  let starts: string[] = [];
  let ends: string[] = [];

  function finalize() {
    if (currentId) {
      map.set(currentId, {
        startDate: starts.length > 0 ? [...starts].sort()[0] : null,
        endDate: ends.length > 0 ? [...ends].sort().at(-1)! : null,
      });
    }
  }

  for (const item of items) {
    if (item.isSection) {
      finalize();
      currentId = item.id;
      starts = [];
      ends = [];
    } else if (currentId) {
      if (item.startDate) starts.push(item.startDate.slice(0, 10));
      if (item.endDate) ends.push(item.endDate.slice(0, 10));
    }
  }
  finalize();
  return map;
}

// ── Sortable item row ──────────────────────────────────────────────────────

function SortableItemRow({
  item,
  onUpdate,
  onDelete,
  sectionDateRange,
  indented,
}: {
  item: ScheduleItem;
  onUpdate: (id: string, data: Partial<ScheduleItem>) => void;
  onDelete: (id: string) => void;
  sectionDateRange?: { startDate: string | null; endDate: string | null };
  indented?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    data: { type: "item", phaseId: item.phaseId },
  });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };

  const [editingName, setEditingName] = useState(false);
  const [nameVal, setNameVal] = useState(item.name);
  const [showDesc, setShowDesc] = useState(false);
  const [descVal, setDescVal] = useState(item.description ?? "");
  const [editDates, setEditDates] = useState(false);
  const [startDate, setStartDate] = useState(toDateStr(item.startDate));
  const [endDate, setEndDate] = useState(toDateStr(item.endDate));

  function saveName() {
    if (!nameVal.trim()) { setNameVal(item.name); setEditingName(false); return; }
    onUpdate(item.id, { name: nameVal.trim() });
    setEditingName(false);
  }

  function saveDesc() {
    onUpdate(item.id, { description: descVal.trim() || null });
    setShowDesc(false);
  }

  function saveDates() {
    onUpdate(item.id, { startDate: startDate || null, endDate: endDate || null });
    setEditDates(false);
  }

  if (item.isSection) {
    return (
      <div ref={setNodeRef} style={style} className="group flex items-center gap-2 py-1.5 pl-8 pr-3 mt-1">
        <button {...attributes} {...listeners} className="flex-shrink-0 cursor-grab text-muted-foreground/40 hover:text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
          <GripVertical size={14} />
        </button>
        <div className="flex-1 min-w-0">
          {editingName ? (
            <div className="flex items-center gap-1">
              <Input value={nameVal} onChange={(e) => setNameVal(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") saveName(); if (e.key === "Escape") { setNameVal(item.name); setEditingName(false); } }}
                className="h-6 text-sm font-semibold py-0 px-1.5" autoFocus />
              <button onClick={saveName} className="text-green-600"><Check size={14} /></button>
              <button onClick={() => { setNameVal(item.name); setEditingName(false); }} className="text-muted-foreground"><X size={14} /></button>
            </div>
          ) : (
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground cursor-pointer hover:text-foreground" onClick={() => setEditingName(true)}>
              {item.name}
            </span>
          )}
        </div>
        {!editingName && sectionDateRange && (sectionDateRange.startDate || sectionDateRange.endDate) && (
          <span className="flex-shrink-0">
            <DateBadge startDate={sectionDateRange.startDate} endDate={sectionDateRange.endDate} done={false} variant="plain" />
          </span>
        )}
        <div className="w-24 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onUpdate(item.id, { hidden: !item.hidden })} className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" title={item.hidden ? "Pokaż klientowi" : "Ukryj przed klientem"}>
            {item.hidden ? <EyeOff size={12} /> : <Eye size={12} />}
          </button>
          <button onClick={() => onDelete(item.id)} className="p-1 rounded text-muted-foreground hover:text-red-500 hover:bg-muted transition-colors" title="Usuń">
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div ref={setNodeRef} style={style} className={`group flex items-start gap-2 py-1.5 ${indented ? "pl-12" : "pl-8"} pr-3 rounded-lg transition-colors ${item.done ? "opacity-50" : ""} hover:bg-muted/40`}>
      <button {...attributes} {...listeners} className="mt-0.5 flex-shrink-0 cursor-grab text-muted-foreground/40 hover:text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
        <GripVertical size={14} />
      </button>

      {/* Done toggle */}
      <button
        onClick={() => onUpdate(item.id, { done: !item.done })}
        className={`mt-0.5 flex-shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
          item.done ? "bg-green-500 border-green-500 text-white" : "border-muted-foreground hover:border-primary"
        }`}
      >
        {item.done && <Check size={8} />}
      </button>

      <div className="flex-1 min-w-0">
        {editingName ? (
          <div className="flex items-center gap-1">
            <Input
              value={nameVal}
              onChange={(e) => setNameVal(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") saveName(); if (e.key === "Escape") { setNameVal(item.name); setEditingName(false); } }}
              className="h-6 text-sm py-0 px-1.5"
              autoFocus
            />
            <button onClick={saveName} className="text-green-600"><Check size={14} /></button>
            <button onClick={() => { setNameVal(item.name); setEditingName(false); }} className="text-muted-foreground"><X size={14} /></button>
          </div>
        ) : (
          <span
            className={`text-sm cursor-pointer hover:underline ${item.done ? "line-through text-muted-foreground" : ""}`}
            onClick={() => setEditingName(true)}
          >
            {item.name}
          </span>
        )}

        {/* Description */}
        {showDesc ? (
          <div className="mt-1 space-y-1">
            <textarea
              value={descVal}
              onChange={(e) => setDescVal(e.target.value)}
              placeholder="Opis działania..."
              rows={2}
              className="w-full text-xs px-2 py-1 border border-border rounded-md bg-background resize-none focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
            <div className="flex gap-1">
              <button onClick={saveDesc} className="text-xs text-green-600 hover:underline">Zapisz</button>
              <button onClick={() => { setDescVal(item.description ?? ""); setShowDesc(false); }} className="text-xs text-muted-foreground hover:underline">Anuluj</button>
            </div>
          </div>
        ) : item.description ? (
          <p className="text-xs text-muted-foreground mt-0.5 cursor-pointer hover:text-foreground" onClick={() => setShowDesc(true)}>
            {item.description}
          </p>
        ) : null}

        {/* Date edit inline */}
        {editDates && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <DatePicker value={startDate} onChange={setStartDate} placeholder="Data od" />
            <span className="text-xs text-muted-foreground">—</span>
            <DatePicker value={endDate} onChange={setEndDate} placeholder="Data do" />
            <button onClick={saveDates} className="text-xs text-green-600 hover:underline">Zapisz</button>
            <button onClick={() => { setStartDate(toDateStr(item.startDate)); setEndDate(toDateStr(item.endDate)); setEditDates(false); }} className="text-xs text-muted-foreground hover:underline">Anuluj</button>
          </div>
        )}

      </div>

      {/* Date badge — right-aligned, before actions */}
      {!editDates && (item.startDate || item.endDate) && (
        <span className="flex-shrink-0 cursor-pointer" onClick={() => setEditDates(true)}>
          <DateBadge startDate={item.startDate} endDate={item.endDate} done={item.done} />
        </span>
      )}

      {/* Actions */}
      <div className="w-24 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        {!editDates && !item.startDate && !item.endDate && (
          <button onClick={() => setEditDates(true)} className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" title="Ustaw daty">
            <Pencil size={12} />
          </button>
        )}
        {!showDesc && !item.description && (
          <button onClick={() => setShowDesc(true)} className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" title="Dodaj opis">
            <Plus size={12} />
          </button>
        )}
        <button
          onClick={() => onUpdate(item.id, { hidden: !item.hidden })}
          className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title={item.hidden ? "Pokaż klientowi" : "Ukryj przed klientem"}
        >
          {item.hidden ? <EyeOff size={12} /> : <Eye size={12} />}
        </button>
        <button onClick={() => onDelete(item.id)} className="p-1 rounded text-muted-foreground hover:text-red-500 hover:bg-muted transition-colors" title="Usuń">
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}

// ── Sortable phase row ─────────────────────────────────────────────────────

function SortablePhaseRow({
  phase,
  onUpdatePhase,
  onDeletePhase,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
}: {
  phase: SchedulePhase;
  onUpdatePhase: (id: string, data: Partial<SchedulePhase>) => void;
  onDeletePhase: (id: string) => void;
  onAddItem: (data: { phaseId: string; name: string; startDate: string | null; endDate: string | null; isSection?: boolean }) => void;
  onUpdateItem: (id: string, data: Partial<ScheduleItem>) => void;
  onDeleteItem: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: phase.id,
    data: { type: "phase" },
  });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };

  const [collapsed, setCollapsed] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemStartDate, setNewItemStartDate] = useState("");
  const [newItemEndDate, setNewItemEndDate] = useState("");
  const [addingItem, setAddingItem] = useState<"section" | "item" | false>(false);
  const [savingItem, setSavingItem] = useState(false);
  const newItemRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (addingItem) newItemRef.current?.focus();
  }, [addingItem]);

  function resetAddingItem() {
    setNewItemName(""); setNewItemStartDate(""); setNewItemEndDate(""); setAddingItem(false);
  }

  const itemIds = phase.items.map((i) => i.id);
  const doneCount = phase.items.filter((i) => i.done && !i.isSection).length;
  const totalCount = phase.items.filter((i) => !i.isSection).length;
  const sectionRanges = computeSectionRanges(phase.items);

  const indentedIds = new Set<string>();
  let underSection = false;
  for (const item of phase.items) {
    if (item.isSection) { underSection = true; }
    else if (underSection) { indentedIds.add(item.id); }
  }

  return (
    <div ref={setNodeRef} style={style} className={`border border-border rounded-xl overflow-hidden mb-3 ${phase.hidden ? "opacity-60" : ""}`}>
      {/* Section header — like PaymentsTab */}
      <div className="flex items-center gap-2 px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors">
        <button {...attributes} {...listeners} className="flex-shrink-0 cursor-grab text-muted-foreground/40 hover:text-muted-foreground">
          <GripVertical size={16} />
        </button>
        <button onClick={() => setCollapsed((v) => !v)} className="flex items-center gap-2 flex-1 text-left min-w-0">
          {collapsed ? <ChevronRight size={15} className="flex-shrink-0 text-muted-foreground" /> : <ChevronDown size={15} className="flex-shrink-0 text-muted-foreground" />}
          <span className="text-sm font-semibold truncate">{phase.rfProject?.title ?? phase.name}</span>
        </button>
        {phase.rfProject && (
          <span className="text-[11px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full flex-shrink-0">ProjectFlow</span>
        )}
        {totalCount > 0 && (
          <span className="text-[11px] text-muted-foreground flex-shrink-0">{doneCount}/{totalCount}</span>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onUpdatePhase(phase.id, { hidden: !phase.hidden }); }}
          title={phase.hidden ? "Pokaż klientowi" : "Ukryj przed klientem"}
          className="p-1 rounded text-muted-foreground hover:text-foreground flex-shrink-0 transition-colors"
        >
          {phase.hidden ? <EyeOff size={13} /> : <Eye size={13} />}
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDeletePhase(phase.id); }}
          className="p-1 rounded text-muted-foreground hover:text-destructive flex-shrink-0 transition-colors"
          title="Usuń harmonogram"
        >
          <Trash2 size={13} />
        </button>
      </div>

      {/* Items */}
      {!collapsed && (
        <div className="pb-1">
          <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
            {phase.items.map((item) => (
              <SortableItemRow
                key={item.id}
                item={item}
                onUpdate={onUpdateItem}
                onDelete={onDeleteItem}
                sectionDateRange={item.isSection ? sectionRanges.get(item.id) : undefined}
                indented={indentedIds.has(item.id)}
              />
            ))}
          </SortableContext>

          {/* Add item/section inline form */}
          {addingItem ? (
            <div className="flex flex-wrap items-center gap-2 py-1.5 pl-[3.25rem] pr-3">
              <Input
                ref={newItemRef}
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Escape") resetAddingItem(); }}
                placeholder={addingItem === "section" ? "Nazwa etapu..." : "Nazwa działania..."}
                className="h-7 text-sm min-w-[160px] flex-1"
              />
              {addingItem === "item" && (
                <>
                  <DatePicker value={newItemStartDate} onChange={setNewItemStartDate} placeholder="Data od" />
                  <span className="text-xs text-muted-foreground">—</span>
                  <DatePicker value={newItemEndDate} onChange={setNewItemEndDate} placeholder="Data do" />
                </>
              )}
              <button
                onClick={async () => {
                  if (!newItemName.trim()) return;
                  setSavingItem(true);
                  await onAddItem({
                    phaseId: phase.id,
                    name: newItemName.trim(),
                    startDate: addingItem === "item" ? (newItemStartDate || null) : null,
                    endDate: addingItem === "item" ? (newItemEndDate || null) : null,
                    isSection: addingItem === "section",
                  });
                  setSavingItem(false);
                  resetAddingItem();
                }}
                disabled={!newItemName.trim() || savingItem}
                className="flex-shrink-0 text-sm font-medium text-primary hover:underline disabled:opacity-40"
              >
                {savingItem ? <Loader2 size={13} className="animate-spin" /> : "Dodaj"}
              </button>
              <button onClick={resetAddingItem} className="flex-shrink-0 text-muted-foreground">
                <X size={14} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 pt-1 pb-2">
              <Button variant="outline" size="sm" className="gap-1 h-7 text-xs" onClick={() => setAddingItem("section")}>
                <Plus size={11} />Dodaj etap
              </Button>
              <Button variant="outline" size="sm" className="gap-1 h-7 text-xs" onClick={() => setAddingItem("item")}>
                <Plus size={11} />Dodaj działanie
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Export dialog ──────────────────────────────────────────────────────────

function ExportDialog({
  phases,
  onConfirm,
  onClose,
}: {
  phases: SchedulePhase[];
  onConfirm: (phaseId: string) => void;
  onClose: () => void;
}) {
  const [phaseId, setPhaseId] = useState(phases[0]?.id ?? "");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-semibold text-base">Eksport harmonogramu</h2>
        {phases.length === 0 ? (
          <p className="text-sm text-muted-foreground">Brak harmonogramów do eksportu.</p>
        ) : (
          <div className="space-y-2">
            <label className="text-sm font-medium">Harmonogram</label>
            <select
              value={phaseId}
              onChange={(e) => setPhaseId(e.target.value)}
              className="w-full text-sm px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary/30"
            >
              {phases.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" size="sm" onClick={onClose}>Anuluj</Button>
          <Button size="sm" disabled={!phaseId} onClick={() => onConfirm(phaseId)}>
            <Download size={13} className="mr-1.5" />
            Pobierz CSV
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── New schedule dialog ────────────────────────────────────────────────────

function NewScheduleDialog({
  rfProjects,
  onConfirm,
  onClose,
}: {
  rfProjects: RfProject[];
  onConfirm: (rfProjectId: string, projectTitle: string) => void;
  onClose: () => void;
}) {
  const [rfProjectId, setRfProjectId] = useState(rfProjects[0]?.id ?? "");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-semibold text-base">Nowy harmonogram</h2>

        {rfProjects.length === 0 ? (
          <p className="text-sm text-muted-foreground">Brak projektów powiązanych z tym klientem.</p>
        ) : (
          <div className="space-y-2">
            <label className="text-sm font-medium">Projekt</label>
            <select
              value={rfProjectId}
              onChange={(e) => setRfProjectId(e.target.value)}
              className="w-full text-sm px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary/30"
            >
              {rfProjects.map((p) => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" size="sm" onClick={onClose}>Anuluj</Button>
          <Button
            size="sm"
            disabled={!rfProjectId}
            onClick={() => {
              const project = rfProjects.find((p) => p.id === rfProjectId);
              if (project) onConfirm(project.id, project.title);
            }}
          >
            Utwórz
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export function ScheduleTab({ clientId, projectId, scheduleSharedWithClient: initialShared }: Props) {
  const [phases, setPhases] = useState<SchedulePhase[]>([]);
  const [rfProjects, setRfProjects] = useState<RfProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [shared, setShared] = useState(initialShared);
  const [sharingLoading, setSharingLoading] = useState(false);
  const [dndActiveId, setDndActiveId] = useState<string | null>(null);
  const [showNewScheduleDialog, setShowNewScheduleDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const load = useCallback(async () => {
    if (!clientId) { setLoading(false); return; }
    try {
      const [phasesRes, projectsRes] = await Promise.all([
        fetch(`/api/schedule/phases?clientId=${clientId}`),
        fetch(`/api/payments/associated-projects?clientId=${clientId}`),
      ]);
      if (phasesRes.ok) setPhases(await phasesRes.json());
      if (projectsRes.ok) setRfProjects(await projectsRes.json());
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  // ── Export CSV ─────────────────────────────────────────────────────────

  function handleExportCSV(phaseId: string) {
    const phase = phases.find((p) => p.id === phaseId);
    if (!phase) return;
    setShowExportDialog(false);
    const rows: string[][] = [["Etap", "Projekt RF", "Nazwa działania", "Opis", "Data od", "Data do", "Status"]];
    for (const item of phase.items) {
      rows.push([
        phase.name,
        phase.rfProject?.title ?? "",
        item.name,
        item.description ?? "",
        item.startDate ? item.startDate.slice(0, 10) : "",
        item.endDate ? item.endDate.slice(0, 10) : "",
        item.done ? "Ukończone" : "W toku",
      ]);
    }
    if (phase.items.length === 0) {
      rows.push([phase.name, phase.rfProject?.title ?? "", "", "", "", "", ""]);
    }
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `harmonogram-${phase.name.toLowerCase().replace(/\s+/g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Share toggle ───────────────────────────────────────────────────────

  async function handleToggleShare() {
    setSharingLoading(true);
    const res = await fetch(`/api/projects/${projectId}/schedule-share`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shared: !shared }),
    });
    setSharingLoading(false);
    if (!res.ok) { toast.error("Błąd zmiany udostępnienia"); return; }
    setShared(!shared);
    toast.success(shared ? "Harmonogram ukryty dla klientów" : "Harmonogram udostępniony klientom");
  }

  // ── Phase CRUD ─────────────────────────────────────────────────────────

  async function handleAddPhase(rfProjectId: string, projectTitle: string) {
    setShowNewScheduleDialog(false);
    const res = await fetch("/api/schedule/phases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId, name: projectTitle, rfProjectId: rfProjectId || undefined }),
    });
    if (!res.ok) { const err = await res.json().catch(() => ({})); toast.error((err as any).error || `Błąd tworzenia harmonogramu (${res.status})`); return; }
    const phase = await res.json();
    setPhases((prev) => [...prev, phase]);
  }

  async function handleUpdatePhase(id: string, data: Partial<SchedulePhase>) {
    setPhases((prev) => prev.map((p) => p.id === id ? { ...p, ...data } : p));
    const res = await fetch(`/api/schedule/phases/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) { toast.error("Błąd zapisu etapu"); load(); }
  }

  async function handleDeletePhase(id: string) {
    setPhases((prev) => prev.filter((p) => p.id !== id));
    const res = await fetch(`/api/schedule/phases/${id}`, { method: "DELETE" });
    if (!res.ok) { toast.error("Błąd usuwania etapu"); load(); }
  }


  // ── Item CRUD ──────────────────────────────────────────────────────────

  async function handleAddItem({ phaseId, name, startDate, endDate, isSection }: { phaseId: string; name: string; startDate: string | null; endDate: string | null; isSection?: boolean }) {
    const res = await fetch(`/api/schedule/phases/${phaseId}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, startDate: startDate || undefined, endDate: endDate || undefined, isSection: isSection ?? false }),
    });
    if (!res.ok) { toast.error("Błąd tworzenia działania"); return; }
    const item = await res.json();
    setPhases((prev) => prev.map((p) => p.id === phaseId ? { ...p, items: [...p.items, item] } : p));
  }

  async function handleUpdateItem(id: string, data: Partial<ScheduleItem>) {
    setPhases((prev) => prev.map((p) => ({
      ...p,
      items: p.items.map((i) => i.id === id ? { ...i, ...data } : i),
    })));
    const res = await fetch(`/api/schedule/items/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) { toast.error("Błąd zapisu działania"); load(); }
  }

  async function handleDeleteItem(id: string) {
    setPhases((prev) => prev.map((p) => ({ ...p, items: p.items.filter((i) => i.id !== id) })));
    const res = await fetch(`/api/schedule/items/${id}`, { method: "DELETE" });
    if (!res.ok) { toast.error("Błąd usuwania działania"); load(); }
  }

  // ── DnD ───────────────────────────────────────────────────────────────

  function handleDragStart(event: DragStartEvent) {
    setDndActiveId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setDndActiveId(null);
    if (!over || active.id === over.id) return;

    const activeType = active.data.current?.type as "phase" | "item";
    const overType = over.data.current?.type as "phase" | "item";

    if (activeType === "phase" && overType === "phase") {
      const oldIdx = phases.findIndex((p) => p.id === String(active.id));
      const newIdx = phases.findIndex((p) => p.id === String(over.id));
      const reordered = arrayMove(phases, oldIdx, newIdx).map((p, i) => ({ ...p, order: i }));
      setPhases(reordered);
      reordered.forEach((p) =>
        fetch(`/api/schedule/phases/${p.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order: p.order }),
        }).catch(() => {})
      );
    } else if (activeType === "item") {
      const activePhaseId = active.data.current?.phaseId as string;
      const overPhaseId = over.data.current?.phaseId as string | undefined;
      const targetPhaseId = overPhaseId ?? (overType === "phase" ? String(over.id) : null);

      if (!targetPhaseId) return;

      if (activePhaseId === targetPhaseId) {
        // reorder within same phase
        setPhases((prev) => prev.map((p) => {
          if (p.id !== activePhaseId) return p;
          const oldIdx = p.items.findIndex((i) => i.id === String(active.id));
          const newIdx = p.items.findIndex((i) => i.id === String(over.id));
          if (oldIdx === -1 || newIdx === -1) return p;
          const reordered = arrayMove(p.items, oldIdx, newIdx).map((item, idx) => ({ ...item, order: idx }));
          reordered.forEach((item) =>
            fetch(`/api/schedule/items/${item.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ order: item.order }),
            }).catch(() => {})
          );
          return { ...p, items: reordered };
        }));
      } else {
        // move item to different phase
        const itemToMove = phases.find((p) => p.id === activePhaseId)?.items.find((i) => i.id === String(active.id));
        if (!itemToMove) return;
        setPhases((prev) => prev.map((p) => {
          if (p.id === activePhaseId) return { ...p, items: p.items.filter((i) => i.id !== itemToMove.id) };
          if (p.id === targetPhaseId) return { ...p, items: [...p.items, { ...itemToMove, phaseId: targetPhaseId }] };
          return p;
        }));
        fetch(`/api/schedule/items/${itemToMove.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phaseId: targetPhaseId }),
        }).catch(() => toast.error("Błąd przenoszenia działania"));
      }
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
        <Loader2 size={18} className="animate-spin" />
        <span className="text-sm">Ładowanie harmonogramu...</span>
      </div>
    );
  }

  const phaseIds = phases.map((p) => p.id);
  const activePhase = dndActiveId ? phases.find((p) => p.id === dndActiveId) : null;

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Button onClick={() => setShowNewScheduleDialog(true)} size="sm" className="gap-1.5">
          <Plus size={13} />
          Dodaj harmonogram
        </Button>
        <div className="flex items-center gap-2">
        <div className="relative group/share">
          <button
            onClick={handleToggleShare}
            disabled={sharingLoading}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
              shared
                ? "bg-primary/10 border-primary/30 text-primary hover:bg-primary/20"
                : "border-border hover:bg-muted"
            }`}
          >
            <Users size={13} />
            {shared ? "Udostępniono klientowi" : "Udostępnij klientowi"}
          </button>
          <div className="absolute right-0 top-full mt-1.5 z-20 w-64 bg-popover border border-border rounded-lg px-3 py-2 text-xs text-muted-foreground shadow-md opacity-0 pointer-events-none group-hover/share:opacity-100 group-hover/share:pointer-events-auto transition-opacity">
            {shared
              ? "Klient widzi zakładkę \"Harmonogram\" w swoim panelu. Kliknij aby ukryć."
              : "Po kliknięciu klient zobaczy zakładkę \"Harmonogram\" w swoim panelu."}
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowExportDialog(true)} className="gap-1.5">
          <Download size={13} />
          Eksport CSV
        </Button>
        </div>
      </div>

      {showExportDialog && (
        <ExportDialog
          phases={phases}
          onConfirm={handleExportCSV}
          onClose={() => setShowExportDialog(false)}
        />
      )}

      {showNewScheduleDialog && (
        <NewScheduleDialog
          rfProjects={rfProjects}
          onConfirm={handleAddPhase}
          onClose={() => setShowNewScheduleDialog(false)}
        />
      )}

      {/* Phases */}
      <div className="overflow-x-auto">
      <div className="min-w-[520px]">
      {phases.length === 0 ? (
        <div className="bg-card border border-border border-dashed rounded-xl py-12 text-center">
          <p className="text-sm text-muted-foreground">Brak harmonogramów — kliknij „Dodaj harmonogram" aby rozpocząć</p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={phaseIds} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {phases.map((phase) => (
                <SortablePhaseRow
                  key={phase.id}
                  phase={phase}
                  onUpdatePhase={handleUpdatePhase}
                  onDeletePhase={handleDeletePhase}
                  onAddItem={handleAddItem}
                  onUpdateItem={handleUpdateItem}
                  onDeleteItem={handleDeleteItem}
                />
              ))}
            </div>
          </SortableContext>
          <DragOverlay>
            {activePhase && (
              <div className="bg-card border border-primary/40 rounded-xl px-3 py-2.5 shadow-lg opacity-90">
                <span className="font-semibold text-sm">{activePhase.name}</span>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}
      </div>
      </div>
    </div>
  );
}
