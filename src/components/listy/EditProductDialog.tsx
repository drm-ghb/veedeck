"use client";

import { useState } from "react";
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
import { Loader2, ExternalLink, ImagePlus, X } from "lucide-react";
import { useT } from "@/lib/i18n";
import { UploadButton } from "@uploadthing/react";
import type { OurFileRouter } from "@/lib/uploadthing";

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

interface EditProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listId: string;
  sectionId: string;
  product: { id: string } & ProductData;
  onUpdated: (product: unknown) => void;
  customCategories?: string[];
}

export default function EditProductDialog({
  open,
  onOpenChange,
  listId,
  sectionId,
  product,
  onUpdated,
  customCategories = [],
}: EditProductDialogProps) {
  const [form, setForm] = useState<ProductData>({
    name: product.name,
    url: product.url ?? "",
    imageUrl: product.imageUrl ?? "",
    price: product.price ?? "",
    manufacturer: product.manufacturer ?? "",
    color: product.color ?? "",
    dimensions: product.dimensions ?? "",
    description: product.description ?? "",
    deliveryTime: product.deliveryTime ?? "",
    category: product.category ?? "",
    supplier: product.supplier ?? "",
    catalogNumber: product.catalogNumber ?? "",
  });
  const t = useT();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  function set(field: keyof ProductData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/lists/${listId}/sections/${sectionId}/products/${product.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      toast.success(t.products.productUpdated);
      onUpdated(updated);
      onOpenChange(false);
    } catch {
      toast.error(t.products.productUpdateError);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t.products.editProduct}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-0">
          <div className="space-y-4 overflow-y-auto pr-1" style={{ maxHeight: "calc(60vh - 48px)" }}>
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
              <div className="rounded-lg border-2 border-dashed border-border h-32 flex flex-col items-center justify-center gap-2 bg-muted/30">
                {uploading ? (
                  <><Loader2 size={18} className="animate-spin text-muted-foreground" /><p className="text-xs text-muted-foreground">{t.products.uploading}</p></>
                ) : (
                  <>
                    <ImagePlus size={20} className="text-muted-foreground" />
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
                        button: "bg-transparent text-xs text-muted-foreground hover:text-foreground underline cursor-pointer ut-uploading:opacity-50",
                        allowedContent: "hidden",
                      }}
                      content={{ button: t.products.chooseImage }}
                    />
                  </>
                )}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ep-category">{t.products.category}</Label>
            <select
              id="ep-category"
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
            <Label htmlFor="ep-name">{t.products.nameLabel}</Label>
            <Input
              id="ep-name"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder={t.products.namePlaceholder}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ep-price">{t.products.priceLabel}</Label>
              <Input id="ep-price" value={form.price} onChange={(e) => set("price", e.target.value)} placeholder={t.products.pricePlaceholder} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ep-manufacturer">{t.products.brandLabel}</Label>
              <Input id="ep-manufacturer" value={form.manufacturer} onChange={(e) => set("manufacturer", e.target.value)} placeholder={t.products.brandPlaceholder} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ep-color">{t.products.colorLabel}</Label>
              <Input id="ep-color" value={form.color} onChange={(e) => set("color", e.target.value)} placeholder={t.products.colorPlaceholder} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ep-size">{t.products.dimensionsLabel}</Label>
              <Input id="ep-size" value={form.dimensions} onChange={(e) => set("dimensions", e.target.value)} placeholder={t.products.dimensionsPlaceholder} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ep-delivery">{t.products.deliveryLabel}</Label>
            <Input id="ep-delivery" value={form.deliveryTime} onChange={(e) => set("deliveryTime", e.target.value)} placeholder={t.products.deliveryPlaceholder} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ep-supplier">{t.products.supplierLabel}</Label>
              <Input id="ep-supplier" value={form.supplier} onChange={(e) => set("supplier", e.target.value)} placeholder={t.products.supplierPlaceholder} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ep-catalog">{t.products.catalogNumberLabel}</Label>
              <Input id="ep-catalog" value={form.catalogNumber} onChange={(e) => set("catalogNumber", e.target.value)} placeholder={t.products.catalogNumberPlaceholder} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ep-url">{t.products.productLink}</Label>
            <div className="relative">
              <Input id="ep-url" value={form.url} onChange={(e) => set("url", e.target.value)} placeholder="https://..." className="pr-8" />
              {form.url && (
                <a href={form.url} target="_blank" rel="noopener noreferrer" className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <ExternalLink size={14} />
                </a>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ep-desc">{t.products.descriptionLabel}</Label>
            <Textarea id="ep-desc" value={form.description} onChange={(e) => set("description", e.target.value)} placeholder={t.products.descriptionPlaceholder} rows={2} />
          </div>

          </div>
          <div className="flex gap-2 justify-end pt-3 border-t border-border mt-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t.common.cancel}</Button>
            <Button type="submit" disabled={saving || !form.name.trim() || uploading}>
              {saving ? t.common.saving : t.products.saveChanges}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
