"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { UploadButton } from "@uploadthing/react";
import type { OurFileRouter } from "@/lib/uploadthing";
import { X, DeployedCode } from "@/components/ui/icons";

const CATEGORIES = ["Meble", "Oświetlenie", "Armatura", "Akcesoria", "Okładziny", "Inne"];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdded: (model: unknown) => void;
  linkedProductId?: string;
}

function getFormat(name: string): "glb" | "fbx" | "obj" | "stl" | null {
  const ext = name.split(".").pop()?.toLowerCase();
  if (ext === "glb" || ext === "fbx" || ext === "obj" || ext === "stl") return ext;
  return null;
}

export default function AddModel3DDialog({ open, onOpenChange, onAdded, linkedProductId }: Props) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [saving, setSaving] = useState(false);

  function reset() {
    setName(""); setCategory(""); setThumbnailUrl(""); setFileUrl(""); setFileName("");
  }

  const format = fileName ? getFormat(fileName) : null;

  async function handleSave() {
    if (!name.trim()) { toast.error("Podaj nazwę modelu"); return; }
    setSaving(true);
    try {
      const body: Record<string, string> = { name, category };
      if (thumbnailUrl) body.thumbnailUrl = thumbnailUrl;
      if (fileUrl && format === "glb") body.urlGlb = fileUrl;
      if (fileUrl && format === "fbx") body.urlFbx = fileUrl;
      if (fileUrl && format === "obj") body.urlObj = fileUrl;
      if (linkedProductId) body.linkedProductId = linkedProductId;

      const res = await fetch("/api/models3d", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      const model = await res.json();
      toast.success("Model 3D dodany");
      onAdded(model);
      onOpenChange(false);
      reset();
    } catch {
      toast.error("Nie udało się dodać modelu");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Dodaj model 3D</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          {/* File upload */}
          <div className="flex flex-col gap-1.5">
            <Label>Plik modelu (.glb, .fbx, .obj)</Label>
            {fileUrl ? (
              <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2 border border-border">
                <DeployedCode size={16} className="text-primary shrink-0" />
                <span className="text-sm truncate flex-1">{fileName}</span>
                {format && <span className="text-xs font-mono text-muted-foreground uppercase">.{format}</span>}
                <button onClick={() => { setFileUrl(""); setFileName(""); }} className="text-muted-foreground hover:text-foreground">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <UploadButton<OurFileRouter, "model3dFileUploader">
                endpoint="model3dFileUploader"
                onClientUploadComplete={(res) => {
                  if (res?.[0]) {
                    setFileUrl(res[0].url);
                    setFileName(res[0].name ?? "model");
                    if (!name) setName((res[0].name ?? "").replace(/\.[^.]+$/, ""));
                  }
                }}
                onUploadError={() => { toast.error("Błąd uploadu pliku"); }}
                appearance={{ button: "ut-ready:bg-primary ut-uploading:bg-primary/70 text-xs px-3 py-1.5 rounded-lg" }}
                content={{ button: "Wgraj plik 3D" }}
              />
            )}
          </div>

          {/* Thumbnail */}
          <div className="flex flex-col gap-1.5">
            <Label>Miniatura (opcjonalnie)</Label>
            {thumbnailUrl ? (
              <div className="relative w-24 aspect-square rounded-lg overflow-hidden border border-border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={thumbnailUrl} alt="miniatura" className="w-full h-full object-cover" />
                <button
                  onClick={() => setThumbnailUrl("")}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/50 text-white flex items-center justify-center"
                >
                  <X size={11} />
                </button>
              </div>
            ) : (
              <UploadButton<OurFileRouter, "model3dThumbnailUploader">
                endpoint="model3dThumbnailUploader"
                onClientUploadComplete={(res) => res?.[0] && setThumbnailUrl(res[0].url)}
                onUploadError={() => { toast.error("Błąd uploadu miniatury"); }}
                appearance={{ button: "ut-ready:bg-muted ut-uploading:bg-muted/70 text-xs px-3 py-1.5 rounded-lg text-foreground border border-border" }}
                content={{ button: "Wgraj miniaturę" }}
              />
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Nazwa *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="np. Fotel Eames – hi-poly" onKeyDown={(e) => e.key === "Enter" && handleSave()} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Kategoria</Label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full bg-muted rounded-lg px-3 py-2 text-sm border border-border focus:outline-none focus:ring-2 focus:ring-primary/30">
              <option value="">— wybierz —</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Anuluj</Button>
          <Button onClick={handleSave} disabled={saving || !fileUrl}>{saving ? "Zapisywanie..." : "Dodaj model"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
