"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronRight, FileText, MessageSquare, ZoomIn, ZoomOut, X, Maximize2 } from "@/components/ui/icons";
import ContractorFileCommentPanel from "./ContractorFileCommentPanel";
import PdfViewer from "@/components/render/PdfViewer";

interface FileItem {
  id: string;
  name: string;
  displayUrl: string | null;
  effectiveType: string;
  unreadCount: number;
  totalComments: number;
}

interface Props {
  files: FileItem[];
  initialIndex: number;
  assignmentId: string;
  folderId: string;
  folderName: string;
  authorName: string;
  authorRole: "contractor" | "designer";
  backHref: string;
  /** Base URL for individual file routes, e.g. /wykonawca/projekty/X/foldery/Y/pliki — used for router.replace when navigating between files */
  fileRouteBase?: string;
  /** When provided, component acts as overlay (no URL changes, close calls this instead of router.push) */
  onClose?: () => void;
  /** Open comments panel immediately on mount */
  initialCommentsOpen?: boolean;
}

export default function ContractorFileViewer({
  files,
  initialIndex,
  assignmentId,
  folderId,
  folderName,
  authorName,
  authorRole,
  backHref,
  fileRouteBase,
  onClose,
  initialCommentsOpen = false,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [index, setIndex] = useState(initialIndex);
  const [commentOpen, setCommentOpen] = useState(initialCommentsOpen);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>(
    Object.fromEntries(files.map((f) => [f.id, f.unreadCount]))
  );
  const totalComments = Object.fromEntries(files.map((f) => [f.id, f.totalComments]));

  // Lightbox
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const lastPinchDistRef = useRef(0);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const touchPanRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const lightboxContainerRef = useRef<HTMLDivElement>(null);

  // PDF
  const [pdfPage, setPdfPage] = useState(1);
  const [pdfTotalPages, setPdfTotalPages] = useState(1);
  const [pdfZoom, setPdfZoom] = useState(1);

  const file = files[index];
  const isImage = file?.effectiveType === "image";
  const isPdf = file?.effectiveType === "pdf";
  const hasPrev = index > 0;
  const hasNext = index < files.length - 1;
  const unread = unreadCounts[file?.id] ?? 0;
  const total = totalComments[file?.id] ?? 0;

  const go = useCallback(
    (newIndex: number) => {
      setIndex(newIndex);
      setCommentOpen(false);
      setLightboxOpen(false);
      setZoom(1);
      setPanX(0);
      setPanY(0);
      setPdfPage(1);
      if (!onClose) {
        const base = fileRouteBase ?? `/wykonawca/projekty/${assignmentId}/foldery/${folderId}/pliki`;
        router.replace(`${base}/${files[newIndex].id}`, { scroll: false });
      }
    },
    [router, assignmentId, folderId, files, onClose, fileRouteBase]
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft" && hasPrev) go(index - 1);
      if (e.key === "ArrowRight" && hasNext) go(index + 1);
      if (e.key === "Escape") {
        if (lightboxOpen) { setLightboxOpen(false); setZoom(1); setPanX(0); setPanY(0); return; }
        if (onClose) onClose(); else router.push(backHref);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, hasPrev, hasNext, go, router, backHref, onClose, lightboxOpen]);

  function openComments() {
    setCommentOpen(true);
    if ((unreadCounts[file.id] ?? 0) > 0) {
      setUnreadCounts((prev) => ({ ...prev, [file.id]: 0 }));
      fetch("/api/contractor-file-comments/mark-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId: file.id, role: authorRole }),
      }).catch(() => {});
    }
  }

  // Auto-open comments when navigated from a notification (?comments=1) — only for route mode
  useEffect(() => {
    if (onClose) return; // overlay mode: initialCommentsOpen handles this
    if (searchParams.get("comments") === "1" && file) {
      openComments();
      const base = fileRouteBase ?? `/wykonawca/projekty/${assignmentId}/foldery/${folderId}/pliki`;
      router.replace(`${base}/${file.id}`, { scroll: false });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!file) return null;

  return (
    <>
    <div className="flex flex-col h-full bg-card rounded-tl-2xl overflow-hidden">
      {/* Header bar */}
      <div className="border-b bg-card flex-shrink-0">
        <div className="flex items-center gap-3 px-4 py-2.5">
          {/* Back arrow */}
          {onClose ? (
            <button
              onClick={onClose}
              className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
          ) : (
            <Link
              href={backHref}
              className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft size={20} />
            </Link>
          )}
          <div className="w-px h-4 bg-border flex-shrink-0" />

          {/* Breadcrumb */}
          <nav className="flex items-center gap-1 min-w-0 flex-1 text-sm overflow-hidden">
            {onClose ? (
              <button
                onClick={onClose}
                className="min-w-0 shrink text-muted-foreground hover:text-foreground transition-colors font-medium truncate max-w-[160px]"
              >
                {folderName}
              </button>
            ) : (
              <Link
                href={backHref}
                className="min-w-0 shrink text-muted-foreground hover:text-foreground transition-colors font-medium truncate max-w-[160px]"
              >
                {folderName}
              </Link>
            )}
            <ChevronLeft size={13} className="flex-shrink-0 text-muted-foreground/40 rotate-180" />
            <span className="text-foreground font-semibold truncate min-w-0 shrink">
              {file.name}
            </span>
          </nav>

          {/* Toolbar */}
          <div className="ml-auto flex items-center gap-1 flex-shrink-0">
            <button
              onClick={commentOpen ? () => setCommentOpen(false) : openComments}
              className={`relative flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md border transition-colors ${
                commentOpen
                  ? "bg-primary text-primary-foreground border-primary"
                  : unread > 0
                  ? "border-violet-400 text-violet-600 bg-violet-50 dark:bg-violet-950/30 dark:text-violet-400 dark:border-violet-700"
                  : "border-transparent text-muted-foreground hover:bg-muted"
              }`}
              title="Komentarze"
            >
              <MessageSquare size={14} />
              <span className="hidden sm:inline">Komentarze</span>
              {(unread > 0 || total > 0) && (
                <span className={`absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 text-[10px] font-bold rounded-full flex items-center justify-center leading-none ${
                  commentOpen
                    ? "bg-primary-foreground text-primary"
                    : unread > 0
                    ? "bg-violet-600 text-white"
                    : "bg-muted-foreground/30 text-foreground"
                }`}>
                  {unread > 0 ? (unread > 9 ? "9+" : unread) : total > 9 ? "9+" : total}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Content row */}
      <div className="flex flex-1 min-h-0">
        {/* Left sidebar — file thumbnails */}
        <div className="hidden md:flex w-44 border-r bg-card flex-col flex-shrink-0 overflow-hidden">
          <div className="px-3 py-2.5 border-b flex-shrink-0">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Pliki ({files.length})
            </p>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {files.map((f, i) => (
              <button
                key={f.id}
                onClick={() => go(i)}
                className={`w-full text-left rounded-lg overflow-hidden border-2 transition-colors ${
                  i === index
                    ? "border-primary"
                    : "border-transparent hover:border-border"
                }`}
              >
                <div className="aspect-video bg-muted overflow-hidden flex items-center justify-center">
                  {f.effectiveType === "image" && f.displayUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={f.displayUrl} alt={f.name} className="w-full h-full object-cover" />
                  ) : (
                    <FileText size={20} className="text-muted-foreground/40" />
                  )}
                </div>
                <p
                  className={`text-xs px-1.5 py-1 truncate ${
                    i === index ? "text-primary font-semibold" : "text-muted-foreground"
                  }`}
                >
                  {f.name}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Image area */}
        <div className="flex-1 relative bg-muted">
          {/* Left arrow */}
          {hasPrev && (
            <button
              onClick={() => go(index - 1)}
              className="absolute left-3 top-1/2 -translate-y-1/2 z-10 bg-white/80 hover:bg-white dark:bg-gray-800/80 dark:hover:bg-gray-800 border border-border rounded-full p-2 shadow-md text-muted-foreground hover:text-foreground transition-all opacity-60 hover:opacity-100"
            >
              <ChevronLeft size={20} />
            </button>
          )}
          {/* Right arrow */}
          {hasNext && (
            <button
              onClick={() => go(index + 1)}
              className="absolute right-3 top-1/2 -translate-y-1/2 z-10 bg-white/80 hover:bg-white dark:bg-gray-800/80 dark:hover:bg-gray-800 border border-border rounded-full p-2 shadow-md text-muted-foreground hover:text-foreground transition-all opacity-60 hover:opacity-100"
            >
              <ChevronRight size={20} />
            </button>
          )}

          {/* PDF zoom controls */}
          {isPdf && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 bg-black/50 backdrop-blur-sm rounded-full px-3 py-1.5 text-white text-sm select-none">
              <button
                onClick={() => setPdfZoom((z) => Math.max(0.5, Math.round((z - 0.25) * 100) / 100))}
                disabled={pdfZoom <= 0.5}
                className="p-0.5 rounded hover:bg-white/20 disabled:opacity-40 transition-colors"
              >
                <ZoomOut size={14} />
              </button>
              <span className="tabular-nums w-10 text-center">{Math.round(pdfZoom * 100)}%</span>
              <button
                onClick={() => setPdfZoom((z) => Math.min(3, Math.round((z + 0.25) * 100) / 100))}
                disabled={pdfZoom >= 3}
                className="p-0.5 rounded hover:bg-white/20 disabled:opacity-40 transition-colors"
              >
                <ZoomIn size={14} />
              </button>
            </div>
          )}

          {/* File display */}
          <div className={`absolute inset-0 flex items-start ${isPdf ? "justify-center overflow-auto" : "justify-center overflow-auto"} p-2 sm:p-6`}>
            {isImage && file.displayUrl ? (
              <div className="relative flex-shrink-0 select-none">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={file.displayUrl}
                  alt={file.name}
                  className="block rounded-lg shadow-sm sm:max-w-full cursor-zoom-in"
                  style={{ maxHeight: "calc(100vh - 180px)" }}
                  draggable={false}
                  onClick={() => setLightboxOpen(true)}
                />
                <button
                  onClick={() => setLightboxOpen(true)}
                  className="absolute top-2 right-2 p-1.5 bg-black/40 hover:bg-black/60 text-white rounded-md transition-colors"
                  title="Pełny ekran"
                >
                  <Maximize2 size={14} />
                </button>
              </div>
            ) : isPdf && file.displayUrl ? (
              <PdfViewer
                url={file.displayUrl}
                page={pdfPage}
                onTotalPages={setPdfTotalPages}
                onPageChange={setPdfPage}
                zoom={pdfZoom}
              />
            ) : (
              <div className="flex flex-col items-center gap-4 text-muted-foreground/50">
                <FileText size={64} />
                <p className="text-sm">{file.name}</p>
              </div>
            )}
          </div>

        </div>

        {/* Comment panel — right of image area */}
        {commentOpen && (
          <ContractorFileCommentPanel
            fileId={file.id}
            fileName={file.name}
            authorName={authorName}
            authorRole={authorRole}
            onClose={() => setCommentOpen(false)}
            mode="sidebar"
          />
        )}
      </div>
    </div>

    {/* Lightbox */}

    {lightboxOpen && isImage && file.displayUrl && (
      <div className="fixed inset-0 z-50 bg-black/95 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 flex-shrink-0 border-b border-white/10">
          <span className="text-white font-semibold truncate max-w-[60vw]">{file.name}</span>
          <button
            onClick={() => { setLightboxOpen(false); setZoom(1); setPanX(0); setPanY(0); }}
            className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-md transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        {/* Image area with zoom + pan */}
        <div
          ref={lightboxContainerRef}
          className={`flex-1 overflow-hidden flex items-center justify-center select-none ${isDragging ? "cursor-grabbing" : zoom > 1 ? "cursor-grab" : "cursor-default"}`}
          onWheel={(e) => {
            e.preventDefault();
            const rect = lightboxContainerRef.current!.getBoundingClientRect();
            const cx = e.clientX - rect.left - rect.width / 2;
            const cy = e.clientY - rect.top - rect.height / 2;
            setZoom((z) => {
              const delta = e.deltaY > 0 ? -0.12 : 0.12;
              const newZ = Math.max(0.25, Math.min(5, z + delta));
              const ratio = newZ / z;
              if (newZ <= 1) { setPanX(0); setPanY(0); }
              else {
                setPanX((px) => cx * (1 - ratio) + px * ratio);
                setPanY((py) => cy * (1 - ratio) + py * ratio);
              }
              return newZ;
            });
          }}
          onMouseDown={(e) => {
            if (zoom <= 1) return;
            isDraggingRef.current = true;
            setIsDragging(true);
            dragStartRef.current = { x: e.clientX, y: e.clientY, panX, panY };
          }}
          onMouseMove={(e) => {
            if (!isDraggingRef.current) return;
            setPanX(dragStartRef.current.panX + e.clientX - dragStartRef.current.x);
            setPanY(dragStartRef.current.panY + e.clientY - dragStartRef.current.y);
          }}
          onMouseUp={() => { isDraggingRef.current = false; setIsDragging(false); }}
          onMouseLeave={() => { isDraggingRef.current = false; setIsDragging(false); }}
          onTouchStart={(e) => {
            if (e.touches.length === 2) {
              const dx = e.touches[0].clientX - e.touches[1].clientX;
              const dy = e.touches[0].clientY - e.touches[1].clientY;
              lastPinchDistRef.current = Math.hypot(dx, dy);
            } else if (e.touches.length === 1) {
              touchPanRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, panX, panY };
            }
          }}
          onTouchMove={(e) => {
            if (e.touches.length === 2) {
              const dx = e.touches[0].clientX - e.touches[1].clientX;
              const dy = e.touches[0].clientY - e.touches[1].clientY;
              const dist = Math.hypot(dx, dy);
              if (lastPinchDistRef.current > 0) {
                const ratio = dist / lastPinchDistRef.current;
                setZoom((z) => Math.max(0.25, Math.min(5, z * ratio)));
              }
              lastPinchDistRef.current = dist;
            } else if (e.touches.length === 1) {
              setPanX(touchPanRef.current.panX + e.touches[0].clientX - touchPanRef.current.x);
              setPanY(touchPanRef.current.panY + e.touches[0].clientY - touchPanRef.current.y);
            }
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={file.displayUrl}
            alt={file.name}
            style={{
              maxWidth: "calc(100vw - 4rem)",
              maxHeight: "calc(100vh - 120px)",
              width: "auto",
              height: "auto",
              transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
              transformOrigin: "center center",
              willChange: "transform",
            }}
            className="block rounded-lg"
            draggable={false}
          />
        </div>
      </div>
    )}
    </>
  );
}
