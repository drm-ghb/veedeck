"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronDown, ChevronUp, Plus, ExternalLink, Minus, MoreHorizontal, Pencil, Trash2, GripVertical, FileDown, Sheet, ArrowDownUp, Eye, EyeOff, Check, X, RotateCcw, FolderInput, Wallet, AlertCircle, AlertTriangle, DollarSign, Copy, Comment } from "@/components/ui/icons";
import ProductCommentPanel from "./ProductCommentPanel";
import ListSectionNav from "./ListSectionNav";
import { pusherClient } from "@/lib/pusher";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import AddProductDialog from "./AddProductDialog";
import EditProductDialog from "./EditProductDialog";
import ShareDialog from "@/components/dashboard/ShareDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

import { getUnreadSet, syncListUnread } from "@/lib/list-unread-store";
import { generateListPDF, type PdfTemplate } from "@/lib/pdf-templates";
import { useLang, useT } from "@/lib/i18n";

const BUILT_IN_CATEGORIES = [
  { value: "OSWIETLENIE", label: "Oświetlenie" },
  { value: "AKCESORIA", label: "Akcesoria" },
  { value: "MEBLE", label: "Meble" },
  { value: "ARMATURA", label: "Armatura" },
  { value: "OKLADZINY_SCIENNE", label: "Okładziny ścienne" },
  { value: "PODLOGA", label: "Podłoga" },
];


function getCategoryLabel(value: string | null | undefined, allCategories: { value: string; label: string }[] = BUILT_IN_CATEGORIES): string {
  if (!value) return "";
  return allCategories.find((c) => c.value === value)?.label ?? value;
}

/** Formats a price number: shows 2 decimal places only when the number has a decimal part. */
function formatPriceNum(n: number): string {
  const hasDec = n % 1 !== 0;
  return n.toLocaleString("pl-PL", { minimumFractionDigits: hasDec ? 2 : 0, maximumFractionDigits: 2 });
}

interface Product {
  id: string;
  name: string;
  url: string | null;
  imageUrl: string | null;
  price: string | null;
  manufacturer: string | null;
  color: string | null;
  dimensions: string | null;
  description: string | null;
  deliveryTime: string | null;
  quantity: number;
  order: number;
  hidden: boolean;
  category: string | null;
  approval: string | null;
  productId: string | null;
  supplier: string | null;
  catalogNumber: string | null;
  note: string | null;
  createdAt?: string;
  commentCount?: number;
}


interface Section {
  id: string;
  name: string;
  order: number;
  sortBy: string;
  budget: number | null;
  unsorted?: boolean;
  products: Product[];
}

interface ListDetailProps {
  list: {
    id: string;
    name: string;
    shareToken: string;
    budget: number | null;
    hidePrices: boolean;
    project: {
      id: string;
      title: string;
      hiddenModules: string[];
      clientName: string | null;
      clientHasAccount: boolean;
      addressStreet: string | null;
      addressCity: string | null;
      addressPostalCode: string | null;
      addressCountry: string | null;
    } | null;
    sections: Section[];
  };
  categoryOrder: string[];
  customCategories: string[];
  pdfTemplate?: PdfTemplate;
}

function getSortBy(sortBy: string | null | undefined): string {
  return sortBy || "manual";
}

function parsePrice(price: string | null): number | null {
  if (!price) return null;
  const num = parseFloat(price.replace(/[^\d.,]/g, "").replace(",", "."));
  return isNaN(num) ? null : num;
}

function normalizeCurrency(cur: string): string {
  const c = cur.trim().toUpperCase();
  if (!c || c === "PLN" || c === "ZŁ" || c === "ZL") return "zł";
  if (c === "USD" || c === "$") return "DOL";
  return cur.trim();
}

function getCurrency(price: string | null): string {
  if (!price) return "";
  return normalizeCurrency(price.replace(/[\d.,\s]/g, "").trim());
}

function SectionTotal({ products, budget }: { products: Product[]; budget?: number | null }) {
  let total = 0;
  let currency = "";
  let hasAny = false;

  for (const p of products.filter((p) => !p.hidden)) {
    const n = parsePrice(p.price);
    if (n !== null) {
      total += n * p.quantity;
      if (!currency) currency = getCurrency(p.price);
      hasAny = true;
    }
  }

  if (!hasAny) return null;

  const pct = budget != null && budget > 0 ? Math.round((total / budget) * 100) : null;

  return (
    <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
      {formatPriceNum(total)} {currency}
      {pct !== null && (
        <span className={`text-xs font-medium tabular-nums ${total > budget! ? "text-red-500" : pct >= 80 ? "text-amber-500" : "text-green-600 dark:text-green-400"}`}>
          ({pct}%)
        </span>
      )}
    </span>
  );
}


function MoveSectionDialog({ open, onOpenChange, sections, currentSectionId, productName, onMove }: {
  open: boolean; onOpenChange: (v: boolean) => void; sections: Section[];
  currentSectionId: string; productName: string; onMove: (targetSectionId: string) => void;
}) {
  const t = useT();
  const targets = sections.filter((s) => s.id !== currentSectionId);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t.listy.moveProduct}</DialogTitle>
          <DialogDescription className="truncate">„{productName}"</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-1 mt-2">
          {targets.map((s) => (
            <button key={s.id} onClick={() => { onMove(s.id); onOpenChange(false); }}
              className="w-full text-left px-4 py-3 rounded-lg hover:bg-muted transition-colors text-sm font-medium">
              {s.name}
            </button>
          ))}
          {targets.length === 0 && <p className="text-sm text-muted-foreground px-4 py-3">{t.listy.noOtherSections}</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CopySectionDialog({ open, onOpenChange, sections, currentSectionId, productName, onCopy }: {
  open: boolean; onOpenChange: (v: boolean) => void; sections: Section[];
  currentSectionId: string; productName: string; onCopy: (targetSectionId: string) => void;
}) {
  const t = useT();
  const targets = sections.filter((s) => s.id !== currentSectionId);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t.listy.copyToSection}</DialogTitle>
          <DialogDescription className="truncate">„{productName}"</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-1 mt-2">
          {targets.map((s) => (
            <button key={s.id} onClick={() => { onCopy(s.id); onOpenChange(false); }}
              className="w-full text-left px-4 py-3 rounded-lg hover:bg-muted transition-colors text-sm font-medium">
              {s.name}
            </button>
          ))}
          {targets.length === 0 && <p className="text-sm text-muted-foreground px-4 py-3">{t.listy.noOtherSections}</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ProductRow({
  product,
  index,
  last,
  listId,
  sectionId,
  onQuantityChange,
  onEdit,
  onDelete,
  onOpenComments,
  onToggleHidden,
  onMove,
  onCopy,
  onOpenMoveDialog,
  onOpenCopyDialog,
  onApprovalChange,
  onFieldUpdate,
  approval,
  commentCount,
  unreadCount,
  unread,
  deleting,
  dragHandle,
  allCategories,
  sections,
}: {
  product: Product;
  index: number;
  last: boolean;
  listId: string;
  sectionId: string;
  onQuantityChange: (productId: string, qty: number) => void;
  onEdit: () => void;
  onDelete: () => void;
  onOpenComments: () => void;
  onToggleHidden: () => void;
  onMove: (targetSectionId: string) => void;
  onCopy: (targetSectionId: string) => void;
  onOpenMoveDialog: () => void;
  onOpenCopyDialog: () => void;
  onApprovalChange: (value: string | null) => void;
  onFieldUpdate: (productId: string, field: string, value: string | null) => void;
  sections: Section[];
  approval: string | null;
  commentCount: number;
  unreadCount: number;
  unread: boolean;
  deleting?: boolean;
  dragHandle?: React.ReactNode;
  allCategories: { value: string; label: string }[];
}) {
  const [qty, setQty] = useState(product.quantity);
  const [saving, setSaving] = useState(false);
  const [lightbox, setLightbox] = useState(false);
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
  const [categoryMenuPos, setCategoryMenuPos] = useState({ top: 0, left: 0 });
  const [copyMenuOpen, setCopyMenuOpen] = useState(false);
  const [copyMenuPos, setCopyMenuPos] = useState({ top: 0, left: 0 });
  const [moveMenuOpen, setMoveMenuOpen] = useState(false);
  const [moveMenuPos, setMoveMenuPos] = useState({ top: 0, left: 0 });
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const t = useT();
  const [collapsed, setCollapsed] = useState(false);
  const isCollapsed = collapsed && product.hidden;

  async function updateQty(next: number) {
    if (next < 1 || saving) return;
    setSaving(true);
    try {
      await fetch(`/api/lists/${listId}/sections/${sectionId}/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: next }),
      });
      setQty(next);
      onQuantityChange(product.id, next);
    } catch {
      toast.error(t.listy.qtyUpdateError);
    } finally {
      setSaving(false);
    }
  }

  function startFieldEdit(field: string, value: string | null) {
    setEditingField(field);
    setEditingValue(value ?? "");
  }

  async function saveFieldEdit() {
    if (editingField === null) return;
    const value = editingValue.trim() || null;
    setEditingField(null);
    onFieldUpdate(product.id, editingField, value);
  }

  const unitPrice = parsePrice(product.price);
  const currency = getCurrency(product.price);
  const totalPrice = unitPrice !== null ? unitPrice * qty : null;

  const dropdown = (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            disabled={deleting}
            className="w-7 h-7 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-40"
          />
        }
      >
        <MoreHorizontal size={15} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem onClick={onEdit}>
          <Pencil size={13} className="mr-2" />
          {t.common.edit}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {approval !== "accepted" && (
          <DropdownMenuItem onClick={() => onApprovalChange("accepted")}>
            <Check size={13} className="mr-2 text-green-600" />
            {t.render.acceptBtn}
          </DropdownMenuItem>
        )}
        {approval !== "rejected" && (
          <DropdownMenuItem onClick={() => onApprovalChange("rejected")}>
            <X size={13} className="mr-2 text-red-500" />
            {t.listy.rejectBtn}
          </DropdownMenuItem>
        )}
        {approval !== null && (
          <DropdownMenuItem onClick={() => onApprovalChange(null)}>
            <RotateCcw size={13} className="mr-2" />
            {t.listy.resetStatus}
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onToggleHidden}>
          {product.hidden ? <Eye size={13} className="mr-2" /> : <EyeOff size={13} className="mr-2" />}
          {product.hidden ? t.render.showToClient : t.render.hideFromClient}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onOpenMoveDialog}>
          <FolderInput size={13} className="mr-2" />
          {t.listy.moveToSection}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onOpenCopyDialog}>
          <Copy size={13} className="mr-2" />
          {t.listy.copyToSection}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
          <Trash2 size={13} className="mr-2" />
          {t.render.deleteProduct}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const image = (
    <div
      className={`w-full h-full shrink-0 rounded-xl bg-white flex items-center justify-center overflow-hidden ${product.imageUrl ? "cursor-zoom-in" : ""}`}
      onClick={() => product.imageUrl && setLightbox(true)}
    >
      {product.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={product.imageUrl} alt={product.name} className="w-full h-full object-contain" />
      ) : (
        <span className="text-3xl text-muted-foreground/30 select-none">📦</span>
      )}
    </div>
  );

  const lightboxEl = lightbox && product.imageUrl && (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={() => setLightbox(false)}
    >
      <button
        className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
        onClick={() => setLightbox(false)}
      >
        <X size={18} />
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={product.imageUrl}
        alt={product.name}
        className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
        style={{ maxWidth: "90vw", maxHeight: "90vh" }}
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );

  const sectionTargets = sections.filter((s) => s.id !== sectionId && !s.unsorted);

  const movePortal = moveMenuOpen ? createPortal(
    <>
      <div className="fixed inset-0 z-[200]" onClick={() => setMoveMenuOpen(false)} />
      <div className="fixed z-[201] bg-popover border border-border rounded-lg shadow-lg py-1 min-w-[180px]" style={{ top: moveMenuPos.top, left: moveMenuPos.left }}>
        <p className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{t.listy.moveToSection}</p>
        {sectionTargets.map((s) => (
          <button
            key={s.id}
            onClick={() => { onMove(s.id); setMoveMenuOpen(false); }}
            className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted transition-colors text-foreground"
          >
            {s.name}
          </button>
        ))}
        {sectionTargets.length === 0 && (
          <p className="px-3 py-1.5 text-xs text-muted-foreground">{t.listy.noOtherSections}</p>
        )}
      </div>
    </>,
    document.body
  ) : null;

  const copyTargets = sectionTargets;
  const copyPortal = copyMenuOpen ? createPortal(
    <>
      <div className="fixed inset-0 z-[200]" onClick={() => setCopyMenuOpen(false)} />
      <div className="fixed z-[201] bg-popover border border-border rounded-lg shadow-lg py-1 min-w-[180px]" style={{ top: copyMenuPos.top, left: copyMenuPos.left }}>
        <p className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{t.listy.copyToSection}</p>
        {copyTargets.map((s) => (
          <button
            key={s.id}
            onClick={() => { onCopy(s.id); setCopyMenuOpen(false); }}
            className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted transition-colors text-foreground"
          >
            {s.name}
          </button>
        ))}
        {copyTargets.length === 0 && (
          <p className="px-3 py-1.5 text-xs text-muted-foreground">{t.listy.noOtherSections}</p>
        )}
      </div>
    </>,
    document.body
  ) : null;

  const categoryPortal = categoryMenuOpen ? createPortal(
    <>
      <div className="fixed inset-0 z-[200]" onClick={() => setCategoryMenuOpen(false)} />
      <div className="fixed z-[201] bg-popover border border-border rounded-lg shadow-lg py-1 min-w-[160px]" style={{ top: categoryMenuPos.top, left: categoryMenuPos.left }}>
        <button
          onClick={() => { onFieldUpdate(product.id, "category", null); setCategoryMenuOpen(false); }}
          className={`w-full text-left px-3 py-1.5 text-xs hover:bg-muted transition-colors ${!product.category ? "text-primary font-medium" : "text-muted-foreground"}`}
        >
          {t.products.noCategory}
        </button>
        {allCategories.map((cat) => (
          <button
            key={cat.value}
            onClick={() => { onFieldUpdate(product.id, "category", cat.value); setCategoryMenuOpen(false); }}
            className={`w-full text-left px-3 py-1.5 text-xs hover:bg-muted transition-colors flex items-center gap-2 ${product.category === cat.value ? "text-primary font-medium" : "text-foreground"}`}
          >
            {product.category === cat.value && <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
            {product.category !== cat.value && <span className="w-1.5 h-1.5 shrink-0" />}
            {cat.label}
          </button>
        ))}
      </div>
    </>,
    document.body
  ) : null;

  return (
    <div className={`hover:bg-muted/30 transition-colors ${!last ? "border-b border-border" : ""} ${product.hidden ? "opacity-40" : ""}`}>
      {lightboxEl}
      {movePortal}
      {copyPortal}
      {categoryPortal}

      {/* ── DESKTOP layout (md+) — original ── */}
      <div className="hidden md:flex items-center gap-2 px-4 py-4">
        <div className="opacity-100 flex flex-col items-center gap-1 self-stretch justify-center shrink-0">
          {product.hidden && (
            <button onClick={() => setCollapsed((c) => !c)} className="w-4 h-5 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors" title={isCollapsed ? t.listy.expand : t.listy.collapse}>
              {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
            </button>
          )}
          {dragHandle ?? <span className="w-4 shrink-0" />}
        </div>
        <div className={`flex flex-col justify-between shrink-0 opacity-100 ${isCollapsed ? "self-center" : "h-32"}`}>
          <button onClick={onToggleHidden} className="w-5 h-5 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors" title={product.hidden ? t.render.showToClient : t.render.hideFromClient}>
            {product.hidden ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
          {!isCollapsed && (
            <>
              <button onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); setCopyMenuPos({ top: r.top, left: r.right + 6 }); setCopyMenuOpen(true); }} className="w-5 h-5 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors" title={t.listy.copyToSection}>
                <Copy size={14} />
              </button>
              <button onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); setMoveMenuPos({ top: r.top, left: r.right + 6 }); setMoveMenuOpen(true); }} className="w-5 h-5 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors" title={t.listy.moveToSection}>
                <FolderInput size={14} />
              </button>
            </>
          )}
        </div>
        {isCollapsed ? (
          <div className="flex-1 min-w-0 flex items-center gap-2">
            {product.url ? (
              <a href={product.url} target="_blank" rel="noopener noreferrer" className="font-medium text-sm text-foreground hover:text-primary hover:underline truncate transition-colors">
                {product.name}
              </a>
            ) : (
              <p className="font-medium text-sm text-foreground truncate">{product.name}</p>
            )}
            {product.category && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/8 text-primary dark:bg-primary/20 shrink-0">
                {getCategoryLabel(product.category, allCategories)}
              </span>
            )}
          </div>
        ) : (
          <>
        <div className="w-32 h-32">{image}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {product.url ? (
              <a href={product.url} target="_blank" rel="noopener noreferrer" className="font-medium text-sm text-foreground hover:text-primary hover:underline truncate transition-colors">
                {product.name}
              </a>
            ) : (
              <p className="font-medium text-sm text-foreground truncate">{product.name}</p>
            )}
            {/* Inline category badge */}
            <button
              onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); const estH = (allCategories.length + 1) * 28 + 8; const top = (window.innerHeight - r.bottom) >= estH + 8 ? r.bottom + 4 : Math.max(4, r.top - estH - 4); setCategoryMenuPos({ top, left: r.left }); setCategoryMenuOpen((v) => !v); }}
              className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors shrink-0 ${product.category ? "bg-primary/8 text-primary dark:bg-primary/20 hover:bg-primary/15" : "border border-dashed border-border text-muted-foreground hover:border-primary/40 hover:text-primary"}`}
              title={t.listy.changeCategoryTitle}
            >
              {product.category ? getCategoryLabel(product.category, allCategories) : t.listy.addCategory}
            </button>
          </div>
          {/* 2-column attribute grid */}
          <div className="grid grid-cols-2 gap-x-4 mt-1">
            {(["manufacturer", "supplier", "color", "deliveryTime", "dimensions", "catalogNumber"] as const).map((field) => {
              const labels: Record<string, string> = { manufacturer: t.listy.fieldManufacturer, supplier: t.listy.fieldSupplier, color: t.listy.fieldColor, dimensions: t.listy.fieldDimensions, deliveryTime: t.listy.fieldDelivery, catalogNumber: t.listy.fieldCatalogNumber };
              const val = product[field] as string | null;
              if (editingField === field) {
                return (
                  <div key={field} className="flex items-center gap-1 py-0.5">
                    <span className="text-xs text-muted-foreground shrink-0">{labels[field]}:</span>
                    <input
                      autoFocus
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      onBlur={saveFieldEdit}
                      onKeyDown={(e) => { if (e.key === "Enter") saveFieldEdit(); if (e.key === "Escape") setEditingField(null); }}
                      className="text-xs bg-transparent border-b border-primary/40 focus:outline-none focus:border-primary px-0 min-w-0 flex-1"
                    />
                  </div>
                );
              }
              if (!val) {
                return (
                  <button
                    key={`add-${field}`}
                    onClick={() => startFieldEdit(field, null)}
                    className="text-left text-xs text-muted-foreground/30 hover:text-muted-foreground transition-colors py-0.5"
                    title={`Dodaj ${labels[field].toLowerCase()}`}
                  >
                    + {labels[field]}
                  </button>
                );
              }
              return (
                <div key={field} className="group/field flex items-center gap-1 py-0.5 min-w-0">
                  <p className="text-xs text-muted-foreground truncate">{labels[field]}: {val}</p>
                  <button
                    onClick={() => startFieldEdit(field, val)}
                    className="opacity-0 group-hover/field:opacity-100 transition-opacity text-muted-foreground hover:text-foreground shrink-0"
                    title={`Edytuj ${labels[field].toLowerCase()}`}
                  >
                    <Pencil size={10} />
                  </button>
                </div>
              );
            })}
          </div>
          {/* Note field */}
          {editingField === "note" ? (
            <div className="flex items-start gap-1 mt-1">
              <span className="text-xs text-muted-foreground shrink-0 mt-0.5">{t.listy.noteLabel}</span>
              <textarea
                autoFocus
                value={editingValue}
                onChange={(e) => setEditingValue(e.target.value)}
                onBlur={saveFieldEdit}
                onKeyDown={(e) => { if (e.key === "Enter" && e.ctrlKey) saveFieldEdit(); if (e.key === "Escape") setEditingField(null); }}
                rows={2}
                className="text-xs bg-transparent border border-primary/40 rounded px-1 focus:outline-none focus:border-primary min-w-0 flex-1 resize-none"
              />
            </div>
          ) : product.note ? (
            <div className="group/note flex items-start gap-1 mt-1">
              <p className="text-xs text-muted-foreground italic">📝 {product.note}</p>
              <button
                onClick={() => startFieldEdit("note", product.note)}
                className="opacity-0 group-hover/note:opacity-100 transition-opacity text-muted-foreground hover:text-foreground shrink-0"
                title={t.listy.noteLabel}
              >
                <Pencil size={10} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => startFieldEdit("note", null)}
              className="text-xs text-muted-foreground/30 hover:text-muted-foreground transition-colors mt-1 block"
            >
              {t.listy.addNote}
            </button>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {approval === "accepted" && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 shrink-0">{t.listy.accepted}</span>}
          {approval === "rejected" && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 shrink-0">{t.listy.rejected}</span>}
          <div className="flex items-center gap-1">
            <button onClick={() => updateQty(qty - 1)} disabled={qty <= 1 || saving} className="w-6 h-6 rounded flex items-center justify-center border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 disabled:opacity-30 transition-colors"><Minus size={11} /></button>
            <span className="w-6 text-center text-sm font-medium tabular-nums">{qty}</span>
            <button onClick={() => updateQty(qty + 1)} disabled={saving} className="w-6 h-6 rounded flex items-center justify-center border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 disabled:opacity-30 transition-colors"><Plus size={11} /></button>
          </div>
          <div className="text-right min-w-[72px]">
            {editingField === "price" ? (
              <input
                autoFocus
                value={editingValue}
                onChange={(e) => setEditingValue(e.target.value)}
                onBlur={saveFieldEdit}
                onKeyDown={(e) => { if (e.key === "Enter") saveFieldEdit(); if (e.key === "Escape") setEditingField(null); }}
                className="text-sm text-right bg-transparent border-b border-primary/40 focus:outline-none focus:border-primary px-0 w-full"
              />
            ) : totalPrice !== null ? (
              <>
                <div className="flex items-center justify-end gap-1">
                  <button
                    onClick={() => startFieldEdit("price", product.price)}
                    className="text-sm font-semibold text-foreground tabular-nums hover:text-primary transition-colors"
                    title={t.listy.editPriceTitle}
                  >
                    {formatPriceNum(totalPrice)} {currency}
                  </button>
                  {product.productId && (
                    <div className="relative group">
                      <AlertCircle size={15} className="text-red-500 cursor-default shrink-0" />
                      <div className="absolute bottom-full right-0 mb-1.5 px-2 py-1 bg-popover text-popover-foreground text-xs rounded shadow-md whitespace-nowrap border border-border opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                        {t.listy.checkPriceWarning}
                      </div>
                    </div>
                  )}
                </div>
                {qty > 1 && unitPrice !== null && <p className="text-xs text-muted-foreground tabular-nums">{formatPriceNum(unitPrice)} / szt.</p>}
              </>
            ) : (
              <button
                onClick={() => startFieldEdit("price", null)}
                className="text-xs text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                title={t.listy.addPriceTitle}
              >
                {t.listy.addPriceBtn}
              </button>
            )}
          </div>
          {product.url ? (
            <a href={product.url} target="_blank" rel="noopener noreferrer" className="w-7 h-7 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" title={t.listy.openProductTitle}><ExternalLink size={14} /></a>
          ) : <span className="w-7" />}
          <button onClick={onOpenComments} className="relative flex items-center justify-center w-7 h-7 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" title="Komentarze">
            <Comment size={15} className={`transition-colors ${unread ? "text-blue-500" : ""}`} />
            {commentCount > 0 && <span className={`absolute -top-1 -right-1 min-w-[14px] h-[14px] rounded-full text-white text-[9px] font-bold flex items-center justify-center px-0.5 leading-none transition-colors ${unread ? "bg-primary" : "bg-muted-foreground/40"}`}>{(unread ? unreadCount : commentCount) > 99 ? "99+" : (unread ? unreadCount : commentCount)}</span>}
          </button>
          {dropdown}
        </div>
          </>
        )}
      </div>

      {/* ── MOBILE layout (< md) — compact ── */}
      <div className="md:hidden flex items-start gap-2 px-3 py-2.5">
        <div className="w-20 h-20 shrink-0 rounded-lg overflow-hidden bg-white flex items-center justify-center">
          {product.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-contain cursor-pointer" onClick={() => product.imageUrl && setLightbox(true)} />
          ) : (
            <span className="text-xl text-muted-foreground/30">📦</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          {/* Row 1: name + menu */}
          <div className="flex items-start justify-between gap-1">
            <div className="min-w-0 flex-1">
              {product.url ? (
                <a href={product.url} target="_blank" rel="noopener noreferrer" className="font-medium text-sm text-foreground hover:text-primary hover:underline leading-tight truncate block transition-colors">
                  {product.name}
                </a>
              ) : (
                <p className="font-medium text-sm text-foreground leading-tight truncate">{product.name}</p>
              )}
              {product.manufacturer && <p className="text-xs text-muted-foreground truncate">{t.listy.fieldManufacturer}: {product.manufacturer}</p>}
              {product.supplier && <p className="text-xs text-muted-foreground truncate">{t.listy.fieldSupplier}: {product.supplier}</p>}
              {product.color && <p className="text-xs text-muted-foreground truncate">{t.listy.fieldColor}: {product.color}</p>}
              {product.deliveryTime && <p className="text-xs text-muted-foreground truncate">{t.listy.fieldDelivery}: {product.deliveryTime}</p>}
              {product.dimensions && <p className="text-xs text-muted-foreground truncate">{t.listy.fieldDimensions}: {product.dimensions}</p>}
              {product.catalogNumber && <p className="text-xs text-muted-foreground truncate">{t.listy.fieldCatalogNumber}: {product.catalogNumber}</p>}
              {editingField === "note" ? (
                <textarea
                  autoFocus
                  value={editingValue}
                  onChange={(e) => setEditingValue(e.target.value)}
                  onBlur={saveFieldEdit}
                  onKeyDown={(e) => { if (e.key === "Enter" && e.ctrlKey) saveFieldEdit(); if (e.key === "Escape") setEditingField(null); }}
                  rows={2}
                  placeholder={t.listy.notePlaceholder}
                  className="text-xs bg-transparent border border-primary/40 rounded px-1 focus:outline-none focus:border-primary w-full resize-none mt-0.5"
                />
              ) : (
                product.note && <p className="text-xs text-muted-foreground italic truncate">📝 {product.note}</p>
              )}
            </div>
            <div className="shrink-0 -mt-0.5">{dropdown}</div>
          </div>
          {/* Row 2: price + category + approval */}
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            {editingField === "price" ? (
              <input
                autoFocus
                value={editingValue}
                onChange={(e) => setEditingValue(e.target.value)}
                onBlur={saveFieldEdit}
                onKeyDown={(e) => { if (e.key === "Enter") saveFieldEdit(); if (e.key === "Escape") setEditingField(null); }}
                className="text-sm bg-transparent border-b border-primary/40 focus:outline-none focus:border-primary px-0 w-24"
              />
            ) : totalPrice !== null ? (
              <span className="inline-flex items-center gap-1">
                <button
                  onClick={() => startFieldEdit("price", product.price)}
                  className="text-sm font-semibold text-foreground tabular-nums hover:text-primary transition-colors"
                  title={t.listy.editPriceTitle}
                >
                  {formatPriceNum(totalPrice)} {currency}
                </button>
                {product.productId && (
                  <div className="relative group">
                    <AlertCircle size={14} className="text-red-500 cursor-default shrink-0" />
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 bg-popover text-popover-foreground text-xs rounded shadow-md whitespace-nowrap border border-border opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                      {t.listy.checkPriceWarning}
                    </div>
                  </div>
                )}
              </span>
            ) : (
              <button
                onClick={() => startFieldEdit("price", null)}
                className="text-xs text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                title={t.listy.addPriceTitle}
              >
                {t.listy.addPriceBtn}
              </button>
            )}
            <button
              onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); const estH = (allCategories.length + 1) * 28 + 8; const top = (window.innerHeight - r.bottom) >= estH + 8 ? r.bottom + 4 : Math.max(4, r.top - estH - 4); setCategoryMenuPos({ top, left: r.left }); setCategoryMenuOpen((v) => !v); }}
              className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors shrink-0 ${product.category ? "bg-primary/8 text-primary dark:bg-primary/20" : "border border-dashed border-border text-muted-foreground"}`}
            >
              {product.category ? getCategoryLabel(product.category, allCategories) : t.listy.addCategoryShort}
            </button>
            {approval === "accepted" && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">{t.listy.accepted}</span>}
            {approval === "rejected" && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">{t.listy.rejected}</span>}
          </div>
          {/* Row 3: qty + link + comments */}
          <div className="flex items-center justify-between mt-1.5">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-0.5">
                <button onClick={() => updateQty(qty - 1)} disabled={qty <= 1 || saving} className="w-6 h-6 rounded flex items-center justify-center border border-border text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"><Minus size={10} /></button>
                <span className="w-6 text-center text-xs font-medium tabular-nums">{qty}</span>
                <button onClick={() => updateQty(qty + 1)} disabled={saving} className="w-6 h-6 rounded flex items-center justify-center border border-border text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"><Plus size={10} /></button>
              </div>
              {product.url && (
                <a href={product.url} target="_blank" rel="noopener noreferrer" className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                  <ExternalLink size={13} />
                </a>
              )}
            </div>
            <button onClick={onOpenComments} className="relative flex items-center justify-center w-7 h-7 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              <Comment size={14} className={`transition-colors ${unread ? "text-blue-500" : ""}`} />
              {commentCount > 0 && <span className={`absolute -top-1 -right-1 min-w-[14px] h-[14px] rounded-full text-white text-[9px] font-bold flex items-center justify-center px-0.5 leading-none ${unread ? "bg-primary" : "bg-muted-foreground/40"}`}>{(unread ? unreadCount : commentCount) > 99 ? "99+" : (unread ? unreadCount : commentCount)}</span>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SortableProduct({ id, sectionId, children }: { id: string; sectionId: string; children: (dragHandle: React.ReactNode) => React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, data: { type: "product", sectionId } });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0 : 1,
  };
  const dragHandle = (
    <button
      {...attributes}
      {...listeners}
      className="cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground transition-colors p-1 touch-none shrink-0"
      tabIndex={-1}
    >
      <GripVertical size={15} />
    </button>
  );
  return (
    <div ref={setNodeRef} style={style}>
      {children(dragHandle)}
    </div>
  );
}

function SortableSection({ id, children }: { id: string; children: (dragHandle: React.ReactNode) => React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, data: { type: "section" } });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };
  const dragHandle = (
    <button
      {...attributes}
      {...listeners}
      className="cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground transition-colors p-1 touch-none"
      tabIndex={-1}
    >
      <GripVertical size={16} />
    </button>
  );
  return (
    <div ref={setNodeRef} style={style}>
      {children(dragHandle)}
    </div>
  );
}

function byCreatedAt(a: Product, b: Product): number {
  const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
  const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
  return ta - tb;
}

function sortProducts(products: Product[], sortBy: string, categoryOrder: string[]): Product[] {
  if (sortBy === "manual") return products;
  const sorted = [...products];
  if (sortBy === "name") {
    sorted.sort((a, b) => {
      const cmp = a.name.localeCompare(b.name, "pl");
      return cmp !== 0 ? cmp : byCreatedAt(a, b);
    });
  } else if (sortBy === "price") {
    sorted.sort((a, b) => {
      const pa = parsePrice(a.price) ?? Infinity;
      const pb = parsePrice(b.price) ?? Infinity;
      return pa !== pb ? pa - pb : byCreatedAt(a, b);
    });
  } else if (sortBy === "category") {
    const order = categoryOrder.length > 0 ? categoryOrder : BUILT_IN_CATEGORIES.map((c) => c.value);
    sorted.sort((a, b) => {
      const ia = a.category ? order.indexOf(a.category) : order.length;
      const ib = b.category ? order.indexOf(b.category) : order.length;
      const ai = ia === -1 ? order.length : ia;
      const bi = ib === -1 ? order.length : ib;
      return ai !== bi ? ai - bi : byCreatedAt(a, b);
    });
  }
  return sorted;
}

export default function ListDetail({ list, designerName, designerEmail, designerLogoUrl, initialOpenProductId, categoryOrder, customCategories, pdfTemplate }: ListDetailProps & { designerName?: string; designerEmail?: string; designerLogoUrl?: string; initialOpenProductId?: string }) {
  const { lang } = useLang();
  const t = useT();
  const [currentPdfTemplate, setCurrentPdfTemplate] = useState<import("@/lib/pdf-templates").PdfTemplate>(pdfTemplate ?? "violet");
  useEffect(() => {
    fetch("/api/ustawienia/lists")
      .then((r) => r.json())
      .then((data) => { if (data.pdfListTemplate) setCurrentPdfTemplate(data.pdfListTemplate); })
      .catch(() => {});
  }, []);
  const SORT_OPTIONS = [
    { value: "manual", label: t.render.sortManual },
    { value: "category", label: t.listy.sortCategory },
    { value: "name", label: t.render.sortName },
    { value: "price", label: t.listy.sortPrice },
  ];
  const translatedCategories = [
    { value: "OSWIETLENIE", label: t.products.catLampy },
    { value: "AKCESORIA", label: t.products.catAkcesoria },
    { value: "MEBLE", label: t.products.catMeble },
    { value: "ARMATURA", label: t.products.catArmatura },
    { value: "OKLADZINY_SCIENNE", label: t.products.catOkladziny },
    { value: "PODLOGA", label: t.products.catPodloga },
  ];

  const [sections, setSections] = useState<Section[]>(list.sections);

  // Sync sections from server props after router.refresh() (e.g. product added via extension)
  useEffect(() => {
    setSections(list.sections);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list.sections]);
  const [budget, setBudget] = useState<number | null>(list.budget);
  const [hidePrices, setHidePrices] = useState(list.hidePrices);
  const allCategories = [...translatedCategories, ...customCategories.map((c) => ({ value: c, label: c }))];
  const [sectionBudgets, setSectionBudgets] = useState<Record<string, number | null>>(() =>
    Object.fromEntries(list.sections.map((s) => [s.id, s.budget ?? null]))
  );
  const [budgetModalOpen, setBudgetModalOpen] = useState(false);
  const [budgetInput, setBudgetInput] = useState(list.budget != null ? String(list.budget) : "");
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportSelectedSections, setExportSelectedSections] = useState<Set<string>>(new Set());
  const [exportHidePrices, setExportHidePrices] = useState(false);
  const [sectionBudgetInputs, setSectionBudgetInputs] = useState<Record<string, string>>(() =>
    Object.fromEntries(list.sections.map((s) => [s.id, s.budget != null ? String(s.budget) : ""]))
  );
  const [savingBudget, setSavingBudget] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [addingSection, setAddingSection] = useState(false);
  const [newSectionName, setNewSectionName] = useState("");
  const [savingSection, setSavingSection] = useState(false);
  const [dialogState, setDialogState] = useState<{ open: boolean; sectionId: string | null }>({
    open: false,
    sectionId: null,
  });
  const [fabMenuOpen, setFabMenuOpen] = useState(false);
  const [editState, setEditState] = useState<{ product: Product; sectionId: string } | null>(null);
  const [moveState, setMoveState] = useState<{ product: Product; sectionId: string } | null>(null);
  const [copyState, setCopyState] = useState<{ product: Product; sectionId: string } | null>(null);
  const [activeDragProduct, setActiveDragProduct] = useState<Product | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editingSectionName, setEditingSectionName] = useState("");
  const [commentsPanelProductId, setCommentsPanelProductId] = useState<string | null>(initialOpenProductId ?? null);
  const [panelLastReadAt, setPanelLastReadAt] = useState<string | null>(null);
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    for (const s of list.sections) {
      for (const p of s.products) {
        init[p.id] = p.commentCount ?? 0;
      }
    }
    return init;
  });
  const [unreadProducts, setUnreadProducts] = useState<Set<string>>(() => new Set(getUnreadSet(list.id)));
  const [seenCounts, setSeenCounts] = useState<Record<string, number>>(() => {
    if (typeof window === "undefined") return {};
    const init: Record<string, number> = {};
    for (const s of list.sections) {
      for (const p of s.products) {
        const stored = localStorage.getItem(`lc_seen_${p.id}`);
        init[p.id] = stored !== null ? parseInt(stored) : (p.commentCount ?? 0);
      }
    }
    return init;
  });
  const [approvals, setApprovals] = useState<Record<string, string | null>>(() => {
    const init: Record<string, string | null> = {};
    for (const s of list.sections) {
      for (const p of s.products) {
        init[p.id] = p.approval ?? null;
      }
    }
    return init;
  });

  useEffect(() => {
    const store = getUnreadSet(list.id);
    const unread = new Set<string>(store); // start with what's already in module store
    for (const s of list.sections) {
      for (const p of s.products) {
        // Persisted unread flag (set by Pusher, cleared only when panel is opened)
        if (localStorage.getItem(`lc_unread_${p.id}`) === "1") {
          unread.add(p.id);
          store.add(p.id);
          continue;
        }
        const stored = localStorage.getItem(`lc_seen_${p.id}`);
        if (stored === null) {
          localStorage.setItem(`lc_seen_${p.id}`, String(p.commentCount ?? 0));
        } else if ((p.commentCount ?? 0) > parseInt(stored)) {
          unread.add(p.id);
          store.add(p.id);
          localStorage.setItem(`lc_unread_${p.id}`, "1");
        }
      }
    }
    setUnreadProducts(new Set(unread));
    // Sync list-level unread flags
    syncListUnread(list.id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [sortDropdownOpen, setSortDropdownOpen] = useState<string | null>(null);
  const [isDraggingSection, setIsDraggingSection] = useState(false);
  const sectionInputRef = useRef<HTMLInputElement>(null);
  const sectionEditRef = useRef<HTMLInputElement>(null);
  const router = useRouter();


  async function handleDeleteSection(sectionId: string) {
    if (!confirm(t.listy.confirmDeleteSection)) return;
    setSections((prev) => prev.filter((s) => s.id !== sectionId));
    try {
      const res = await fetch(`/api/lists/${list.id}/sections/${sectionId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success(t.listy.sectionDeleted);
    } catch {
      toast.error(t.listy.sectionDeleteError);
      router.refresh();
    }
  }

  async function toggleHidePrices() {
    const next = !hidePrices;
    setHidePrices(next);
    try {
      await fetch(`/api/lists/${list.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hidePrices: next }),
      });
      toast.success(next ? t.listy.pricesHiddenForClient : t.listy.pricesVisibleForClient);
    } catch {
      setHidePrices(!next);
      toast.error(t.listy.saveSettingError);
    }
  }

  async function handleProductFieldUpdate(sectionId: string, productId: string, field: string, value: string | null) {
    const scrollY = window.scrollY;
    setSections((prev) =>
      prev.map((s) =>
        s.id === sectionId
          ? { ...s, products: s.products.map((p) => p.id === productId ? { ...p, [field]: value } : p) }
          : s
      )
    );
    requestAnimationFrame(() => window.scrollTo({ top: scrollY, behavior: "instant" }));
    try {
      const res = await fetch(`/api/lists/${list.id}/sections/${sectionId}/products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      if (!res.ok) throw new Error();
    } catch {
      toast.error(t.listy.saveError);
      router.refresh();
    }
  }

  async function handleSectionSortBy(sectionId: string, sortBy: string) {
    setSections((prev) => prev.map((s) => s.id === sectionId ? { ...s, sortBy } : s));
    setSortDropdownOpen(null);
    try {
      await fetch(`/api/lists/${list.id}/sections/${sectionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sortBy }),
      });
    } catch {
      toast.error(t.listy.saveSortError);
    }
  }

  const authorName = designerName || t.listy.defaultDesigner;

  const commentsPanelProductIdRef = useRef<string | null>(null);
  useEffect(() => {
    commentsPanelProductIdRef.current = commentsPanelProductId;
  }, [commentsPanelProductId]);

  // Real-time badge updates via list-level Pusher channel
  useEffect(() => {
    const channel = pusherClient.subscribe(`shopping-list-${list.id}`);
    channel.bind("comment-activity", ({ productId, action }: { productId: string; action: string }) => {
      if (commentsPanelProductIdRef.current === productId) return; // panel handles it
      setCommentCounts((prev) => ({
        ...prev,
        [productId]: action === "new" ? (prev[productId] ?? 0) + 1 : Math.max(0, (prev[productId] ?? 0) - 1),
      }));
      if (action === "new") {
        localStorage.setItem(`lc_unread_${productId}`, "1");
        getUnreadSet(list.id).add(productId);
        syncListUnread(list.id);
        setUnreadProducts((prev) => new Set([...prev, productId]));
      }
    });
    channel.bind("approval-change", ({ productId, approval }: { productId: string; approval: string | null }) => {
      setApprovals((prev) => ({ ...prev, [productId]: approval }));
    });
    channel.bind("product-added", () => {
      router.refresh();
    });
    return () => {
      channel.unbind("comment-activity");
      channel.unbind("approval-change");
      channel.unbind("product-added");
      pusherClient.unsubscribe(`shopping-list-${list.id}`);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCountChange = useCallback((productId: string, count: number) => {
    setCommentCounts((prev) => ({ ...prev, [productId]: count }));
  }, []);

  function openCommentsPanel(productId: string) {
    const lastReadAt = localStorage.getItem(`lc_readAt_${productId}`);
    const currentCount = commentCounts[productId] ?? 0;
    localStorage.setItem(`lc_readAt_${productId}`, new Date().toISOString());
    localStorage.setItem(`lc_seen_${productId}`, String(currentCount));
    localStorage.removeItem(`lc_unread_${productId}`);
    getUnreadSet(list.id).delete(productId);
    syncListUnread(list.id);
    setUnreadProducts((prev) => {
      const next = new Set(prev);
      next.delete(productId);
      return next;
    });
    setSeenCounts((prev) => ({ ...prev, [productId]: currentCount }));
    setPanelLastReadAt(lastReadAt);
    setCommentsPanelProductId(productId);
  }

  function closeCommentsPanel() {
    if (commentsPanelProductId) {
      const currentCount = commentCounts[commentsPanelProductId] ?? 0;
      localStorage.setItem(`lc_seen_${commentsPanelProductId}`, String(currentCount));
      setSeenCounts((prev) => ({ ...prev, [commentsPanelProductId]: currentCount }));
    }
    setCommentsPanelProductId(null);
  }

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function handleSectionDragStart(event: DragStartEvent) {
    const type = event.active.data.current?.type;
    if (type === "section") {
      setIsDraggingSection(true);
    } else if (type === "product") {
      const sectionId = event.active.data.current?.sectionId as string;
      const product = sections.find((s) => s.id === sectionId)?.products.find((p) => p.id === event.active.id);
      setActiveDragProduct(product ?? null);
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    setIsDraggingSection(false);
    setActiveDragProduct(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeType = active.data.current?.type;

    if (activeType === "section") {
      const regularSections = sections.filter((s) => !s.unsorted);
      const unsortedSection = sections.find((s) => s.unsorted);
      const oldIndex = regularSections.findIndex((s) => s.id === active.id);
      const newIndex = regularSections.findIndex((s) => s.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;
      const reordered = arrayMove(regularSections, oldIndex, newIndex);
      setSections([...(unsortedSection ? [unsortedSection] : []), ...reordered]);
      try {
        await fetch(`/api/lists/${list.id}/sections`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order: reordered.map((s) => s.id) }),
        });
      } catch {
        toast.error(t.listy.saveSectionOrderError);
      }
      return;
    }

    if (activeType === "product") {
      const sourceSectionId = active.data.current?.sectionId as string;
      const targetSectionId = over.data.current?.sectionId as string;
      if (!sourceSectionId || !targetSectionId) return;

      if (sourceSectionId === targetSectionId) {
        // Within-section reorder
        const section = sections.find((s) => s.id === sourceSectionId);
        if (!section) return;
        const currentSortBy = getSortBy(section.sortBy);
        const displayed = sortProducts(section.products, currentSortBy, categoryOrder);
        const oldIndex = displayed.findIndex((p) => p.id === active.id);
        const newIndex = displayed.findIndex((p) => p.id === over.id);
        if (oldIndex === -1 || newIndex === -1) return;
        const reordered = arrayMove(displayed, oldIndex, newIndex);
        setSections((prev) => prev.map((s) => s.id === sourceSectionId ? { ...s, sortBy: "manual", products: reordered } : s));
        try {
          await Promise.all([
            fetch(`/api/lists/${list.id}/sections/${sourceSectionId}/products`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ order: reordered.map((p) => p.id) }),
            }),
            currentSortBy !== "manual"
              ? fetch(`/api/lists/${list.id}/sections/${sourceSectionId}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ sortBy: "manual" }),
                })
              : Promise.resolve(),
          ]);
        } catch {
          toast.error(t.listy.saveProductOrderError);
        }
      } else {
        // Cross-section move
        const product = sections.find((s) => s.id === sourceSectionId)?.products.find((p) => p.id === active.id);
        if (!product) return;

        const overIndex = sections.find((s) => s.id === targetSectionId)?.products.findIndex((p) => p.id === over.id) ?? -1;

        setSections((prev) =>
          prev.map((s) => {
            if (s.id === sourceSectionId) return { ...s, products: s.products.filter((p) => p.id !== active.id) };
            if (s.id === targetSectionId) {
              const newProducts = [...s.products];
              const insertAt = overIndex >= 0 ? overIndex : newProducts.length;
              newProducts.splice(insertAt, 0, product);
              return { ...s, products: newProducts };
            }
            return s;
          })
        );

        try {
          await fetch(`/api/lists/${list.id}/sections/${sourceSectionId}/products/${active.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sectionId: targetSectionId }),
          });
          // Update order in target section
          const tgtProducts = sections.find((s) => s.id === targetSectionId)?.products ?? [];
          const newTgtProducts = [...tgtProducts];
          const insertAt = overIndex >= 0 ? overIndex : newTgtProducts.length;
          newTgtProducts.splice(insertAt, 0, product);
          await fetch(`/api/lists/${list.id}/sections/${targetSectionId}/products`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ order: newTgtProducts.map((p) => p.id) }),
          });
          toast.success(t.listy.productMoved);
        } catch {
          setSections((prev) =>
            prev.map((s) => {
              if (s.id === sourceSectionId) return { ...s, products: [...s.products, product] };
              if (s.id === targetSectionId) return { ...s, products: s.products.filter((p) => p.id !== active.id) };
              return s;
            })
          );
          toast.error(t.listy.moveProductError);
        }
      }
    }
  }

  function startEditSection(section: Section) {
    setEditingSectionId(section.id);
    setEditingSectionName(section.name);
    setTimeout(() => sectionEditRef.current?.focus(), 50);
  }

  async function handleSaveSectionName(sectionId: string) {
    const name = editingSectionName.trim();
    if (!name) { setEditingSectionId(null); return; }
    const prev = sections.find((s) => s.id === sectionId)?.name;
    if (name === prev) { setEditingSectionId(null); return; }
    setSections((s) => s.map((sec) => sec.id === sectionId ? { ...sec, name } : sec));
    setEditingSectionId(null);
    try {
      await fetch(`/api/lists/${list.id}/sections/${sectionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
    } catch {
      toast.error(t.listy.saveSectionNameError);
    }
  }

  async function saveBudget() {
    const parsedList = budgetInput.trim() === "" ? null : parseFloat(budgetInput.replace(",", "."));
    if (budgetInput.trim() !== "" && (isNaN(parsedList!) || parsedList! < 0)) {
      toast.error(t.listy.invalidListBudget);
      return;
    }
    for (const [sid, val] of Object.entries(sectionBudgetInputs)) {
      if (val.trim() !== "") {
        const p = parseFloat(val.replace(",", "."));
        if (isNaN(p) || p < 0) { toast.error(t.listy.invalidSectionBudget); return; }
      }
    }
    setSavingBudget(true);
    try {
      const requests: Promise<Response>[] = [
        fetch(`/api/lists/${list.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ budget: parsedList }),
        }),
        ...sections.filter((s) => !s.unsorted).map((s) => {
          const val = sectionBudgetInputs[s.id] ?? "";
          const parsed = val.trim() === "" ? null : parseFloat(val.replace(",", "."));
          return fetch(`/api/lists/${list.id}/sections/${s.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ budget: parsed }),
          });
        }),
      ];
      const results = await Promise.all(requests);
      if (results.some((r) => !r.ok)) throw new Error();
      setBudget(parsedList);
      setSectionBudgets(Object.fromEntries(
        sections.filter((s) => !s.unsorted).map((s) => {
          const val = sectionBudgetInputs[s.id] ?? "";
          return [s.id, val.trim() === "" ? null : parseFloat(val.replace(",", "."))];
        })
      ));
      setBudgetModalOpen(false);
      toast.success(t.listy.budgetSaved);
    } catch {
      toast.error(t.listy.saveBudgetError);
    } finally {
      setSavingBudget(false);
    }
  }

  function openAddSection() {
    setAddingSection(true);
    setTimeout(() => sectionInputRef.current?.focus(), 50);
  }

  async function handleAddSection(e: React.FormEvent) {
    e.preventDefault();
    if (!newSectionName.trim()) return;
    setSavingSection(true);
    try {
      const res = await fetch(`/api/lists/${list.id}/sections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newSectionName.trim() }),
      });
      if (!res.ok) throw new Error();
      const section = await res.json();
      setSections((prev) => [...prev, { ...section, budget: null }]);
      setSectionBudgetInputs((prev) => ({ ...prev, [section.id]: "" }));
      setSectionBudgets((prev) => ({ ...prev, [section.id]: null }));
      setNewSectionName("");
      setAddingSection(false);
    } catch {
      toast.error(t.listy.sectionCreateError);
    } finally {
      setSavingSection(false);
    }
  }

  function handleProductAdded(sectionId: string | null, product: unknown) {
    const p = product as Product & { sectionId: string };
    const actualSectionId = sectionId ?? p.sectionId;
    setSections((prev) => {
      const exists = prev.find((s) => s.id === actualSectionId);
      if (exists) {
        return prev.map((s) => s.id === actualSectionId ? { ...s, products: [...s.products, p] } : s);
      }
      // Unsorted section was just created — add it to state
      return [
        { id: actualSectionId, name: "__unsorted__", order: -1, sortBy: "manual", budget: null, unsorted: true, products: [p] },
        ...prev,
      ];
    });
    router.refresh();
  }

  function handleQuantityChange(sectionId: string, productId: string, qty: number) {
    setSections((prev) =>
      prev.map((s) =>
        s.id === sectionId
          ? { ...s, products: s.products.map((p) => p.id === productId ? { ...p, quantity: qty } : p) }
          : s
      )
    );
  }

  function handleProductUpdated(sectionId: string, updated: Product) {
    setSections((prev) =>
      prev.map((s) =>
        s.id === sectionId
          ? { ...s, products: s.products.map((p) => p.id === updated.id ? { ...p, ...updated } : p) }
          : s
      )
    );
  }

  async function handleMoveProduct(sourceSectionId: string, productId: string, targetSectionId: string) {
    const product = sections.find((s) => s.id === sourceSectionId)?.products.find((p) => p.id === productId);
    if (!product) return;

    setSections((prev) =>
      prev.map((s) => {
        if (s.id === sourceSectionId) return { ...s, products: s.products.filter((p) => p.id !== productId) };
        if (s.id === targetSectionId) return { ...s, products: [...s.products, product] };
        return s;
      })
    );

    try {
      const res = await fetch(`/api/lists/${list.id}/sections/${sourceSectionId}/products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sectionId: targetSectionId }),
      });
      if (!res.ok) throw new Error();
      toast.success(t.listy.productMoved);
    } catch {
      setSections((prev) =>
        prev.map((s) => {
          if (s.id === sourceSectionId) return { ...s, products: [...s.products, product] };
          if (s.id === targetSectionId) return { ...s, products: s.products.filter((p) => p.id !== productId) };
          return s;
        })
      );
      toast.error(t.listy.moveProductError);
    }
  }

  async function handleCopyProduct(sourceSectionId: string, product: Product, targetSectionId: string) {
    try {
      const res = await fetch(`/api/lists/${list.id}/sections/${targetSectionId}/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: product.name,
          url: product.url,
          imageUrl: product.imageUrl,
          price: product.price,
          manufacturer: product.manufacturer,
          color: product.color,
          dimensions: product.dimensions,
          description: product.description,
          deliveryTime: product.deliveryTime,
          quantity: product.quantity,
          category: product.category,
          supplier: product.supplier,
          catalogNumber: product.catalogNumber,
          productId: product.productId,
          note: product.note,
        }),
      });
      if (!res.ok) throw new Error();
      const newProduct: Product = await res.json();
      setSections((prev) =>
        prev.map((s) =>
          s.id === targetSectionId ? { ...s, products: [...s.products, newProduct] } : s
        )
      );
      toast.success(t.listy.productCopied);
    } catch {
      toast.error(t.listy.copyProductError);
    }
  }

  async function handleToggleHidden(sectionId: string, productId: string) {
    const section = sections.find((s) => s.id === sectionId);
    const product = section?.products.find((p) => p.id === productId);
    if (!product) return;
    const hidden = !product.hidden;
    setSections((prev) =>
      prev.map((s) =>
        s.id === sectionId
          ? { ...s, products: s.products.map((p) => p.id === productId ? { ...p, hidden } : p) }
          : s
      )
    );
    try {
      const res = await fetch(`/api/lists/${list.id}/sections/${sectionId}/products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hidden }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error("Toggle hidden failed:", res.status, err);
        // rollback
        setSections((prev) =>
          prev.map((s) =>
            s.id === sectionId
              ? { ...s, products: s.products.map((p) => p.id === productId ? { ...p, hidden: !hidden } : p) }
              : s
          )
        );
        toast.error(t.listy.toggleVisibilityError);
      }
    } catch {
      // rollback
      setSections((prev) =>
        prev.map((s) =>
          s.id === sectionId
            ? { ...s, products: s.products.map((p) => p.id === productId ? { ...p, hidden: !hidden } : p) }
            : s
        )
      );
      toast.error(t.listy.toggleVisibilityError);
    }
  }

  async function handleApprovalChange(sectionId: string, productId: string, value: string | null) {
    const prev = approvals[productId];
    setApprovals((a) => ({ ...a, [productId]: value }));
    try {
      const res = await fetch(`/api/lists/${list.id}/sections/${sectionId}/products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approval: value }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setApprovals((a) => ({ ...a, [productId]: prev }));
      toast.error(t.listy.approvalChangeError);
    }
  }

  async function handleDeleteProduct(sectionId: string, productId: string) {
    setDeletingId(productId);
    try {
      const res = await fetch(`/api/lists/${list.id}/sections/${sectionId}/products/${productId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      setSections((prev) =>
        prev.map((s) =>
          s.id === sectionId
            ? { ...s, products: s.products.filter((p) => p.id !== productId) }
            : s
        )
      );
      toast.success(t.products.productDeleted);
    } catch {
      toast.error(t.products.productDeleteError);
    } finally {
      setDeletingId(null);
    }
  }

  // Grand total across all sections (excluding hidden products)
  const allProducts = sections.flatMap((s) => s.products.filter((p) => !p.hidden));
  const grandTotal = allProducts.reduce((sum, p) => {
    const n = parsePrice(p.price);
    return n !== null ? sum + n * p.quantity : sum;
  }, 0);
  const grandCurrency = allProducts.find((p) => getCurrency(p.price))
    ? getCurrency(allProducts.find((p) => getCurrency(p.price))!.price)
    : "";
  const hasTotal = allProducts.some((p) => parsePrice(p.price) !== null);

  function openExportPdfDialog() {
    setExportSelectedSections(new Set(sections.filter((s) => !s.unsorted).map((s) => s.id)));
    setExportHidePrices(false);
    setExportDialogOpen(true);
  }

  async function exportToPDF(selectedSectionIds: Set<string>, hidePricesInPdf: boolean) {
    // Load images: try direct fetch first (works for UploadThing which has CORS *),
    // fall back to server-side proxy for external URLs without CORS headers.
    const loadImgToDataUrl = async (rawSrc: string): Promise<string | null> => {
      // Decode HTML entities in URL (e.g. &amp; → &) that can appear in scraped URLs
      const src = rawSrc.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"');
      const toDataUrl = (objectUrl: string): Promise<string | null> =>
        new Promise((resolve) => {
          const img = new Image();
          img.onload = () => {
            try {
              const canvas = document.createElement("canvas");
              canvas.width = img.naturalWidth || 200;
              canvas.height = img.naturalHeight || 200;
              const ctx = canvas.getContext("2d");
              ctx?.drawImage(img, 0, 0);
              resolve(canvas.toDataURL("image/jpeg", 0.85));
            } catch { resolve(null); }
            finally { URL.revokeObjectURL(objectUrl); }
          };
          img.onerror = () => { URL.revokeObjectURL(objectUrl); resolve(null); };
          img.src = objectUrl;
        });

      // Try direct fetch (works when CORS * is set, e.g. UploadThing CDN)
      try {
        const res = await fetch(src);
        if (res.ok) {
          const blob = await res.blob();
          return toDataUrl(URL.createObjectURL(blob));
        }
      } catch { /* CORS or network error — fall through to proxy */ }

      // Fall back to server-side proxy for external URLs without CORS headers
      try {
        const res = await fetch(`/api/image-proxy?url=${encodeURIComponent(src)}`);
        if (!res.ok) return null;
        const blob = await res.blob();
        return toDataUrl(URL.createObjectURL(blob));
      } catch { return null; }
    };

    // Filter to selected sections, strip prices if requested
    const filteredSections = sections.filter((s) => selectedSectionIds.has(s.id));
    const sectionsForPdf = hidePricesInPdf
      ? filteredSections.map((s) => ({
          ...s,
          products: s.products.map((p) => ({ ...p, price: null })),
        }))
      : filteredSections;

    const allVisible = sectionsForPdf.flatMap((s) => s.products.filter((p) => !p.hidden));

    const imgCache: Record<string, string> = {};
    await Promise.all(
      allVisible
        .filter((p) => p.imageUrl)
        .map(async (p) => {
          const data = await loadImgToDataUrl(p.imageUrl!);
          if (data) imgCache[p.id] = data;
        })
    );

    let logoDataUrl: string | null = null;
    if (designerLogoUrl) {
      logoDataUrl = await loadImgToDataUrl(designerLogoUrl);
    }

    const pdfHasTotal = !hidePricesInPdf && allVisible.some((p) => parsePrice(p.price));
    const pdfGrandTotal = hidePricesInPdf ? 0 : allVisible.reduce((sum, p) => {
      const n = parsePrice(p.price);
      return n !== null ? sum + n * p.quantity : sum;
    }, 0);
    const pdfGrandCurrency = hidePricesInPdf ? "" : (getCurrency(allVisible.find((p) => getCurrency(p.price))?.price ?? null));

    const pdf = await generateListPDF({
      template: currentPdfTemplate,
      lang,
      list,
      sections: sectionsForPdf,
      designerName: authorName,
      designerEmail,
      designerLogoUrl,
      grandTotal: pdfGrandTotal,
      grandCurrency: pdfGrandCurrency,
      hasTotal: pdfHasTotal,
      imgCache,
      logoDataUrl,
    });
    pdf.save(`${list.name}.pdf`);
  }

  async function exportToXLSX() {
    const XLSX = await import("xlsx");
    const wb = XLSX.utils.book_new();
    const wsData: unknown[][] = [];

    wsData.push([list.name]);
    wsData.push([`${t.listy.xlsxProjectLabel}: ${list.project?.title ?? "—"}`, "", "", "", "", "", "", `${t.listy.xlsxGeneratedLabel}: ${new Date().toLocaleDateString()}`]);
    wsData.push([]);

    let globalIdx = 1;

    for (const section of sections) {
      const visibleProducts = section.products.filter((p) => !p.hidden);
      if (visibleProducts.length === 0) continue;

      wsData.push([section.name]);
      wsData.push([t.listy.xlsxColLp, t.listy.xlsxColName, t.listy.xlsxColManufacturer, t.listy.xlsxColColor, t.listy.xlsxColDimensions, t.listy.xlsxColDelivery, t.listy.xlsxColQty, t.listy.xlsxColUnitPrice, t.listy.xlsxColTotalPrice]);

      for (const p of visibleProducts) {
        const unit = parsePrice(p.price);
        const total = unit !== null ? unit * p.quantity : null;
        const cur = getCurrency(p.price);
        wsData.push([
          globalIdx++,
          p.name,
          p.manufacturer || "",
          p.color || "",
          p.dimensions || "",
          p.deliveryTime || "",
          p.quantity,
          unit !== null ? `${unit} ${cur}` : "",
          total !== null ? `${total} ${cur}` : "",
        ]);
      }

      const sectionTotal = visibleProducts.reduce((s, p) => {
        const n = parsePrice(p.price);
        return n !== null ? s + n * p.quantity : s;
      }, 0);
      const sectionCur = getCurrency(visibleProducts.find((p) => getCurrency(p.price))?.price ?? null);
      if (sectionTotal > 0) {
        wsData.push(["", "", "", "", "", "", "", t.listy.xlsxSectionTotal, `${sectionTotal.toLocaleString()} ${sectionCur}`]);
      }
      wsData.push([]);
    }

    if (hasTotal) {
      wsData.push(["", "", "", "", "", "", "", t.listy.xlsxGrandTotal, `${grandTotal.toLocaleString()} ${grandCurrency}`]);
    }

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws["!cols"] = [{ wch: 5 }, { wch: 35 }, { wch: 18 }, { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 6 }, { wch: 15 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, ws, "Lista");
    XLSX.writeFile(wb, `${list.name}.xlsx`);
  }

  return (
    <div className="pb-24">
      <div className="md:max-w-[75%] md:mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-5 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <Link
            href="/listy"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            <ChevronLeft size={16} />
            <span className="hidden sm:inline">{t.listy.backToLists}</span>
          </Link>
          <span className="text-muted-foreground hidden sm:inline">/</span>
          <h1 className="text-lg sm:text-xl font-bold truncate">{list.name}</h1>
          {list.project && (
            <span className="text-xs text-muted-foreground shrink-0 hidden sm:inline">· {list.project.title}</span>
          )}
        </div>
        <ShareDialog
          shareUrl={typeof window !== "undefined" ? `${window.location.origin}/share/list/${list.shareToken}` : `/share/list/${list.shareToken}`}
          moduleSlug="listy"
          moduleName="Listy zakupowe"
          hiddenModules={list.project?.hiddenModules ?? []}
        />
      </div>
      </div>

      {/* No-account banner */}
      {list.project && !list.project.clientHasAccount && list.project.clientName && (
        <div className="mb-4 flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-3 py-2.5 text-sm text-amber-800 dark:text-amber-300">
          <AlertTriangle size={15} className="flex-shrink-0 mt-0.5" />
          <span className="flex-1">
            {t.listy.clientLabel} <strong>{list.project.clientName}</strong> {t.listy.noAccountNote}{" "}
            <Link href={`/klienci/${list.project.id}`} className="underline hover:no-underline">
              {t.listy.noAccountPassword}
            </Link>
          </span>
        </div>
      )}

      {/* Toolbar */}
      <div className="mb-6 md:mb-0 md:sticky md:top-0 md:z-20 md:-mx-6 md:px-6 md:bg-background md:pb-3 md:pt-2">
        <div className="md:max-w-[75%] md:mx-auto">
          <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-muted/40 border border-border rounded-xl shadow-sm">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Button onClick={openAddSection} className="flex items-center gap-1.5 h-8 px-3 text-xs">
            <Plus size={13} />
            <span className="hidden xs:inline">{t.listy.addSection}</span>
            <span className="xs:hidden">{t.listy.sectionLabel}</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => setDialogState({ open: true, sectionId: null })}
            className="flex items-center gap-1.5 h-8 px-3 text-xs"
          >
            <Plus size={13} />
            {t.products.addProduct}
          </Button>
          <div className="w-px h-5 bg-border mx-0.5 hidden sm:block" />
          <DropdownMenu>
            <DropdownMenuTrigger render={
              <button className="flex items-center gap-1 h-8 px-2 sm:px-3 text-xs rounded-lg border border-border bg-background hover:bg-muted transition-colors text-foreground">
                <FileDown size={13} />
                <span className="hidden sm:inline">{t.listy.exportBtn}</span>
              </button>
            } />
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={openExportPdfDialog}>
                <FileDown size={13} className="mr-2" />
                {t.listy.exportPDF}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportToXLSX}>
                <Sheet size={13} className="mr-2" />
                {t.listy.exportXLSX}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <button
            onClick={() => { setBudgetInput(budget != null ? String(budget) : ""); setBudgetModalOpen(true); }}
            className="flex items-center gap-1 h-8 px-2 sm:px-3 text-xs rounded-lg border border-border bg-background hover:bg-muted transition-colors text-foreground"
            title={t.listy.setBudget}
          >
            <Wallet size={13} />
            <span className="hidden sm:inline">{budget != null ? t.listy.budget : t.listy.setBudget}</span>
          </button>
          <button
            onClick={toggleHidePrices}
            className={`flex items-center gap-1 h-8 px-2 sm:px-3 text-xs rounded-lg border transition-colors ${hidePrices ? "border-amber-400 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-700" : "border-border bg-background hover:bg-muted text-foreground"}`}
            title={hidePrices ? t.listy.pricesHiddenTitle : t.listy.hidePricesTitle}
          >
            <DollarSign size={13} />
            <span className="hidden sm:inline">{hidePrices ? t.listy.pricesHiddenBtn : t.listy.hidePricesBtn}</span>
          </button>
        </div>
        {hasTotal && (
          <div className="flex flex-col items-end gap-1 shrink-0 pr-1 min-w-0">
            <div className="flex items-center gap-1.5 text-sm">
              <span className="text-muted-foreground text-xs">{t.listy.sumLabel}</span>
              <span className={`font-semibold tabular-nums ${budget != null && budget > 0 && grandTotal > budget ? "text-red-500" : ""}`}>
                {formatPriceNum(grandTotal)} {grandCurrency}
              </span>
              {budget != null && budget > 0 && (
                <span className="text-xs text-muted-foreground tabular-nums">
                  / {formatPriceNum(budget)} {grandCurrency}
                </span>
              )}
              {budget != null && budget > 0 && (
                <span className={`text-xs font-medium tabular-nums ${grandTotal > budget ? "text-red-500" : grandTotal / budget > 0.75 ? "text-orange-500" : "text-green-600 dark:text-green-400"}`}>
                  ({Math.round((grandTotal / budget) * 100)}%)
                </span>
              )}
            </div>
          </div>
        )}
          </div>
        </div>
      </div>

      <div className="md:max-w-[75%] md:mx-auto">
      {sections.filter((s) => !s.unsorted).length > 1 && (
        <div className="hidden md:block h-0 overflow-visible sticky top-[76px] z-30">
          <div className="absolute right-full top-0 pr-4 w-36">
            <ListSectionNav
              sections={sections.filter((s) => !s.unsorted).map((s) => ({ id: s.id, name: s.name }))}
              scrollOffset={80}
            />
          </div>
        </div>
      )}
      {/* Add section inline form */}
      {addingSection && (
        <form onSubmit={handleAddSection} className="flex gap-2 mb-6">
          <input
            ref={sectionInputRef}
            value={newSectionName}
            onChange={(e) => setNewSectionName(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && setAddingSection(false)}
            placeholder={t.listy.sectionNamePlaceholder}
            className="flex-1 px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
          />
          <Button type="submit" disabled={savingSection || !newSectionName.trim()}>
            {savingSection ? t.listy.creating : t.listy.createBtn}
          </Button>
          <Button type="button" variant="outline" onClick={() => setAddingSection(false)}>
            {t.common.cancel}
          </Button>
        </form>
      )}

      {/* Empty state */}
      {sections.filter((s) => !s.unsorted).length === 0 && !addingSection && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <Plus size={28} className="text-primary" />
          </div>
          <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-1">{t.listy.noSections}</h2>
          <p className="text-sm text-gray-400 max-w-xs">
            {t.listy.noSectionsHint}
          </p>
        </div>
      )}

      {/* Sections + unsorted products (all inside one DnD context) */}
      <DndContext id={`sections-${list.id}`} sensors={sensors} collisionDetection={closestCenter} onDragStart={handleSectionDragStart} onDragEnd={handleDragEnd} onDragCancel={() => { setIsDraggingSection(false); setActiveDragProduct(null); }}>

        {/* Unsorted products */}
        {(() => {
          const unsortedSection = sections.find((s) => s.unsorted);
          if (!unsortedSection || unsortedSection.products.length === 0) return null;
          return (
            <div className="mb-8">
              <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">{t.listy.productsOutsideSection}</h2>
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <SortableContext items={unsortedSection.products.map((p) => p.id)} strategy={verticalListSortingStrategy}>
                  {unsortedSection.products.map((product, i) => (
                    <SortableProduct key={product.id} id={product.id} sectionId={unsortedSection.id}>
                      {(dragHandle) => (
                        <ProductRow
                          product={product}
                          index={i}
                          last={i === unsortedSection.products.length - 1}
                          listId={list.id}
                          sectionId={unsortedSection.id}
                          onQuantityChange={(pid, qty) => handleQuantityChange(unsortedSection.id, pid, qty)}
                          onEdit={() => setEditState({ product, sectionId: unsortedSection.id })}
                          onDelete={() => handleDeleteProduct(unsortedSection.id, product.id)}
                          onOpenComments={() => openCommentsPanel(product.id)}
                          onToggleHidden={() => handleToggleHidden(unsortedSection.id, product.id)}
                          onMove={(targetSectionId) => handleMoveProduct(unsortedSection.id, product.id, targetSectionId)}
                          onCopy={(targetSectionId) => handleCopyProduct(unsortedSection.id, product, targetSectionId)}
                          onOpenMoveDialog={() => setMoveState({ product, sectionId: unsortedSection.id })}
                          onOpenCopyDialog={() => setCopyState({ product, sectionId: unsortedSection.id })}
                          onApprovalChange={(value) => handleApprovalChange(unsortedSection.id, product.id, value)}
                          onFieldUpdate={(pid, field, value) => handleProductFieldUpdate(unsortedSection.id, pid, field, value)}
                          approval={approvals[product.id] ?? null}
                          commentCount={commentCounts[product.id] ?? 0}
                          unreadCount={unreadProducts.has(product.id) ? Math.max(0, (commentCounts[product.id] ?? 0) - (seenCounts[product.id] ?? 0)) : 0}
                          unread={unreadProducts.has(product.id)}
                          deleting={deletingId === product.id}
                          dragHandle={dragHandle}
                          allCategories={allCategories}
                          sections={sections}
                        />
                      )}
                    </SortableProduct>
                  ))}
                </SortableContext>
              </div>
            </div>
          );
        })()}

        <SortableContext items={sections.filter((s) => !s.unsorted).map((s) => s.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-8">
            {sections.filter((s) => !s.unsorted).map((section) => (
              <SortableSection key={section.id} id={section.id}>
                {(dragHandle) => (
                  <div id={`section-nav-${section.id}`}>
                    {/* Section header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 min-w-0">
                        {dragHandle}
                        <button
                          onClick={() => setCollapsedSections((prev) => {
                            const next = new Set(prev);
                            next.has(section.id) ? next.delete(section.id) : next.add(section.id);
                            return next;
                          })}
                          className="w-6 h-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
                          title={collapsedSections.has(section.id) ? t.listy.expandSection : t.listy.collapseSection}
                        >
                          {collapsedSections.has(section.id) ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                        </button>
                        {editingSectionId === section.id ? (
                          <input
                            ref={sectionEditRef}
                            value={editingSectionName}
                            onChange={(e) => setEditingSectionName(e.target.value)}
                            onBlur={() => handleSaveSectionName(section.id)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveSectionName(section.id);
                              if (e.key === "Escape") setEditingSectionId(null);
                            }}
                            className="text-base font-semibold bg-transparent border-b border-primary/40 focus:outline-none focus:border-primary px-0 min-w-0 w-auto"
                          />
                        ) : (
                          <h2
                            className="text-base font-semibold text-foreground cursor-pointer hover:text-primary transition-colors"
                            onClick={() => startEditSection(section)}
                            title={t.listy.clickToEdit}
                          >
                            {section.name}
                          </h2>
                        )}
                        <button
                          onClick={() => setDialogState({ open: true, sectionId: section.id })}
                          className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground border border-border hover:border-foreground/30 rounded-md px-2 py-0.5 transition-colors shrink-0"
                          title={t.products.addProduct}
                        >
                          <Plus size={13} />
                          {t.products.addProduct}
                        </button>
                      </div>
                      <div className="flex items-center gap-3">
                        {/* Sort dropdown */}
                        <div className="relative">
                          <button
                            onClick={() => setSortDropdownOpen(sortDropdownOpen === section.id ? null : section.id)}
                            className={`flex items-center gap-1 text-xs px-2 py-1 rounded-md border transition-colors ${
                              getSortBy(section.sortBy) !== "manual"
                                ? "border-primary/40 bg-primary/5 text-primary dark:text-[#A5B4FC]"
                                : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
                            }`}
                            title={t.listy.sortSectionTitle}
                          >
                            <ArrowDownUp size={11} />
                            <span className="hidden sm:inline">
                              {SORT_OPTIONS.find((o) => o.value === getSortBy(section.sortBy))?.label ?? t.render.sortManual}
                            </span>
                          </button>
                          {sortDropdownOpen === section.id && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setSortDropdownOpen(null)} />
                              <div className="absolute right-0 top-full mt-1 z-20 bg-popover border border-border rounded-lg shadow-lg py-1 min-w-[130px]">
                                {SORT_OPTIONS.map((opt) => (
                                  <button
                                    key={opt.value}
                                    onClick={() => handleSectionSortBy(section.id, opt.value)}
                                    className={`w-full text-left px-3 py-1.5 text-sm hover:bg-muted transition-colors flex items-center gap-2 ${
                                      getSortBy(section.sortBy) === opt.value ? "text-primary font-medium dark:text-[#A5B4FC]" : "text-foreground"
                                    }`}
                                  >
                                    {getSortBy(section.sortBy) === opt.value && <span className="w-1.5 h-1.5 rounded-full bg-primary dark:bg-[#A5B4FC] shrink-0" />}
                                    {getSortBy(section.sortBy) !== opt.value && <span className="w-1.5 h-1.5 shrink-0" />}
                                    {opt.label}
                                  </button>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                        <SectionTotal products={section.products} budget={sectionBudgets[section.id]} />
                        <button
                          onClick={() => handleDeleteSection(section.id)}
                          className="w-7 h-7 flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          title={t.listy.deleteSectionTitle}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {collapsedSections.has(section.id) ? null : !isDraggingSection && section.products.length === 0 ? (
                      <div
                        className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/30 hover:bg-primary/5 transition-colors"
                        onClick={() => setDialogState({ open: true, sectionId: section.id })}
                      >
                        <Plus size={20} className="mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">{t.listy.addFirstProduct}</p>
                      </div>
                    ) : !isDraggingSection ? (
                      <div className="bg-card border border-border rounded-xl overflow-hidden">
                          <SortableContext
                            items={section.products.map((p) => p.id)}
                            strategy={verticalListSortingStrategy}
                          >
                            {sortProducts(section.products, getSortBy(section.sortBy), categoryOrder).map((product, i) => (
                              <SortableProduct key={product.id} id={product.id} sectionId={section.id}>
                                {(dragHandle) => (
                                  <ProductRow
                                    product={product}
                                    index={i}
                                    last={i === section.products.length - 1}
                                    listId={list.id}
                                    sectionId={section.id}
                                    onQuantityChange={(pid, qty) => handleQuantityChange(section.id, pid, qty)}
                                    onEdit={() => setEditState({ product, sectionId: section.id })}
                                    onDelete={() => handleDeleteProduct(section.id, product.id)}
                                    onOpenComments={() => openCommentsPanel(product.id)}
                                    onToggleHidden={() => handleToggleHidden(section.id, product.id)}
                                    onMove={(targetSectionId) => handleMoveProduct(section.id, product.id, targetSectionId)}
                                    onCopy={(targetSectionId) => handleCopyProduct(section.id, product, targetSectionId)}
                                    onOpenMoveDialog={() => setMoveState({ product, sectionId: section.id })}
                                    onOpenCopyDialog={() => setCopyState({ product, sectionId: section.id })}
                                    onApprovalChange={(value) => handleApprovalChange(section.id, product.id, value)}
                                    onFieldUpdate={(pid, field, value) => handleProductFieldUpdate(section.id, pid, field, value)}
                                    approval={approvals[product.id] ?? null}
                                    commentCount={commentCounts[product.id] ?? 0}
                                    unreadCount={unreadProducts.has(product.id) ? Math.max(0, (commentCounts[product.id] ?? 0) - (seenCounts[product.id] ?? 0)) : 0}
                                    unread={unreadProducts.has(product.id)}
                                    deleting={deletingId === product.id}
                                    dragHandle={dragHandle}
                                    allCategories={allCategories}
                                    sections={sections}
                                  />
                                )}
                              </SortableProduct>
                            ))}
                          </SortableContext>
                        <button
                          onClick={() => setDialogState({ open: true, sectionId: section.id })}
                          className="w-full flex items-center gap-1.5 px-4 py-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/30 border-t border-border transition-colors"
                        >
                          <Plus size={13} />
                          {t.products.addProduct}
                        </button>
                      </div>
                    ) : null}
                  </div>
                )}
              </SortableSection>
            ))}
          </div>
        </SortableContext>
        <DragOverlay>
          {activeDragProduct && (
            <div className="flex items-center gap-2 px-4 py-4 bg-card border border-border rounded-xl shadow-2xl opacity-95 cursor-grabbing">
              <span className="w-4 shrink-0" />
              <div className="w-32 h-32 shrink-0 rounded-xl bg-muted flex items-center justify-center overflow-hidden">
                {activeDragProduct.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={activeDragProduct.imageUrl} alt={activeDragProduct.name} className="w-full h-full object-contain" />
                ) : (
                  <span className="text-3xl text-muted-foreground/30">📦</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-foreground truncate">{activeDragProduct.name}</p>
                {activeDragProduct.manufacturer && (
                  <p className="text-xs text-muted-foreground mt-0.5">{activeDragProduct.manufacturer}</p>
                )}
                {activeDragProduct.price && (
                  <p className="text-xs text-muted-foreground mt-0.5">{activeDragProduct.price}</p>
                )}
              </div>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      <AddProductDialog
        open={dialogState.open}
        onOpenChange={(open) => setDialogState({ open, sectionId: open ? dialogState.sectionId : null })}
        listId={list.id}
        sectionId={dialogState.sectionId}
        onAdded={(product) => handleProductAdded(dialogState.sectionId, product)}
        customCategories={customCategories}
      />

      {editState && (
        <EditProductDialog
          open={true}
          onOpenChange={(open) => { if (!open) setEditState(null); }}
          listId={list.id}
          sectionId={editState.sectionId}
          customCategories={customCategories}
          product={{
            id: editState.product.id,
            name: editState.product.name,
            url: editState.product.url ?? "",
            imageUrl: editState.product.imageUrl ?? "",
            price: editState.product.price ?? "",
            manufacturer: editState.product.manufacturer ?? "",
            color: editState.product.color ?? "",
            dimensions: editState.product.dimensions ?? "",
            description: editState.product.description ?? "",
            deliveryTime: editState.product.deliveryTime ?? "",
            category: editState.product.category ?? "",
            supplier: editState.product.supplier ?? "",
            catalogNumber: editState.product.catalogNumber ?? "",
          }}
          onUpdated={(updated) => {
            handleProductUpdated(editState.sectionId, updated as Product);
            setEditState(null);
          }}
        />
      )}

      {moveState && (
        <MoveSectionDialog
          open={!!moveState}
          onOpenChange={(v) => { if (!v) setMoveState(null); }}
          sections={sections.filter((s) => !s.unsorted)}
          currentSectionId={moveState.sectionId}
          productName={moveState.product.name}
          onMove={(targetSectionId) => handleMoveProduct(moveState.sectionId, moveState.product.id, targetSectionId)}
        />
      )}

      {copyState && (
        <CopySectionDialog
          open={!!copyState}
          onOpenChange={(v) => { if (!v) setCopyState(null); }}
          sections={sections.filter((s) => !s.unsorted)}
          currentSectionId={copyState.sectionId}
          productName={copyState.product.name}
          onCopy={(targetSectionId) => handleCopyProduct(copyState.sectionId, copyState.product, targetSectionId)}
        />
      )}

      {commentsPanelProductId && (() => {
        const product = sections.flatMap((s) => s.products).find((p) => p.id === commentsPanelProductId);
        return product ? (
          <ProductCommentPanel
            productId={commentsPanelProductId}
            productName={product.name}
            productImageUrl={product.imageUrl}
            isDesigner={true}
            authorName={authorName}
            designerName={authorName}
            designerLogoUrl={designerLogoUrl}
            lastReadAt={panelLastReadAt}
            onClose={closeCommentsPanel}
            onCountChange={handleCountChange}
          />
        ) : null;
      })()}

      {/* Export PDF dialog */}
      {exportDialogOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4"
          onClick={() => setExportDialogOpen(false)}
        >
          <div
            className="w-full sm:max-w-sm bg-card rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h2 className="text-sm font-semibold">{t.listy.pdfExportSettings}</h2>
              <button
                onClick={() => setExportDialogOpen(false)}
                className="w-7 h-7 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-4 space-y-4 overflow-y-auto max-h-[60vh]">
              {/* Sekcje */}
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t.listy.sectionsLabel}</p>
                {sections.filter((s) => !s.unsorted).map((s) => (
                  <label key={s.id} className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={exportSelectedSections.has(s.id)}
                      onChange={(e) => {
                        const next = new Set(exportSelectedSections);
                        if (e.target.checked) next.add(s.id);
                        else next.delete(s.id);
                        setExportSelectedSections(next);
                      }}
                      className="w-4 h-4 rounded accent-primary"
                    />
                    <span className="text-sm">{s.name}</span>
                    <span className="text-xs text-muted-foreground ml-auto">{s.products.filter((p) => !p.hidden).length} {t.listy.prodCountSuffix}</span>
                  </label>
                ))}
              </div>

              {/* Separator */}
              <div className="border-t border-border" />

              {/* Ukryj ceny */}
              <label className="flex items-center justify-between gap-3 cursor-pointer select-none">
                <div>
                  <p className="text-sm font-medium">{t.listy.hidePricesPDF}</p>
                  <p className="text-xs text-muted-foreground">{t.listy.hidePricesPDFDesc}</p>
                </div>
                <button
                  role="switch"
                  aria-checked={exportHidePrices}
                  onClick={() => setExportHidePrices((v) => !v)}
                  className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors ${exportHidePrices ? "bg-primary" : "bg-muted-foreground/30"}`}
                >
                  <span className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${exportHidePrices ? "translate-x-4" : "translate-x-0"}`} />
                </button>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border">
              <button
                onClick={() => setExportDialogOpen(false)}
                className="px-3 py-1.5 text-sm rounded-lg border border-border hover:bg-muted transition-colors"
              >
                {t.common.cancel}
              </button>
              <button
                disabled={exportSelectedSections.size === 0}
                onClick={() => {
                  setExportDialogOpen(false);
                  exportToPDF(exportSelectedSections, exportHidePrices);
                }}
                className="px-3 py-1.5 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t.listy.generatePDF}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Budget modal */}
      {budgetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={() => setBudgetModalOpen(false)}>
          <div className="bg-card rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Wallet size={18} className="text-muted-foreground" />
                <h2 className="text-base font-semibold">{t.listy.budgetModal}</h2>
              </div>
              <button onClick={() => setBudgetModalOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 space-y-5 pr-1">
              {/* Overall budget */}
              <div className="space-y-2">
                <p className="text-sm font-semibold">{t.listy.wholeList}</p>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={budgetInput}
                      onChange={(e) => setBudgetInput(e.target.value)}
                      placeholder="np. 60 000"
                      className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary/40 pr-8"
                      autoFocus
                    />
                    {budgetInput !== "" && (
                      <button
                        onClick={() => setBudgetInput("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        tabIndex={-1}
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                  <span className="text-sm text-muted-foreground shrink-0">zł</span>
                </div>
              </div>

              {/* Section budgets */}
              {sections.filter((s) => !s.unsorted).length > 0 && (
                <div className="space-y-3">
                  <p className="text-sm font-semibold">{t.listy.sectionsLabel}</p>
                  {sections.filter((s) => !s.unsorted).map((s) => (
                    <div key={s.id} className="space-y-1">
                      <label className="text-xs text-muted-foreground">{s.name}</label>
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={sectionBudgetInputs[s.id] ?? ""}
                            onChange={(e) => setSectionBudgetInputs((prev) => ({ ...prev, [s.id]: e.target.value }))}
                            placeholder="np. 15 000"
                            className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary/40 pr-8"
                          />
                          {(sectionBudgetInputs[s.id] ?? "") !== "" && (
                            <button
                              onClick={() => setSectionBudgetInputs((prev) => ({ ...prev, [s.id]: "" }))}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                              tabIndex={-1}
                            >
                              <X size={14} />
                            </button>
                          )}
                        </div>
                        <span className="text-sm text-muted-foreground shrink-0">zł</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <p className="text-xs text-muted-foreground">{t.listy.budgetLeaveEmpty}</p>
            </div>

            <div className="flex gap-2 mt-5 pt-4 border-t border-border">
              <button
                onClick={() => setBudgetModalOpen(false)}
                className="px-3 py-2 text-sm text-muted-foreground hover:bg-muted rounded-lg transition-colors"
              >
                {t.common.cancel}
              </button>
              <button
                onClick={saveBudget}
                disabled={savingBudget}
                className="ml-auto px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40"
              >
                {savingBudget ? t.listy.savingBudget : t.common.save}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FAB — mobile only */}
      {sections.filter((s) => !s.unsorted).length > 0 && (
        <div className="sm:hidden fixed bottom-6 right-5 z-40">
          {fabMenuOpen && (
            <>
              <div className="fixed inset-0" onClick={() => setFabMenuOpen(false)} />
              <div className="absolute bottom-16 right-0 bg-popover border border-border rounded-2xl shadow-xl overflow-hidden min-w-[180px]">
                <p className="text-[11px] font-medium text-muted-foreground px-4 pt-3 pb-1.5 uppercase tracking-wide">Dodaj produkt do</p>
                {sections.filter((s) => !s.unsorted).map((s) => (
                  <button
                    key={s.id}
                    onClick={() => { setFabMenuOpen(false); setDialogState({ open: true, sectionId: s.id }); }}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted transition-colors"
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            </>
          )}
          <button
            onClick={() => {
              const real = sections.filter((s) => !s.unsorted);
              if (real.length === 1) {
                setDialogState({ open: true, sectionId: real[0].id });
              } else {
                setFabMenuOpen((v) => !v);
              }
            }}
            className="w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:opacity-90 active:scale-95 transition-all"
            title="Dodaj produkt"
          >
            <Plus size={24} />
          </button>
        </div>
      )}
      </div>
    </div>
  );
}
