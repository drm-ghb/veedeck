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
import { UploadButton } from "@uploadthing/react";
import type { OurFileRouter } from "@/lib/uploadthing";

const CATEGORIES = [
  { value: "LAMPY", label: "Lampy" },
  { value: "AKCESORIA", label: "Akcesoria" },
  { value: "MEBLE", label: "Meble" },
  { value: "ARMATURA", label: "Armatura" },
  { value: "OKLADZINY_SCIENNE", label: "Okładziny ścienne" },
  { value: "PODLOGA", label: "Podłoga" },
];

const CATEGORY_LABELS: Record<string, string> = {
  LAMPY: "Lampy", AKCESORIA: "Akcesoria", MEBLE: "Meble",
  ARMATURA: "Armatura", OKLADZINY_SCIENNE: "Okładziny ścienne", PODLOGA: "Podłoga",
};

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
}: AddProductDialogProps) {
  const [tab, setTab] = useState<"link" | "manual" | "library">("link");
  const [scrapeUrl, setScrapeUrl] = useState("");
  const [scraping, setScraping] = useState(false);
  const [form, setForm] = useState<ProductData>(empty());
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

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
        toast.warning("Sklep blokuje automatyczne pobieranie — uzupełnij dane ręcznie");
      }
      setTab("manual");
    } catch {
      toast.error("Nie udało się pobrać danych produktu");
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
      toast.success("Produkt dodany");
      onAdded(product);
      handleClose();
    } catch {
      toast.error("Błąd dodawania produktu");
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
      toast.success("Produkt dodany");
      onAdded(product);
      handleClose();
    } catch {
      toast.error("Błąd dodawania produktu");
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
          <DialogTitle>Dodaj produkt</DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-1 bg-muted rounded-lg p-1 mb-2 overflow-hidden">
          {(["link", "library", "manual"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`flex-1 min-w-0 text-sm py-1.5 rounded-md font-medium transition-colors truncate ${
                tab === t
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "link" ? "Link" : t === "library" ? "Produkty" : "Ręcznie"}
            </button>
          ))}
        </div>

        {tab === "link" && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="scrape-url">Link do produktu</Label>
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
                <><Loader2 size={15} className="animate-spin mr-2" />Pobieranie danych...</>
              ) : (
                "Pobierz dane produktu"
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
                placeholder="Szukaj po nazwie lub producencie..."
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
                    {libraryQuery ? "Brak wyników dla podanej frazy" : "Brak produktów w bazie"}
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
                            {CATEGORY_LABELS[lp.category] ?? lp.category}
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
              <Label>Zdjęcie produktu</Label>
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
                <div className="rounded-lg border-2 border-dashed border-border h-32 bg-muted/30 flex items-center justify-center">
                  {uploading ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 size={18} className="animate-spin text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">Przesyłanie...</p>
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
                        toast.error("Błąd przesyłania zdjęcia");
                        setUploading(false);
                      }}
                      appearance={{
                        container: "flex flex-col items-center gap-2 !mt-0",
                        button: "bg-transparent p-0 border-0 shadow-none text-xs text-muted-foreground hover:text-foreground underline cursor-pointer ut-uploading:opacity-50 flex flex-col items-center gap-1.5",
                        allowedContent: "hidden",
                      }}
                      content={{
                        button: <><ImagePlus size={20} className="text-muted-foreground" /><span>Wybierz zdjęcie</span></>,
                      }}
                    />
                  )}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="p-category">Kategoria</Label>
              <select
                id="p-category"
                value={form.category}
                onChange={(e) => set("category", e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#C45824]/20 focus:border-[#C45824]/40"
              >
                <option value="">Brak kategorii</option>
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="p-name">Nazwa *</Label>
              <Input
                id="p-name"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="np. Lampa sufitowa Jaxal"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="p-price">Cena</Label>
                <Input id="p-price" value={form.price} onChange={(e) => set("price", e.target.value)} placeholder="np. 299 PLN" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-manufacturer">Producent</Label>
                <Input id="p-manufacturer" value={form.manufacturer} onChange={(e) => set("manufacturer", e.target.value)} placeholder="np. Sklum" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="p-color">Kolor</Label>
                <Input id="p-color" value={form.color} onChange={(e) => set("color", e.target.value)} placeholder="np. Biały" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-size">Wymiar</Label>
                <Input id="p-size" value={form.dimensions} onChange={(e) => set("dimensions", e.target.value)} placeholder="np. 30x30 cm" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="p-delivery">Czas dostawy</Label>
              <Input id="p-delivery" value={form.deliveryTime} onChange={(e) => set("deliveryTime", e.target.value)} placeholder="np. 3-5 dni roboczych" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="p-supplier">Dostawca</Label>
                <Input id="p-supplier" value={form.supplier} onChange={(e) => set("supplier", e.target.value)} placeholder="np. sklum.com" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-catalog">Nr. katalogowy</Label>
                <Input id="p-catalog" value={form.catalogNumber} onChange={(e) => set("catalogNumber", e.target.value)} placeholder="np. 194309-497795" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="p-url">Link do produktu</Label>
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
              <Label htmlFor="p-desc">Opis</Label>
              <Textarea id="p-desc" value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Opis produktu..." rows={2} />
            </div>

            </div>
            <div className="flex gap-2 justify-end pt-3 border-t border-border mt-3">
              <Button type="button" variant="outline" onClick={handleClose}>Anuluj</Button>
              <Button type="submit" disabled={saving || !form.name.trim() || uploading}>
                {saving ? "Dodawanie..." : "Dodaj produkt"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
