"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, Plus, ExternalLink, Minus, MoreHorizontal, Pencil, Trash2, GripVertical, FileDown, Sheet } from "lucide-react";
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
}

interface Section {
  id: string;
  name: string;
  order: number;
  products: Product[];
}

interface ListDetailProps {
  list: {
    id: string;
    name: string;
    shareToken: string;
    project: { id: string; title: string } | null;
    sections: Section[];
  };
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

function SectionTotal({ products }: { products: Product[] }) {
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

  return (
    <span className="text-sm font-semibold text-foreground">
      {total.toLocaleString("pl-PL", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} {currency}
    </span>
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
  deleting,
}: {
  product: Product;
  index: number;
  last: boolean;
  listId: string;
  sectionId: string;
  onQuantityChange: (productId: string, qty: number) => void;
  onEdit: () => void;
  onDelete: () => void;
  deleting?: boolean;
}) {
  const [qty, setQty] = useState(product.quantity);
  const [saving, setSaving] = useState(false);

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

  return (
    <div className={`flex items-center gap-4 px-4 py-3 hover:bg-muted/30 transition-colors ${!last ? "border-b border-border" : ""}`}>
      {/* Index */}
      <span className="w-5 text-right text-xs text-muted-foreground tabular-nums shrink-0">{index + 1}</span>

      {/* Image */}
      <div className="w-16 h-16 shrink-0 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.imageUrl} alt={product.name} className="w-full h-full object-contain" />
        ) : (
          <span className="text-xl text-muted-foreground/30 select-none">📦</span>
        )}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm text-foreground truncate">{product.name}</p>
        {product.manufacturer && (
          <p className="text-xs text-muted-foreground mt-0.5">{product.manufacturer}</p>
        )}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1">
          {product.color && <span className="text-xs text-muted-foreground">Kolor: {product.color}</span>}
          {product.size && <span className="text-xs text-muted-foreground">Rozmiar: {product.size}</span>}
          {product.deliveryTime && <span className="text-xs text-muted-foreground">Dostawa: {product.deliveryTime}</span>}
        </div>
      </div>

      {/* Qty + Price (right side) */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Quantity control */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => updateQty(qty - 1)}
            disabled={qty <= 1 || saving}
            className="w-6 h-6 rounded flex items-center justify-center border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 disabled:opacity-30 transition-colors"
          >
            <Minus size={11} />
          </button>
          <span className="w-6 text-center text-sm font-medium tabular-nums">{qty}</span>
          <button
            onClick={() => updateQty(qty + 1)}
            disabled={saving}
            className="w-6 h-6 rounded flex items-center justify-center border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 disabled:opacity-30 transition-colors"
          >
            <Plus size={11} />
          </button>
        </div>

        {/* Price */}
        {totalPrice !== null && (
          <div className="text-right min-w-[72px]">
            <p className="text-sm font-semibold text-foreground tabular-nums">
              {totalPrice.toLocaleString("pl-PL", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} {currency}
            </p>
            {qty > 1 && unitPrice !== null && (
              <p className="text-xs text-muted-foreground tabular-nums">
                {unitPrice.toLocaleString("pl-PL", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} / szt.
              </p>
            )}
          </div>
        )}

        {/* External link */}
        {product.url ? (
          <a
            href={product.url}
            target="_blank"
            rel="noopener noreferrer"
            className="w-7 h-7 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title="Otwórz produkt"
          >
            <ExternalLink size={14} />
          </a>
        ) : (
          <span className="w-7" />
        )}

        {/* 3-dot menu */}
        <DropdownMenu>
          <DropdownMenuTrigger
            disabled={deleting}
            className="w-7 h-7 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-40"
          >
            <MoreHorizontal size={15} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}>
              <Pencil size={13} className="mr-2" />
              Edytuj
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
              <Trash2 size={13} className="mr-2" />
              Usuń produkt
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

function SortableSection({ id, children }: { id: string; children: (dragHandle: React.ReactNode) => React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
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

export default function ListDetail({ list }: ListDetailProps) {
  const [sections, setSections] = useState<Section[]>(list.sections);
  const [addingSection, setAddingSection] = useState(false);
  const [newSectionName, setNewSectionName] = useState("");
  const [savingSection, setSavingSection] = useState(false);
  const [dialogState, setDialogState] = useState<{ open: boolean; sectionId: string | null }>({
    open: false,
    sectionId: null,
  });
  const [editState, setEditState] = useState<{ product: Product; sectionId: string } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editingSectionName, setEditingSectionName] = useState("");
  const sectionInputRef = useRef<HTMLInputElement>(null);
  const sectionEditRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = sections.findIndex((s) => s.id === active.id);
    const newIndex = sections.findIndex((s) => s.id === over.id);
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
      setSections((prev) => [...prev, section]);
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
      if (section.products.length === 0) continue;

      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text(section.name, 14, y);
      y += 2;

      const rows = section.products.map((p, i) => {
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
      globalIdx += section.products.length;

      const sectionTotal = section.products.reduce((s, p) => {
        const n = parsePrice(p.price);
        return n !== null ? s + n * p.quantity : s;
      }, 0);
      const sectionCur = getCurrency(section.products.find((p) => getCurrency(p.price))?.price ?? null);

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
      wsData.push([section.name]);
      wsData.push(["Lp.", "Nazwa", "Producent", "Kolor", "Rozmiar", "Czas dostawy", "Szt.", "Cena jedn.", "Cena łączna"]);

      for (const p of section.products) {
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

      const sectionTotal = section.products.reduce((s, p) => {
        const n = parsePrice(p.price);
        return n !== null ? s + n * p.quantity : s;
      }, 0);
      const sectionCur = getCurrency(section.products.find((p) => getCurrency(p.price))?.price ?? null);
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
      <div className="flex items-center justify-between gap-3 mb-5 min-w-0">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/listy"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            <ChevronLeft size={16} />
            Listy
          </Link>
          <span className="text-muted-foreground">/</span>
          <h1 className="text-xl font-bold truncate">{list.name}</h1>
          {list.project && (
            <span className="text-xs text-muted-foreground shrink-0">· {list.project.title}</span>
          )}
        </div>
        <ShareDialog shareUrl={typeof window !== "undefined" ? `${window.location.origin}/share/list/${list.shareToken}` : `/share/list/${list.shareToken}`} />
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 mb-6 p-2 bg-muted/40 border border-border rounded-xl">
        <div className="flex items-center gap-2">
          <Button onClick={openAddSection} className="flex items-center gap-1.5 h-8 px-3 text-xs">
            <Plus size={13} />
            Dodaj sekcję
          </Button>
          <div className="w-px h-5 bg-border mx-1" />
          <button
            onClick={exportToPDF}
            className="flex items-center gap-1.5 h-8 px-3 text-xs rounded-lg border border-border bg-background hover:bg-muted transition-colors text-foreground"
          >
            <FileDown size={13} />
            Eksport PDF
          </button>
          <button
            onClick={exportToXLSX}
            className="flex items-center gap-1.5 h-8 px-3 text-xs rounded-lg border border-border bg-background hover:bg-muted transition-colors text-foreground"
          >
            <Sheet size={13} />
            Eksport XLSX
          </button>
        </div>
        {hasTotal && (
          <div className="flex items-center gap-1.5 text-sm shrink-0 pr-1">
            <span className="text-muted-foreground text-xs">Suma:</span>
            <span className="font-semibold tabular-nums">
              {grandTotal.toLocaleString("pl-PL", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} {grandCurrency}
            </span>
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
            className="flex-1 px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-[#19213D]/20 focus:border-[#19213D]/40"
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
          <div className="w-16 h-16 rounded-2xl bg-[#19213D]/10 flex items-center justify-center mb-4">
            <Plus size={28} className="text-[#19213D]" />
          </div>
          <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-1">Brak sekcji</h2>
          <p className="text-sm text-gray-400 max-w-xs">
            Kliknij „Dodaj sekcję" aby stworzyć pierwszą sekcję, np. Salon lub Kuchnia.
          </p>
        </div>
      )}

      {/* Sections */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
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
                            className="text-base font-semibold bg-transparent border-b border-[#19213D]/40 focus:outline-none focus:border-[#19213D] px-0 min-w-0 w-auto"
                          />
                        ) : (
                          <h2
                            className="text-base font-semibold text-foreground cursor-pointer hover:text-[#19213D] transition-colors"
                            onClick={() => startEditSection(section)}
                            title="Kliknij aby edytować"
                          >
                            {section.name}
                          </h2>
                        )}
                        {section.products.length > 0 && (
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-muted text-xs text-muted-foreground font-medium tabular-nums shrink-0">
                            {section.products.length}
                          </span>
                        )}
                      </div>
                      <SectionTotal products={section.products} />
                    </div>

                    {section.products.length === 0 ? (
                      <div
                        className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-[#19213D]/30 hover:bg-[#19213D]/5 transition-colors"
                        onClick={() => setDialogState({ open: true, sectionId: section.id })}
                      >
                        <Plus size={20} className="mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Dodaj pierwszy produkt</p>
                      </div>
                    ) : (
                      <div className="bg-card border border-border rounded-xl overflow-hidden">
                        {section.products.map((product, i) => (
                          <ProductRow
                            key={product.id}
                            product={product}
                            index={i}
                            last={i === section.products.length - 1}
                            listId={list.id}
                            sectionId={section.id}
                            onQuantityChange={(pid, qty) => handleQuantityChange(section.id, pid, qty)}
                            onEdit={() => setEditState({ product, sectionId: section.id })}
                            onDelete={() => handleDeleteProduct(section.id, product.id)}
                            deleting={deletingId === product.id}
                          />
                        ))}
                        <button
                          onClick={() => setDialogState({ open: true, sectionId: section.id })}
                          className="w-full flex items-center gap-1.5 px-4 py-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/30 border-t border-border transition-colors"
                        >
                          <Plus size={13} />
                          Dodaj produkt
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </SortableSection>
            ))}
          </div>
        </SortableContext>
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
          }}
          onUpdated={(updated) => {
            handleProductUpdated(editState.sectionId, updated as Product);
            setEditState(null);
          }}
        />
      )}
    </div>
  );
}
