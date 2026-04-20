"use client";

import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, ExternalLink, ImagePlus, X, Search, Package } from "lucide-react";
import { useT } from "@/lib/i18n";
import { UploadButton } from "@uploadthing/react";
import type { OurFileRouter } from "@/lib/uploadthing";
import { useUploadThing } from "@/lib/uploadthing-client";

const CATEGORY_VALUES = ["LAMPY", "AKCESORIA", "MEBLE", "ARMATURA", "OKLADZINY_SCIENNE", "PODLOGA"] as const;

type TProducts = ReturnType<typeof useT>["products"];
const CAT_KEY_MAP: Record<string, keyof TProducts> = {
  LAMPY: "catLampy", AKCESORIA: "catAkcesoria", MEBLE: "catMeble",
  ARMATURA: "catArmatura", OKLADZINY_SCIENNE: "catOkladziny", PODLOGA: "catPodloga",
};
function getCategoryLabel(cat: string, t: ReturnType<typeof useT>) {
  const key = CAT_KEY_MAP[cat];
  return key ? t.products[key] : cat;
}

interface ProductData {
  name: string;
  url: string;
  imageUrl: string;
  price: string;
  manufacturer: string;
  color: string;
  dimensions: string;
  description: string;
  deliveryTime: string;
  category: string;
  supplier: string;
  catalogNumber: string;
}

interface LibraryProduct {
  id: string;
  name: string;
  imageUrl: string | null;
  price: string | null;
  manufacturer: string | null;
  url: string | null;
  color: string | null;
  dimensions: string | null;
  description: string | null;
  deliveryTime: string | null;
  category: string | null;
  quantity: number;
}

interface AddProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listId: string;
  sectionId?: string | null;
  onAdded: (product: unknown) => void;
  customCategories?: string[];
}

const empty = (): ProductData => ({
  name: "", url: "", imageUrl: "", price: "",
  manufacturer: "", color: "", dimensions: "", description: "", deliveryTime: "", category: "",
  supplier: "", catalogNumber: "",
});

export default function AddProductDialog({
  open,
  onOpenChange,
  listId,
  sectionId,
  onAdded,
  customCategories = [],
}: AddProductDialogProps) {
  const t = useT();
  const [tab, setTab] = useState<"link" | "manual" | "library">("link");
  const [scrapeUrl, setScrapeUrl] = useState("");
  const [scraping, setScraping] = useState(false);
  const [form, setForm] = useState<ProductData>(empty());
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const { startUpload } = useUploadThing("productImageUploader", {
    onUploadBegin: () => setUploading(true),
    onClientUploadComplete: (res) => {
      const url = res?.[0]?.url;
      if (url) set("imageUrl", url);
      setUploading(false);
    },
    onUploadError: () => {
      toast.error(t.products.imageUploadError);
      setUploading(false);
    },
  });

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    startUpload([file]);
  }

  // Library tab state
  const [libraryQuery, setLibraryQuery] = useState("");
  const [libraryProducts, setLibraryProducts] = useState<LibraryProduct[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function set(field: keyof ProductData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  // Fetch library products when tab is active or query changes
  useEffect(() => {
    if (tab !== "library") return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLibraryLoading(true);
      try {
        const res = await fetch(`/api/products?q=${encodeURIComponent(libraryQuery)}`);
        if (res.ok) setLibraryProducts(await res.json());
      } finally {
        setLibraryLoading(false);
      }
    }, 250);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [tab, libraryQuery]);

  async function handleScrape() {
    if (!scrapeUrl.trim()) return;
    setScraping(true);
    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: scrapeUrl.trim() }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      let fallbackSupplier = "";
      try {
        const h = new URL(scrapeUrl.trim()).hostname;
        fallbackSupplier = h.startsWith("www.") ? h : `www.${h}`;
      } catch { /* ignore */ }
      setForm({
        name: data.name ?? "",
        url: scrapeUrl.trim(),
        imageUrl: data.imageUrl ?? "",
        price: data.price ?? "",
        manufacturer: data.manufacturer ?? "",
        color: data.color ?? "",
        dimensions: data.dimensions ?? "",
        description: data.description ?? "",
        deliveryTime: data.deliveryTime ?? "",
        category: "",
        supplier: data.supplier || fallbackSupplier,
        catalogNumber: data.catalogNumber ?? "",
      });
      if (data.partial) {
        toast.warning(t.products.fetchBlockedError);
      }
      setTab("manual");
    } catch {
      toast.error(t.products.fetchError);
    } finally {
      setScraping(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const endpoint = sectionId
        ? `/api/lists/${listId}/sections/${sectionId}/products`
        : `/api/lists/${listId}/products`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      const product = await res.json();
      toast.success(t.products.productAdded);
      onAdded(product);
      handleClose();
    } catch {
      toast.error(t.products.productAddError);
    } finally {
      setSaving(false);
    }
  }

  async function handleSelectFromLibrary(lp: LibraryProduct) {
    setSaving(true);
    try {
      const endpoint = sectionId
        ? `/api/lists/${listId}/sections/${sectionId}/products`
        : `/api/lists/${listId}/products`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: lp.name,
          url: lp.url || "",
          imageUrl: lp.imageUrl || "",
          price: lp.price || "",
          manufacturer: lp.manufacturer || "",
          color: lp.color || "",
          dimensions: lp.dimensions || "",
          description: lp.description || "",
          deliveryTime: lp.deliveryTime || "",
          category: lp.category || "",
          quantity: 1,
          productId: lp.id,
        }),
      });
      if (!res.ok) throw new Error();
      const product = await res.json();
      toast.success(t.products.productAdded);
      onAdded(product);
      handleClose();
    } catch {
      toast.error(t.products.productAddError);
    } finally {
      setSaving(false);
    }
  }

  function handleClose() {
    onOpenChange(false);
    setScrapeUrl("");
    setForm(empty());
    setTab("link");
    setLibraryQuery("");
    setLibraryProducts([]);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl overflow-x-hidden">
        <DialogHeader>
          <DialogTitle>{t.products.addProduct}</DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-1 bg-muted rounded-lg p-1 mb-2 overflow-hidden">
          {(["link", "library", "manual"] as const).map((tabKey) => (
            <button
              key={tabKey}
              type="button"
              onClick={() => setTab(tabKey)}
              className={`flex-1 min-w-0 text-sm py-1.5 rounded-md font-medium transition-colors truncate ${
                tab === tabKey
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tabKey === "link" ? t.products.linkTab : tabKey === "library" ? t.products.libraryTab : t.products.manualTab}
            </button>
          ))}
        </div>

        {tab === "link" && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="scrape-url">{t.products.productLink}</Label>
              <Input
                id="scrape-url"
                value={scrapeUrl}
                onChange={(e) => setScrapeUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleScrape()}
                placeholder="https://..."
                autoFocus
              />
            </div>
            <Button
              onClick={handleScrape}
              disabled={scraping || !scrapeUrl.trim()}
              className="w-full"
            >
              {scraping ? (
                <><Loader2 size={15} className="animate-spin mr-2" />{t.products.fetching}</>
              ) : (
                t.products.fetchData
              )}
            </Button>
          </div>
        )}

        {tab === "library" && (
          <div className="w-full min-w-0 flex flex-col gap-3">
            <div className="relative w-full">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={libraryQuery}
                onChange={(e) => setLibraryQuery(e.target.value)}
                placeholder={t.products.searchByName}
                className="pl-9"
                autoFocus
              />
            </div>
            <div className="w-full overflow-y-auto overflow-x-hidden space-y-1 h-[45dvh] sm:h-[55dvh]">
              {libraryLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 size={20} className="animate-spin text-muted-foreground" />
                </div>
              ) : libraryProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
                  <Package size={32} className="opacity-30" />
                  <p className="text-sm">
                    {libraryQuery ? t.common.noResults : t.products.noProductsInDB}
                  </p>
                </div>
              ) : (
                libraryProducts.map((lp) => (
                  <button
                    key={lp.id}
                    type="button"
                    disabled={saving}
                    onClick={() => handleSelectFromLibrary(lp)}
                    className="w-full max-w-full flex items-center gap-2 p-2 rounded-lg border border-border hover:bg-muted/60 transition-colors text-left disabled:opacity-50 overflow-hidden"
                  >
                    <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-md overflow-hidden border border-border bg-muted flex items-center justify-center shrink-0">
                      {lp.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={lp.imageUrl} alt={lp.name} className="w-full h-full object-contain" />
                      ) : (
                        <Package size={14} className="text-muted-foreground/40 sm:w-[18px] sm:h-[18px]" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <p className="text-sm font-medium truncate">{lp.name}</p>
                      {lp.manufacturer && (
                        <p className="text-xs text-muted-foreground truncate">{lp.manufacturer}</p>
                      )}
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        {lp.price && (
                          <span className="text-xs font-semibold text-foreground shrink-0">{lp.price}</span>
                        )}
                        {lp.category && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium shrink-0">
                            {getCategoryLabel(lp.category, t)}
                          </span>
                        )}
                      </div>
                    </div>
                    {saving && <Loader2 size={14} className="animate-spin text-muted-foreground shrink-0" />}
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {tab === "manual" && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-0">
            <div className="space-y-4 overflow-y-auto pr-1 max-h-[45dvh] sm:max-h-[55dvh]">
            {/* Image */}
            <div className="space-y-1.5">
              <Label>{t.products.productImage}</Label>
              {form.imageUrl ? (
                <div className="relative rounded-lg overflow-hidden border border-border h-40 bg-muted flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={form.imageUrl} alt={form.name} className="h-full w-full object-contain" />
                  <button
                    type="button"
                    onClick={() => set("imageUrl", "")}
                    className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div
                  className={`rounded-lg border-2 border-dashed h-32 flex items-center justify-center transition-colors ${
                    isDragOver
                      ? "border-primary bg-primary/5"
                      : "border-border bg-muted/30"
                  }`}
                  onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                  onDragEnter={(e) => { e.preventDefault(); setIsDragOver(true); }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={handleDrop}
                >
                  {uploading ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 size={18} className="animate-spin text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">{t.products.uploading}</p>
                    </div>
                  ) : isDragOver ? (
                    <div className="flex flex-col items-center gap-2 pointer-events-none">
                      <ImagePlus size={22} className="text-primary" />
                      <p className="text-xs font-medium text-primary">Upuść zdjęcie tutaj</p>
                    </div>
                  ) : (
                    <UploadButton<OurFileRouter, "productImageUploader">
                      endpoint="productImageUploader"
                      onUploadBegin={() => setUploading(true)}
                      onClientUploadComplete={(res) => {
                        const url = res?.[0]?.url;
                        if (url) set("imageUrl", url);
                        setUploading(false);
                      }}
                      onUploadError={() => {
                        toast.error(t.products.imageUploadError);
                        setUploading(false);
                      }}
                      appearance={{
                        container: "flex flex-col items-center gap-2 !mt-0",
                        button: "bg-transparent p-0 border-0 shadow-none text-xs text-muted-foreground hover:text-foreground underline cursor-pointer ut-uploading:opacity-50 flex flex-col items-center gap-1.5",
                        allowedContent: "hidden",
                      }}
                      content={{
                        button: <><ImagePlus size={20} className="text-muted-foreground" /><span>{t.products.chooseImage}</span><span className="text-[10px] text-muted-foreground/60">lub przeciągnij zdjęcie</span></>,
                      }}
                    />
                  )}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="p-category">{t.products.category}</Label>
              <select
                id="p-category"
                value={form.category}
                onChange={(e) => set("category", e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
              >
                <option value="">{t.products.noCategory}</option>
                {CATEGORY_VALUES.map((v) => (
                  <option key={v} value={v}>{getCategoryLabel(v, t)}</option>
                ))}
                {customCategories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="p-name">{t.products.nameLabel}</Label>
              <Input
                id="p-name"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder={t.products.namePlaceholder}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="p-price">{t.products.priceLabel}</Label>
                <Input id="p-price" value={form.price} onChange={(e) => set("price", e.target.value)} placeholder={t.products.pricePlaceholder} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-manufacturer">{t.products.brandLabel}</Label>
                <Input id="p-manufacturer" value={form.manufacturer} onChange={(e) => set("manufacturer", e.target.value)} placeholder={t.products.brandPlaceholder} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="p-color">{t.products.colorLabel}</Label>
                <Input id="p-color" value={form.color} onChange={(e) => set("color", e.target.value)} placeholder={t.products.colorPlaceholder} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-size">{t.products.dimensionsLabel}</Label>
                <Input id="p-size" value={form.dimensions} onChange={(e) => set("dimensions", e.target.value)} placeholder={t.products.dimensionsPlaceholder} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="p-delivery">{t.products.deliveryLabel}</Label>
              <Input id="p-delivery" value={form.deliveryTime} onChange={(e) => set("deliveryTime", e.target.value)} placeholder={t.products.deliveryPlaceholder} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="p-supplier">{t.products.supplierLabel}</Label>
                <Input id="p-supplier" value={form.supplier} onChange={(e) => set("supplier", e.target.value)} placeholder={t.products.supplierPlaceholder} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-catalog">{t.products.catalogNumberLabel}</Label>
                <Input id="p-catalog" value={form.catalogNumber} onChange={(e) => set("catalogNumber", e.target.value)} placeholder={t.products.catalogNumberPlaceholder} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="p-url">{t.products.productLink}</Label>
              <div className="relative">
                <Input id="p-url" value={form.url} onChange={(e) => set("url", e.target.value)} placeholder="https://..." className="pr-8" />
                {form.url && (
                  <a href={form.url} target="_blank" rel="noopener noreferrer" className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    <ExternalLink size={14} />
                  </a>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="p-desc">{t.products.descriptionLabel}</Label>
              <Textarea id="p-desc" value={form.description} onChange={(e) => set("description", e.target.value)} placeholder={t.products.descriptionPlaceholder} rows={2} />
            </div>

            </div>
            <div className="flex gap-2 justify-end pt-3 border-t border-border mt-3">
              <Button type="button" variant="outline" onClick={handleClose}>{t.common.cancel}</Button>
              <Button type="submit" disabled={saving || !form.name.trim() || uploading}>
                {saving ? t.products.addingProduct : t.products.addProduct}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
