"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Search, Package, ChevronLeft, ArrowUpDown, Pencil, Trash2, ExternalLink, Plus, Check, X, SlidersHorizontal, Layers } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";
import AddProductToLibraryDialog from "./AddProductToLibraryDialog";
import { SearchProductDialog } from "./SearchProductDialog";

const CATEGORY_LABELS: Record<string, string> = {
  OSWIETLENIE: "Oświetlenie",
  AKCESORIA: "Akcesoria",
  MEBLE: "Meble",
  ARMATURA: "Armatura",
  OKLADZINY_SCIENNE: "Okładziny ścienne",
  PODLOGA: "Podłoga",
};

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
  category: string | null;
  createdAt: string;
}

interface Props {
  initialProducts: Product[];
}

type GroupBy = "none" | "category" | "manufacturer";
type SortOption = "default" | "price-asc" | "price-desc" | "name-asc" | "name-desc";

const SORT_LABELS: Record<SortOption, string> = {
  "default": "Domyślne",
  "price-asc": "Cena: od najniższej",
  "price-desc": "Cena: od najwyższej",
  "name-asc": "Nazwa: A–Z",
  "name-desc": "Nazwa: Z–A",
};

function extractPrice(price: string | null): number {
  if (!price) return Infinity;
  const num = parseFloat(price.replace(/[^\d.,]/g, "").replace(",", "."));
  return isNaN(num) ? Infinity : num;
}

export default function ProduktyView({ initialProducts }: Props) {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [query, setQuery] = useState("");
  const [groupBy, setGroupBy] = useState<GroupBy>("none");
  const [sortOption, setSortOption] = useState<SortOption>("default");
  const [folderKey, setFolderKey] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [advancedSearchOpen, setAdvancedSearchOpen] = useState(false);

  const filtered = useMemo(() => {
    let list = products;
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.manufacturer?.toLowerCase().includes(q) ?? false)
      );
    }
    if (folderKey !== null) {
      if (groupBy === "category") {
        list = list.filter((p) => (p.category ?? "") === folderKey);
      } else if (groupBy === "manufacturer") {
        list = list.filter((p) => (p.manufacturer ?? "Brak producenta") === folderKey);
      }
    }
    if (sortOption !== "default") {
      list = [...list].sort((a, b) => {
        if (sortOption === "price-asc" || sortOption === "price-desc") {
          const pa = extractPrice(a.price);
          const pb = extractPrice(b.price);
          return sortOption === "price-asc" ? pa - pb : pb - pa;
        }
        const na = a.name.toLowerCase();
        const nb = b.name.toLowerCase();
        return sortOption === "name-asc" ? na.localeCompare(nb) : nb.localeCompare(na);
      });
    }
    return list;
  }, [products, query, groupBy, sortOption, folderKey]);

  const folders = useMemo(() => {
    if (groupBy === "none") return [];
    const map = new Map<string, number>();
    const source = query.trim()
      ? products.filter(
          (p) =>
            p.name.toLowerCase().includes(query.toLowerCase()) ||
            (p.manufacturer?.toLowerCase().includes(query.toLowerCase()) ?? false)
        )
      : products;
    for (const p of source) {
      const key =
        groupBy === "category"
          ? (p.category ?? "")
          : (p.manufacturer ?? "Brak producenta");
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .map(([key, count]) => ({ key, count }))
      .sort((a, b) => a.key.localeCompare(b.key));
  }, [products, groupBy, query]);

  function handleGroupChange(val: GroupBy) {
    setGroupBy(val);
    setFolderKey(null);
  }

  function handleFolderClick(key: string) {
    setFolderKey(key);
  }

  function handleBack() {
    setFolderKey(null);
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setProducts((prev) => prev.filter((p) => p.id !== id));
      toast.success("Produkt usunięty");
    } catch {
      toast.error("Błąd usuwania produktu");
    } finally {
      setDeletingId(null);
    }
  }

  function handleAdded(product: unknown) {
    setProducts((prev) => [product as Product, ...prev]);
  }

  function handleEdited(product: unknown) {
    const updated = product as Product;
    setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  }

  const showFolders = groupBy !== "none" && folderKey === null;
  const folderLabel =
    folderKey !== null
      ? groupBy === "category"
        ? (CATEGORY_LABELS[folderKey] ?? folderKey) || "Brak kategorii"
        : folderKey
      : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Produkty</h1>
          <p className="text-gray-500 mt-1">Twoja baza produktów ({products.length})</p>
        </div>
        <Button onClick={() => { setEditProduct(null); setAddOpen(true); }} className="gap-2 shrink-0">
          <Plus size={15} />
          Dodaj produkt
        </Button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Szukaj po nazwie lub producencie..."
            className="pl-9 pr-9 bg-background dark:bg-background"
          />
          <button
            type="button"
            onClick={() => setAdvancedSearchOpen(true)}
            title="Zaawansowane wyszukiwanie"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <SlidersHorizontal size={15} />
          </button>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger render={
            <button className={`w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-md border transition-colors ${groupBy !== "none" ? "border-primary bg-primary text-white" : "border-input bg-background text-muted-foreground hover:text-foreground"}`}>
              <Layers size={14} />
            </button>
          } />
          <DropdownMenuContent align="end">
            {([["none", "Wszystkie"], ["category", "Kategoria"], ["manufacturer", "Producent"]] as [GroupBy, string][]).map(([val, label]) => (
              <DropdownMenuItem key={val} onClick={() => handleGroupChange(val)} className="justify-between">
                {label}
                {groupBy === val && <Check size={14} className="text-primary" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger render={
            <button className={`w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-md border transition-colors ${sortOption !== "default" ? "border-primary bg-primary text-white" : "border-input bg-background text-muted-foreground hover:text-foreground"}`}>
              <ArrowUpDown size={14} />
            </button>
          } />
          <DropdownMenuContent align="end">
            {(["default", "name-asc", "name-desc", "price-asc", "price-desc"] as SortOption[]).map((opt) => (
              <DropdownMenuItem key={opt} onClick={() => setSortOption(opt)} className="justify-between">
                {SORT_LABELS[opt]}
                {sortOption === opt && <Check size={14} className="text-primary" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Breadcrumb when inside folder */}
      {folderLabel && (
        <div className="flex items-center gap-2">
          <button onClick={handleBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft size={15} />
            Wróć
          </button>
          <span className="text-muted-foreground">/</span>
          <span className="text-sm font-medium">{folderLabel}</span>
        </div>
      )}

      {/* Folder grid */}
      {showFolders && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {folders.length === 0 ? (
            <p className="col-span-full text-sm text-muted-foreground py-8 text-center">Brak produktów</p>
          ) : (
            folders.map(({ key, count }) => {
              const label =
                groupBy === "category"
                  ? (CATEGORY_LABELS[key] ?? key) || "Brak kategorii"
                  : key;
              return (
                <button
                  key={key}
                  onClick={() => handleFolderClick(key)}
                  className="flex flex-col items-start gap-2 p-4 rounded-xl border border-border bg-card hover:bg-muted/50 transition-colors text-left"
                >
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Package size={18} className="text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium leading-tight">{label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{count} {count === 1 ? "produkt" : count < 5 ? "produkty" : "produktów"}</p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}

      {/* Product list */}
      {!showFolders && (
        <div className="space-y-2">
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Package size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">
                {products.length === 0
                  ? "Brak produktów w bazie. Dodaj pierwszy produkt!"
                  : "Nie znaleziono produktów pasujących do wyszukiwania."}
              </p>
            </div>
          ) : (
            filtered.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onEdit={() => { setEditProduct(product); setAddOpen(true); }}
                onDelete={() => handleDelete(product.id)}
                deleting={deletingId === product.id}
              />
            ))
          )}
        </div>
      )}

      {/* Advanced search dialog */}
      <SearchProductDialog
        open={advancedSearchOpen}
        onOpenChange={setAdvancedSearchOpen}
        onSelectProduct={(product) => {
          setQuery(product.name);
          setAdvancedSearchOpen(false);
        }}
      />

      {/* Add/Edit dialog */}
      <AddProductToLibraryDialog
        open={addOpen}
        onOpenChange={(open) => { setAddOpen(open); if (!open) setEditProduct(null); }}
        onAdded={editProduct ? handleEdited : handleAdded}
        initialData={editProduct ? {
          name: editProduct.name,
          url: editProduct.url ?? undefined,
          imageUrl: editProduct.imageUrl ?? undefined,
          price: editProduct.price ?? undefined,
          manufacturer: editProduct.manufacturer ?? undefined,
          color: editProduct.color ?? undefined,
          dimensions: editProduct.dimensions ?? undefined,
          description: editProduct.description ?? undefined,
          deliveryTime: editProduct.deliveryTime ?? undefined,
          category: editProduct.category ?? undefined,
        } : undefined}
        editMode={!!editProduct}
        editId={editProduct?.id}
        hideAddFromLibrary
      />
    </div>
  );
}

function ProductCard({
  product,
  onEdit,
  onDelete,
  deleting,
}: {
  product: Product;
  onEdit: () => void;
  onDelete: () => void;
  deleting: boolean;
}) {
  const [lightbox, setLightbox] = useState(false);

  return (
    <div className="flex gap-3 p-3 rounded-xl border border-border bg-card hover:bg-muted/30 transition-colors">
      {/* Image */}
      <div
        className={`w-20 h-20 rounded-lg overflow-hidden border border-border bg-muted flex-shrink-0 flex items-center justify-center ${product.imageUrl ? "cursor-zoom-in" : ""}`}
        onClick={() => product.imageUrl && setLightbox(true)}
      >
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.imageUrl} alt={product.name} className="w-full h-full object-contain" />
        ) : (
          <Package size={24} className="text-muted-foreground/40" />
        )}
      </div>

      {/* Lightbox */}
      {lightbox && product.imageUrl && (
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
      )}

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="min-w-0">
          <p className="font-medium text-sm truncate">{product.name}</p>
          {product.manufacturer && (
            <p className="text-xs text-muted-foreground truncate">{product.manufacturer}</p>
          )}
        </div>

        <div className="flex items-center gap-3 mt-2 flex-wrap">
          {product.price && (
            <span className="text-sm font-semibold text-foreground">{product.price}</span>
          )}
          {product.color && (
            <span className="text-xs text-muted-foreground">{product.color}</span>
          )}
          {product.dimensions && (
            <span className="text-xs text-muted-foreground">{product.dimensions}</span>
          )}
          {product.deliveryTime && (
            <span className="text-xs text-muted-foreground">Dostawa: {product.deliveryTime}</span>
          )}
        </div>
      </div>

      {/* Category badge */}
      {product.category && (
        <span className="self-center shrink-0 text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
          {CATEGORY_LABELS[product.category] ?? product.category}
        </span>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        {product.url && (
          <a
            href={product.url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <ExternalLink size={14} />
          </a>
        )}
        <button
          onClick={onEdit}
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <Pencil size={14} />
        </button>
        <button
          onClick={onDelete}
          disabled={deleting}
          className="p-1.5 rounded-md text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors disabled:opacity-40"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}
