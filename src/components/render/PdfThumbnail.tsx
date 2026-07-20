"use client";

import { useEffect, useRef, useState } from "react";
import { FileText } from "@/components/ui/icons";
import { useT } from "@/lib/i18n";

// Singleton init — prevents race conditions when multiple thumbnails load simultaneously
const WORKER_SRC = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).href;

let pdfjsInitPromise: Promise<typeof import("pdfjs-dist")> | null = null;
function getPdfJs() {
  if (!pdfjsInitPromise) {
    pdfjsInitPromise = import("pdfjs-dist").then((lib) => {
      lib.GlobalWorkerOptions.workerSrc = WORKER_SRC;
      return lib;
    });
  }
  return pdfjsInitPromise;
}

// Cache rendered thumbnail images (dataURL) by file URL — avoids re-parsing PDF on re-mount
const thumbnailCache = new Map<string, string>();

interface PdfThumbnailProps {
  fileUrl: string;
  className?: string;
  iconSize?: number;
}

export default function PdfThumbnail({ fileUrl, className, iconSize = 36 }: PdfThumbnailProps) {
  const t = useT();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<"loading" | "done" | "error">("loading");
  const [retryKey, setRetryKey] = useState(0);
  const pdfDocRef = useRef<import("pdfjs-dist").PDFDocumentProxy | null>(null);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");

    async function render() {
      try {
        // Serve from cache — skips pdf.js entirely on re-mount
        const cached = thumbnailCache.get(fileUrl);
        if (cached) {
          const canvas = canvasRef.current;
          if (!canvas) return;
          const ctx = canvas.getContext("2d");
          if (!ctx) return;
          const img = new Image();
          img.onload = () => {
            if (cancelled) return;
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            canvas.style.width = "100%";
            canvas.style.height = "100%";
            ctx.drawImage(img, 0, 0);
            setStatus("done");
          };
          img.src = cached;
          return;
        }

        const pdfjsLib = await getPdfJs();
        const pdf = await pdfjsLib.getDocument(fileUrl).promise;
        if (cancelled) { pdf.destroy(); return; }
        pdfDocRef.current = pdf;

        const page = await pdf.getPage(1);
        if (cancelled) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        const viewport = page.getViewport({ scale: 1 });
        // Render at 2× target size × device pixel ratio for sharp thumbnails
        const scale = Math.min(800 / viewport.width, 600 / viewport.height) * dpr;
        const scaled = page.getViewport({ scale });

        canvas.width = scaled.width;
        canvas.height = scaled.height;
        canvas.style.width = "100%";
        canvas.style.height = "100%";

        await page.render({ canvas, canvasContext: ctx, viewport: scaled }).promise;
        if (!cancelled) {
          thumbnailCache.set(fileUrl, canvas.toDataURL("image/jpeg", 0.85));
          setStatus("done");
        }
      } catch {
        if (!cancelled) setStatus("error");
      }
    }

    render();
    return () => {
      cancelled = true;
      pdfDocRef.current?.destroy();
      pdfDocRef.current = null;
    };
  }, [fileUrl, retryKey]);

  if (status === "error") {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-1 bg-muted cursor-pointer ${className ?? ""}`}
        onClick={() => setRetryKey((k) => k + 1)}
        title={t.render.pdfRetryTitle}
      >
        <FileText size={iconSize} className="text-red-400" />
        <span className="text-[10px] text-muted-foreground">{t.render.pdfRefresh}</span>
      </div>
    );
  }

  return (
    <div className={`relative flex items-center justify-center bg-muted overflow-hidden ${className ?? ""}`}>
      {status === "loading" && (
        <FileText size={iconSize} className="text-red-300 animate-pulse absolute" />
      )}
      <canvas
        ref={canvasRef}
        className={`w-full h-full object-cover ${status === "done" ? "opacity-100" : "opacity-0"}`}
      />
    </div>
  );
}
