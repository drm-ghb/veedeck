"use client";

import { useEffect, useRef, useState } from "react";
import { FileText } from "@/components/ui/icons";
import { useT } from "@/lib/i18n";

// ---------------------------------------------------------------------------
// pdf.js singleton init
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// In-memory cache (session) — fast path, no IDB round-trip on re-mount
// ---------------------------------------------------------------------------
const memoryCache = new Map<string, string>();

// ---------------------------------------------------------------------------
// IndexedDB cache (persistent) — survives page reload, avoids re-rendering PDFs
// ---------------------------------------------------------------------------
const IDB_DB = "veedeck-pdf-thumbnails";
const IDB_STORE = "thumbnails";
const IDB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;
function getDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(IDB_DB, IDB_VERSION);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(IDB_STORE)) {
          req.result.createObjectStore(IDB_STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

async function idbGet(key: string): Promise<string | null> {
  try {
    const db = await getDb();
    return new Promise((resolve) => {
      const req = db.transaction(IDB_STORE, "readonly").objectStore(IDB_STORE).get(key);
      req.onsuccess = () => resolve((req.result as string) ?? null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

async function idbSet(key: string, value: string): Promise<void> {
  try {
    const db = await getDb();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(IDB_STORE, "readwrite");
      tx.objectStore(IDB_STORE).put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // IDB write failure is non-fatal — thumbnail was already rendered
  }
}

// ---------------------------------------------------------------------------
// Concurrency limiter — max 2 PDF renders simultaneously to prevent OOM
// ---------------------------------------------------------------------------
let activeRenders = 0;
const renderQueue: Array<() => void> = [];

function acquireSlot(): Promise<void> {
  return new Promise((resolve) => {
    if (activeRenders < 2) {
      activeRenders++;
      resolve();
    } else {
      renderQueue.push(() => { activeRenders++; resolve(); });
    }
  });
}

function releaseSlot() {
  activeRenders = Math.max(0, activeRenders - 1);
  const next = renderQueue.shift();
  if (next) next();
}

// ---------------------------------------------------------------------------
// Canvas size cap — NO device pixel ratio multiplier.
// Previous code used `* devicePixelRatio` which on mobile (dpr=3) created
// 2400×1800 canvases (~17 MB each), causing OOM crash. 400×300 ≈ 0.5 MB.
// ---------------------------------------------------------------------------
const THUMB_MAX_W = 400;
const THUMB_MAX_H = 300;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
interface PdfThumbnailProps {
  fileUrl: string;
  className?: string;
  iconSize?: number;
}

export default function PdfThumbnail({ fileUrl, className, iconSize = 36 }: PdfThumbnailProps) {
  const t = useT();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [retryKey, setRetryKey] = useState(0);
  const pdfDocRef = useRef<import("pdfjs-dist").PDFDocumentProxy | null>(null);

  useEffect(() => {
    let cancelled = false;
    let slotAcquired = false;
    setStatus("loading");

    const container = containerRef.current;

    async function drawDataUrl(dataUrl: string) {
      const canvas = canvasRef.current;
      if (!canvas || cancelled) return;
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
      img.src = dataUrl;
    }

    async function startRender() {
      // 1. In-memory cache (fastest — same session, no IDB round-trip)
      const mem = memoryCache.get(fileUrl);
      if (mem) { await drawDataUrl(mem); return; }

      // 2. IndexedDB cache (persistent — survives page reload)
      const idb = await idbGet(fileUrl);
      if (idb) {
        memoryCache.set(fileUrl, idb); // promote to memory cache
        await drawDataUrl(idb);
        return;
      }

      // 3. Render from PDF (expensive — concurrency-limited)
      await acquireSlot();
      slotAcquired = true;
      if (cancelled) { releaseSlot(); slotAcquired = false; return; }

      try {
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

        const viewport = page.getViewport({ scale: 1 });
        const scale = Math.min(THUMB_MAX_W / viewport.width, THUMB_MAX_H / viewport.height);
        const scaled = page.getViewport({ scale });

        canvas.width = Math.round(scaled.width);
        canvas.height = Math.round(scaled.height);
        canvas.style.width = "100%";
        canvas.style.height = "100%";

        await page.render({ canvas, canvasContext: ctx, viewport: scaled }).promise;

        if (!cancelled) {
          const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
          memoryCache.set(fileUrl, dataUrl);
          // Save to IDB in background — don't block UI
          idbSet(fileUrl, dataUrl);
          setStatus("done");
        }
      } catch {
        if (!cancelled) setStatus("error");
      } finally {
        if (slotAcquired) { releaseSlot(); slotAcquired = false; }
      }
    }

    let observer: IntersectionObserver | undefined;
    if (container) {
      // Lazy load — only start when thumbnail enters viewport (+200px margin)
      observer = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            observer?.disconnect();
            startRender();
          }
        },
        { rootMargin: "200px" }
      );
      observer.observe(container);
    } else {
      // Retry after error — containerRef not available (error branch rendered), start immediately
      startRender();
    }

    return () => {
      cancelled = true;
      observer?.disconnect();
      pdfDocRef.current?.destroy();
      pdfDocRef.current = null;
      if (slotAcquired) { releaseSlot(); slotAcquired = false; }
    };
  }, [fileUrl, retryKey]);

  if (status === "error") {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-1 bg-muted cursor-pointer ${className ?? ""}`}
        onClick={(e) => {
          e.stopPropagation();
          setStatus("loading");
          setRetryKey((k) => k + 1);
        }}
        title={t.render.pdfRetryTitle}
      >
        <FileText size={iconSize} className="text-red-400" />
        <span className="text-[10px] text-muted-foreground">{t.render.pdfRefresh}</span>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`relative flex items-center justify-center bg-muted overflow-hidden ${className ?? ""}`}>
      {(status === "idle" || status === "loading") && (
        <FileText
          size={iconSize}
          className={`text-red-300 absolute ${status === "loading" ? "animate-pulse" : ""}`}
        />
      )}
      <canvas
        ref={canvasRef}
        className={`w-full h-full object-cover ${status === "done" ? "opacity-100" : "opacity-0"}`}
      />
    </div>
  );
}
