"use client";

import { useEffect, useRef, useState } from "react";
import { FileText } from "@/components/ui/icons";

interface PdfThumbnailProps {
  fileUrl: string;
  className?: string;
}

export default function PdfThumbnail({ fileUrl, className }: PdfThumbnailProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<"loading" | "done" | "error">("loading");

  useEffect(() => {
    let cancelled = false;

    async function render() {
      try {
        const pdfjsLib = await import("pdfjs-dist");
        // Use CDN worker matching installed version — avoids ES module worker issues in production
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

        const loadingTask = pdfjsLib.getDocument(fileUrl);
        const pdf = await loadingTask.promise;
        if (cancelled) return;

        const page = await pdf.getPage(1);
        if (cancelled) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const viewport = page.getViewport({ scale: 1 });
        // Scale to fit container width (max ~400px) maintaining aspect ratio
        const scale = Math.min(400 / viewport.width, 300 / viewport.height);
        const scaled = page.getViewport({ scale });

        canvas.width = scaled.width;
        canvas.height = scaled.height;

        await page.render({ canvas, viewport: scaled }).promise;
        if (!cancelled) setStatus("done");
      } catch {
        if (!cancelled) setStatus("error");
      }
    }

    render();
    return () => { cancelled = true; };
  }, [fileUrl]);

  if (status === "error") {
    return (
      <div className={`flex items-center justify-center bg-red-50 ${className ?? ""}`}>
        <FileText size={40} className="text-red-400" />
      </div>
    );
  }

  return (
    <div className={`relative flex items-center justify-center bg-gray-100 overflow-hidden ${className ?? ""}`}>
      {status === "loading" && (
        <FileText size={40} className="text-red-300 animate-pulse" />
      )}
      <canvas
        ref={canvasRef}
        className={`w-full h-full object-cover transition-opacity duration-300 ${status === "done" ? "opacity-100" : "opacity-0 absolute"}`}
        style={{ objectFit: "cover" }}
      />
    </div>
  );
}
