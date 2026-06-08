"use client";

import { useEffect, useRef, useState } from "react";
import { FileText } from "@/components/ui/icons";

// Singleton init — prevents race conditions when multiple thumbnails load simultaneously
let pdfjsInitPromise: Promise<typeof import("pdfjs-dist")> | null = null;
function getPdfJs() {
  if (!pdfjsInitPromise) {
    pdfjsInitPromise = import("pdfjs-dist").then((lib) => {
      lib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
      return lib;
    });
  }
  return pdfjsInitPromise;
}

interface PdfThumbnailProps {
  fileUrl: string;
  className?: string;
  iconSize?: number;
}

export default function PdfThumbnail({ fileUrl, className, iconSize = 36 }: PdfThumbnailProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<"loading" | "done" | "error">("loading");
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");

    async function render() {
      try {
        const pdfjsLib = await getPdfJs();

        const pdf = await pdfjsLib.getDocument(fileUrl).promise;
        if (cancelled) return;

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
        if (!cancelled) setStatus("done");
      } catch {
        if (!cancelled) setStatus("error");
      }
    }

    render();
    return () => { cancelled = true; };
  }, [fileUrl, retryKey]);

  if (status === "error") {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-1 bg-muted cursor-pointer ${className ?? ""}`}
        onClick={() => setRetryKey((k) => k + 1)}
        title="Kliknij aby spróbować ponownie"
      >
        <FileText size={iconSize} className="text-red-400" />
        <span className="text-[10px] text-muted-foreground">Odśwież</span>
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
        className={`w-full h-full object-cover transition-opacity duration-300 ${status === "done" ? "opacity-100" : "opacity-0"}`}
      />
    </div>
  );
}
