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
}

export default function EditProductDialog({
  open,
  onOpenChange,
  listId,
  sectionId,
  product,
  onUpdated,
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
      toast.success("Produkt zaktualizowany");
      onUpdated(updated);
      onOpenChange(false);
    } catch {
      toast.error("Błąd aktualizacji produktu");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edytuj produkt</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-0">
          <div className="space-y-4 overflow-y-auto pr-1" style={{ maxHeight: "calc(60vh - 48px)" }}>
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
              <div className="rounded-lg border-2 border-dashed border-border h-32 flex flex-col items-center justify-center gap-2 bg-muted/30">
                {uploading ? (
                  <><Loader2 size={18} className="animate-spin text-muted-foreground" /><p className="text-xs text-muted-foreground">Przesyłanie...</p></>
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
                        toast.error("Błąd przesyłania zdjęcia");
                        setUploading(false);
                      }}
                      appearance={{
                        button: "bg-transparent text-xs text-muted-foreground hover:text-foreground underline cursor-pointer ut-uploading:opacity-50",
                        allowedContent: "hidden",
                      }}
                      content={{ button: "Wybierz zdjęcie" }}
                    />
                  </>
                )}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ep-name">Nazwa *</Label>
            <Input
              id="ep-name"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="np. Lampa sufitowa Jaxal"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ep-price">Cena</Label>
              <Input id="ep-price" value={form.price} onChange={(e) => set("price", e.target.value)} placeholder="np. 299 PLN" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ep-manufacturer">Producent</Label>
              <Input id="ep-manufacturer" value={form.manufacturer} onChange={(e) => set("manufacturer", e.target.value)} placeholder="np. Sklum" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ep-color">Kolor</Label>
              <Input id="ep-color" value={form.color} onChange={(e) => set("color", e.target.value)} placeholder="np. Biały" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ep-size">Wymiar</Label>
              <Input id="ep-size" value={form.dimensions} onChange={(e) => set("dimensions", e.target.value)} placeholder="np. 30x30 cm" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ep-delivery">Czas dostawy</Label>
            <Input id="ep-delivery" value={form.deliveryTime} onChange={(e) => set("deliveryTime", e.target.value)} placeholder="np. 3-5 dni roboczych" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ep-supplier">Dostawca</Label>
              <Input id="ep-supplier" value={form.supplier} onChange={(e) => set("supplier", e.target.value)} placeholder="np. sklum.com" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ep-catalog">Nr. katalogowy</Label>
              <Input id="ep-catalog" value={form.catalogNumber} onChange={(e) => set("catalogNumber", e.target.value)} placeholder="np. 194309-497795" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ep-category">Kategoria</Label>
            <select
              id="ep-category"
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
            <Label htmlFor="ep-url">Link do produktu</Label>
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
            <Label htmlFor="ep-desc">Opis</Label>
            <Textarea id="ep-desc" value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Opis produktu..." rows={2} />
          </div>

          </div>
          <div className="flex gap-2 justify-end pt-3 border-t border-border mt-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Anuluj</Button>
            <Button type="submit" disabled={saving || !form.name.trim() || uploading}>
              {saving ? "Zapisywanie..." : "Zapisz zmiany"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
