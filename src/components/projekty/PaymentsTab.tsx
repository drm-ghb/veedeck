"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ChevronDown, ChevronRight, Plus, Pencil, Trash2,
  Paperclip, Check, X, Download, Loader2, GripVertical, Users, Eye, EyeOff,
} from "@/components/ui/icons";
import { useUploadThing } from "@/lib/uploadthing-client";
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

// ── Upload button ────────────────────────────────────────────────────────────

function AttachmentUploadButton({ onUploaded }: { onUploaded: (url: string, name: string) => void }) {
  const [uploading, setUploading] = useState(false);
  const { startUpload } = useUploadThing("paymentAttachmentUploader");

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploading(true);
    try {
      const uploaded = await startUpload([f]);
      if (uploaded?.[0]) onUploaded(uploaded[0].ufsUrl, f.name);
    } catch {
      toast.error("Błąd przesyłania pliku");
    } finally {
      setUploading(false);
    }
  }

  return (
    <label className="cursor-pointer text-muted-foreground hover:text-foreground transition-colors opacity-0 group-hover:opacity-100">
      {uploading ? <Loader2 size={13} className="animate-spin" /> : <Paperclip size={13} />}
      <input type="file" className="hidden" accept="image/*,.pdf" onChange={handleChange} />
    </label>
  );
}

// ── Types ────────────────────────────────────────────────────────────────────

interface RfProject {
  id: string;
  title: string;
  paymentsSharedWithClient: boolean;
}

interface PaymentGroup {
  id: string;
  clientId: string;
  parentId: string | null;
  rfProjectId: string | null;
  hiddenFromClient: boolean;
  name: string;
  order: number;
}

interface Payment {
  id: string;
  clientId: string;
  groupId: string | null;
  rfProjectId: string | null;
  name: string;
  amount: number;
  status: "pending" | "paid";
  attachmentUrl: string | null;
  attachmentName: string | null;
  order: number;
}

interface Props {
  clientId: string;
  projectId?: string;
  paymentsSharedWithClient: boolean;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatPLN(amount: number) {
  return new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN" }).format(amount);
}

function buildTree(groups: PaymentGroup[], parentId: string | null): PaymentGroup[] {
  return groups.filter((g) => g.parentId === parentId).sort((a, b) => a.order - b.order);
}

function sumGroup(groupId: string, payments: Payment[], groups: PaymentGroup[]): number {
  const direct = payments.filter((p) => p.groupId === groupId).reduce((s, p) => s + p.amount, 0);
  const children = groups.filter((g) => g.parentId === groupId);
  return direct + children.reduce((s, g) => s + sumGroup(g.id, payments, groups), 0);
}

function isDescendant(ancestorId: string, targetId: string, groups: PaymentGroup[]): boolean {
  const children = groups.filter((g) => g.parentId === ancestorId);
  return children.some((g) => g.id === targetId || isDescendant(g.id, targetId, groups));
}

// ── Dialog: Eksport CSV ──────────────────────────────────────────────────────

function ExportPaymentsDialog({
  sections,
  onConfirm,
  onClose,
}: {
  sections: { key: string; label: string; rfProjectId: string | null }[];
  onConfirm: (key: string) => void;
  onClose: () => void;
}) {
  const [key, setKey] = useState(sections[0]?.key ?? "");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-semibold text-base">Eksport płatności</h2>
        {sections.length === 0 ? (
          <p className="text-sm text-muted-foreground">Brak danych do eksportu.</p>
        ) : (
          <div className="space-y-2">
            <label className="text-sm font-medium">Projekt</label>
            <select
              value={key}
              onChange={(e) => setKey(e.target.value)}
              className="w-full text-sm px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary/30"
            >
              {sections.map((s) => (
                <option key={s.key} value={s.key}>{s.label}</option>
              ))}
            </select>
          </div>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" size="sm" onClick={onClose}>Anuluj</Button>
          <Button size="sm" disabled={!key} onClick={() => onConfirm(key)}>
            <Download size={13} className="mr-1.5" />
            Pobierz CSV
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Dialog: Nowa płatność (projekt) ─────────────────────────────────────────

function NewPaymentProjectDialog({
  rfProjects,
  onConfirm,
  onClose,
}: {
  rfProjects: RfProject[];
  onConfirm: (rfProjectId: string, projectTitle: string) => Promise<void>;
  onClose: () => void;
}) {
  const [rfProjectId, setRfProjectId] = useState<string>(rfProjects[0]?.id ?? "");
  const [loading, setLoading] = useState(false);

  const selectedProject = rfProjects.find((p) => p.id === rfProjectId);

  async function handleSubmit() {
    if (!rfProjectId || !selectedProject) return;
    setLoading(true);
    await onConfirm(rfProjectId, selectedProject.title);
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-card border border-border rounded-2xl shadow-xl p-6 w-full max-w-md space-y-4 mx-4">
        <h2 className="font-semibold text-base">Nowa płatność</h2>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Projekt ProjectFlow</label>
          {rfProjects.length === 0 ? (
            <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
              Brak projektów powiązanych z tym klientem.
            </p>
          ) : (
            <select
              value={rfProjectId}
              onChange={(e) => setRfProjectId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              {rfProjects.map((p) => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
          )}
        </div>

        <div className="flex gap-2 pt-1">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-2 text-sm border border-border rounded-lg hover:bg-muted transition-colors"
          >
            Anuluj
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !rfProjectId}
            className="flex-1 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            {loading ? "Tworzenie..." : "Utwórz"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── GroupRow component ───────────────────────────────────────────────────────

interface GroupRowProps {
  group: PaymentGroup;
  depth: number;
  isDndActive: boolean;
  isEditing: boolean;
  editingName: string;
  isCollapsed: boolean;
  groupTotal: number;
  children?: React.ReactNode;
  addGroupForm?: React.ReactNode;
  addPaymentForm?: React.ReactNode;
  onToggleCollapse: () => void;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onEditNameChange: (v: string) => void;
  onDelete: () => void;
  onAddSubgroup: () => void;
  onAddPayment: () => void;
}

function GroupRow({
  group, depth, isDndActive, isEditing, editingName, isCollapsed, groupTotal,
  children, addGroupForm, addPaymentForm,
  onToggleCollapse, onStartEdit, onSaveEdit, onCancelEdit, onEditNameChange,
  onDelete, onAddSubgroup, onAddPayment,
}: GroupRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging, isOver } = useSortable({
    id: group.id,
    data: { type: "group", parentId: group.parentId },
  });

  const sortableStyle = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };
  const indent = depth * 16;
  const isDropTarget = isDndActive && isOver && !isDragging;

  return (
    <div ref={setNodeRef} style={sortableStyle} className="mb-1">
      <div
        className={`flex items-center gap-1.5 py-1.5 rounded-lg group cursor-pointer transition-colors ${
          isDropTarget ? "bg-primary/10 ring-1 ring-primary/30" : "hover:bg-muted/40"
        }`}
        style={{ paddingLeft: `${12 + indent}px`, paddingRight: "12px" }}
      >
        <div
          {...attributes}
          {...listeners}
          className="flex-shrink-0 text-muted-foreground/40 hover:text-muted-foreground cursor-grab active:cursor-grabbing touch-none"
        >
          <GripVertical size={14} />
        </div>

        <button onClick={onToggleCollapse} className="text-muted-foreground hover:text-foreground flex-shrink-0">
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
        </button>

        {isEditing ? (
          <>
            <Input
              autoFocus
              value={editingName}
              onChange={(e) => onEditNameChange(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") onSaveEdit(); if (e.key === "Escape") onCancelEdit(); }}
              className="h-6 text-sm flex-1 font-medium"
            />
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={onSaveEdit}><Check size={12} /></Button>
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={onCancelEdit}><X size={12} /></Button>
          </>
        ) : (
          <>
            <span className="flex-1 text-sm font-semibold" onClick={onToggleCollapse}>{group.name}</span>
            {isDropTarget && (
              <span className="text-xs text-primary font-medium flex-shrink-0 mr-1">Upuść tutaj</span>
            )}
            <span className="text-sm font-medium tabular-nums text-muted-foreground">{formatPLN(groupTotal)}</span>
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity ml-1">
              <button onClick={(e) => { e.stopPropagation(); onAddSubgroup(); }} className="p-1 rounded text-muted-foreground hover:text-foreground" title="Dodaj podgrupę"><Plus size={12} /></button>
              <button onClick={(e) => { e.stopPropagation(); onAddPayment(); }} className="p-1 rounded text-muted-foreground hover:text-foreground" title="Dodaj płatność"><Plus size={12} className="opacity-60" /></button>
              <button onClick={(e) => { e.stopPropagation(); onStartEdit(); }} className="p-1 rounded text-muted-foreground hover:text-foreground"><Pencil size={12} /></button>
              <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-1 rounded text-muted-foreground hover:text-destructive"><Trash2 size={12} /></button>
            </div>
          </>
        )}
      </div>

      {!isCollapsed && (
        <div>
          {children}
          {addPaymentForm}
          {addGroupForm}
        </div>
      )}
    </div>
  );
}

// ── PaymentRow component ─────────────────────────────────────────────────────

interface PaymentRowProps {
  payment: Payment;
  depth: number;
  isEditing: boolean;
  editingName: string;
  editingAmount: string;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onEditNameChange: (v: string) => void;
  onEditAmountChange: (v: string) => void;
  onToggleStatus: () => void;
  onDelete: () => void;
  onUploadComplete: (url: string, name: string) => void;
  onSaveAmountInline: (amount: string) => void;
}

function PaymentRow({
  payment, depth, isEditing, editingName, editingAmount,
  onStartEdit, onSaveEdit, onCancelEdit, onEditNameChange, onEditAmountChange,
  onToggleStatus, onDelete, onUploadComplete, onSaveAmountInline,
}: PaymentRowProps) {
  const [inlineAmountEdit, setInlineAmountEdit] = useState(false);
  const [inlineAmountValue, setInlineAmountValue] = useState("");
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: payment.id,
    data: { type: "payment", groupId: payment.groupId },
  });

  const sortableStyle = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };
  const indent = depth * 16;

  return (
    <div
      ref={setNodeRef}
      style={{ ...sortableStyle, paddingLeft: `${12 + indent}px` }}
      className="flex items-center gap-2 py-1.5 pr-3 rounded-lg hover:bg-muted/40 group"
      data-edit-row
    >
      <div
        {...attributes}
        {...listeners}
        className="flex-shrink-0 text-muted-foreground/40 hover:text-muted-foreground cursor-grab active:cursor-grabbing touch-none"
      >
        <GripVertical size={14} />
      </div>

      <button
        onClick={onToggleStatus}
        title={payment.status === "paid" ? "Oznacz jako nieopłacone" : "Oznacz jako opłacone"}
        className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
          payment.status === "paid"
            ? "bg-green-500 border-green-500 text-white"
            : "border-muted-foreground hover:border-green-500"
        }`}
      >
        {payment.status === "paid" && <Check size={10} />}
      </button>

      {isEditing ? (
        <>
          <Input
            autoFocus
            value={editingName}
            onChange={(e) => onEditNameChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") onSaveEdit(); if (e.key === "Escape") onCancelEdit(); }}
            onBlur={(e) => { if (!(e.relatedTarget instanceof HTMLElement) || !e.currentTarget.closest("[data-edit-row]")?.contains(e.relatedTarget)) onSaveEdit(); }}
            className="h-6 text-sm flex-1"
            data-edit-input
          />
          <Input
            value={editingAmount}
            onChange={(e) => onEditAmountChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") onSaveEdit(); if (e.key === "Escape") onCancelEdit(); }}
            onBlur={(e) => { if (!(e.relatedTarget instanceof HTMLElement) || !e.currentTarget.closest("[data-edit-row]")?.contains(e.relatedTarget)) onSaveEdit(); }}
            className="h-6 text-sm w-28"
            data-edit-input
          />
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={onSaveEdit} data-edit-input><Check size={12} /></Button>
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={onCancelEdit} data-edit-input><X size={12} /></Button>
        </>
      ) : (
        <>
          <span
            className={`flex-1 text-sm cursor-pointer hover:text-primary transition-colors ${payment.status === "paid" ? "line-through text-muted-foreground" : ""}`}
            onClick={onStartEdit}
          >
            {payment.name}
          </span>
          {inlineAmountEdit ? (
            <Input
              autoFocus
              value={inlineAmountValue}
              onChange={(e) => setInlineAmountValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { onSaveAmountInline(inlineAmountValue); setInlineAmountEdit(false); }
                if (e.key === "Escape") setInlineAmountEdit(false);
              }}
              onBlur={() => { onSaveAmountInline(inlineAmountValue); setInlineAmountEdit(false); }}
              className="h-6 text-sm w-28 tabular-nums"
            />
          ) : (
            <span
              className={`text-sm font-medium tabular-nums cursor-default ${payment.status === "paid" ? "text-muted-foreground" : ""}`}
              onClick={() => { setInlineAmountValue(String(payment.amount)); setInlineAmountEdit(true); }}
            >
              {formatPLN(payment.amount)}
            </span>
          )}
          <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${
            payment.status === "paid"
              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
          }`}>
            {payment.status === "paid" ? "Opłacone" : "Do opłacenia"}
          </span>
          <div className="flex-shrink-0">
            {payment.attachmentUrl ? (
              <a href={payment.attachmentUrl} target="_blank" rel="noopener noreferrer" title={payment.attachmentName ?? "Załącznik"} className="text-muted-foreground hover:text-foreground transition-colors">
                <Paperclip size={13} />
              </a>
            ) : (
              <AttachmentUploadButton onUploaded={onUploadComplete} />
            )}
          </div>
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={onStartEdit} className="p-1 rounded text-muted-foreground hover:text-foreground"><Pencil size={12} /></button>
            <button onClick={onDelete} className="p-1 rounded text-muted-foreground hover:text-destructive"><Trash2 size={12} /></button>
          </div>
        </>
      )}
    </div>
  );
}

// ── ProjectSection — zwijalna sekcja per projekt ──────────────────────────────

function ProjectSection({
  label,
  rfProjectId,
  isCollapsed,
  isHidden,
  shared,
  sharingLoading,
  onToggle,
  onDelete,
  onToggleHidden,
  onToggleShare,
  children,
}: {
  label: string;
  rfProjectId: string | null;
  isCollapsed: boolean;
  isHidden?: boolean;
  shared?: boolean;
  sharingLoading?: boolean;
  onToggle: () => void;
  onDelete?: () => void;
  onToggleHidden?: () => void;
  onToggleShare?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className={`border border-border rounded-xl overflow-hidden mb-3 ${isHidden ? "opacity-60" : ""}`}>
      <div className="flex items-center gap-2 px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors">
        <button onClick={onToggle} className="flex items-center gap-2 flex-1 text-left min-w-0">
          {isCollapsed ? <ChevronRight size={15} className="flex-shrink-0 text-muted-foreground" /> : <ChevronDown size={15} className="flex-shrink-0 text-muted-foreground" />}
          <span className="text-sm font-semibold truncate">{label}</span>
        </button>
        {rfProjectId && (
          <span className="text-[11px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full flex-shrink-0">ProjectFlow</span>
        )}
        {onToggleShare && (
          <button
            onClick={(e) => { e.stopPropagation(); onToggleShare(); }}
            disabled={sharingLoading}
            title={shared ? "Ukryj płatności przed klientem" : "Udostępnij płatności klientowi"}
            className={`flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-md border transition-colors flex-shrink-0 ${
              shared
                ? "bg-primary/10 border-primary/30 text-primary hover:bg-primary/20"
                : "border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            <Users size={11} />
            {shared ? "Udostępniono" : "Udostępnij"}
          </button>
        )}
        {onToggleHidden && (
          <button
            onClick={(e) => { e.stopPropagation(); onToggleHidden(); }}
            title={isHidden ? "Pokaż klientowi" : "Ukryj przed klientem"}
            className="p-1 rounded text-muted-foreground hover:text-foreground flex-shrink-0 transition-colors"
          >
            {isHidden ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        )}
        {onDelete && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            title="Usuń sekcję"
            className="p-1 rounded text-muted-foreground hover:text-destructive flex-shrink-0 transition-colors"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
      {!isCollapsed && (
        <div className="p-2">
          {children}
        </div>
      )}
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export function PaymentsTab({ clientId, projectId, paymentsSharedWithClient: initialShared }: Props) {
  const [groups, setGroups] = useState<PaymentGroup[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [rfProjects, setRfProjects] = useState<RfProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [sectionCollapsed, setSectionCollapsed] = useState<Record<string, boolean>>({});
  const [sharedByProject, setSharedByProject] = useState<Record<string, boolean>>(() =>
    initialShared && projectId ? { [projectId]: initialShared } : {}
  );
  const [sharingAll, setSharingAll] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);


  const [showNewPaymentDialog, setShowNewPaymentDialog] = useState(false);

  const [addingGroup, setAddingGroup] = useState<string | null>(null);
  const [newGroupName, setNewGroupName] = useState("");

  const [addingPayment, setAddingPayment] = useState<string | null>(null);
  const [newPaymentName, setNewPaymentName] = useState("");
  const [newPaymentAmount, setNewPaymentAmount] = useState("");

  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingGroupName, setEditingGroupName] = useState("");
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [editingPaymentName, setEditingPaymentName] = useState("");
  const [editingPaymentAmount, setEditingPaymentAmount] = useState("");

  // DnD
  const [dndActiveId, setDndActiveId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  // ── Load ────────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    if (!clientId) { setLoading(false); return; }
    try {
      const [dataRes, projectsRes] = await Promise.all([
        fetch(`/api/payments?clientId=${clientId}`),
        fetch(`/api/payments/associated-projects?clientId=${clientId}`),
      ]);
      if (dataRes.ok) {
        const data = await dataRes.json();
        setGroups(data.groups);
        setPayments(data.payments);
      }
      if (projectsRes.ok) {
        const projects: RfProject[] = await projectsRes.json();
        setRfProjects(projects);
        setSharedByProject((prev) => {
          const map = { ...prev };
          for (const p of projects) map[p.id] = p.paymentsSharedWithClient;
          return map;
        });
      }
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  // ── Computed ────────────────────────────────────────────────────────────────

  const paidAmount = payments.filter((p) => p.status === "paid").reduce((sum, p) => sum + p.amount, 0);
  const totalPaymentsAmount = payments.reduce((sum, p) => sum + p.amount, 0);
  const remaining = totalPaymentsAmount - paidAmount;

  // Group top-level groups by rfProjectId
  const topLevelGroups = groups.filter((g) => g.parentId === null);

  // Collect unique rfProjectIds from top-level groups AND ungrouped payments
  const groupRfProjectIds = topLevelGroups.map((g) => g.rfProjectId);
  const paymentRfProjectIds = payments.filter((p) => p.rfProjectId && p.groupId === null).map((p) => p.rfProjectId!);
  const rfProjectIds = Array.from(new Set([...groupRfProjectIds, ...paymentRfProjectIds]));

  // Sections: one per rfProject + one for "unassigned"
  const sections: { key: string; label: string; rfProjectId: string | null; topGroups: PaymentGroup[] }[] = [];

  for (const rfProjId of rfProjectIds) {
    if (rfProjId === null) continue;
    const rfProject = rfProjects.find((p) => p.id === rfProjId);
    const label = rfProject?.title ?? "Nieznany projekt";
    sections.push({
      key: rfProjId,
      label,
      rfProjectId: rfProjId,
      topGroups: topLevelGroups.filter((g) => g.rfProjectId === rfProjId).sort((a, b) => a.order - b.order),
    });
  }

  // Unassigned top-level groups
  const unassignedGroups = topLevelGroups.filter((g) => g.rfProjectId === null).sort((a, b) => a.order - b.order);
  // Only truly unassigned payments (no group AND no rfProject)
  const ungroupedPayments = payments.filter((p) => p.groupId === null && !p.rfProjectId).sort((a, b) => a.order - b.order);

  const hasUnassigned = unassignedGroups.length > 0 || ungroupedPayments.length > 0 || addingGroup === "root" || addingPayment === "root";

  // ── Handlers ────────────────────────────────────────────────────────────────

  async function handleCreatePaymentProject(rfProjectId: string, projectTitle: string) {
    const res = await fetch("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId, groupId: null, rfProjectId, name: projectTitle, amount: 0 }),
    });
    if (!res.ok) { toast.error("Błąd tworzenia płatności"); return; }
    const newPayment = await res.json();
    setPayments((prev) => [...prev, newPayment]);
    setShowNewPaymentDialog(false);
    setSectionCollapsed((c) => ({ ...c, [rfProjectId]: false }));
  }

  async function handleDeleteSection(rfProjectId: string) {
    const sectionGroups = groups.filter((g) => g.rfProjectId === rfProjectId && g.parentId === null);
    const sectionPayments = payments.filter((p) => p.rfProjectId === rfProjectId && p.groupId === null);
    if (!confirm(`Usunąć całą sekcję płatności z tym projektem i wszystkie jej elementy?`)) return;
    for (const g of sectionGroups) {
      await fetch(`/api/payment-groups/${g.id}`, { method: "DELETE" });
    }
    for (const p of sectionPayments) {
      await fetch(`/api/payments/${p.id}`, { method: "DELETE" });
    }
    load();
  }

  async function handleToggleSectionHidden(rfProjectId: string) {
    const sectionGroups = groups.filter((g) => g.rfProjectId === rfProjectId && g.parentId === null);
    const isHidden = sectionGroups.every((g) => g.hiddenFromClient);
    for (const g of sectionGroups) {
      await fetch(`/api/payment-groups/${g.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hiddenFromClient: !isHidden }),
      });
    }
    setGroups((prev) => prev.map((g) =>
      g.rfProjectId === rfProjectId && g.parentId === null
        ? { ...g, hiddenFromClient: !isHidden }
        : g
    ));
  }

  async function handleAddGroup(parentId: string | null, rfProjectId?: string | null) {
    if (!newGroupName.trim()) return;
    const res = await fetch("/api/payment-groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId, parentId, name: newGroupName.trim(), rfProjectId: rfProjectId ?? null }),
    });
    if (!res.ok) { toast.error("Błąd dodawania grupy"); return; }
    const newGroup = await res.json();
    setGroups((prev) => [...prev, newGroup]);
    setNewGroupName("");
    setAddingGroup(null);
  }

  async function handleAddPayment(groupId: string | null, rfProjectId?: string | null) {
    if (!newPaymentName.trim()) return;
    const res = await fetch("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId, groupId,
        rfProjectId: rfProjectId ?? null,
        name: newPaymentName.trim(),
        amount: newPaymentAmount.trim() ? parseFloat(newPaymentAmount.replace(",", ".")) : 0,
      }),
    });
    if (!res.ok) { toast.error("Błąd dodawania płatności"); return; }
    const newPayment = await res.json();
    setPayments((prev) => [...prev, newPayment]);
    setNewPaymentName("");
    setNewPaymentAmount("");
    setAddingPayment(null);
  }

  async function handleDeleteGroup(id: string) {
    const res = await fetch(`/api/payment-groups/${id}`, { method: "DELETE" });
    if (!res.ok) { toast.error("Błąd usuwania grupy"); return; }
    load();
  }

  async function handleDeletePayment(id: string) {
    const res = await fetch(`/api/payments/${id}`, { method: "DELETE" });
    if (!res.ok) { toast.error("Błąd usuwania płatności"); return; }
    setPayments((prev) => prev.filter((p) => p.id !== id));
  }

  async function handleToggleStatus(payment: Payment) {
    const newStatus = payment.status === "paid" ? "pending" : "paid";
    setPayments((prev) => prev.map((p) => p.id === payment.id ? { ...p, status: newStatus } : p));
    const res = await fetch(`/api/payments/${payment.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (!res.ok) {
      setPayments((prev) => prev.map((p) => p.id === payment.id ? { ...p, status: payment.status } : p));
      toast.error("Błąd zmiany statusu");
    }
  }

  async function handleSaveGroup(id: string) {
    if (!editingGroupName.trim()) return;
    const res = await fetch(`/api/payment-groups/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editingGroupName.trim() }),
    });
    if (!res.ok) { toast.error("Błąd zapisu grupy"); return; }
    setGroups((prev) => prev.map((g) => g.id === id ? { ...g, name: editingGroupName.trim() } : g));
    setEditingGroupId(null);
  }

  async function handleSavePayment(id: string) {
    if (!editingPaymentName.trim() || !editingPaymentAmount) return;
    const amount = parseFloat(editingPaymentAmount.replace(",", "."));
    const res = await fetch(`/api/payments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editingPaymentName.trim(), amount }),
    });
    if (!res.ok) { toast.error("Błąd zapisu płatności"); return; }
    setPayments((prev) => prev.map((p) => p.id === id ? { ...p, name: editingPaymentName.trim(), amount } : p));
    setEditingPaymentId(null);
  }

  async function handleUploadComplete(paymentId: string, url: string, name: string) {
    const res = await fetch(`/api/payments/${paymentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ attachmentUrl: url, attachmentName: name }),
    });
    if (!res.ok) { toast.error("Błąd zapisu załącznika"); return; }
    setPayments((prev) => prev.map((p) => p.id === paymentId ? { ...p, attachmentUrl: url, attachmentName: name } : p));
  }

  async function handleToggleShareAll() {
    const rfProjectIds = sections.map((s) => s.rfProjectId).filter(Boolean) as string[];
    if (rfProjectIds.length === 0) return;
    const newShared = !allShared;
    setSharingAll(true);
    for (const rfProjectId of rfProjectIds) {
      await fetch(`/api/projects/${rfProjectId}/payments-share`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shared: newShared }),
      });
    }
    setSharingAll(false);
    setSharedByProject((prev) => {
      const map = { ...prev };
      for (const id of rfProjectIds) map[id] = newShared;
      return map;
    });
    toast.success(newShared ? "Płatności udostępnione klientowi" : "Płatności ukryte dla klienta");
  }

  function handleExportCSV(sectionKey: string, sectionLabel: string, sectionRfProjectId: string | null) {
    setShowExportDialog(false);
    const sectionPayments = sectionRfProjectId === null
      ? payments.filter((p) => !p.rfProjectId)
      : payments.filter((p) => p.rfProjectId === sectionRfProjectId);
    const rows = [["Nazwa", "Kwota (PLN)", "Status", "Grupa"]];
    for (const p of sectionPayments) {
      const group = groups.find((g) => g.id === p.groupId);
      rows.push([p.name, p.amount.toString(), p.status === "paid" ? "Opłacone" : "Do opłacenia", group?.name ?? ""]);
    }
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `platnosci-${sectionLabel.toLowerCase().replace(/\s+/g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Drag & drop ─────────────────────────────────────────────────────────────

  function handleDragStart(event: DragStartEvent) {
    setDndActiveId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setDndActiveId(null);
    if (!over || active.id === over.id) return;

    const activeId = String(active.id);
    const overId = String(over.id);
    const activeType = active.data.current?.type as "group" | "payment";
    const overType = over.data.current?.type as "group" | "payment";

    if (activeType === "payment") {
      if (overType === "group") {
        const payment = payments.find((p) => p.id === activeId);
        if (!payment || payment.groupId === overId) return;
        setPayments((prev) => prev.map((p) => p.id === activeId ? { ...p, groupId: overId } : p));
        fetch(`/api/payments/${activeId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ groupId: overId }),
        }).catch(() => toast.error("Błąd przenoszenia płatności"));
      } else {
        const activePayment = payments.find((p) => p.id === activeId);
        const overPayment = payments.find((p) => p.id === overId);
        if (!activePayment || !overPayment) return;

        if (activePayment.groupId === overPayment.groupId) {
          const siblings = payments.filter((p) => p.groupId === activePayment.groupId).sort((a, b) => a.order - b.order);
          const reordered = arrayMove(siblings, siblings.findIndex((p) => p.id === activeId), siblings.findIndex((p) => p.id === overId)).map((p, i) => ({ ...p, order: i }));
          setPayments((prev) => [...prev.filter((p) => p.groupId !== activePayment.groupId), ...reordered]);
          reordered.forEach((p) => fetch(`/api/payments/${p.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ order: p.order }) }).catch(() => {}));
        } else {
          setPayments((prev) => prev.map((p) => p.id === activeId ? { ...p, groupId: overPayment.groupId } : p));
          fetch(`/api/payments/${activeId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ groupId: overPayment.groupId }) }).catch(() => toast.error("Błąd przenoszenia płatności"));
        }
      }
    } else if (activeType === "group") {
      if (overType === "group") {
        const activeGroup = groups.find((g) => g.id === activeId);
        const overGroup = groups.find((g) => g.id === overId);
        if (!activeGroup || !overGroup) return;

        if (activeGroup.parentId === overGroup.parentId) {
          const siblings = groups.filter((g) => g.parentId === activeGroup.parentId).sort((a, b) => a.order - b.order);
          const reordered = arrayMove(siblings, siblings.findIndex((g) => g.id === activeId), siblings.findIndex((g) => g.id === overId)).map((g, i) => ({ ...g, order: i }));
          setGroups((prev) => [...prev.filter((g) => g.parentId !== activeGroup.parentId), ...reordered]);
          reordered.forEach((g) => fetch(`/api/payment-groups/${g.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ order: g.order }) }).catch(() => {}));
        } else {
          if (isDescendant(activeId, overId, groups)) return;
          setGroups((prev) => prev.map((g) => g.id === activeId ? { ...g, parentId: overId } : g));
          fetch(`/api/payment-groups/${activeId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ parentId: overId }) }).catch(() => toast.error("Błąd przenoszenia grupy"));
        }
      }
    }
  }

  // ── Render helpers ───────────────────────────────────────────────────────────

  function renderAddGroupForm(parentId: string | null, rfProjectId?: string | null, sectionKey?: string) {
    const key = parentId ?? sectionKey ?? "root";
    if (addingGroup !== key) return null;
    return (
      <div className="flex items-center gap-2 mt-2 ml-4">
        <Input autoFocus placeholder="Nazwa grupy" value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleAddGroup(parentId, rfProjectId); if (e.key === "Escape") { setAddingGroup(null); setNewGroupName(""); } }}
          className="h-7 text-sm" />
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleAddGroup(parentId, rfProjectId)}><Check size={14} /></Button>
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setAddingGroup(null); setNewGroupName(""); }}><X size={14} /></Button>
      </div>
    );
  }

  function renderAddPaymentForm(groupId: string | null, sectionKey?: string, rfProjectId?: string | null) {
    const key = groupId ?? sectionKey ?? "root";
    if (addingPayment !== key) return null;
    return (
      <div className="flex items-center gap-2 mt-2 ml-4">
        <Input autoFocus placeholder="Nazwa płatności" value={newPaymentName} onChange={(e) => setNewPaymentName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleAddPayment(groupId, rfProjectId); if (e.key === "Escape") { setAddingPayment(null); setNewPaymentName(""); setNewPaymentAmount(""); } }}
          className="h-7 text-sm flex-1" />
        <Input placeholder="Kwota" value={newPaymentAmount} onChange={(e) => setNewPaymentAmount(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleAddPayment(groupId, rfProjectId); }} className="h-7 text-sm w-28" />
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleAddPayment(groupId, rfProjectId)}><Check size={14} /></Button>
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setAddingPayment(null); setNewPaymentName(""); setNewPaymentAmount(""); }}><X size={14} /></Button>
      </div>
    );
  }

  function renderGroup(group: PaymentGroup, depth: number): React.ReactNode {
    const groupPayments = payments.filter((p) => p.groupId === group.id).sort((a, b) => a.order - b.order);
    const childGroups = buildTree(groups, group.id);
    const childIds = [...groupPayments.map((p) => p.id), ...childGroups.map((g) => g.id)];

    return (
      <GroupRow
        key={group.id}
        group={group}
        depth={depth}
        isDndActive={!!dndActiveId}
        isEditing={editingGroupId === group.id}
        editingName={editingGroupName}
        isCollapsed={!!collapsed[group.id]}
        groupTotal={sumGroup(group.id, payments, groups)}
        addGroupForm={renderAddGroupForm(group.id)}
        addPaymentForm={renderAddPaymentForm(group.id)}
        onToggleCollapse={() => setCollapsed((c) => ({ ...c, [group.id]: !c[group.id] }))}
        onStartEdit={() => { setEditingGroupId(group.id); setEditingGroupName(group.name); }}
        onSaveEdit={() => handleSaveGroup(group.id)}
        onCancelEdit={() => setEditingGroupId(null)}
        onEditNameChange={setEditingGroupName}
        onDelete={() => handleDeleteGroup(group.id)}
        onAddSubgroup={() => setAddingGroup(group.id)}
        onAddPayment={() => setAddingPayment(group.id)}
      >
        <SortableContext items={childIds} strategy={verticalListSortingStrategy}>
          {groupPayments.map((p) => renderPaymentItem(p, depth + 1))}
          {childGroups.map((child) => renderGroup(child, depth + 1))}
        </SortableContext>
      </GroupRow>
    );
  }

  function renderPaymentItem(payment: Payment, depth: number): React.ReactNode {
    return (
      <PaymentRow
        key={payment.id}
        payment={payment}
        depth={depth}
        isEditing={editingPaymentId === payment.id}
        editingName={editingPaymentName}
        editingAmount={editingPaymentAmount}
        onStartEdit={() => { setEditingPaymentId(payment.id); setEditingPaymentName(payment.name); setEditingPaymentAmount(String(payment.amount)); }}
        onSaveEdit={() => handleSavePayment(payment.id)}
        onCancelEdit={() => setEditingPaymentId(null)}
        onEditNameChange={setEditingPaymentName}
        onEditAmountChange={setEditingPaymentAmount}
        onToggleStatus={() => handleToggleStatus(payment)}
        onDelete={() => handleDeletePayment(payment.id)}
        onUploadComplete={(url, name) => handleUploadComplete(payment.id, url, name)}
        onSaveAmountInline={async (val) => {
          const amount = parseFloat(val.replace(",", "."));
          if (isNaN(amount)) return;
          setPayments((prev) => prev.map((p) => p.id === payment.id ? { ...p, amount } : p));
          fetch(`/api/payments/${payment.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount }) }).catch(() => toast.error("Błąd zapisu kwoty"));
        }}
      />
    );
  }

  function renderDragGhost() {
    if (!dndActiveId) return null;
    const payment = payments.find((p) => p.id === dndActiveId);
    if (payment) return (
      <div className="flex items-center gap-2 py-1.5 px-3 rounded-lg bg-card border border-primary/40 shadow-lg opacity-95">
        <GripVertical size={14} className="text-muted-foreground flex-shrink-0" />
        <span className="text-sm font-medium flex-1">{payment.name}</span>
        <span className="text-sm font-medium tabular-nums">{formatPLN(payment.amount)}</span>
      </div>
    );
    const group = groups.find((g) => g.id === dndActiveId);
    if (group) return (
      <div className="flex items-center gap-2 py-1.5 px-3 rounded-lg bg-card border border-primary/40 shadow-lg opacity-95">
        <GripVertical size={14} className="text-muted-foreground flex-shrink-0" />
        <span className="text-sm font-semibold">{group.name}</span>
      </div>
    );
    return null;
  }

  function renderSectionContent(topGroups: PaymentGroup[], rfProjectId: string | null) {
    const sectionUngrouped = rfProjectId
      ? payments.filter((p) => p.groupId === null && p.rfProjectId === rfProjectId).sort((a, b) => a.order - b.order)
      : [];
    const allIds = [...topGroups.map((g) => g.id), ...sectionUngrouped.map((p) => p.id)];
    return (
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <SortableContext items={allIds} strategy={verticalListSortingStrategy}>
          <div className="divide-y divide-border/30">
            {topGroups.map((g) => renderGroup(g, 0))}
            {sectionUngrouped.map((p) => renderPaymentItem(p, 0))}
          </div>
          {renderAddGroupForm(null, rfProjectId, rfProjectId ?? "none")}
          {renderAddPaymentForm(null, rfProjectId ?? "none", rfProjectId)}
        </SortableContext>
        <DragOverlay dropAnimation={null}>{renderDragGhost()}</DragOverlay>
      </DndContext>
    );
  }

  // ── Early returns ────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const hasAnyContent = sections.length > 0 || hasUnassigned;
  const allShared = sections.length > 0 && sections.every((s) => s.rfProjectId ? (sharedByProject[s.rfProjectId] ?? false) : false);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-end gap-2 flex-wrap">
        {sections.length > 0 && (
          <button
            onClick={handleToggleShareAll}
            disabled={sharingAll}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${
              allShared
                ? "bg-primary/10 border-primary/30 text-primary hover:bg-primary/20"
                : "border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            <Users size={14} />
            {allShared ? "Udostępniono klientowi" : "Udostępnij klientowi"}
          </button>
        )}
        <Button variant="outline" size="sm" onClick={() => setShowExportDialog(true)} className="gap-1.5">
          <Download size={13} />
          Eksport CSV
        </Button>
        <Button onClick={() => setShowNewPaymentDialog(true)} size="sm" className="gap-1.5">
          <Plus size={13} />
          Nowa płatność
        </Button>
      </div>

      {showExportDialog && (() => {
        const exportSections = [
          ...sections.map((s) => ({ key: s.key, label: s.label, rfProjectId: s.rfProjectId })),
          ...(hasUnassigned ? [{ key: "unassigned", label: "Nieprzypisane", rfProjectId: null }] : []),
        ];
        return (
          <ExportPaymentsDialog
            sections={exportSections}
            onConfirm={(key) => {
              const s = exportSections.find((x) => x.key === key)!;
              handleExportCSV(s.key, s.label, s.rfProjectId);
            }}
            onClose={() => setShowExportDialog(false)}
          />
        );
      })()}

      {/* Sections per project */}
      {hasAnyContent ? (
        <>
          {sections.map((section) => (
            <ProjectSection
              key={section.key}
              label={section.label}
              rfProjectId={section.rfProjectId}
              isCollapsed={!!sectionCollapsed[section.key]}
              isHidden={section.topGroups.length > 0 && section.topGroups.every((g) => g.hiddenFromClient)}
              onToggle={() => setSectionCollapsed((c) => ({ ...c, [section.key]: !c[section.key] }))}
              onDelete={() => handleDeleteSection(section.rfProjectId!)}
              onToggleHidden={() => handleToggleSectionHidden(section.rfProjectId!)}
            >
              {renderSectionContent(section.topGroups, section.rfProjectId)}
              {/* Sub-actions */}
              {!sectionCollapsed[section.key] && (
                <div className="flex items-center gap-2 mt-2 px-2">
                  <Button variant="outline" size="sm" className="gap-1 h-7 text-xs" onClick={() => { setAddingGroup(section.rfProjectId ?? "none"); setNewGroupName(""); }}>
                    <Plus size={11} />Dodaj grupę
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1 h-7 text-xs" onClick={() => { setAddingPayment(section.rfProjectId ?? "none"); setNewPaymentName(""); setNewPaymentAmount(""); }}>
                    <Plus size={11} />Dodaj płatność
                  </Button>
                </div>
              )}
            </ProjectSection>
          ))}

          {/* Unassigned section */}
          {hasUnassigned && (
            <ProjectSection
              key="unassigned"
              label="Nieprzypisane"
              rfProjectId={null}
              isCollapsed={!!sectionCollapsed["unassigned"]}
              onToggle={() => setSectionCollapsed((c) => ({ ...c, unassigned: !c["unassigned"] }))}
            >
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                <SortableContext items={[...unassignedGroups.map((g) => g.id), ...ungroupedPayments.map((p) => p.id)]} strategy={verticalListSortingStrategy}>
                  <div className="divide-y divide-border/30">
                    {unassignedGroups.map((g) => renderGroup(g, 0))}
                    {ungroupedPayments.map((p) => renderPaymentItem(p, 0))}
                  </div>
                  {renderAddGroupForm(null, null, "unassigned")}
                  {renderAddPaymentForm(null, "unassigned")}
                </SortableContext>
                <DragOverlay dropAnimation={null}>{renderDragGhost()}</DragOverlay>
              </DndContext>
              {!sectionCollapsed["unassigned"] && (
                <div className="flex items-center gap-2 mt-2 px-2">
                  <Button variant="outline" size="sm" className="gap-1 h-7 text-xs" onClick={() => { setAddingGroup("unassigned"); setNewGroupName(""); }}>
                    <Plus size={11} />Dodaj grupę
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1 h-7 text-xs" onClick={() => { setAddingPayment("unassigned"); setNewPaymentName(""); setNewPaymentAmount(""); }}>
                    <Plus size={11} />Dodaj płatność
                  </Button>
                </div>
              )}
            </ProjectSection>
          )}
        </>
      ) : (
        <div className="text-center py-12 text-sm text-muted-foreground border border-border border-dashed rounded-xl">
          Brak płatności. Kliknij &quot;Nowa płatność&quot; aby dodać.
        </div>
      )}

      {/* Footer */}
      {payments.length > 0 && (
        <div className="flex items-center justify-between pt-3 border-t border-border">
          <span className="text-sm text-muted-foreground">Łącznie do opłacenia:</span>
          <span className={`text-sm font-bold tabular-nums ${remaining <= 0 ? "text-green-600 dark:text-green-400" : "text-foreground"}`}>
            {formatPLN(Math.max(0, remaining))}
          </span>
        </div>
      )}

      {/* Dialog */}
      {showNewPaymentDialog && (
        <NewPaymentProjectDialog
          rfProjects={rfProjects}
          onConfirm={handleCreatePaymentProject}
          onClose={() => setShowNewPaymentDialog(false)}
        />
      )}
    </div>
  );
}
