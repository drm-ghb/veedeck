"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useUploadThing } from "@/lib/uploadthing-client";
import { Upload, Loader2, AlertCircle, Download, Sparkles } from "@/components/ui/icons";
import { toast } from "sonner";

type Phase = "idle" | "uploading" | "processing" | "done" | "error";

export default function RenderBoosterView() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const dragCounterRef = useRef(0);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { startUpload } = useUploadThing("renderBoosterUploader");

  function stopPolling() {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }

  useEffect(() => {
    return () => stopPolling();
  }, []);

  function reset() {
    stopPolling();
    setPhase("idle");
    setProgress(0);
    setPreviewImage(null);
    setOutputUrl(null);
    setErrorMsg(null);
  }

  async function startPolling(id: string) {
    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/veezard/renderbooster/status/${id}`);
        if (!res.ok) throw new Error("Błąd serwera");
        const data = await res.json();
        setProgress(data.progress ?? 0);

        if (data.status === "SUCCEEDED") {
          stopPolling();
          if (!data.outputUrl) {
            setErrorMsg("Brak wyniku z serwera");
            setPhase("error");
            return;
          }
          setOutputUrl(data.outputUrl);
          setPhase("done");
        } else if (data.status === "FAILED") {
          stopPolling();
          setErrorMsg(data.errorMessage ?? "Ulepszanie nie powiodło się");
          setPhase("error");
        }
      } catch {
        stopPolling();
        setErrorMsg("Błąd podczas sprawdzania statusu");
        setPhase("error");
      }
    }, 4000);
  }

  async function processFile(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Dozwolone są tylko pliki graficzne");
      return;
    }

    // Generate base64 preview
    const reader = new FileReader();
    reader.onload = (e) => setPreviewImage(e.target?.result as string);
    reader.readAsDataURL(file);

    setPhase("uploading");
    try {
      const results = await startUpload([file]);
      if (!results?.[0]) throw new Error("Przesyłanie nie powiodło się");

      const imageUrl = results[0].url;

      const res = await fetch("/api/veezard/renderbooster", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Błąd serwera");
      }

      const data = await res.json();
      setPhase("processing");
      startPolling(data.predictionId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Nieznany błąd";
      setErrorMsg(msg);
      setPhase("error");
      toast.error(msg);
    }
  }

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current += 1;
    if (dragCounterRef.current === 1) setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current === 0) setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current = 0;
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }

  // ── Idle ──────────────────────────────────────────────────────────────────

  if (phase === "idle") {
    return (
      <div className="flex flex-col items-center justify-center h-full px-6 py-12 gap-8">
        <div
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative w-full max-w-lg border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center gap-4 cursor-pointer transition-colors ${
            isDragOver
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50 hover:bg-muted/30"
          }`}
        >
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
            <Upload size={28} />
          </div>
          <div className="text-center">
            <p className="font-semibold text-foreground">Wrzuć wizualizację do ulepszenia</p>
            <p className="text-sm text-muted-foreground mt-1">JPG, PNG, WebP · maks. 16 MB</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileInput}
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-3 text-sm text-muted-foreground max-w-lg w-full">
          {[
            "Najlepiej działa z renderami wnętrz",
            "Podnosi jakość 4× i wyostrza detale",
            "Przetwarzanie zajmuje zwykle 30–60 sekund",
          ].map((tip) => (
            <div key={tip} className="flex items-start gap-2 flex-1">
              <Sparkles size={13} className="text-primary mt-0.5 shrink-0" />
              <span>{tip}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Uploading ─────────────────────────────────────────────────────────────

  if (phase === "uploading") {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
        <Loader2 size={36} className="animate-spin text-primary" />
        <p className="font-medium text-foreground">Przesyłanie pliku…</p>
      </div>
    );
  }

  // ── Processing ────────────────────────────────────────────────────────────

  if (phase === "processing") {
    return (
      <div className="flex flex-col items-center justify-center h-full px-6 gap-6">
        {previewImage && (
          <div className="w-full max-w-sm rounded-xl overflow-hidden border border-border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewImage} alt="Oryginał" className="w-full object-contain max-h-64" />
          </div>
        )}
        <div className="w-full max-w-sm flex flex-col gap-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-foreground">Ulepszanie wizualizacji…</span>
            {progress > 0 && (
              <span className="text-muted-foreground tabular-nums">{progress}%</span>
            )}
          </div>
          <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: progress > 0 ? `${progress}%` : "100%", opacity: progress > 0 ? 1 : 0.4 }}
            />
          </div>
          {progress === 0 && (
            <p className="text-xs text-muted-foreground">Oczekiwanie na start…</p>
          )}
        </div>
      </div>
    );
  }

  // ── Done ──────────────────────────────────────────────────────────────────

  if (phase === "done" && outputUrl) {
    return (
      <div className="flex flex-col items-center h-full px-6 py-8 gap-6 overflow-auto">
        <div className="grid grid-cols-2 gap-4 w-full max-w-2xl">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">Oryginał</span>
            <div className="rounded-xl overflow-hidden border border-border bg-muted">
              {previewImage && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewImage} alt="Oryginał" className="w-full object-contain" />
              )}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-primary uppercase tracking-wider text-center">Ulepszony</span>
            <div className="rounded-xl overflow-hidden border border-primary/30 bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={outputUrl} alt="Ulepszony" className="w-full object-contain" />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <a
            href={outputUrl}
            download="render-ulepszony.jpg"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Download size={15} />
            Pobierz ulepszony
          </a>
          <button
            onClick={reset}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            Ulepsz kolejny
          </button>
        </div>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
      <AlertCircle size={36} className="text-red-400" />
      <div className="text-center">
        <p className="font-medium text-foreground">Coś poszło nie tak</p>
        {errorMsg && <p className="text-sm mt-1">{errorMsg}</p>}
      </div>
      <button
        onClick={reset}
        className="px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors"
      >
        Spróbuj ponownie
      </button>
    </div>
  );
}
