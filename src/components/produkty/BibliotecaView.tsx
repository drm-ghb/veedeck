"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";
import { useIsTrialExpired } from "@/lib/trial-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Stacks, TextureIcon, DeployedCode, Search, Plus, ExternalLink,
  Pencil, Trash2, StarOutline, StarFilled, AddShoppingCart, X, SlidersHorizontal,
  MoreVertical, Download,
} from "@/components/ui/icons";
import AddProductToLibraryDialog from "./AddProductToLibraryDialog";
import AddToShoppingListModal, { type LibraryProduct } from "./AddToShoppingListModal";
import AddTextureDialog from "./AddTextureDialog";
import AddModel3DDialog from "./AddModel3DDialog";

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
  source: string;
  createdAt: string;
}

interface Texture {
  id: string;
  name: string;
  category: string | null;
  imageUrl: string | null;
  manufacturer: string | null;
  resolution: string | null;
  scale: string | null;
  finish: string | null;
  favorite: boolean;
  isPbr: boolean;
  urlAlbedo: string | null;
  urlNormal: string | null;
  urlRoughness: string | null;
  urlMetallic: string | null;
  urlAo: string | null;
  urlHeight: string | null;
  createdAt: string;
}

interface Model3D {
  id: string;
  name: string;
  category: string;
  thumbnailUrl: string | null;
  urlGlb: string | null;
  meshyTaskId: string | null;
  linkedProductId: string | null;
  createdAt: string;
}

interface Props {
  initialProducts: Product[];
  initialTextures: Texture[];
  initialModels3d: Model3D[];
}

type Tab = "produkty" | "tekstury" | "modele";


export default function BibliotecaView({ initialProducts, initialTextures, initialModels3d }: Props) {
  const t = useT();
  const router = useRouter();
  const expired = useIsTrialExpired();

  const [tab, setTab] = useState<Tab>("produkty");
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [textures, setTextures] = useState<Texture[]>(initialTextures);
  const [models3d, setModels3d] = useState<Model3D[]>(initialModels3d);
  const [query, setQuery] = useState("");
  const [filterCategories, setFilterCategories] = useState<Set<string>>(new Set());
  const [filterManufacturers, setFilterManufacturers] = useState<Set<string>>(new Set());
  const [filterSource, setFilterSource] = useState<"all" | "manual" | "veepick">("all");
  const [filterHasModel, setFilterHasModel] = useState<"all" | "has" | "none">("all");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [selectedTexture, setSelectedTexture] = useState<Texture | null>(null);
  const [editTexture, setEditTexture] = useState<Texture | null>(null);
  const [deletingTextureId, setDeletingTextureId] = useState<string | null>(null);
  const [filterTextureCategories, setFilterTextureCategories] = useState<Set<string>>(new Set());
  const [filterTextureManufacturers, setFilterTextureManufacturers] = useState<Set<string>>(new Set());
  const [filterTextureFinishes, setFilterTextureFinishes] = useState<Set<string>>(new Set());
  const [textureFavoritesOnly, setTextureFavoritesOnly] = useState(false);
  const [addTextureOpen, setAddTextureOpen] = useState(false);
  const [addModelOpen, setAddModelOpen] = useState(false);
  const [addModelForProductId, setAddModelForProductId] = useState<string | undefined>(undefined);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [addToListProduct, setAddToListProduct] = useState<LibraryProduct | null>(null);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [manufacturerQuery, setManufacturerQuery] = useState("");

  const CATEGORY_MAP: Record<string, string> = {
    OSWIETLENIE: t.products.catLampy,
    AKCESORIA: t.products.catAkcesoria,
    MEBLE: t.products.catMeble,
    ARMATURA: t.products.catArmatura,
    OKLADZINY_SCIENNE: t.products.catOkladziny,
    PODLOGA: t.products.catPodloga,
  };

  // Available filter values from current products
  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    for (const p of products) if (p.category) cats.add(p.category);
    return Array.from(cats).sort();
  }, [products]);

  const availableManufacturers = useMemo(() => {
    const mans = new Set<string>();
    for (const p of products) if (p.manufacturer) mans.add(p.manufacturer);
    return Array.from(mans).sort();
  }, [products]);

  const linkedProductIds = useMemo(() => new Set(models3d.filter(m => m.linkedProductId).map(m => m.linkedProductId!)), [models3d]);

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
    if (favoritesOnly) list = list.filter((p) => p.favorite);
    if (filterCategories.size > 0) list = list.filter((p) => p.category && filterCategories.has(p.category));
    if (filterManufacturers.size > 0) list = list.filter((p) => p.manufacturer && filterManufacturers.has(p.manufacturer));
    if (filterSource !== "all") list = list.filter((p) => p.source === filterSource);
    if (filterHasModel === "has") list = list.filter((p) => linkedProductIds.has(p.id));
    if (filterHasModel === "none") list = list.filter((p) => !linkedProductIds.has(p.id));
    return list;
  }, [products, query, favoritesOnly, filterCategories, filterManufacturers, filterSource, filterHasModel, linkedProductIds]);

  function toggleCategory(cat: string) {
    setFilterCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat); else next.add(cat);
      return next;
    });
  }

  function toggleManufacturer(man: string) {
    setFilterManufacturers((prev) => {
      const next = new Set(prev);
      if (next.has(man)) next.delete(man); else next.add(man);
      return next;
    });
  }

  function clearFilters() {
    setFilterCategories(new Set());
    setFilterManufacturers(new Set());
    setFilterSource("all");
    setFilterHasModel("all");
    setFavoritesOnly(false);
    setQuery("");
  }

  function clearTextureFilters() {
    setFilterTextureCategories(new Set());
    setFilterTextureManufacturers(new Set());
    setFilterTextureFinishes(new Set());
    setTextureFavoritesOnly(false);
    setQuery("");
  }

  const hasActiveFilters = filterCategories.size > 0 || filterManufacturers.size > 0 || filterSource !== "all" || filterHasModel !== "all" || favoritesOnly || !!query.trim();
  const hasActiveTextureFilters = filterTextureCategories.size > 0 || filterTextureManufacturers.size > 0 || filterTextureFinishes.size > 0 || textureFavoritesOnly || !!query.trim();
  const hasTabActiveFilters = (tab === "produkty" && hasActiveFilters) || (tab === "tekstury" && hasActiveTextureFilters);

  async function handleToggleFavorite(p: Product) {
    const next = !p.favorite;
    setProducts((prev) => prev.map((x) => x.id === p.id ? { ...x, favorite: next } : x));
    if (selectedProduct?.id === p.id) setSelectedProduct({ ...p, favorite: next });
    try {
      await fetch(`/api/products/${p.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ favorite: next }),
      });
    } catch {
      setProducts((prev) => prev.map((x) => x.id === p.id ? { ...x, favorite: p.favorite } : x));
    }
  }

  async function handleDelete(p: Product) {
    setDeletingId(p.id);
    try {
      const res = await fetch(`/api/products/${p.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setProducts((prev) => prev.filter((x) => x.id !== p.id));
      if (selectedProduct?.id === p.id) setSelectedProduct(null);
      toast.success(t.products.productDeleted);
    } catch {
      toast.error(t.products.productDeleteError);
    } finally {
      setDeletingId(null);
    }
  }

  function handleAdded(product: unknown) {
    setProducts((prev) => [product as Product, ...prev]);
    router.refresh();
  }

  function handleModelAdded(model: unknown) {
    setModels3d((prev) => [model as Model3D, ...prev]);
  }

  async function handleToggleTextureFavorite(tex: Texture) {
    const next = !tex.favorite;
    setTextures((prev) => prev.map((x) => x.id === tex.id ? { ...x, favorite: next } : x));
    if (selectedTexture?.id === tex.id) setSelectedTexture({ ...tex, favorite: next });
    try {
      await fetch(`/api/textures/${tex.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ favorite: next }),
      });
    } catch {
      setTextures((prev) => prev.map((x) => x.id === tex.id ? { ...x, favorite: tex.favorite } : x));
    }
  }

  async function handleDeleteTexture(tex: Texture) {
    setDeletingTextureId(tex.id);
    try {
      const res = await fetch(`/api/textures/${tex.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setTextures((prev) => prev.filter((x) => x.id !== tex.id));
      if (selectedTexture?.id === tex.id) setSelectedTexture(null);
      toast.success(t.products.textureDeleted);
    } catch {
      toast.error(t.products.textureDeleteError);
    } finally {
      setDeletingTextureId(null);
    }
  }

  function handleTextureEdited(updated: unknown) {
    const t = updated as Texture;
    setTextures((prev) => prev.map((x) => x.id === t.id ? t : x));
    if (selectedTexture?.id === t.id) setSelectedTexture(t);
  }

  function handleEdited(product: unknown) {
    const updated = product as Product;
    setProducts((prev) => prev.map((p) => p.id === updated.id ? updated : p));
    if (selectedProduct?.id === updated.id) setSelectedProduct(updated);
  }

  const filterRailContent = (
    <div className="flex flex-col gap-0 h-full overflow-y-auto">
      {/* Tabs */}
      <div className="flex flex-col gap-1 p-3 border-b">
        {(
          [
            { id: "produkty" as Tab, label: t.products.tabProducts, icon: <Stacks size={17} />, count: products.length },
            { id: "tekstury" as Tab, label: t.products.tabTextures, icon: <TextureIcon size={17} />, count: textures.length },
            { id: "modele" as Tab, label: t.products.tabModels3D, icon: <DeployedCode size={17} />, count: models3d.length },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            className={`flex items-center gap-2.5 px-[10px] py-[9px] rounded-lg text-[13px] font-semibold transition-colors w-full text-left ${
              tab === item.id
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {item.icon}
            {item.label}
            <span className={`ml-auto text-[11.5px] font-bold ${tab === item.id ? "text-primary" : "text-muted-foreground"}`}>
              {item.count}
            </span>
          </button>
        ))}
      </div>

      {tab === "produkty" && (
        <>
          {/* Ulubione toggle */}
          <div className="px-3 py-3 border-b">
            <button
              onClick={() => setFavoritesOnly((v) => !v)}
              className={`flex items-center gap-2 text-sm w-full px-2 py-1.5 rounded-lg transition-colors ${
                favoritesOnly ? "bg-amber-50 text-amber-600" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {favoritesOnly ? <StarFilled size={15} className="text-amber-500" /> : <StarOutline size={15} />}
              {t.products.filterFavorites}
            </button>
          </div>

          {/* Source */}
          <div className="px-3 py-3 border-b">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{t.products.filterSource}</p>
            <div className="flex flex-col gap-1">
              {(
                [
                  { value: "all" as const, label: t.products.filterSourceAll },
                  { value: "manual" as const, label: t.products.filterSourceManual },
                  { value: "veepick" as const, label: "veepick" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setFilterSource(opt.value)}
                  className={`flex items-center gap-2 text-sm px-2 py-1 rounded-lg transition-colors text-left ${
                    filterSource === opt.value
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Assets */}
          <div className="px-3 py-3 border-b">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{t.products.filterAssets}</p>
            <div className="flex flex-col gap-1">
              {(
                [
                  { value: "all" as const, label: t.products.filterSourceAll },
                  { value: "has" as const, label: t.products.filterHasModel },
                  { value: "none" as const, label: t.products.filterNoModel },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setFilterHasModel(opt.value)}
                  className={`flex items-center gap-2 text-sm px-2 py-1 rounded-lg transition-colors text-left ${
                    filterHasModel === opt.value
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Category */}
          {availableCategories.length > 0 && (
            <div className="px-3 py-3 border-b">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{t.products.filterCategory}</p>
              <div className="flex flex-col gap-1">
                {availableCategories.map((cat) => (
                  <label key={cat} className="flex items-center gap-2 text-sm px-2 py-1 rounded-lg hover:bg-muted cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filterCategories.has(cat)}
                      onChange={() => toggleCategory(cat)}
                      className="accent-primary"
                    />
                    <span className={filterCategories.has(cat) ? "text-foreground font-medium" : "text-muted-foreground"}>
                      {CATEGORY_MAP[cat] ?? cat}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Manufacturer */}
          {availableManufacturers.length > 0 && (
            <div className="px-3 py-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{t.products.filterManufacturer}</p>
              {availableManufacturers.length > 5 && (
                <div className="relative mb-2">
                  <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder={t.products.searchManufacturer}
                    value={manufacturerQuery}
                    onChange={(e) => setManufacturerQuery(e.target.value)}
                    className="w-full pl-7 pr-2 py-1.5 text-xs rounded-lg bg-muted border border-border focus:outline-none focus:ring-1 focus:ring-primary/30"
                  />
                </div>
              )}
              <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
                {availableManufacturers.filter((man) =>
                  !manufacturerQuery.trim() || man.toLowerCase().includes(manufacturerQuery.toLowerCase())
                ).map((man) => (
                  <label key={man} className="flex items-center gap-2 text-sm px-2 py-1 rounded-lg hover:bg-muted cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filterManufacturers.has(man)}
                      onChange={() => toggleManufacturer(man)}
                      className="accent-primary"
                    />
                    <span className={`truncate ${filterManufacturers.has(man) ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                      {man}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {tab === "tekstury" && (() => {
        const cats = Array.from(new Set(textures.map(t => t.category).filter(Boolean) as string[])).sort();
        const mans = Array.from(new Set(textures.map(t => t.manufacturer).filter(Boolean) as string[])).sort();
        const fins = Array.from(new Set(textures.map(t => t.finish).filter(Boolean) as string[])).sort();
        return (
          <>
            <div className="px-3 py-3 border-b">
              <button
                onClick={() => setTextureFavoritesOnly((v) => !v)}
                className={`flex items-center gap-2 text-sm w-full px-2 py-1.5 rounded-lg transition-colors ${textureFavoritesOnly ? "bg-amber-50 text-amber-600" : "text-muted-foreground hover:bg-muted"}`}
              >
                {textureFavoritesOnly ? <StarFilled size={15} className="text-amber-500" /> : <StarOutline size={15} />}
                {t.products.filterFavorites}
              </button>
            </div>
            {cats.length > 0 && (
              <div className="px-3 py-3 border-b">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{t.products.filterCategory}</p>
                <div className="flex flex-col gap-1">
                  {cats.map((cat) => (
                    <label key={cat} className="flex items-center gap-2 text-sm px-2 py-1 rounded-lg hover:bg-muted cursor-pointer">
                      <input type="checkbox" checked={filterTextureCategories.has(cat)} onChange={() => setFilterTextureCategories(prev => { const n = new Set(prev); n.has(cat) ? n.delete(cat) : n.add(cat); return n; })} className="accent-primary" />
                      <span className={filterTextureCategories.has(cat) ? "text-foreground font-medium" : "text-muted-foreground"}>{cat}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
            {fins.length > 0 && (
              <div className="px-3 py-3 border-b">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{t.products.filterFinish}</p>
                <div className="flex flex-col gap-1">
                  {fins.map((fin) => (
                    <label key={fin} className="flex items-center gap-2 text-sm px-2 py-1 rounded-lg hover:bg-muted cursor-pointer">
                      <input type="checkbox" checked={filterTextureFinishes.has(fin)} onChange={() => setFilterTextureFinishes(prev => { const n = new Set(prev); n.has(fin) ? n.delete(fin) : n.add(fin); return n; })} className="accent-primary" />
                      <span className={filterTextureFinishes.has(fin) ? "text-foreground font-medium" : "text-muted-foreground"}>{fin}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
            {mans.length > 0 && (
              <div className="px-3 py-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{t.products.filterManufacturer}</p>
                <div className="flex flex-col gap-1">
                  {mans.map((man) => (
                    <label key={man} className="flex items-center gap-2 text-sm px-2 py-1 rounded-lg hover:bg-muted cursor-pointer">
                      <input type="checkbox" checked={filterTextureManufacturers.has(man)} onChange={() => setFilterTextureManufacturers(prev => { const n = new Set(prev); n.has(man) ? n.delete(man) : n.add(man); return n; })} className="accent-primary" />
                      <span className={`truncate ${filterTextureManufacturers.has(man) ? "text-foreground font-medium" : "text-muted-foreground"}`}>{man}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </>
        );
      })()}

      {tab === "modele" && (
        <div className="flex flex-col items-center justify-center flex-1 gap-2 py-12 px-4 text-center">
          <DeployedCode size={32} className="text-muted-foreground/40" />
          <p className="text-sm font-medium text-muted-foreground">{t.products.models3DFilterLabel}</p>
          <p className="text-xs text-muted-foreground/60">{t.products.models3DComingSoon}</p>
        </div>
      )}

      {/* Floating reset button — sticky at bottom of scroll area */}
      {hasTabActiveFilters && (
        <div className="sticky bottom-0 left-0 right-0 px-3 py-3 bg-gradient-to-t from-background via-background/95 to-transparent shrink-0">
          <button
            onClick={tab === "tekstury" ? clearTextureFilters : clearFilters}
            className="w-full flex items-center justify-center gap-1.5 text-xs font-medium text-muted-foreground border border-border rounded-lg py-2 hover:bg-muted hover:text-foreground transition-colors bg-background shadow-sm"
          >
            <X size={12} />
            {t.products.resetFilters}
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex h-full overflow-hidden relative">
      {/* Filter rail — desktop */}
      <aside className="hidden lg:flex w-56 xl:w-60 shrink-0 border-r flex-col overflow-hidden bg-background/60">
        {filterRailContent}
      </aside>

      {/* Mobile filter drawer */}
      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileFiltersOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-background shadow-xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
              <span className="text-sm font-semibold">{t.products.filtersTitle}</span>
              <button onClick={() => setMobileFiltersOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {filterRailContent}
            </div>
          </aside>
        </div>
      )}

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 sm:px-5 py-3.5 border-b shrink-0">
          <button
            className="lg:hidden shrink-0 p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
            onClick={() => setMobileFiltersOpen(true)}
          >
            <SlidersHorizontal size={18} />
          </button>
          <div className="relative flex-1 max-w-sm">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-8 h-9 text-sm"
              placeholder={t.products.searchProductsPlaceholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 shrink-0"
            >
              <X size={13} />
              {t.products.clearFiltersBtn}
            </button>
          )}
          <div className="flex-1" />
          {tab === "produkty" && (
            <Button
              size="sm"
              disabled={expired}
              title={expired ? t.products.paidPlanOnly : undefined}
              onClick={() => setAddOpen(true)}
            >
              <Plus size={15} />
              <span className="hidden sm:inline">{t.products.addProductBtn}</span>
            </Button>
          )}
          {tab === "tekstury" && (
            <Button
              size="sm"
              disabled={expired}
              title={expired ? t.products.paidPlanOnly : undefined}
              onClick={() => setAddTextureOpen(true)}
            >
              <Plus size={15} />
              <span className="hidden sm:inline">{t.products.addTextureBtn}</span>
            </Button>
          )}
          {tab === "modele" && (
            <Button
              size="sm"
              disabled
              title={t.products.comingSoon}
              onClick={() => { setAddModelForProductId(undefined); setAddModelOpen(true); }}
            >
              <Plus size={15} />
              <span className="hidden sm:inline">{t.products.addModelBtn}</span>
            </Button>
          )}
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {tab === "produkty" && (
            <>
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
                  <Stacks size={40} className="text-muted-foreground/30" />
                  <p className="text-sm font-medium text-muted-foreground">
                    {products.length === 0 ? t.products.emptyLibrary : t.common.noResults}
                  </p>
                  {products.length === 0 && (
                    <p className="text-xs text-muted-foreground/70 max-w-xs">
                      {t.products.emptyLibraryHint}
                    </p>
                  )}
                  {hasActiveFilters && (
                    <button onClick={clearFilters} className="text-xs text-primary hover:underline">{t.products.clearFiltersBtn}</button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4">
                  {filtered.map((p) => (
                    <ProductTile
                      key={p.id}
                      product={p}
                      selected={selectedProduct?.id === p.id}
                      onSelect={() => setSelectedProduct(selectedProduct?.id === p.id ? null : p)}
                      onToggleFavorite={() => handleToggleFavorite(p)}
                      categoryLabel={CATEGORY_MAP[p.category ?? ""] ?? p.category ?? ""}
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {tab === "tekstury" && (() => {
            let filteredTextures = textures;
            if (textureFavoritesOnly) filteredTextures = filteredTextures.filter(t => t.favorite);
            if (filterTextureCategories.size > 0) filteredTextures = filteredTextures.filter(t => t.category && filterTextureCategories.has(t.category));
            if (filterTextureFinishes.size > 0) filteredTextures = filteredTextures.filter(t => t.finish && filterTextureFinishes.has(t.finish));
            if (filterTextureManufacturers.size > 0) filteredTextures = filteredTextures.filter(t => t.manufacturer && filterTextureManufacturers.has(t.manufacturer));
            return textures.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
                <TextureIcon size={40} className="text-muted-foreground/30" />
                <p className="text-sm font-medium text-muted-foreground">{t.products.noTexturesEmpty}</p>
                <p className="text-xs text-muted-foreground/60 max-w-xs">
                  {t.products.noTexturesHint}
                </p>
              </div>
            ) : filteredTextures.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
                <TextureIcon size={40} className="text-muted-foreground/30" />
                <p className="text-sm font-medium text-muted-foreground">{t.common.noResults}</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4">
                {filteredTextures.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTexture(selectedTexture?.id === t.id ? null : t)}
                    className={`group flex flex-col rounded-xl border overflow-hidden cursor-pointer transition-all ${
                      selectedTexture?.id === t.id
                        ? "border-primary ring-1 ring-primary/30 shadow-sm"
                        : "border-border hover:border-primary/40 hover:shadow-sm"
                    }`}
                  >
                    <div className="aspect-square bg-muted flex items-center justify-center overflow-hidden">
                      {t.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={t.imageUrl} alt={t.name} className="w-full h-full object-cover" />
                      ) : (
                        <TextureIcon size={28} className="text-muted-foreground/30" />
                      )}
                    </div>
                    <div className="p-2.5 flex flex-col gap-0.5">
                      <p className="text-xs font-medium line-clamp-2 leading-tight">{t.name}</p>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {t.category && <p className="text-[11px] text-muted-foreground">{t.category}</p>}
                        {t.isPbr && (
                          <span className="text-[9.5px] font-bold uppercase tracking-wide bg-primary/10 text-primary px-1.5 py-0.5 rounded">PBR</span>
                        )}
                      </div>
                      {t.manufacturer && <p className="text-[11px] text-muted-foreground truncate">{t.manufacturer}</p>}
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}

          {tab === "modele" && (
            models3d.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
                <DeployedCode size={40} className="text-muted-foreground/30" />
                <p className="text-sm font-medium text-muted-foreground">{t.products.noModels3DEmpty}</p>
                <p className="text-xs text-muted-foreground/60 max-w-xs">
                  {t.products.noModels3DHint}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4">
                {models3d.map((m) => (
                  <div key={m.id} className="flex flex-col rounded-xl border border-border overflow-hidden bg-muted/30">
                    <div className="aspect-square bg-muted flex items-center justify-center overflow-hidden">
                      {m.thumbnailUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={m.thumbnailUrl} alt={m.name} className="w-full h-full object-cover" />
                      ) : (
                        <DeployedCode size={28} className="text-muted-foreground/30" />
                      )}
                    </div>
                    <div className="p-2.5 flex flex-col gap-0.5">
                      <p className="text-xs font-medium line-clamp-2 leading-tight">{m.name}</p>
                      <p className="text-[11px] text-muted-foreground">{m.category}</p>
                      {m.linkedProductId && (
                        <span className="text-[10px] text-primary font-medium mt-0.5">{t.products.linkedToProduct}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>

      {/* Detail panel */}
      {selectedProduct && (
        <aside className="hidden lg:flex w-72 xl:w-80 shrink-0 border-l flex-col overflow-y-auto bg-background">
          <DetailPanel
            product={selectedProduct}
            categoryLabel={CATEGORY_MAP[selectedProduct.category ?? ""] ?? selectedProduct.category ?? ""}
            linkedModels={models3d.filter(m => m.linkedProductId === selectedProduct.id)}
            onClose={() => setSelectedProduct(null)}
            onEdit={() => setEditProduct(selectedProduct)}
            onDelete={() => handleDelete(selectedProduct)}
            onAddToList={() => setAddToListProduct(selectedProduct)}
            onToggleFavorite={() => handleToggleFavorite(selectedProduct)}
            onAddModel={() => { setAddModelForProductId(selectedProduct.id); setAddModelOpen(true); }}
            deleting={deletingId === selectedProduct.id}
            expired={expired}
          />
        </aside>
      )}

      {/* Mobile detail panel — full overlay */}
      {selectedProduct && (
        <div className="fixed inset-0 z-30 lg:hidden flex flex-col bg-background overflow-y-auto">
          <DetailPanel
            product={selectedProduct}
            categoryLabel={CATEGORY_MAP[selectedProduct.category ?? ""] ?? selectedProduct.category ?? ""}
            linkedModels={models3d.filter(m => m.linkedProductId === selectedProduct.id)}
            onClose={() => setSelectedProduct(null)}
            onEdit={() => setEditProduct(selectedProduct)}
            onDelete={() => handleDelete(selectedProduct)}
            onAddToList={() => setAddToListProduct(selectedProduct)}
            onToggleFavorite={() => handleToggleFavorite(selectedProduct)}
            onAddModel={() => { setAddModelForProductId(selectedProduct.id); setAddModelOpen(true); }}
            deleting={deletingId === selectedProduct.id}
            expired={expired}
          />
        </div>
      )}

      {/* Texture detail panel — desktop */}
      {selectedTexture && (
        <aside className="hidden lg:flex w-72 xl:w-80 shrink-0 border-l flex-col overflow-y-auto bg-background">
          <TextureDetailPanel
            texture={selectedTexture}
            onClose={() => setSelectedTexture(null)}
            onToggleFavorite={() => handleToggleTextureFavorite(selectedTexture)}
            onEdit={() => setEditTexture(selectedTexture)}
            onDelete={() => handleDeleteTexture(selectedTexture)}
            deleting={deletingTextureId === selectedTexture.id}
          />
        </aside>
      )}

      {/* Texture detail panel — mobile */}
      {selectedTexture && (
        <div className="fixed inset-0 z-30 lg:hidden flex flex-col bg-background overflow-y-auto">
          <TextureDetailPanel
            texture={selectedTexture}
            onClose={() => setSelectedTexture(null)}
            onToggleFavorite={() => handleToggleTextureFavorite(selectedTexture)}
            onEdit={() => setEditTexture(selectedTexture)}
            onDelete={() => handleDeleteTexture(selectedTexture)}
            deleting={deletingTextureId === selectedTexture.id}
          />
        </div>
      )}

      {/* Dialogs */}
      <AddProductToLibraryDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onAdded={handleAdded}
        hideAddFromLibrary
      />

      {editProduct && (
        <AddProductToLibraryDialog
          open={!!editProduct}
          onOpenChange={(o) => !o && setEditProduct(null)}
          onAdded={handleEdited}
          initialData={{
            name: editProduct.name,
            url: editProduct.url ?? "",
            imageUrl: editProduct.imageUrl ?? "",
            price: editProduct.price ?? "",
            manufacturer: editProduct.manufacturer ?? "",
            color: editProduct.color ?? "",
            dimensions: editProduct.dimensions ?? "",
            description: editProduct.description ?? "",
            deliveryTime: editProduct.deliveryTime ?? "",
            category: editProduct.category ?? "",
          }}
          editMode
          editId={editProduct.id}
          hideAddFromLibrary
        />
      )}

      {addToListProduct && (
        <AddToShoppingListModal
          open={!!addToListProduct}
          onClose={() => setAddToListProduct(null)}
          product={addToListProduct}
        />
      )}

      <AddTextureDialog
        open={addTextureOpen}
        onOpenChange={setAddTextureOpen}
        onAdded={(t) => setTextures((prev) => [t as Texture, ...prev])}
      />

      {editTexture && (
        <AddTextureDialog
          open={!!editTexture}
          onOpenChange={(o) => !o && setEditTexture(null)}
          onAdded={handleTextureEdited}
          editMode
          editId={editTexture.id}
          initialData={{
            name: editTexture.name,
            category: editTexture.category ?? "",
            manufacturer: editTexture.manufacturer ?? "",
            resolution: editTexture.resolution ?? "",
            scale: editTexture.scale ?? "",
            finish: editTexture.finish ?? "",
            imageUrl: editTexture.imageUrl ?? "",
          }}
        />
      )}

      <AddModel3DDialog
        open={addModelOpen}
        onOpenChange={(o) => { if (!o) { setAddModelOpen(false); setAddModelForProductId(undefined); } else setAddModelOpen(true); }}
        onAdded={handleModelAdded}
        linkedProductId={addModelForProductId}
      />
    </div>
  );
}

// ── Product tile ──────────────────────────────────────────────────────────────

function ProductTile({
  product,
  selected,
  onSelect,
  onToggleFavorite,
  categoryLabel,
}: {
  product: Product;
  selected: boolean;
  onSelect: () => void;
  onToggleFavorite: () => void;
  categoryLabel: string;
}) {
  return (
    <div
      onClick={onSelect}
      className={`group relative flex flex-col rounded-xl border overflow-hidden cursor-pointer transition-all ${
        selected
          ? "border-primary ring-1 ring-primary/30 shadow-sm"
          : "border-border hover:border-primary/40 hover:shadow-sm"
      }`}
    >
      {/* Image */}
      <div className="aspect-square bg-muted flex items-center justify-center overflow-hidden">
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <Stacks size={28} className="text-muted-foreground/30" />
        )}
      </div>

      {/* Favorite button */}
      <button
        onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
        className="absolute top-2 right-2 p-1 rounded-full bg-background/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
      >
        {product.favorite
          ? <StarFilled size={14} className="text-amber-500" />
          : <StarOutline size={14} className="text-muted-foreground" />}
      </button>

      {/* Info */}
      <div className="p-2.5 flex flex-col gap-0.5 flex-1">
        <p className="text-xs font-medium line-clamp-2 leading-tight">{product.name}</p>
        {product.manufacturer && (
          <p className="text-[11px] text-muted-foreground truncate">{product.manufacturer}</p>
        )}
        {product.price && (
          <p className="text-xs font-semibold text-foreground mt-auto pt-1">{product.price}</p>
        )}
      </div>
    </div>
  );
}

// ── Detail panel ─────────────────────────────────────────────────────────────

function DetailPanel({
  product,
  categoryLabel,
  linkedModels,
  onClose,
  onEdit,
  onDelete,
  onAddToList,
  onToggleFavorite,
  onAddModel,
  deleting,
  expired,
}: {
  product: Product;
  categoryLabel: string;
  linkedModels: Model3D[];
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onAddToList: () => void;
  onToggleFavorite: () => void;
  onAddModel: () => void;
  deleting: boolean;
  expired: boolean;
}) {
  const t = useT();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  return (
    <>
      {/* Header — 52px, border-bottom */}
      <div className="h-[52px] flex items-center justify-between px-4 border-b shrink-0">
        <span className="text-[11px] font-bold tracking-[.05em] uppercase text-muted-foreground">
          {t.products.productDetails}
        </span>
        <div className="flex items-center gap-0.5">
          {/* Star */}
          <button
            onClick={onToggleFavorite}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
            title={product.favorite ? t.products.favoriteRemove : t.products.favoriteAdd}
          >
            {product.favorite
              ? <StarFilled size={16} className="text-amber-500" />
              : <StarOutline size={16} className="text-muted-foreground" />}
          </button>
          {/* Edit */}
          <button
            onClick={onEdit}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            title={t.products.editProductTitle}
          >
            <Pencil size={16} />
          </button>
          {/* More / delete */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            >
              <MoreVertical size={16} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-9 z-10 bg-background border border-border rounded-lg shadow-md w-36 py-1">
                {confirmDelete ? (
                  <>
                    <button
                      className="w-full text-left px-3 py-2 text-xs text-destructive hover:bg-muted"
                      onClick={() => { setMenuOpen(false); setConfirmDelete(false); onDelete(); }}
                      disabled={deleting}
                    >
                      {deleting ? t.products.deletingLabel : t.products.confirmDeleteBtn}
                    </button>
                    <button
                      className="w-full text-left px-3 py-2 text-xs text-muted-foreground hover:bg-muted"
                      onClick={() => setConfirmDelete(false)}
                    >
                      {t.products.cancelBtn}
                    </button>
                  </>
                ) : (
                  <button
                    className="w-full text-left px-3 py-2 text-xs text-destructive hover:bg-muted"
                    onClick={() => setConfirmDelete(true)}
                  >
                    {t.products.deleteProduct}
                  </button>
                )}
              </div>
            )}
          </div>
          {/* Close */}
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-0">

        {/* Cover image — aspect 4:3 */}
        <div
          className={`aspect-[4/3] rounded-xl border border-border overflow-hidden bg-muted shrink-0 ${product.imageUrl ? "cursor-zoom-in" : ""}`}
          onClick={() => product.imageUrl && setLightboxOpen(true)}
        >
          {product.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-contain" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Stacks size={36} className="text-muted-foreground/20" />
            </div>
          )}
        </div>

        {/* Lightbox */}
        {lightboxOpen && product.imageUrl && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
            onClick={() => setLightboxOpen(false)}
          >
            <button
              className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
              onClick={() => setLightboxOpen(false)}
            >
              <X size={18} />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={product.imageUrl}
              alt={product.name}
              className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}


        {/* Name + manufacturer + price */}
        <h2 className="text-[15.5px] font-bold leading-[1.35] mt-4">{product.name}</h2>
        {product.manufacturer && (
          <p className="text-[12.5px] text-muted-foreground mt-0.5">{product.manufacturer}</p>
        )}
        {product.price && (
          <p className="text-[20px] font-bold mt-3">{product.price}</p>
        )}

        {/* Spec list */}
        <div className="mt-4 flex flex-col">
          {categoryLabel && <SpecRow label={t.products.specCategory} value={categoryLabel} />}
          {product.dimensions && <SpecRow label={t.products.specDimensions} value={product.dimensions} />}
          {product.color && <SpecRow label={t.products.colorLabel} value={product.color} />}
          {product.deliveryTime && <SpecRow label={t.products.specAvailability} value={product.deliveryTime} />}
          <SpecRow
            label={t.products.specSource}
            value={product.source === "veepick" ? "veepick" : t.products.addedManually}
            accent={product.source === "veepick"}
            url={product.source === "veepick" ? (product.url ?? undefined) : undefined}
          />
        </div>

        {/* Description */}
        {product.description && (
          <DescriptionBlock text={product.description} />
        )}

        {/* Modele 3D */}
        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-bold tracking-[.05em] uppercase text-muted-foreground">{t.products.model3DSection}</p>
            {linkedModels.length > 0 && (
              <button
                onClick={onAddModel}
                className="text-[11px] text-primary hover:underline font-medium"
              >
                {t.products.addAnother}
              </button>
            )}
          </div>
          {linkedModels.length === 0 ? (
            <button
              onClick={onAddModel}
              disabled={expired}
              title={expired ? t.products.paidPlanOnly : undefined}
              className="w-full flex items-center justify-center gap-2 rounded-lg border border-dashed border-border py-3 text-[12.5px] text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors disabled:opacity-40 disabled:pointer-events-none"
            >
              <DeployedCode size={15} />
              {t.products.addModel3D}
            </button>
          ) : (
            <div className="flex flex-col gap-2">
              {linkedModels.map((m) => (
                <div key={m.id} className="flex items-center gap-2.5 rounded-lg border border-border px-2.5 py-2 bg-muted/30">
                  <div className="w-9 h-9 rounded-md bg-muted flex items-center justify-center overflow-hidden shrink-0">
                    {m.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.thumbnailUrl} alt={m.name} className="w-full h-full object-cover" />
                    ) : (
                      <DeployedCode size={16} className="text-muted-foreground/50" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-medium truncate">{m.name}</p>
                    <p className="text-[10.5px] text-muted-foreground">{m.category}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-border px-4 py-[14px] flex flex-col gap-2 shrink-0">
        <Button
          className="w-full justify-center text-[12.5px] py-[11px]"
          disabled={expired}
          title={expired ? t.products.paidPlanOnly : undefined}
          onClick={onAddToList}
        >
          <AddShoppingCart size={15} />
          {t.products.addToShoppingList}
        </Button>
        {product.url && (
          <a
            href={product.url}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 text-[12.5px] font-medium text-foreground border border-border rounded-lg py-[11px] hover:bg-muted transition-colors"
          >
            <ExternalLink size={14} />
            {t.products.openInShop}
          </a>
        )}
      </div>
    </>
  );
}

function TextureDetailPanel({
  texture,
  onClose,
  onToggleFavorite,
  onEdit,
  onDelete,
  deleting,
}: {
  texture: Texture;
  onClose: () => void;
  onToggleFavorite: () => void;
  onEdit: () => void;
  onDelete: () => void;
  deleting: boolean;
}) {
  const t = useT();
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const rows: { label: string; value: string }[] = [
    ...(texture.category ? [{ label: t.products.specCategory, value: texture.category }] : []),
    ...(texture.manufacturer ? [{ label: t.products.filterManufacturer, value: texture.manufacturer }] : []),
    ...(texture.finish ? [{ label: t.products.specFinish, value: texture.finish }] : []),
    ...(texture.resolution ? [{ label: t.products.specResolution, value: texture.resolution }] : []),
    ...(texture.scale ? [{ label: t.products.specTileScale, value: texture.scale }] : []),
  ];

  return (
    <>
      {/* Header */}
      <div className="h-[52px] flex items-center justify-between px-4 border-b shrink-0">
        <span className="text-[11px] font-bold tracking-[.05em] uppercase text-muted-foreground">
          {t.products.textureDetails}
        </span>
        <div className="flex items-center gap-0.5">
          <button
            onClick={onToggleFavorite}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
            title={texture.favorite ? t.products.favoriteRemove : t.products.favoriteAdd}
          >
            {texture.favorite
              ? <StarFilled size={16} className="text-amber-500" />
              : <StarOutline size={16} className="text-muted-foreground" />}
          </button>
          <button
            onClick={onEdit}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            title={t.products.editTextureTitle}
          >
            <Pencil size={16} />
          </button>
          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            >
              <MoreVertical size={16} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-9 z-10 bg-background border border-border rounded-lg shadow-md w-36 py-1">
                {confirmDelete ? (
                  <>
                    <button
                      className="w-full text-left px-3 py-2 text-xs text-destructive hover:bg-muted"
                      onClick={() => { setMenuOpen(false); setConfirmDelete(false); onDelete(); }}
                      disabled={deleting}
                    >
                      {deleting ? t.products.deletingLabel : t.products.confirmDeleteBtn}
                    </button>
                    <button
                      className="w-full text-left px-3 py-2 text-xs text-muted-foreground hover:bg-muted"
                      onClick={() => setConfirmDelete(false)}
                    >
                      {t.products.cancelBtn}
                    </button>
                  </>
                ) : (
                  <button
                    className="w-full text-left px-3 py-2 text-xs text-destructive hover:bg-muted"
                    onClick={() => setConfirmDelete(true)}
                  >
                    {t.products.deleteTexture}
                  </button>
                )}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-0">
        <div
          className={`aspect-[4/3] rounded-xl border border-border overflow-hidden bg-muted shrink-0 ${texture.imageUrl ? "cursor-zoom-in" : ""}`}
          onClick={() => texture.imageUrl && setLightboxOpen(true)}
        >
          {texture.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={texture.imageUrl} alt={texture.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <TextureIcon size={36} className="text-muted-foreground/20" />
            </div>
          )}
        </div>

        {lightboxOpen && texture.imageUrl && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={() => setLightboxOpen(false)}>
            <button className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors" onClick={() => setLightboxOpen(false)}>
              <X size={18} />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={texture.imageUrl} alt={texture.name} className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl" onClick={(e) => e.stopPropagation()} />
          </div>
        )}

        <h2 className="text-[15.5px] font-bold leading-[1.35] mt-4">{texture.name}</h2>

        {rows.length > 0 && (
          <div className="mt-4 flex flex-col">
            {rows.map((r) => <SpecRow key={r.label} label={r.label} value={r.value} />)}
          </div>
        )}
      </div>

      {texture.imageUrl && (
        <div className="border-t border-border px-4 py-[14px] shrink-0">
          <a
            href={texture.imageUrl}
            download
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 text-[12.5px] font-medium bg-primary text-primary-foreground rounded-lg py-[11px] hover:bg-primary/90 transition-colors"
          >
            <Download size={15} />
            {t.products.downloadTexture}
          </a>
        </div>
      )}
    </>
  );
}

function DescriptionBlock({ text }: { text: string }) {
  const t = useT();
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="mt-4 pt-4 border-t border-border">
      <p className="text-[11px] font-bold tracking-[.05em] uppercase text-muted-foreground mb-2">{t.products.descriptionTitle}</p>
      <div className="relative">
        <p className={`text-[12.5px] text-foreground whitespace-pre-wrap leading-relaxed ${expanded ? "" : "line-clamp-2"}`}>
          {text}
        </p>
        {!expanded && (
          <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-background to-transparent pointer-events-none" />
        )}
      </div>
      <button
        onClick={() => setExpanded((v) => !v)}
        className="mt-1.5 text-[11.5px] text-primary hover:underline font-medium"
      >
        {expanded ? t.products.descriptionCollapse : t.products.descriptionExpand}
      </button>
    </div>
  );
}

function SpecRow({ label, value, accent, url }: { label: string; value: string; accent?: boolean; url?: string }) {
  return (
    <div className="flex items-center justify-between py-[9px] border-b border-border last:border-b-0 gap-3">
      <span className="text-[12.5px] text-muted-foreground shrink-0">{label}</span>
      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className={`text-[12.5px] font-semibold text-right flex items-center gap-1 hover:underline ${accent ? "text-primary" : "text-foreground"}`}
        >
          {value}
          <ExternalLink size={11} />
        </a>
      ) : (
        <span className={`text-[12.5px] font-semibold text-right ${accent ? "text-primary" : "text-foreground"}`}>
          {value}
        </span>
      )}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-sm text-foreground">{value}</p>
    </div>
  );
}
