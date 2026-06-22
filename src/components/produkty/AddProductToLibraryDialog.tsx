"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, ExternalLink, ImagePlus, X } from "@/components/ui/icons";
import { UploadButton } from "@uploadthing/react";
import type { OurFileRouter } from "@/lib/uploadthing";
import { SearchProductDialog } from "./SearchProductDialog";
import { useT } from "@/lib/i18n";

interface ProductData {
  name: string; url: string; imageUrl: string; price: string;
  manufacturer: string; color: string; dimensions: string; description: string;
  deliveryTime: string; category: string;
}

const empty = (): ProductData => ({
  name: "", url: "", imageUrl: "", price: "",
  manufacturer: "", color: "", dimensions: "", description: "", deliveryTime: "", category: "",
});

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdded: (product: unknown) => void;
  initialData?: Partial<ProductData>;
  editMode?: boolean;
  editId?: string;
  hideAddFromLibrary?: boolean;
}

export default function AddProductToLibraryDialog({ open, onOpenChange, onAdded, initialData, editMode, editId, hideAddFromLibrary }: Props) {
  const t = useT();
  const CATEGORIES = [
    { value: "OSWIETLENIE", label: t.products.catLampy },
    { value: "AKCESORIA", label: t.products.catAkcesoria },
    { value: "MEBLE", label: t.products.catMeble },
    { value: "ARMATURA", label: t.products.catArmatura },
    { value: "OKLADZINY_SCIENNE", label: t.products.catOkladziny },
    { value: "PODLOGA", label: t.products.catPodloga },
  ];
  const [tab, setTab] = useState<"link" | "manual">("link");
  const [scrapeUrl, setScrapeUrl] = useState("");
  const [scraping, setScraping] = useState(false);
  const [form, setForm] = useState<ProductData>(empty);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({ ...empty(), ...initialData });
      setTab(editMode ? "manual" : "link");
      setScrapeUrl("");
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  function set(field: keyof ProductData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

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
      setForm({
        name: data.name ?? "", url: scrapeUrl.trim(), imageUrl: data.imageUrl ?? "",
        price: data.price ?? "", manufacturer: data.manufacturer ?? "", color: data.color ?? "",
        dimensions: data.dimensions ?? "", description: data.description ?? "", deliveryTime: data.deliveryTime ?? "", category: "",
      });
      if (data.partial) toast.warning(t.products.fetchBlockedError);
      setTab("manual");
    } catch {
      toast.error(t.products.fetchError);
    } finally {
      setScraping(false);
    }
  }

  async function handleSubmit() {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const url = editMode && editId ? `/api/products/${editId}` : "/api/products";
      const method = editMode ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      const product = await res.json();
      toast.success(editMode ? t.products.productUpdated : t.products.productAddedToLibrary);
      onAdded(product);
      handleClose();
    } catch {
      toast.error(editMode ? t.products.productUpdateError : t.products.productAddError);
    } finally {
      setSaving(false);
    }
  }

  function handleClose() {
    onOpenChange(false);
    setScrapeUrl("");
    setForm(empty());
    setTab("link");
  }

  function handleSelectProduct(product: any) {
    setForm({
      name: product.name || "",
      url: product.url || "",
      imageUrl: product.imageUrl || "",
      price: product.price || "",
      manufacturer: product.manufacturer || "",
      color: product.color || "",
      dimensions: product.dimensions || "",
      description: product.description || "",
      deliveryTime: product.deliveryTime || "",
      category: product.category || "",
    });
    setTab("manual");
    toast.success(t.products.productLoaded);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editMode ? t.products.editProduct : t.products.addToLibrary}</DialogTitle>
        </DialogHeader>

        <div className="flex gap-1 bg-muted rounded-lg p-1 mb-2">
          {(["link", "manual"] as const).map((tabKey) => (
            <button
              key={tabKey}
              type="button"
              onClick={() => setTab(tabKey)}
              className={`flex-1 text-sm py-1.5 rounded-md font-medium transition-colors ${tab === tabKey ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {tabKey === "link" ? t.products.linkTab : t.products.manualTab}
            </button>
          ))}
        </div>

        {tab === "link" ? (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="scrape-url">{t.products.productLink}</Label>
              <Input id="scrape-url" value={scrapeUrl} onChange={(e) => setScrapeUrl(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleScrape()} placeholder="https://..." autoFocus />
            </div>
            <Button onClick={handleScrape} disabled={scraping || !scrapeUrl.trim()} className="w-full">
              {scraping ? <><Loader2 size={15} className="animate-spin mr-2" />{t.products.fetching}</> : t.products.fetchData}
            </Button>
            {!hideAddFromLibrary && (
              <>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border"></div>
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">{t.common.or}</span>
                  </div>
                </div>
                <Button onClick={() => setSearchOpen(true)} variant="outline" className="w-full">
                  {t.products.addFromLibrary}
                </Button>
              </>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-0">
            <div className="space-y-4 overflow-y-auto pr-1" style={{ maxHeight: "calc(60vh - 48px)" }}>
              <div className="space-y-1.5">
                <Label>{t.products.productImage}</Label>
                {form.imageUrl ? (
                  <div className="relative rounded-lg overflow-hidden border border-border h-40 bg-muted flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={form.imageUrl} alt={form.name} className="h-full w-full object-contain" />
                    <button type="button" onClick={() => set("imageUrl", "")} className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1"><X size={14} /></button>
                  </div>
                ) : (
                  <div className="rounded-lg border-2 border-dashed border-border h-32 bg-muted/30 flex items-center justify-center">
                    {uploading ? (
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 size={18} className="animate-spin text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">{t.products.uploading}</p>
                      </div>
                    ) : (
                      <UploadButton<OurFileRouter, "productImageUploader">
                        endpoint="productImageUploader"
                        onUploadBegin={() => setUploading(true)}
                        onClientUploadComplete={(res) => { const url = res?.[0]?.url; if (url) set("imageUrl", url); setUploading(false); }}
                        onUploadError={() => { toast.error(t.products.imageUploadError); setUploading(false); }}
                        appearance={{ container: "flex flex-col items-center gap-2 !mt-0", button: "bg-transparent p-0 border-0 shadow-none text-xs text-muted-foreground hover:text-foreground underline cursor-pointer ut-uploading:opacity-50 flex flex-col items-center gap-1.5", allowedContent: "hidden" }}
                        content={{ button: <><ImagePlus size={20} className="text-muted-foreground" /><span>{t.products.chooseImage}</span></> }}
                      />
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="p-category">{t.products.category}</Label>
                <select id="p-category" value={form.category} onChange={(e) => set("category", e.target.value)} className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40">
                  <option value="">{t.products.noCategory}</option>
                  {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="p-name">{t.products.nameLabel}</Label>
                <Input id="p-name" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder={t.products.namePlaceholder} required autoFocus={tab === "manual"} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="p-price">{t.products.priceLabel}</Label>
                  <Input id="p-price" value={form.price} onChange={(e) => set("price", e.target.value)} placeholder={t.products.pricePlaceholder} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="p-manufacturer">{t.products.brandLabel}</Label>
                  <Input id="p-manufacturer" value={form.manufacturer} onChange={(e) => set("manufacturer", e.target.value)} placeholder={t.products.brandPlaceholder} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
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

              <div className="space-y-1.5">
                <Label htmlFor="p-url">{t.products.productLink}</Label>
                <div className="relative">
                  <Input id="p-url" value={form.url} onChange={(e) => set("url", e.target.value)} placeholder="https://..." className="pr-8" />
                  {form.url && <a href={form.url} target="_blank" rel="noopener noreferrer" className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><ExternalLink size={14} /></a>}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="p-desc">{t.products.descriptionLabel}</Label>
                <Textarea id="p-desc" value={form.description} onChange={(e) => set("description", e.target.value)} placeholder={t.products.descriptionPlaceholder} rows={2} />
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-3 border-t border-border mt-3">
              <Button type="button" variant="outline" onClick={handleClose}>{t.common.cancel}</Button>
              <Button onClick={handleSubmit} disabled={saving || !form.name.trim() || uploading}>
                {saving ? t.common.saving : (editMode ? t.products.saveChanges : t.products.addProduct)}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>

      <SearchProductDialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
        onSelectProduct={handleSelectProduct}
      />
    </Dialog>
  );
}
