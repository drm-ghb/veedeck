"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { useViewPreference, useGridCols } from "@/hooks/useViewPreference";
import { Check, CopyCheck, Eye, FileText, LayoutGrid, List, Pin, Upload } from "@/components/ui/icons";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import RenderMenu from "./RenderMenu";
import PdfThumbnail from "./PdfThumbnail";
import BulkActionBar from "./BulkActionBar";
import BulkMoveDialog from "./BulkMoveDialog";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useUploadThing } from "@/lib/uploadthing-client";
import { useT } from "@/lib/i18n";

type RenderStatus = "REVIEW" | "ACCEPTED" | "REJECTED";

interface Render {
  id: string;
  name: string;
  fileUrl: string;
  fileType?: string;
  commentCount: number;
  viewCount: number;
  status: RenderStatus;
  pinned: boolean;
  createdAt: string;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pl-PL", { day: "numeric", month: "short", year: "numeric" });
}

interface FolderRenderViewProps {
  projectId: string;
  roomId: string;
  folderId: string;
  renders: Render[];
}

const GRID_COLS_CLASS: Record<number, string> = {
  3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-2 md:grid-cols-3 lg:grid-cols-4",
  5: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5",
};

export default function FolderRenderView({ projectId, roomId, folderId, renders }: FolderRenderViewProps) {
  const t = useT();
  const [viewMode, setViewMode] = useViewPreference("renderflow-room", "grid");
  const [gridCols, setGridCols] = useGridCols("renderflow-room");
  const [gridOpen, setGridOpen] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [newRenderIds, setNewRenderIds] = useState<Set<string>>(new Set());
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);
  const router = useRouter();

  const { startUpload } = useUploadThing("renderUploader");

  const uploadFiles = useCallback(async (files: File[]) => {
    setIsUploading(true);
    try {
      const results = await startUpload(files);
      if (!results) throw new Error();
      for (let i = 0; i < results.length; i++) {
        const file = files[i];
        const r = results[i];
        const name = file.name.replace(/\.[^.]+$/, "");
        const fileType = file.type === "application/pdf" ? "pdf" : "image";
        await fetch("/api/renders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId, name, fileUrl: r.url, fileKey: r.key, roomId, folderId, fileType }),
        });
      }
      const count = results.length;
      toast.success(`${t.render.filesAddedPrefix} ${count} ${count === 1 ? t.render.fileSingular : count < 5 ? t.render.fileFew : t.render.fileMany}`);
      router.refresh();
    } catch {
      toast.error(t.render.filesUploadError);
    } finally {
      setIsUploading(false);
    }
  }, [startUpload, projectId, roomId, folderId, router, t]);

  // Track previous render IDs to detect newly added ones
  const prevRenderIdsRef = useRef<Set<string>>(new Set(renders.map((r) => r.id)));

  useEffect(() => {
    const prevIds = prevRenderIdsRef.current;
    const currentIds = new Set(renders.map((r) => r.id));
    const addedIds = [...currentIds].filter((id) => !prevIds.has(id));
prevRenderIdsRef.current = currentIds;
    if (!addedIds.length) return;

    setNewRenderIds((prev) => new Set([...prev, ...addedIds]));
    const t = setTimeout(() => {
      setNewRenderIds((prev) => {
        const next = new Set(prev);
        addedIds.forEach((id) => next.delete(id));
        return next;
      });
    }, 5000);
    return () => clearTimeout(t);
  }, [renders]);

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

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current = 0;
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files).filter(
      (f) => f.type.startsWith("image/") || f.type === "application/pdf"
    );
    if (files.length === 0) return;
    await uploadFiles(files);
  }, [uploadFiles]);

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function exitSelection() {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }

  async function handleBulkAction(action: "archive" | "delete") {
    if (action === "delete" && !confirm(t.render.confirmDeleteSelectedFiles)) return;
    setBulkLoading(true);
    try {
      const res = await fetch("/api/renders/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds), action }),
      });
      if (!res.ok) throw new Error();
      toast.success(action === "archive" ? t.render.filesArchived : t.render.filesDeleted);
      exitSelection();
      router.refresh();
    } catch {
      toast.error(t.render.operationError);
    } finally {
      setBulkLoading(false);
    }
  }

  const sorted = [...renders].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return 0;
  });

  useEffect(() => {
    if (!gridOpen) return;
    function onOutside(e: MouseEvent) {
      if (gridRef.current && !gridRef.current.contains(e.target as Node)) setGridOpen(false);
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [gridOpen]);

  useEffect(() => {
    if (!contextMenu) return;
    function close() { setContextMenu(null); }
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") close(); }
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [contextMenu]);

  useEffect(() => {
    function onCtxMenu(e: MouseEvent) {
      e.preventDefault();
      const target = e.target as HTMLElement;
      if (target.closest('a, button, [role="button"]')) return;
      const x = Math.min(e.clientX + 2, window.innerWidth - 210);
      const y = Math.min(e.clientY + 2, window.innerHeight - 80);
      setContextMenu({ x, y });
    }
    document.addEventListener("contextmenu", onCtxMenu);
    return () => document.removeEventListener("contextmenu", onCtxMenu);
  }, []);

  const dragProps = {
    onDragEnter: handleDragEnter,
    onDragLeave: handleDragLeave,
    onDragOver: (e: React.DragEvent) => e.preventDefault(),
    onDrop: handleDrop,
  };

  const dropOverlay = (isDragOver || isUploading) && (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-primary/10 backdrop-blur-[1px] pointer-events-none rounded-xl">
      <div className="flex flex-col items-center gap-3 px-10 py-8 rounded-2xl border-2 border-dashed border-primary bg-background/80 shadow-lg">
        <div className="w-14 h-14 rounded-full bg-primary/15 flex items-center justify-center">
          <Upload size={28} className="text-primary" />
        </div>
        <p className="text-base font-semibold text-primary">
          {isUploading ? t.render.uploadingFiles : t.render.dropFilesToFolder}
        </p>
        <p className="text-xs text-muted-foreground">{t.render.imagesAndPdfs}</p>
      </div>
    </div>
  );

  if (renders.length === 0) {
    return (
      <div className="relative min-h-dvh text-center py-16 text-muted-foreground" {...dragProps}>
        {dropOverlay}
        <p className="text-lg font-medium">{t.render.noFiles}</p>
        <p className="text-sm mt-1">{t.render.noFilesFolderHint}</p>
        <input type="file" multiple accept="image/*,.pdf" className="hidden" ref={fileInputRef}
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []).filter(f => f.type.startsWith("image/") || f.type === "application/pdf");
            e.target.value = "";
            if (files.length > 0) uploadFiles(files);
          }}
        />
        {contextMenu && createPortal(
          <div onMouseDown={(e) => e.stopPropagation()} style={{ left: contextMenu.x, top: contextMenu.y }} className="fixed z-[150] bg-popover border border-border rounded-lg shadow-lg py-1 min-w-[200px] overflow-hidden">
            <button className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors text-left" onClick={() => { setContextMenu(null); fileInputRef.current?.click(); }}>
              <Upload size={14} className="text-muted-foreground shrink-0" />
              Dodaj pliki
            </button>
          </div>,
          document.body
        )}
      </div>
    );
  }

  return (
    <div className="relative min-h-dvh" {...dragProps}>
      {dropOverlay}
      <div className="flex justify-end items-center gap-2 mb-4">
        <button
          onClick={() => { setSelectionMode((v) => !v); setSelectedIds(new Set()); }}
          title={selectionMode ? t.render.exitSelect : t.render.selectFiles}
          className={`relative p-1.5 rounded-md transition-colors ${selectionMode ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
        >
          <CopyCheck size={15} />
          {selectionMode && selectedIds.size > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[14px] h-3.5 px-0.5 bg-primary text-primary-foreground text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
              {selectedIds.size}
            </span>
          )}
        </button>
        <div className="flex items-center gap-0.5 bg-muted rounded-md p-0.5">
          <div className="relative" ref={gridRef}>
            <button
              onClick={() => { setViewMode("grid"); setGridOpen((v) => !v); }}
              className={`p-1.5 rounded transition-colors ${viewMode === "grid" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              title={t.render.gridLayout}
            >
              <span className="inline-flex items-baseline gap-0.5">
                <LayoutGrid size={15} />
                {viewMode === "grid" && <span className="text-[9px] font-bold leading-none">{gridCols}</span>}
              </span>
            </button>
            {gridOpen && (
              <div className="absolute right-0 top-full mt-1 z-20 bg-popover border border-border rounded-lg shadow-md py-1 min-w-[148px]">
                {([3, 4, 5] as const).map((n) => (
                  <button
                    key={n}
                    onClick={() => { setGridCols(n); setViewMode("grid"); setGridOpen(false); }}
                    className={`flex items-center justify-between w-full px-3 py-1.5 text-sm transition-colors hover:bg-muted ${gridCols === n && viewMode === "grid" ? "text-foreground font-medium" : "text-muted-foreground"}`}
                  >
                    {n} {t.render.columns}
                    {gridCols === n && viewMode === "grid" && <Check size={12} />}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => setViewMode("list")}
            className={`p-1.5 rounded transition-colors ${viewMode === "list" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            <List size={15} />
          </button>
        </div>
      </div>

      {viewMode === "grid" ? (
        <div className={`grid ${GRID_COLS_CLASS[gridCols]} gap-2 sm:gap-4`}>
          {sorted.map((render) => {
            const isSelected = selectedIds.has(render.id);
            const isNew = newRenderIds.has(render.id);
            const card = (
              <Card className={`overflow-hidden transition-all cursor-pointer group relative ${isSelected ? "ring-2 ring-primary border-primary" : "hover:shadow-[0_4px_16px_rgba(25,33,61,0.2)] hover:border-primary/30"}`}>
                {selectionMode && (
                  <div className="absolute top-2 left-2 z-10">
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${isSelected ? "bg-primary border-primary" : "bg-white/80 border-gray-400"}`}>
                      {isSelected && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L4 7L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </div>
                  </div>
                )}
                {!selectionMode && render.pinned && (
                  <div className="absolute top-2 left-2 z-10">
                    <Pin size={13} className="text-red-500 fill-red-500 drop-shadow" />
                  </div>
                )}
                <div className="relative aspect-video bg-muted overflow-hidden flex items-center justify-center">
                  {render.fileType === "pdf" ? (
                    <PdfThumbnail fileUrl={render.fileUrl} className="w-full h-full group-hover:scale-105 transition-transform duration-200" />
                  ) : (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={render.fileUrl} alt={render.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" />
                  )}
                  {render.fileType === "pdf" && (
                    <span className="absolute bottom-2 left-2 z-10 bg-black/50 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">PDF</span>
                  )}
                </div>
                <div className="p-3">
                  <p className="text-sm font-medium truncate mb-1">{render.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate mb-1.5">Dodano: {formatDate(render.createdAt)}</p>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className={`flex-shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${render.status === "ACCEPTED" ? "bg-green-100 text-green-700" : render.status === "REJECTED" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}`}>
                        {render.status === "ACCEPTED" ? t.render.statusAccepted : render.status === "REJECTED" ? t.render.statusRejected : t.render.statusReview}
                      </span>
                      {render.commentCount > 0 && <span className="text-xs text-muted-foreground flex items-center gap-1"><Pin size={11} />{render.commentCount}</span>}
                      <span className="text-xs text-muted-foreground flex items-center gap-1"><Eye size={11} />{render.viewCount}</span>
                    </div>
                    {!selectionMode && (
                      <div className="flex-shrink-0" onClick={(e) => e.preventDefault()}>
                        <RenderMenu render={{ id: render.id, name: render.name, pinned: render.pinned }} projectId={projectId} currentRoomId={roomId} currentFolderId={folderId} />
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
            return selectionMode ? (
              <div key={render.id} onClick={() => toggleSelect(render.id)} className={`rounded-xl transition-all duration-500 ${isNew ? "ring-2 ring-violet-500 ring-offset-2" : ""}`}>{card}</div>
            ) : (
              <Link key={render.id} href={`/projekty/${projectId}/renders/${render.id}`} className={`block rounded-xl transition-all duration-500 ${isNew ? "ring-2 ring-violet-500 ring-offset-2" : ""}`}>{card}</Link>
            );
          })}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {sorted.map((render, i) => {
            const isSelected = selectedIds.has(render.id);
            const isNew = newRenderIds.has(render.id);
            const row = (
              <div className={`relative flex items-center gap-3 px-4 py-3 transition-all duration-500 group ${i !== sorted.length - 1 ? "border-b border-border" : ""} ${isSelected ? "bg-primary/5" : isNew ? "bg-violet-500/5" : "hover:bg-muted/50"} ${selectionMode ? "cursor-pointer" : ""}`}>
                {isNew && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-violet-500" />}
                {selectionMode && (
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${isSelected ? "bg-primary border-primary" : "border-gray-400"}`}>
                    {isSelected && <svg width="8" height="6" viewBox="0 0 10 8" fill="none"><path d="M1 4L4 7L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </div>
                )}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-14 h-10 rounded-md overflow-hidden bg-muted flex-shrink-0 flex items-center justify-center">
                    {render.fileType === "pdf" ? (
                      <PdfThumbnail fileUrl={render.fileUrl} className="w-full h-full" iconSize={16} />
                    ) : (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={render.fileUrl} alt={render.name} className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate flex items-center gap-1.5">
                      {!selectionMode && render.pinned && <Pin size={11} className="text-red-500 fill-red-500 flex-shrink-0" />}
                      {render.name}
                    </p>
                    <div className="flex items-center gap-2">
                      {render.commentCount > 0 && <span className="text-xs text-muted-foreground flex items-center gap-1"><Pin size={10} />{render.commentCount}</span>}
                      <span className="text-xs text-muted-foreground flex items-center gap-1"><Eye size={10} />{render.viewCount}</span>
                      <span className="text-xs text-muted-foreground">Dodano: {formatDate(render.createdAt)}</span>
                    </div>
                  </div>
                </div>
                <span className={`flex-shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${render.status === "ACCEPTED" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>
                  {render.status === "ACCEPTED" ? t.render.statusAccepted : t.render.statusReview}
                </span>
                {!selectionMode && (
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" onClick={(e) => e.preventDefault()}>
                    <RenderMenu render={{ id: render.id, name: render.name, pinned: render.pinned }} projectId={projectId} currentRoomId={roomId} currentFolderId={folderId} />
                  </div>
                )}
              </div>
            );
            return selectionMode ? (
              <div key={render.id} onClick={() => toggleSelect(render.id)}>{row}</div>
            ) : (
              <Link key={render.id} href={`/projekty/${projectId}/renders/${render.id}`}>{row}</Link>
            );
          })}
        </div>
      )}

      {selectionMode && selectedIds.size > 0 && (
        <BulkActionBar
          count={selectedIds.size}
          loading={bulkLoading}
          onArchive={() => handleBulkAction("archive")}
          onMove={() => setMoveOpen(true)}
          onDelete={() => handleBulkAction("delete")}
          onCancel={exitSelection}
        />
      )}

      <BulkMoveDialog
        open={moveOpen}
        onOpenChange={setMoveOpen}
        ids={Array.from(selectedIds)}
        projectId={projectId}
        onSuccess={exitSelection}
      />

      <input type="file" multiple accept="image/*,.pdf" className="hidden" ref={fileInputRef}
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []).filter(f => f.type.startsWith("image/") || f.type === "application/pdf");
          e.target.value = "";
          if (files.length > 0) uploadFiles(files);
        }}
      />

      {contextMenu && createPortal(
        <div onMouseDown={(e) => e.stopPropagation()} style={{ left: contextMenu.x, top: contextMenu.y }} className="fixed z-[150] bg-popover border border-border rounded-lg shadow-lg py-1 min-w-[200px] overflow-hidden">
          <button className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors text-left" onClick={() => { setContextMenu(null); fileInputRef.current?.click(); }}>
            <Upload size={14} className="text-muted-foreground shrink-0" />
            Dodaj pliki
          </button>
        </div>,
        document.body
      )}
    </div>
  );
}
