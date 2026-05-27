"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Script from "next/script";
import { useUploadThing } from "@/lib/uploadthing-client";
import {
  Upload, ViewInAr, Trash2, Download, ChevronDown, X,
  Check, Loader2, AlertCircle, Image as ImageIcon,
} from "@/components/ui/icons";
import { toast } from "sonner";

// ── Types ────────────────────────────────────────────────────────────────────

interface ModelUrls {
  glb?: string;
  obj?: string;
  stl?: string;
  fbx?: string;
}

interface Model3D {
  id: string;
  name: string;
  category: string;
  thumbnailUrl: string | null;
  urlGlb: string | null;
  urlObj: string | null;
  urlStl: string | null;
  urlFbx: string | null;
  createdAt: string;
}

type Phase = "idle" | "uploading" | "generating" | "done" | "error";

// ── Categories ───────────────────────────────────────────────────────────────

const CATEGORIES = [
  { id: "Lampa",      symbol: "lightbulb" },
  { id: "Krzesło",    symbol: "chair" },
  { id: "Sofa",       symbol: "weekend" },
  { id: "Stół",       symbol: "table_restaurant" },
  { id: "Łóżko",      symbol: "bed" },
  { id: "Dekoracja",  symbol: "interests" },
  { id: "Łazienka",   symbol: "bathtub" },
  { id: "Kuchnia",    symbol: "kitchen" },
  { id: "Inne",       symbol: "category" },
];

const EXPORT_FORMATS = [
  { label: "GLB", key: "glb" },
  { label: "OBJ", key: "obj" },
  { label: "STL", key: "stl" },
  { label: "FBX", key: "fbx" },
] as const;

// ── Main component ───────────────────────────────────────────────────────────

export default function Generator3DView({ initialModels, hideHeader }: { initialModels: Model3D[]; hideHeader?: boolean }) {
  const [activeTab, setActiveTab] = useState<"generator" | "library">("generator");
  const [models, setModels] = useState<Model3D[]>(initialModels);

  // Generator state
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [modelUrls, setModelUrls] = useState<ModelUrls | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Save bar state
  const [saveName, setSaveName] = useState("");
  const [saveCategory, setSaveCategory] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Export dropdown
  const [exportOpen, setExportOpen] = useState(false);

  // Library delete confirmation
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { startUpload, isUploading } = useUploadThing("generator3dUploader");

  // ── Polling ────────────────────────────────────────────────────────────────

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (phase !== "generating" || !taskId) return;

    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/veezard/status/${taskId}`);
        const data = await res.json();

        setProgress(data.progress ?? 0);

        if (data.status === "SUCCEEDED") {
          stopPolling();
          setModelUrls(data.modelUrls);
          setThumbnailUrl(data.thumbnailUrl);
          setPhase("done");
        } else if (data.status === "FAILED" || data.status === "EXPIRED") {
          stopPolling();
          setErrorMsg(data.errorMessage ?? "Generowanie nie powiodło się.");
          setPhase("error");
        }
      } catch {
        // network hiccup — keep polling
      }
    }, 5000);

    return stopPolling;
  }, [phase, taskId, stopPolling]);

  // ── File handling ──────────────────────────────────────────────────────────

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Dopuszczalne formaty: JPG, PNG, SVG, WebP");
      return;
    }
    // Local preview
    const reader = new FileReader();
    reader.onload = (e) => setPreviewImage(e.target?.result as string);
    reader.readAsDataURL(file);

    // Auto-fill name from filename
    setSaveName(file.name.replace(/\.[^.]+$/, ""));
    setSaveCategory("");
    setSaved(false);
    setModelUrls(null);
    setThumbnailUrl(null);
    setErrorMsg(null);
    setProgress(0);
    setPhase("uploading");

    const uploaded = await startUpload([file]);
    if (!uploaded?.[0]?.url) {
      setPhase("error");
      setErrorMsg("Upload obrazu nie powiódł się.");
      return;
    }

    setPhase("generating");

    const genRes = await fetch("/api/veezard/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageUrl: uploaded[0].url }),
    });

    if (!genRes.ok) {
      const err = await genRes.json();
      setPhase("error");
      setErrorMsg(err.error ?? "Błąd generowania.");
      return;
    }

    const { taskId: id } = await genRes.json();
    setTaskId(id);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  function resetGenerator() {
    stopPolling();
    setPhase("idle");
    setProgress(0);
    setTaskId(null);
    setModelUrls(null);
    setThumbnailUrl(null);
    setPreviewImage(null);
    setErrorMsg(null);
    setSaveName("");
    setSaveCategory("");
    setSaved(false);
    setExportOpen(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // ── Save to library ────────────────────────────────────────────────────────

  async function handleSave() {
    if (!saveName.trim() || !saveCategory || saving || saved) return;
    setSaving(true);

    const res = await fetch("/api/veezard/library", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: saveName.trim(),
        category: saveCategory,
        meshyTaskId: taskId,
        thumbnailUrl,
        urlGlb: modelUrls?.glb ?? null,
        urlObj: modelUrls?.obj ?? null,
        urlStl: modelUrls?.stl ?? null,
        urlFbx: modelUrls?.fbx ?? null,
      }),
    });

    if (!res.ok) {
      toast.error("Nie udało się zapisać modelu.");
      setSaving(false);
      return;
    }

    const model = await res.json();
    setModels((prev) => [model, ...prev]);
    setSaving(false);
    setSaved(true);
    toast.success(`Model "${model.name}" zapisany w bibliotece.`);
  }

  // ── Delete from library ────────────────────────────────────────────────────

  async function handleDelete(id: string) {
    const res = await fetch(`/api/veezard/library/${id}`, { method: "DELETE" });
    if (!res.ok) { toast.error("Nie udało się usunąć modelu."); return; }
    setModels((prev) => prev.filter((m) => m.id !== id));
    setDeleteId(null);
    toast.success("Model usunięty.");
  }

  // ── Export download ────────────────────────────────────────────────────────

  function downloadUrl(format: string): string | null {
    if (!modelUrls) return null;
    return (modelUrls as Record<string, string | undefined>)[format] ?? null;
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <Script
        src="https://ajax.googleapis.com/ajax/libs/model-viewer/3.5.0/model-viewer.min.js"
        type="module"
        strategy="lazyOnload"
      />

      <div className="flex flex-col h-full">
        {/* Header */}
        {!hideHeader && (
          <div className="flex items-center gap-3 px-6 py-4 border-b border-border flex-shrink-0">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <ViewInAr size={20} />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">Generator 3D</h1>
              <p className="text-xs text-muted-foreground">Generuj modele 3D na podstawie zdjęć</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 px-6 pt-4 flex-shrink-0">
          {(["generator", "library"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {tab === "generator" ? "Generator" : `Biblioteka (${models.length})`}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {activeTab === "generator" ? (
            <GeneratorTab
              phase={phase}
              progress={progress}
              previewImage={previewImage}
              modelUrls={modelUrls}
              thumbnailUrl={thumbnailUrl}
              errorMsg={errorMsg}
              isUploading={isUploading}
              saveName={saveName}
              saveCategory={saveCategory}
              saving={saving}
              saved={saved}
              exportOpen={exportOpen}
              fileInputRef={fileInputRef}
              onDrop={handleDrop}
              onFileInput={handleFileInput}
              onReset={resetGenerator}
              onSaveNameChange={setSaveName}
              onCategoryChange={setSaveCategory}
              onSave={handleSave}
              onExportToggle={() => setExportOpen((o) => !o)}
              onExportClose={() => setExportOpen(false)}
              downloadUrl={downloadUrl}
            />
          ) : (
            <LibraryTab
              models={models}
              deleteId={deleteId}
              onDeleteRequest={setDeleteId}
              onDeleteConfirm={handleDelete}
              onDeleteCancel={() => setDeleteId(null)}
            />
          )}
        </div>
      </div>
    </>
  );
}

// ── Generator Tab ─────────────────────────────────────────────────────────────

function GeneratorTab({
  phase, progress, previewImage, modelUrls, thumbnailUrl, errorMsg, isUploading,
  saveName, saveCategory, saving, saved, exportOpen,
  fileInputRef, onDrop, onFileInput, onReset, onSaveNameChange, onCategoryChange,
  onSave, onExportToggle, onExportClose, downloadUrl,
}: {
  phase: Phase;
  progress: number;
  previewImage: string | null;
  modelUrls: ModelUrls | null;
  thumbnailUrl: string | null;
  errorMsg: string | null;
  isUploading: boolean;
  saveName: string;
  saveCategory: string;
  saving: boolean;
  saved: boolean;
  exportOpen: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onDrop: (e: React.DragEvent) => void;
  onFileInput: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onReset: () => void;
  onSaveNameChange: (v: string) => void;
  onCategoryChange: (v: string) => void;
  onSave: () => void;
  onExportToggle: () => void;
  onExportClose: () => void;
  downloadUrl: (format: string) => string | null;
}) {
  const [dragOver, setDragOver] = useState(false);

  const canSave = saveName.trim().length > 0 && saveCategory.length > 0 && !saving && !saved;

  if (phase === "idle") {
    return (
      <div className="max-w-xl mx-auto">
        <div
          onDrop={(e) => { setDragOver(false); onDrop(e); }}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onClick={() => fileInputRef.current?.click()}
          className={`relative flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed cursor-pointer transition-colors p-12
            ${dragOver
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50 hover:bg-muted/40"
            }`}
        >
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
            <Upload size={28} />
          </div>
          <div className="text-center">
            <p className="font-semibold text-foreground">Wrzuć zdjęcie produktu</p>
            <p className="text-sm text-muted-foreground mt-1">JPG, PNG, SVG, WebP · maks. 16 MB</p>
          </div>
          <p className="text-xs text-muted-foreground">
            Na podstawie zdjęcia zostanie wygenerowany model 3D
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onFileInput}
          />
        </div>

        <div className="mt-6 rounded-xl bg-muted/40 border border-border p-4 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Wskazówki</p>
          <ul className="space-y-1.5 text-sm text-muted-foreground">
            <li className="flex items-start gap-2"><span className="text-primary mt-0.5">•</span>Najlepiej działa ze zdjęciami produktowymi na białym tle</li>
            <li className="flex items-start gap-2"><span className="text-primary mt-0.5">•</span>Jeden obiekt na zdjęciu daje lepsze rezultaty</li>
            <li className="flex items-start gap-2"><span className="text-primary mt-0.5">•</span>Generowanie trwa zwykle 1–3 minuty</li>
          </ul>
        </div>
      </div>
    );
  }

  if (phase === "uploading") {
    return (
      <div className="max-w-xl mx-auto flex flex-col items-center gap-4 py-16">
        <Loader2 size={36} className="text-primary animate-spin" />
        <p className="font-medium text-foreground">Przesyłanie zdjęcia…</p>
      </div>
    );
  }

  if (phase === "generating") {
    return (
      <div className="max-w-xl mx-auto">
        <div className="flex flex-col items-center gap-6 py-8">
          {previewImage && (
            <div className="w-40 h-40 rounded-xl overflow-hidden border border-border flex-shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewImage} alt="Podgląd" className="w-full h-full object-contain bg-muted" />
            </div>
          )}
          <div className="w-full space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-foreground">Generowanie modelu 3D…</span>
              <span className="text-muted-foreground">{progress}%</span>
            </div>
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${Math.max(progress, 5)}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground text-center">Zwykle zajmuje 1–3 minuty. Możesz zamknąć tę stronę.</p>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="max-w-xl mx-auto">
        <div className="flex flex-col items-center gap-4 py-12">
          <AlertCircle size={40} className="text-destructive" />
          <p className="font-semibold text-foreground">Generowanie nie powiodło się</p>
          <p className="text-sm text-muted-foreground text-center">{errorMsg}</p>
          <button
            onClick={onReset}
            className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
          >
            Spróbuj ponownie
          </button>
        </div>
      </div>
    );
  }

  // phase === "done"
  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* 3D Viewer */}
      <div className="rounded-2xl overflow-hidden border border-border bg-muted/30 relative" style={{ height: 400 }}>
        {modelUrls?.glb ? (
          <model-viewer
            src={modelUrls.glb}
            camera-controls
            auto-rotate
            shadow-intensity="1"
            style={{ width: "100%", height: "100%" }}
          />
        ) : thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumbnailUrl} alt="Podgląd" className="w-full h-full object-contain" />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <ImageIcon size={48} />
          </div>
        )}

        <button
          onClick={onReset}
          title="Generuj nowy model"
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-background/80 backdrop-blur border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      {/* Save bar */}
      <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
        {/* Name + Category row */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Nazwa modelu</label>
            <input
              type="text"
              value={saveName}
              onChange={(e) => onSaveNameChange(e.target.value)}
              disabled={saved}
              placeholder="np. Lampa Flos IC"
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
            />
          </div>
        </div>

        {/* Category chips */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">Kategoria</label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                disabled={saved}
                onClick={() => onCategoryChange(saveCategory === cat.id ? "" : cat.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors disabled:opacity-50 disabled:cursor-default
                  ${saveCategory === cat.id
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
                  }`}
              >
                <span className="material-symbols-rounded text-[14px] leading-none">{cat.symbol}</span>
                {cat.id}
              </button>
            ))}
          </div>
        </div>

        {/* Actions row */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Export dropdown */}
          <div className="relative">
            <button
              onClick={onExportToggle}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium border border-border rounded-lg bg-background hover:bg-muted transition-colors"
            >
              <Download size={15} />
              Eksportuj
              <ChevronDown size={13} />
            </button>
            {exportOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={onExportClose} />
                <div className="absolute left-0 top-full mt-1 z-20 bg-card border border-border rounded-xl shadow-lg overflow-hidden min-w-[120px]">
                  {EXPORT_FORMATS.map((fmt) => {
                    const url = downloadUrl(fmt.key);
                    return (
                      <a
                        key={fmt.key}
                        href={url ?? "#"}
                        download={url ? `model.${fmt.key}` : undefined}
                        onClick={(e) => { if (!url) e.preventDefault(); onExportClose(); }}
                        className={`flex items-center gap-2 px-4 py-2.5 text-sm transition-colors
                          ${url
                            ? "text-foreground hover:bg-muted cursor-pointer"
                            : "text-muted-foreground/40 cursor-not-allowed"
                          }`}
                      >
                        <span className="font-mono text-xs font-bold text-muted-foreground w-8">.{fmt.key}</span>
                        {fmt.label}
                      </a>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Save button */}
          <button
            onClick={onSave}
            disabled={!canSave}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors
              ${saved
                ? "bg-green-500/10 text-green-600 border border-green-500/30 cursor-default"
                : "bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
              }`}
          >
            {saving ? (
              <Loader2 size={15} className="animate-spin" />
            ) : saved ? (
              <Check size={15} />
            ) : null}
            {saving ? "Zapisywanie…" : saved ? "Zapisano w bibliotece" : "Zapisz w bibliotece"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Library Tab ───────────────────────────────────────────────────────────────

function LibraryTab({
  models, deleteId, onDeleteRequest, onDeleteConfirm, onDeleteCancel,
}: {
  models: Model3D[];
  deleteId: string | null;
  onDeleteRequest: (id: string) => void;
  onDeleteConfirm: (id: string) => void;
  onDeleteCancel: () => void;
}) {
  if (models.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-muted-foreground">
        <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
          <ViewInAr size={28} />
        </div>
        <div className="text-center">
          <p className="font-medium text-foreground">Biblioteka jest pusta</p>
          <p className="text-sm mt-1">Wygeneruj i zapisz pierwszy model 3D</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {models.map((model) => (
        <div
          key={model.id}
          className="group relative bg-card border border-border rounded-2xl overflow-hidden flex flex-col"
        >
          {/* Thumbnail */}
          <div className="aspect-square bg-muted flex items-center justify-center overflow-hidden">
            {model.thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={model.thumbnailUrl}
                alt={model.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <ViewInAr size={32} className="text-muted-foreground/40" />
            )}
          </div>

          {/* Info */}
          <div className="p-3 flex flex-col gap-1 flex-1">
            <p className="text-sm font-medium text-foreground truncate" title={model.name}>{model.name}</p>
            <p className="text-xs text-muted-foreground">{model.category}</p>
          </div>

          {/* Actions */}
          <div className="px-3 pb-3 flex items-center gap-1.5">
            {model.urlGlb && (
              <a
                href={model.urlGlb}
                download="model.glb"
                title="Pobierz GLB"
                className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-medium border border-border rounded-lg bg-background hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              >
                <Download size={12} />
                GLB
              </a>
            )}
            {deleteId === model.id ? (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onDeleteConfirm(model.id)}
                  className="px-2 py-1.5 text-xs font-medium bg-destructive text-destructive-foreground rounded-lg hover:opacity-90 transition-opacity"
                >
                  Usuń
                </button>
                <button
                  onClick={onDeleteCancel}
                  className="px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Nie
                </button>
              </div>
            ) : (
              <button
                onClick={() => onDeleteRequest(model.id)}
                title="Usuń model"
                className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
