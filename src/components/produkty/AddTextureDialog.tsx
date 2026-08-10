"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { UploadButton } from "@uploadthing/react";
import type { OurFileRouter } from "@/lib/uploadthing";
import { X, TextureIcon } from "@/components/ui/icons";

const CATEGORIES = ["Drewno", "Kamień", "Tkaniny", "Płytki", "Metal", "Szkło", "Beton", "Inne"];
const FINISHES = ["Mat", "Połysk", "Struktura", "Satyna"];

interface InitialData {
  name: string;
  category: string;
  manufacturer: string;
  resolution: string;
  scale: string;
  finish: string;
  imageUrl: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdded: (texture: unknown) => void;
  editMode?: boolean;
  editId?: string;
  initialData?: InitialData;
}

export default function AddTextureDialog({ open, onOpenChange, onAdded, editMode, editId, initialData }: Props) {
  const [name, setName] = useState(initialData?.name ?? "");
  const [category, setCategory] = useState(initialData?.category ?? "");
  const [manufacturer, setManufacturer] = useState(initialData?.manufacturer ?? "");
  const [resolution, setResolution] = useState(initialData?.resolution ?? "");
  const [scale, setScale] = useState(initialData?.scale ?? "");
  const [finish, setFinish] = useState(initialData?.finish ?? "");
  const [imageUrl, setImageUrl] = useState(initialData?.imageUrl ?? "");
  const [saving, setSaving] = useState(false);

  function reset() {
    setName(""); setCategory(""); setManufacturer("");
    setResolution(""); setScale(""); setFinish(""); setImageUrl("");
  }

  async function handleSave() {
    if (!name.trim()) { toast.error("Podaj nazwę tekstury"); return; }
    setSaving(true);
    try {
      const url = editMode && editId ? `/api/textures/${editId}` : "/api/textures";
      const method = editMode ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, category, manufacturer, resolution, scale, finish, imageUrl }),
      });
      if (!res.ok) throw new Error();
      const texture = await res.json();
      toast.success(editMode ? "Tekstura zaktualizowana" : "Tekstura dodana");
      onAdded(texture);
      onOpenChange(false);
      if (!editMode) reset();
    } catch {
      toast.error(editMode ? "Nie udało się zaktualizować tekstury" : "Nie udało się dodać tekstury");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editMode ? "Edytuj teksturę" : "Dodaj teksturę"}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          {/* Image upload */}
          <div className="flex flex-col gap-1.5">
            <Label>Podgląd (JPG / PNG)</Label>
            {imageUrl ? (
              <div className="relative w-32 aspect-square rounded-lg overflow-hidden border border-border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl} alt="podgląd" className="w-full h-full object-cover" />
                <button
                  onClick={() => setImageUrl("")}
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70"
                >
                  <X size={12} />
                </button>
              </div>
            ) : (
              <div className="relative w-32 aspect-square rounded-lg border-2 border-dashed border-border bg-muted/30 flex flex-col items-center justify-center gap-1.5 overflow-hidden">
                <TextureIcon size={24} className="text-muted-foreground/50 pointer-events-none" />
                <span className="text-[10.5px] text-muted-foreground pointer-events-none">Wgraj zdjęcie</span>
                <UploadButton<OurFileRouter, "textureImageUploader">
                  endpoint="textureImageUploader"
                  onClientUploadComplete={(res) => res?.[0] && setImageUrl(res[0].url)}
                  onUploadError={() => { toast.error("Błąd uploadu"); }}
                  appearance={{
                    button: "absolute inset-0 opacity-0 cursor-pointer w-full h-full",
                    container: "absolute inset-0",
                    allowedContent: "hidden",
                  }}
                  content={{ button: "" }}
                />
              </div>
            )}
          </div>

          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <Label>Nazwa *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="np. Marmur Carrara" onKeyDown={(e) => e.key === "Enter" && handleSave()} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Kategoria</Label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full bg-muted rounded-lg px-3 py-2 text-sm border border-border focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="">— wybierz —</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Wykończenie</Label>
              <select value={finish} onChange={(e) => setFinish(e.target.value)} className="w-full bg-muted rounded-lg px-3 py-2 text-sm border border-border focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="">— wybierz —</option>
                {FINISHES.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Producent</Label>
            <Input value={manufacturer} onChange={(e) => setManufacturer(e.target.value)} placeholder="np. Tubądzin" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Rozdzielczość</Label>
              <Input value={resolution} onChange={(e) => setResolution(e.target.value)} placeholder="np. 4096 × 4096 px" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Skala kafla</Label>
              <Input value={scale} onChange={(e) => setScale(e.target.value)} placeholder="np. 60 × 60 cm" />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Anuluj</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Zapisywanie..." : editMode ? "Zapisz zmiany" : "Dodaj teksturę"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
