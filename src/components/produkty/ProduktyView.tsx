"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Search, Package, ChevronLeft, ArrowUpDown, Pencil, Trash2, ExternalLink, Plus, Check, X, SlidersHorizontal, StarOutline, StarFilled, MoreHorizontal } from "@/components/ui/icons";
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
import { useIsTrialExpired } from "@/lib/trial-context";
import AddProductToLibraryDialog from "./AddProductToLibraryDialog";
import { SearchProductDialog } from "./SearchProductDialog";


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
  favorite: boolean;
  createdAt: string;
}

interface Props {
  initialProducts: Product[];
}

type GroupBy = "none" | "category" | "manufacturer" | "favorites";
type SortOption = "default" | "price-asc" | "price-desc" | "name-asc" | "name-desc";


function extractPrice(price: string | null): number {
  if (!price) return Infinity;
  const num = parseFloat(price.replace(/[^\d.,]/g, "").replace(",", "."));
  return isNaN(num) ? Infinity : num;
}

export default function ProduktyView({ initialProducts }: Props) {
  const t = useT();
  const expired = useIsTrialExpired();
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

  const SORT_LABELS: Record<SortOption, string> = {
    "default": t.products.sortDefault,
    "price-asc": t.products.sortPriceAsc,
    "price-desc": t.products.sortPriceDesc,
    "name-asc": t.products.sortNameAsc,
    "name-desc": t.products.sortNameDesc,
  };

  const CATEGORY_LABELS_T_T: Record<string, string> = {
    OSWIETLENIE: t.products.catLampy,
    AKCESORIA: t.products.catAkcesoria,
    MEBLE: t.products.catMeble,
    ARMATURA: t.products.catArmatura,
    OKLADZINY_SCIENNE: t.products.catOkladziny,
    PODLOGA: t.products.catPodloga,
  };

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
    if (groupBy === "favorites") {
      list = list.filter((p) => p.favorite);
    } else if (folderKey !== null) {
      if (groupBy === "category") {
        list = list.filter((p) => (p.category ?? "") === folderKey);
      } else if (groupBy === "manufacturer") {
        list = list.filter((p) => (p.manufacturer ?? t.products.noManufacturer) === folderKey);
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
          : (p.manufacturer ?? t.products.noManufacturer);
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
      toast.success(t.products.productDeleted);
    } catch {
      toast.error(t.products.productDeleteError);
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

  async function handleFavorite(id: string, current: boolean) {
    setProducts((prev) => prev.map((p) => p.id === id ? { ...p, favorite: !current } : p));
    const res = await fetch(`/api/products/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ favorite: !current }),
    });
    if (!res.ok) {
      setProducts((prev) => prev.map((p) => p.id === id ? { ...p, favorite: current } : p));
      toast.error(t.products.favoriteError);
    }
  }

  const tabCounts = useMemo(() => ({
    none: products.length,
    favorites: products.filter((p) => p.favorite).length,
    category: new Set(products.map((p) => p.category).filter(Boolean)).size,
    manufacturer: new Set(products.map((p) => p.manufacturer).filter(Boolean)).size,
  }), [products]);

  const showFolders = groupBy !== "none" && groupBy !== "favorites" && folderKey === null;
  const folderLabel =
    folderKey !== null
      ? groupBy === "category"
        ? (CATEGORY_LABELS_T_T[folderKey] ?? folderKey) || t.products.noCategory
        : folderKey
      : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t.products.libraryTitle}</h1>
          <p className="text-gray-500 mt-1">{t.products.libraryDesc} ({products.length})</p>
        </div>
        <Button
          onClick={() => { if (!expired) { setEditProduct(null); setAddOpen(true); } }}
          disabled={expired}
          title={expired ? "Dostępne w płatnym planie" : undefined}
          className="gap-2 shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Plus size={15} />
          {t.products.addProduct}
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-5 border-b border-border overflow-x-auto scrollbar-none">
        {([
          ["none", t.products.all, tabCounts.none],
          ["favorites", t.products.favorites, tabCounts.favorites],
          ["category", t.products.filterCategories, tabCounts.category],
          ["manufacturer", t.products.filterManufacturers, tabCounts.manufacturer],
        ] as [GroupBy, string, number][]).map(([val, label, count]) => (
          <button
            key={val}
            onClick={() => handleGroupChange(val)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              groupBy === val
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
            {count > 0 && (
              <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                groupBy === val ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.products.searchByName}
            className="pl-9 pr-9 bg-background dark:bg-background"
          />
          <button
            type="button"
            onClick={() => setAdvancedSearchOpen(true)}
            title={t.products.searchTitle}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <SlidersHorizontal size={15} />
          </button>
        </div>
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
            {t.products.backBtn}
          </button>
          <span className="text-muted-foreground">/</span>
          <span className="text-sm font-medium">{folderLabel}</span>
        </div>
      )}

      {/* Folder grid */}
      {showFolders && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {folders.length === 0 ? (
            <p className="col-span-full text-sm text-muted-foreground py-8 text-center">{t.products.noProductsInDB}</p>
          ) : (
            folders.map(({ key, count }) => {
              const label =
                groupBy === "category"
                  ? (CATEGORY_LABELS_T_T[key] ?? key) || t.products.noCategory
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
                    <p className="text-xs text-muted-foreground mt-0.5">{count} {count === 1 ? t.products.productCountUnit : count < 5 ? t.products.productCountUnitFew : t.products.productCountUnitMany}</p>
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
                  ? t.products.noProductsLibHint
                  : t.products.noProductsFound}
              </p>
            </div>
          ) : (
            filtered.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onEdit={() => { setEditProduct(product); setAddOpen(true); }}
                onDelete={() => handleDelete(product.id)}
                onFavorite={() => handleFavorite(product.id, product.favorite)}
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
  onFavorite,
  deleting,
}: {
  product: Product;
  onEdit: () => void;
  onDelete: () => void;
  onFavorite: () => void;
  deleting: boolean;
}) {
  const t = useT();
  const CATEGORY_LABELS_T: Record<string, string> = {
    OSWIETLENIE: t.products.catLampy,
    AKCESORIA: t.products.catAkcesoria,
    MEBLE: t.products.catMeble,
    ARMATURA: t.products.catArmatura,
    OKLADZINY_SCIENNE: t.products.catOkladziny,
    PODLOGA: t.products.catPodloga,
  };
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
            <span className="text-xs text-muted-foreground">{t.products.deliveryLabel} {product.deliveryTime}</span>
          )}
        </div>
      </div>

      {/* Category badge */}
      {product.category && (
        <span className="self-center shrink-0 text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
          {CATEGORY_LABELS_T[product.category] ?? product.category}
        </span>
      )}

      {/* Actions — desktop */}
      <div className="hidden md:flex items-center gap-1 shrink-0">
        <button
          onClick={onFavorite}
          title={product.favorite ? t.products.favoriteRemove : t.products.favoriteAdd}
          className={`p-1.5 rounded-md transition-colors ${product.favorite ? "text-yellow-400 hover:text-yellow-500" : "text-muted-foreground hover:text-yellow-400 hover:bg-muted"}`}
        >
          {product.favorite ? <StarFilled size={14} /> : <StarOutline size={14} />}
        </button>
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

      {/* Actions — mobile (3 dots) */}
      <div className="flex md:hidden items-center shrink-0">
        <DropdownMenu>
          <DropdownMenuTrigger render={
            <button className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              <MoreHorizontal size={16} />
            </button>
          } />
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onFavorite}>
              {product.favorite ? <StarFilled size={14} className="text-yellow-400" /> : <StarOutline size={14} />}
              {product.favorite ? t.products.favoriteRemove : t.products.favoriteAdd}
            </DropdownMenuItem>
            {product.url && (
              <DropdownMenuItem onClick={() => window.open(product.url!, "_blank", "noopener,noreferrer")}>
                <ExternalLink size={14} />
                {t.products.openLink}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={onEdit}>
              <Pencil size={14} />
              {t.products.editProduct}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDelete} disabled={deleting} className="text-red-500 focus:text-red-500">
              <Trash2 size={14} />
              {t.products.deleteBtn}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
