"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, Plus, ExternalLink, Minus, MoreHorizontal, Pencil, Trash2, GripVertical, FileDown, Sheet, MessageSquare, ArrowUpDown, Eye, EyeOff, Check, X, RotateCcw, FolderInput, Wallet } from "lucide-react";
import ProductCommentPanel from "./ProductCommentPanel";
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

const CATEGORIES = [
  { value: "LAMPY", label: "Lampy" },
  { value: "AKCESORIA", label: "Akcesoria" },
  { value: "MEBLE", label: "Meble" },
  { value: "ARMATURA", label: "Armatura" },
  { value: "OKLADZINY_SCIENNE", label: "Okładziny ścienne" },
  { value: "PODLOGA", label: "Podłoga" },
];

const SORT_OPTIONS = [
  { value: "manual", label: "Ręcznie" },
  { value: "category", label: "Kategoria" },
  { value: "name", label: "Nazwa" },
  { value: "price", label: "Cena" },
];

function getCategoryLabel(value: string | null | undefined): string {
  if (!value) return "";
  return CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

interface Product {
  id: string;
  name: string;
  url: string | null;
  imageUrl: string | null;
  price: string | null;
  manufacturer: string | null;
  color: string | null;
  size: string | null;
  description: string | null;
  deliveryTime: string | null;
  quantity: number;
  order: number;
  hidden: boolean;
  category: string | null;
  approval: string | null;
  commentCount?: number;
}


interface Section {
  id: string;
  name: string;
  order: number;
  sortBy: string;
  budget: number | null;
  products: Product[];
}

interface ListDetailProps {
  list: {
    id: string;
    name: string;
    shareToken: string;
    budget: number | null;
    project: { id: string; title: string; hiddenModules: string[] } | null;
    sections: Section[];
  };
  categoryOrder: string[];
}

function getSortBy(sortBy: string | null | undefined): string {
  return sortBy || "manual";
}

function parsePrice(price: string | null): number | null {
  if (!price) return null;
  const num = parseFloat(price.replace(/[^\d.,]/g, "").replace(",", "."));
  return isNaN(num) ? null : num;
}

function getCurrency(price: string | null): string {
  if (!price) return "";
  return price.replace(/[\d.,\s]/g, "").trim();
}

function SectionTotal({ products, budget }: { products: Product[]; budget?: number | null }) {
  let total = 0;
  let currency = "";
  let hasAny = false;

  for (const p of products) {
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
      {total.toLocaleString("pl-PL", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} {currency}
      {pct !== null && (
        <span className={`text-xs font-medium tabular-nums ${total > budget! ? "text-red-500" : pct >= 80 ? "text-amber-500" : "text-green-600 dark:text-green-400"}`}>
          ({pct}%)
        </span>
      )}
    </span>
  );
}

function MoveSectionDialog({
  open,
  onOpenChange,
  sections,
  currentSectionId,
  productName,
  onMove,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  sections: Section[];
  currentSectionId: string;
  productName: string;
  onMove: (targetSectionId: string) => void;
}) {
  const targets = sections.filter((s) => s.id !== currentSectionId);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Przenieś produkt</DialogTitle>
          <DialogDescription className="truncate">„{productName}"</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-1 mt-2">
          {targets.map((s) => (
            <button
              key={s.id}
              onClick={() => { onMove(s.id); onOpenChange(false); }}
              className="w-full text-left px-4 py-3 rounded-lg hover:bg-muted transition-colors text-sm font-medium"
            >
              {s.name}
            </button>
          ))}
          {targets.length === 0 && (
            <p className="text-sm text-muted-foreground px-4 py-3">Brak innych sekcji.</p>
          )}
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
  onApprovalChange,
  approval,
  commentCount,
  unread,
  deleting,
  dragHandle,
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
  onMove: () => void;
  onApprovalChange: (value: string | null) => void;
  approval: string | null;
  commentCount: number;
  unread: boolean;
  deleting?: boolean;
  dragHandle?: React.ReactNode;
}) {
  const [qty, setQty] = useState(product.quantity);
  const [saving, setSaving] = useState(false);
  const [lightbox, setLightbox] = useState(false);

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
      toast.error("Błąd aktualizacji ilości");
    } finally {
      setSaving(false);
    }
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
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onEdit}>
          <Pencil size={13} className="mr-2" />
          Edytuj
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {approval !== "accepted" && (
          <DropdownMenuItem onClick={() => onApprovalChange("accepted")}>
            <Check size={13} className="mr-2 text-green-600" />
            Zaakceptuj
          </DropdownMenuItem>
        )}
        {approval !== "rejected" && (
          <DropdownMenuItem onClick={() => onApprovalChange("rejected")}>
            <X size={13} className="mr-2 text-red-500" />
            Odrzuć
          </DropdownMenuItem>
        )}
        {approval !== null && (
          <DropdownMenuItem onClick={() => onApprovalChange(null)}>
            <RotateCcw size={13} className="mr-2" />
            Resetuj status
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onToggleHidden}>
          {product.hidden ? <Eye size={13} className="mr-2" /> : <EyeOff size={13} className="mr-2" />}
          {product.hidden ? "Pokaż klientowi" : "Ukryj przed klientem"}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onMove}>
          <FolderInput size={13} className="mr-2" />
          Przenieś do sekcji
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
          <Trash2 size={13} className="mr-2" />
          Usuń produkt
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const image = (
    <div
      className={`shrink-0 rounded-xl bg-muted flex items-center justify-center overflow-hidden ${product.imageUrl ? "cursor-zoom-in" : ""}`}
      onClick={() => product.imageUrl && setLightbox(true)}
    >
      {product.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={product.imageUrl} alt={product.name} className="w-full h-full object-contain" />
      ) : (
        <span className="text-muted-foreground/30 select-none">📦</span>
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

  return (
    <div className={`hover:bg-muted/30 transition-colors ${!last ? "border-b border-border" : ""} ${product.hidden ? "opacity-40" : ""}`}>
      {lightboxEl}

      {/* ── DESKTOP layout (md+) — original ── */}
      <div className="hidden md:flex items-center gap-2 px-4 py-4">
        {dragHandle ?? <span className="w-4 shrink-0" />}
        <div className="flex flex-col justify-between shrink-0 h-32">
          <button onClick={onToggleHidden} className="w-5 h-5 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors" title={product.hidden ? "Pokaż klientowi" : "Ukryj przed klientem"}>
            {product.hidden ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
          <button onClick={onMove} className="w-5 h-5 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors" title="Przenieś do innej sekcji">
            <FolderInput size={14} />
          </button>
        </div>
        <div className="w-32 h-32">{image}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium text-sm text-foreground truncate">{product.name}</p>
            {product.category && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#C45824]/8 text-[#C45824] dark:bg-[#C45824]/20 shrink-0">
                {getCategoryLabel(product.category)}
              </span>
            )}
          </div>
          {product.manufacturer && <p className="text-xs text-muted-foreground mt-0.5">{product.manufacturer}</p>}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1">
            {product.color && <span className="text-xs text-muted-foreground">Kolor: {product.color}</span>}
            {product.size && <span className="text-xs text-muted-foreground">Rozmiar: {product.size}</span>}
            {product.deliveryTime && <span className="text-xs text-muted-foreground">Dostawa: {product.deliveryTime}</span>}
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {approval === "accepted" && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 shrink-0">Zaakceptowane</span>}
          {approval === "rejected" && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 shrink-0">Odrzucone</span>}
          <div className="flex items-center gap-1">
            <button onClick={() => updateQty(qty - 1)} disabled={qty <= 1 || saving} className="w-6 h-6 rounded flex items-center justify-center border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 disabled:opacity-30 transition-colors"><Minus size={11} /></button>
            <span className="w-6 text-center text-sm font-medium tabular-nums">{qty}</span>
            <button onClick={() => updateQty(qty + 1)} disabled={saving} className="w-6 h-6 rounded flex items-center justify-center border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 disabled:opacity-30 transition-colors"><Plus size={11} /></button>
          </div>
          {totalPrice !== null && (
            <div className="text-right min-w-[72px]">
              <p className="text-sm font-semibold text-foreground tabular-nums">{totalPrice.toLocaleString("pl-PL", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} {currency}</p>
              {qty > 1 && unitPrice !== null && <p className="text-xs text-muted-foreground tabular-nums">{unitPrice.toLocaleString("pl-PL", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} / szt.</p>}
            </div>
          )}
          {product.url ? (
            <a href={product.url} target="_blank" rel="noopener noreferrer" className="w-7 h-7 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" title="Otwórz produkt"><ExternalLink size={14} /></a>
          ) : <span className="w-7" />}
          <button onClick={onOpenComments} className="relative flex items-center justify-center w-7 h-7 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" title="Komentarze">
            <MessageSquare size={15} className={unread ? "text-blue-500" : ""} />
            {commentCount > 0 && <span className={`absolute -top-1 -right-1 min-w-[14px] h-[14px] rounded-full text-white text-[9px] font-bold flex items-center justify-center px-0.5 leading-none transition-colors ${unread ? "bg-blue-500" : "bg-muted-foreground/40"}`}>{commentCount > 99 ? "99+" : commentCount}</span>}
          </button>
          {dropdown}
        </div>
      </div>

      {/* ── MOBILE layout (< md) — compact ── */}
      <div className="md:hidden flex items-start gap-2 px-3 py-2.5">
        {dragHandle ?? <span className="w-4 shrink-0" />}
        <div className="w-14 h-14 shrink-0 rounded-lg overflow-hidden bg-muted flex items-center justify-center">
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
              <p className="font-medium text-sm text-foreground leading-tight truncate">{product.name}</p>
              {product.manufacturer && <p className="text-xs text-muted-foreground truncate">{product.manufacturer}</p>}
            </div>
            <div className="shrink-0 -mt-0.5">{dropdown}</div>
          </div>
          {/* Row 2: price + category + approval */}
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            {totalPrice !== null && (
              <span className="text-sm font-semibold text-foreground tabular-nums">
                {totalPrice.toLocaleString("pl-PL", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} {currency}
              </span>
            )}
            {product.category && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#C45824]/8 text-[#C45824] dark:bg-[#C45824]/20 shrink-0">
                {getCategoryLabel(product.category)}
              </span>
            )}
            {approval === "accepted" && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Zaakceptowane</span>}
            {approval === "rejected" && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Odrzucone</span>}
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
              <MessageSquare size={14} className={unread ? "text-blue-500" : ""} />
              {commentCount > 0 && <span className={`absolute -top-1 -right-1 min-w-[14px] h-[14px] rounded-full text-white text-[9px] font-bold flex items-center justify-center px-0.5 leading-none ${unread ? "bg-blue-500" : "bg-muted-foreground/40"}`}>{commentCount > 99 ? "99+" : commentCount}</span>}
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

function sortProducts(products: Product[], sortBy: string, categoryOrder: string[]): Product[] {
  if (sortBy === "manual") return products;
  const sorted = [...products];
  if (sortBy === "name") {
    sorted.sort((a, b) => a.name.localeCompare(b.name, "pl"));
  } else if (sortBy === "price") {
    sorted.sort((a, b) => {
      const pa = parsePrice(a.price) ?? Infinity;
      const pb = parsePrice(b.price) ?? Infinity;
      return pa - pb;
    });
  } else if (sortBy === "category") {
    const order = categoryOrder.length > 0 ? categoryOrder : CATEGORIES.map((c) => c.value);
    sorted.sort((a, b) => {
      const ia = a.category ? order.indexOf(a.category) : order.length;
      const ib = b.category ? order.indexOf(b.category) : order.length;
      const ai = ia === -1 ? order.length : ia;
      const bi = ib === -1 ? order.length : ib;
      return ai - bi;
    });
  }
  return sorted;
}

export default function ListDetail({ list, designerName, designerLogoUrl, initialOpenProductId, categoryOrder }: ListDetailProps & { designerName?: string; designerLogoUrl?: string; initialOpenProductId?: string }) {
  const [sections, setSections] = useState<Section[]>(list.sections);
  const [budget, setBudget] = useState<number | null>(list.budget);
  const [sectionBudgets, setSectionBudgets] = useState<Record<string, number | null>>(() =>
    Object.fromEntries(list.sections.map((s) => [s.id, s.budget ?? null]))
  );
  const [budgetModalOpen, setBudgetModalOpen] = useState(false);
  const [budgetInput, setBudgetInput] = useState(list.budget != null ? String(list.budget) : "");
  const [sectionBudgetInputs, setSectionBudgetInputs] = useState<Record<string, string>>(() =>
    Object.fromEntries(list.sections.map((s) => [s.id, s.budget != null ? String(s.budget) : ""]))
  );
  const [savingBudget, setSavingBudget] = useState(false);
  const [addingSection, setAddingSection] = useState(false);
  const [newSectionName, setNewSectionName] = useState("");
  const [savingSection, setSavingSection] = useState(false);
  const [dialogState, setDialogState] = useState<{ open: boolean; sectionId: string | null }>({
    open: false,
    sectionId: null,
  });
  const [editState, setEditState] = useState<{ product: Product; sectionId: string } | null>(null);
  const [moveState, setMoveState] = useState<{ product: Product; sectionId: string } | null>(null);
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
      toast.error("Błąd zapisu sortowania sekcji");
    }
  }

  const authorName = designerName || "Projektant";

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
    return () => {
      channel.unbind("comment-activity");
      channel.unbind("approval-change");
      pusherClient.unsubscribe(`shopping-list-${list.id}`);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCountChange = useCallback((productId: string, count: number) => {
    setCommentCounts((prev) => ({ ...prev, [productId]: count }));
  }, []);

  function openCommentsPanel(productId: string) {
    const lastReadAt = localStorage.getItem(`lc_readAt_${productId}`);
    localStorage.setItem(`lc_readAt_${productId}`, new Date().toISOString());
    localStorage.removeItem(`lc_unread_${productId}`);
    getUnreadSet(list.id).delete(productId);
    syncListUnread(list.id);
    setUnreadProducts((prev) => {
      const next = new Set(prev);
      next.delete(productId);
      return next;
    });
    setPanelLastReadAt(lastReadAt);
    setCommentsPanelProductId(productId);
  }

  function closeCommentsPanel() {
    if (commentsPanelProductId) {
      const currentCount = commentCounts[commentsPanelProductId] ?? 0;
      localStorage.setItem(`lc_seen_${commentsPanelProductId}`, String(currentCount));
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
      const oldIndex = sections.findIndex((s) => s.id === active.id);
      const newIndex = sections.findIndex((s) => s.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;
      const reordered = arrayMove(sections, oldIndex, newIndex);
      setSections(reordered);
      try {
        await fetch(`/api/lists/${list.id}/sections`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order: reordered.map((s) => s.id) }),
        });
      } catch {
        toast.error("Błąd zapisu kolejności sekcji");
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
          toast.error("Błąd zapisu kolejności produktów");
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
          toast.success("Produkt przeniesiony");
        } catch {
          setSections((prev) =>
            prev.map((s) => {
              if (s.id === sourceSectionId) return { ...s, products: [...s.products, product] };
              if (s.id === targetSectionId) return { ...s, products: s.products.filter((p) => p.id !== active.id) };
              return s;
            })
          );
          toast.error("Błąd przenoszenia produktu");
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
      toast.error("Błąd zapisu nazwy sekcji");
    }
  }

  async function saveBudget() {
    const parsedList = budgetInput.trim() === "" ? null : parseFloat(budgetInput.replace(",", "."));
    if (budgetInput.trim() !== "" && (isNaN(parsedList!) || parsedList! < 0)) {
      toast.error("Nieprawidłowa wartość budżetu listy");
      return;
    }
    for (const [sid, val] of Object.entries(sectionBudgetInputs)) {
      if (val.trim() !== "") {
        const p = parseFloat(val.replace(",", "."));
        if (isNaN(p) || p < 0) { toast.error("Nieprawidłowa wartość budżetu sekcji"); return; }
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
        ...sections.map((s) => {
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
        sections.map((s) => {
          const val = sectionBudgetInputs[s.id] ?? "";
          return [s.id, val.trim() === "" ? null : parseFloat(val.replace(",", "."))];
        })
      ));
      setBudgetModalOpen(false);
      toast.success("Budżet zapisany");
    } catch {
      toast.error("Błąd zapisu budżetu");
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
      toast.error("Błąd tworzenia sekcji");
    } finally {
      setSavingSection(false);
    }
  }

  function handleProductAdded(sectionId: string, product: unknown) {
    setSections((prev) =>
      prev.map((s) =>
        s.id === sectionId ? { ...s, products: [...s.products, product as Product] } : s
      )
    );
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
      toast.success("Produkt przeniesiony");
    } catch {
      setSections((prev) =>
        prev.map((s) => {
          if (s.id === sourceSectionId) return { ...s, products: [...s.products, product] };
          if (s.id === targetSectionId) return { ...s, products: s.products.filter((p) => p.id !== productId) };
          return s;
        })
      );
      toast.error("Błąd przenoszenia produktu");
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
        toast.error("Błąd zmiany widoczności produktu");
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
      toast.error("Błąd zmiany widoczności produktu");
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
      toast.error("Błąd zmiany statusu akceptacji");
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
      toast.success("Produkt usunięty");
    } catch {
      toast.error("Błąd usuwania produktu");
    } finally {
      setDeletingId(null);
    }
  }

  // Grand total across all sections
  const allProducts = sections.flatMap((s) => s.products);
  const grandTotal = allProducts.reduce((sum, p) => {
    const n = parsePrice(p.price);
    return n !== null ? sum + n * p.quantity : sum;
  }, 0);
  const grandCurrency = allProducts.find((p) => getCurrency(p.price))
    ? getCurrency(allProducts.find((p) => getCurrency(p.price))!.price)
    : "";
  const hasTotal = allProducts.some((p) => parsePrice(p.price) !== null);

  async function exportToPDF() {
    const { default: jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    const today = new Date().toLocaleDateString("pl-PL");
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(list.name, 14, 20);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(120);
    doc.text(`Wygenerowano: ${today}${list.project ? `  ·  Projekt: ${list.project.title}` : ""}`, 14, 27);
    doc.setTextColor(0);

    let y = 34;
    let globalIdx = 1;

    for (const section of sections) {
      const visibleProducts = section.products.filter((p) => !p.hidden);
      if (visibleProducts.length === 0) continue;

      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text(section.name, 14, y);
      y += 2;

      const rows = visibleProducts.map((p, i) => {
        const unit = parsePrice(p.price);
        const total = unit !== null ? unit * p.quantity : null;
        const fmt = (n: number | null) =>
          n !== null ? n.toLocaleString("pl-PL", { minimumFractionDigits: 0, maximumFractionDigits: 2 }) : "—";
        const cur = getCurrency(p.price);
        return [
          globalIdx + i,
          p.name,
          p.manufacturer || "—",
          p.color || "—",
          p.size || "—",
          p.quantity,
          unit !== null ? `${fmt(unit)} ${cur}` : "—",
          total !== null ? `${fmt(total)} ${cur}` : "—",
        ];
      });
      globalIdx += visibleProducts.length;

      const sectionTotal = visibleProducts.reduce((s, p) => {
        const n = parsePrice(p.price);
        return n !== null ? s + n * p.quantity : s;
      }, 0);
      const sectionCur = getCurrency(visibleProducts.find((p) => getCurrency(p.price))?.price ?? null);

      autoTable(doc, {
        startY: y,
        head: [["Lp.", "Nazwa", "Producent", "Kolor", "Rozmiar", "Szt.", "Cena jedn.", "Łącznie"]],
        body: rows,
        foot: sectionTotal > 0
          ? [[{ content: `Suma sekcji: ${sectionTotal.toLocaleString("pl-PL", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ${sectionCur}`, colSpan: 8, styles: { halign: "right", fontStyle: "bold" } }]]
          : undefined,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [25, 33, 61], textColor: 255, fontStyle: "bold" },
        footStyles: { fillColor: [240, 240, 240], textColor: 60 },
        columnStyles: { 0: { cellWidth: 8 }, 5: { cellWidth: 10, halign: "center" }, 6: { cellWidth: 24, halign: "right" }, 7: { cellWidth: 24, halign: "right" } },
        margin: { left: 14, right: 14 },
        didDrawPage: (data) => { y = data.cursor?.y ?? y; },
      });

      y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
    }

    if (hasTotal) {
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(
        `Suma całkowita: ${grandTotal.toLocaleString("pl-PL", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ${grandCurrency}`,
        doc.internal.pageSize.getWidth() - 14,
        y,
        { align: "right" }
      );
    }

    doc.save(`${list.name}.pdf`);
  }

  async function exportToXLSX() {
    const XLSX = await import("xlsx");
    const wb = XLSX.utils.book_new();
    const wsData: unknown[][] = [];

    wsData.push([list.name]);
    wsData.push([`Projekt: ${list.project?.title ?? "—"}`, "", "", "", "", "", "", `Wygenerowano: ${new Date().toLocaleDateString("pl-PL")}`]);
    wsData.push([]);

    let globalIdx = 1;

    for (const section of sections) {
      const visibleProducts = section.products.filter((p) => !p.hidden);
      if (visibleProducts.length === 0) continue;

      wsData.push([section.name]);
      wsData.push(["Lp.", "Nazwa", "Producent", "Kolor", "Rozmiar", "Czas dostawy", "Szt.", "Cena jedn.", "Cena łączna"]);

      for (const p of visibleProducts) {
        const unit = parsePrice(p.price);
        const total = unit !== null ? unit * p.quantity : null;
        const cur = getCurrency(p.price);
        wsData.push([
          globalIdx++,
          p.name,
          p.manufacturer || "",
          p.color || "",
          p.size || "",
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
        wsData.push(["", "", "", "", "", "", "", "Suma sekcji:", `${sectionTotal.toLocaleString("pl-PL")} ${sectionCur}`]);
      }
      wsData.push([]);
    }

    if (hasTotal) {
      wsData.push(["", "", "", "", "", "", "", "SUMA CAŁKOWITA:", `${grandTotal.toLocaleString("pl-PL")} ${grandCurrency}`]);
    }

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws["!cols"] = [{ wch: 5 }, { wch: 35 }, { wch: 18 }, { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 6 }, { wch: 15 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, ws, "Lista");
    XLSX.writeFile(wb, `${list.name}.xlsx`);
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-5 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <Link
            href="/listy"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            <ChevronLeft size={16} />
            <span className="hidden sm:inline">Listy</span>
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

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-6 p-2 bg-muted/40 border border-border rounded-xl">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Button onClick={openAddSection} className="flex items-center gap-1.5 h-8 px-3 text-xs">
            <Plus size={13} />
            <span className="hidden xs:inline">Dodaj sekcję</span>
            <span className="xs:hidden">Sekcja</span>
          </Button>
          <div className="w-px h-5 bg-border mx-0.5 hidden sm:block" />
          <button
            onClick={exportToPDF}
            className="flex items-center gap-1 h-8 px-2 sm:px-3 text-xs rounded-lg border border-border bg-background hover:bg-muted transition-colors text-foreground"
            title="Eksport PDF"
          >
            <FileDown size={13} />
            <span className="hidden sm:inline">Eksport PDF</span>
          </button>
          <button
            onClick={exportToXLSX}
            className="flex items-center gap-1 h-8 px-2 sm:px-3 text-xs rounded-lg border border-border bg-background hover:bg-muted transition-colors text-foreground"
            title="Eksport XLSX"
          >
            <Sheet size={13} />
            <span className="hidden sm:inline">Eksport XLSX</span>
          </button>
          <button
            onClick={() => { setBudgetInput(budget != null ? String(budget) : ""); setBudgetModalOpen(true); }}
            className="flex items-center gap-1 h-8 px-2 sm:px-3 text-xs rounded-lg border border-border bg-background hover:bg-muted transition-colors text-foreground"
            title="Ustaw budżet"
          >
            <Wallet size={13} />
            <span className="hidden sm:inline">{budget != null ? "Budżet" : "Ustaw budżet"}</span>
          </button>
        </div>
        {hasTotal && (
          <div className="flex flex-col items-end gap-1 shrink-0 pr-1 min-w-0">
            <div className="flex items-center gap-1.5 text-sm">
              <span className="text-muted-foreground text-xs">Suma:</span>
              <span className={`font-semibold tabular-nums ${budget != null && budget > 0 && grandTotal > budget ? "text-red-500" : ""}`}>
                {grandTotal.toLocaleString("pl-PL", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} {grandCurrency}
              </span>
              {budget != null && budget > 0 && (
                <span className="text-xs text-muted-foreground tabular-nums">
                  / {budget.toLocaleString("pl-PL", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} {grandCurrency}
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

      {/* Add section inline form */}
      {addingSection && (
        <form onSubmit={handleAddSection} className="flex gap-2 mb-6">
          <input
            ref={sectionInputRef}
            value={newSectionName}
            onChange={(e) => setNewSectionName(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && setAddingSection(false)}
            placeholder="Nazwa sekcji, np. Salon"
            className="flex-1 px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-[#C45824]/20 focus:border-[#C45824]/40"
          />
          <Button type="submit" disabled={savingSection || !newSectionName.trim()}>
            {savingSection ? "Tworzenie..." : "Utwórz"}
          </Button>
          <Button type="button" variant="outline" onClick={() => setAddingSection(false)}>
            Anuluj
          </Button>
        </form>
      )}

      {/* Empty state */}
      {sections.length === 0 && !addingSection && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#C45824]/10 flex items-center justify-center mb-4">
            <Plus size={28} className="text-[#C45824]" />
          </div>
          <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-1">Brak sekcji</h2>
          <p className="text-sm text-gray-400 max-w-xs">
            Kliknij „Dodaj sekcję" aby stworzyć pierwszą sekcję, np. Salon lub Kuchnia.
          </p>
        </div>
      )}

      {/* Sections */}
      <DndContext id={`sections-${list.id}`} sensors={sensors} collisionDetection={closestCenter} onDragStart={handleSectionDragStart} onDragEnd={handleDragEnd} onDragCancel={() => { setIsDraggingSection(false); setActiveDragProduct(null); }}>
        <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-8">
            {sections.map((section) => (
              <SortableSection key={section.id} id={section.id}>
                {(dragHandle) => (
                  <div>
                    {/* Section header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 min-w-0">
                        {dragHandle}
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
                            className="text-base font-semibold bg-transparent border-b border-[#C45824]/40 focus:outline-none focus:border-[#C45824] px-0 min-w-0 w-auto"
                          />
                        ) : (
                          <h2
                            className="text-base font-semibold text-foreground cursor-pointer hover:text-[#C45824] transition-colors"
                            onClick={() => startEditSection(section)}
                            title="Kliknij aby edytować"
                          >
                            {section.name}
                          </h2>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        {/* Sort dropdown */}
                        <div className="relative">
                          <button
                            onClick={() => setSortDropdownOpen(sortDropdownOpen === section.id ? null : section.id)}
                            className={`flex items-center gap-1 text-xs px-2 py-1 rounded-md border transition-colors ${
                              getSortBy(section.sortBy) !== "manual"
                                ? "border-[#C45824]/40 bg-[#C45824]/5 text-[#C45824] dark:text-blue-300"
                                : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
                            }`}
                            title="Sortuj sekcję"
                          >
                            <ArrowUpDown size={11} />
                            {SORT_OPTIONS.find((o) => o.value === getSortBy(section.sortBy))?.label ?? "Ręcznie"}
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
                                      getSortBy(section.sortBy) === opt.value ? "text-[#C45824] font-medium dark:text-blue-300" : "text-foreground"
                                    }`}
                                  >
                                    {getSortBy(section.sortBy) === opt.value && <span className="w-1.5 h-1.5 rounded-full bg-[#C45824] dark:bg-blue-400 shrink-0" />}
                                    {getSortBy(section.sortBy) !== opt.value && <span className="w-1.5 h-1.5 shrink-0" />}
                                    {opt.label}
                                  </button>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                        <SectionTotal products={section.products} budget={sectionBudgets[section.id]} />
                      </div>
                    </div>

                    {!isDraggingSection && section.products.length === 0 ? (
                      <div
                        className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-[#C45824]/30 hover:bg-[#C45824]/5 transition-colors"
                        onClick={() => setDialogState({ open: true, sectionId: section.id })}
                      >
                        <Plus size={20} className="mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Dodaj pierwszy produkt</p>
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
                                    onMove={() => setMoveState({ product, sectionId: section.id })}
                                    onApprovalChange={(value) => handleApprovalChange(section.id, product.id, value)}
                                    approval={approvals[product.id] ?? null}
                                    commentCount={commentCounts[product.id] ?? 0}
                                    unread={unreadProducts.has(product.id)}
                                    deleting={deletingId === product.id}
                                    dragHandle={dragHandle}
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
                          Dodaj produkt
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

      {dialogState.sectionId && (
        <AddProductDialog
          open={dialogState.open}
          onOpenChange={(open) => setDialogState({ open, sectionId: open ? dialogState.sectionId : null })}
          listId={list.id}
          sectionId={dialogState.sectionId}
          onAdded={(product) => handleProductAdded(dialogState.sectionId!, product)}
        />
      )}

      {editState && (
        <EditProductDialog
          open={true}
          onOpenChange={(open) => { if (!open) setEditState(null); }}
          listId={list.id}
          sectionId={editState.sectionId}
          product={{
            id: editState.product.id,
            name: editState.product.name,
            url: editState.product.url ?? "",
            imageUrl: editState.product.imageUrl ?? "",
            price: editState.product.price ?? "",
            manufacturer: editState.product.manufacturer ?? "",
            color: editState.product.color ?? "",
            size: editState.product.size ?? "",
            description: editState.product.description ?? "",
            deliveryTime: editState.product.deliveryTime ?? "",
            category: editState.product.category ?? "",
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
          sections={sections}
          currentSectionId={moveState.sectionId}
          productName={moveState.product.name}
          onMove={(targetSectionId) => handleMoveProduct(moveState.sectionId, moveState.product.id, targetSectionId)}
        />
      )}

      {commentsPanelProductId && (() => {
        const product = sections.flatMap((s) => s.products).find((p) => p.id === commentsPanelProductId);
        return product ? (
          <ProductCommentPanel
            productId={commentsPanelProductId}
            productName={product.name}
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

      {/* Budget modal */}
      {budgetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={() => setBudgetModalOpen(false)}>
          <div className="bg-card rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Wallet size={18} className="text-muted-foreground" />
                <h2 className="text-base font-semibold">Budżet listy</h2>
              </div>
              <button onClick={() => setBudgetModalOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 space-y-5 pr-1">
              {/* Overall budget */}
              <div className="space-y-2">
                <p className="text-sm font-semibold">Cała lista</p>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={budgetInput}
                    onChange={(e) => setBudgetInput(e.target.value)}
                    placeholder="np. 60 000"
                    className="flex-1 px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                    autoFocus
                  />
                  <span className="text-sm text-muted-foreground shrink-0">zł</span>
                </div>
              </div>

              {/* Section budgets */}
              {sections.length > 0 && (
                <div className="space-y-3">
                  <p className="text-sm font-semibold">Sekcje</p>
                  {sections.map((s) => (
                    <div key={s.id} className="space-y-1">
                      <label className="text-xs text-muted-foreground">{s.name}</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          step="100"
                          value={sectionBudgetInputs[s.id] ?? ""}
                          onChange={(e) => setSectionBudgetInputs((prev) => ({ ...prev, [s.id]: e.target.value }))}
                          placeholder="np. 15 000"
                          className="flex-1 px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                        <span className="text-sm text-muted-foreground shrink-0">zł</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <p className="text-xs text-muted-foreground">Zostaw pole puste, aby usunąć budżet dla danej pozycji.</p>
            </div>

            <div className="flex gap-2 mt-5 pt-4 border-t border-border">
              <button
                onClick={() => setBudgetModalOpen(false)}
                className="px-3 py-2 text-sm text-muted-foreground hover:bg-muted rounded-lg transition-colors"
              >
                Anuluj
              </button>
              <button
                onClick={saveBudget}
                disabled={savingBudget}
                className="ml-auto px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40"
              >
                {savingBudget ? "Zapisuję..." : "Zapisz"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
