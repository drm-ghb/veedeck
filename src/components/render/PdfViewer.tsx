"use client";

import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react";
import { ChevronLeft, ChevronRight, FileText } from "@/components/ui/icons";

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

interface PdfViewerProps {
  url: string;
  page: number;
  onTotalPages: (n: number) => void;
  onPageChange: (n: number) => void;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  className?: string;
  maxHeight?: number;
  maxWidth?: number;
  zoom?: number;
}

const PdfViewer = forwardRef<HTMLDivElement, PdfViewerProps>(function PdfViewer(
  { url, page, onTotalPages, onPageChange, onClick, className, maxHeight, maxWidth, zoom = 1 },
  ref
) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [status, setStatus] = useState<"loading" | "done" | "error">("loading");
  const renderTaskRef = useRef<{ cancel: () => void } | null>(null);
  const pdfDocRef = useRef<import("pdfjs-dist").PDFDocumentProxy | null>(null);

  // Forward the wrapper div as ref (used by RenderViewer for getBoundingClientRect)
  useImperativeHandle(ref, () => wrapperRef.current!);

  useEffect(() => {
    let cancelled = false;

    async function render() {
      setStatus("loading");
      try {
        const pdfjsLib = await getPdfJs();
        const pdf = await pdfjsLib.getDocument(url).promise;
        if (cancelled) { pdf.destroy(); return; }

        pdfDocRef.current = pdf;
        const total = pdf.numPages;
        setTotalPages(total);
        onTotalPages(total);

        const safePage = Math.max(1, Math.min(page, total));
        const pdfPage = await pdf.getPage(safePage);
        if (cancelled) return;

        const canvas = canvasRef.current;
        const wrapper = wrapperRef.current;
        if (!canvas || !wrapper) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Cancel previous render if still running
        renderTaskRef.current?.cancel();

        const dpr = window.devicePixelRatio || 1;
        const containerWidth = maxWidth ?? wrapper.clientWidth ?? 800;
        const viewport = pdfPage.getViewport({ scale: 1 });
        const scaleByWidth = containerWidth / viewport.width;
        const scaleByHeight = maxHeight ? maxHeight / viewport.height : Infinity;
        const scale = Math.min(scaleByWidth, scaleByHeight) * zoom * dpr;
        const scaled = pdfPage.getViewport({ scale });

        canvas.width = scaled.width;
        canvas.height = scaled.height;
        canvas.style.width = `${scaled.width / dpr}px`;
        canvas.style.height = `${scaled.height / dpr}px`;

        const renderTask = pdfPage.render({ canvasContext: ctx, canvas, viewport: scaled });
        renderTaskRef.current = renderTask;
        await renderTask.promise;
        if (!cancelled) setStatus("done");
      } catch (e: unknown) {
        if (cancelled) return;
        const name = (e as { name?: string })?.name;
        if (name === "RenderingCancelledException") return;
        setStatus("error");
      }
    }

    render();
    return () => {
      cancelled = true;
      renderTaskRef.current?.cancel();
      pdfDocRef.current?.destroy();
      pdfDocRef.current = null;
    };
  }, [url, page, maxHeight, maxWidth, zoom]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      ref={wrapperRef}
      className={`relative ${className ?? ""}`}
      onClick={onClick}
    >
      {/* Page navigation */}
      {totalPages > 1 && (
        <div
          className="absolute top-2 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-black/50 backdrop-blur-sm rounded-full px-3 py-1.5 text-white text-sm select-none"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page <= 1}
            className="p-0.5 rounded hover:bg-white/20 disabled:opacity-40 transition-colors"
          >
            <ChevronLeft size={14} />
          </button>
          <span className="tabular-nums">{page} / {totalPages}</span>
          <button
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            className="p-0.5 rounded hover:bg-white/20 disabled:opacity-40 transition-colors"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      )}

      {status === "loading" && (
        <div className="absolute inset-0 flex items-center justify-center min-h-[300px]">
          <FileText size={48} className="text-red-300 animate-pulse" />
        </div>
      )}

      {status === "error" && (
        <div className="absolute inset-0 flex items-center justify-center min-h-[300px]">
          <FileText size={48} className="text-red-400" />
        </div>
      )}

      <canvas
        ref={canvasRef}
        className={`block rounded-lg shadow-sm transition-opacity duration-300 ${status === "done" ? "opacity-100" : "opacity-0"}`}
      />
    </div>
  );
});

export default PdfViewer;
