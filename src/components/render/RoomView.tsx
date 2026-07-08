"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useViewPreference, useGridCols } from "@/hooks/useViewPreference";
import { ArchiveRestore, ArrowUpDown, Check, CopyCheck, Eye, FileText, Folder, FolderPlus, LayoutGrid, List, Pin, Trash2, GripVertical, Upload } from "@/components/ui/icons";
import AddFolderDialog from "./AddFolderDialog";
import { useUploadThing } from "@/lib/uploadthing-client";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  rectSortingStrategy,
  arrayMove,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import RenderMenu from "./RenderMenu";
import FolderCard from "./FolderCard";
import PdfThumbnail from "./PdfThumbnail";
import BulkActionBar from "./BulkActionBar";
import BulkMoveDialog from "./BulkMoveDialog";
import { useT } from "@/lib/i18n";

type RenderStatus = "REVIEW" | "ACCEPTED";
type SortBy = "manual" | "name" | "createdAt";

interface Render {
  id: string;
  name: string;
  fileUrl: string;
  fileType?: string;
  commentCount: number;
  viewCount: number;
  status: RenderStatus;
  folderId: string | null;
  pinned: boolean;
  createdAt: string;
}

interface Folder {
  id: string;
  name: string;
  renderCount: number;
  pinned: boolean;
  createdAt: string;
}

interface ArchivedFolder {
  id: string;
  name: string;
  renderCount: number;
  createdAt: string;
}

function sortItems<T extends { name: string; pinned?: boolean; createdAt: string }>(
  items: T[],
  sortBy: SortBy
): T[] {
  const arr = [...items];
  if (sortBy === "name") {
    arr.sort((a, b) => a.name.localeCompare(b.name, "pl"));
  } else if (sortBy === "createdAt") {
    arr.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  // pinned always float to top (stable — preserves sort within each group)
  arr.sort((a, b) => {
    if ((a.pinned ?? false) !== (b.pinned ?? false)) return (a.pinned ?? false) ? -1 : 1;
    return 0;
  });
  return arr;
}

interface RoomViewProps {
  projectId: string;
  roomId: string;
  renders: Render[];
  archivedRenders: Render[];
  folders: Folder[];
  archivedFolders: ArchivedFolder[];
}

const GRID_COLS_CLASS: Record<number, string> = {
  3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-2 md:grid-cols-3 lg:grid-cols-4",
  5: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5",
};

export default function RoomView({ projectId, roomId, renders, archivedRenders, folders, archivedFolders }: RoomViewProps) {
  const t = useT();
  const [tab, setTab] = useState<"active" | "archived">("active");
  const [viewMode, setViewMode] = useViewPreference("renderflow-room", "grid");
  const [gridCols, setGridCols] = useGridCols("renderflow-room");
  const [gridOpen, setGridOpen] = useState(false);
  const [sortBy, setSortBy] = useState<SortBy>(() => {
    if (typeof window === "undefined") return "manual";
    const saved = localStorage.getItem("renderflow-room-sort");
    return (saved === "manual" || saved === "name" || saved === "createdAt") ? saved : "manual";
  });
  const [sortOpen, setSortOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [localFolders, setLocalFolders] = useState(folders);
  const [localRenders, setLocalRenders] = useState(renders);
  const [newRenderIds, setNewRenderIds] = useState<Set<string>>(new Set());
  const pendingFolderIds = useRef<Set<string>>(new Set());
  const pendingRenderIds = useRef<Set<string>>(new Set());
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [addFolderOpen, setAddFolderOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function addHighlight(ids: string[]) {
    if (!ids.length) return;
    setNewRenderIds((prev) => new Set([...prev, ...ids]));
    setTimeout(() => {
      setNewRenderIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      });
    }, 5000);
  }
  useEffect(() => {
    setLocalFolders(prev => {
      for (const f of folders) pendingFolderIds.current.delete(f.id);
      const optimistic = prev.filter(f => pendingFolderIds.current.has(f.id));
      return [...folders, ...optimistic];
    });
  }, [folders]);
  useEffect(() => {
    setLocalRenders(prev => {
      for (const r of renders) pendingRenderIds.current.delete(r.id);
      const optimistic = prev.filter(r => pendingRenderIds.current.has(r.id));
      return [...renders, ...optimistic];
    });
  }, [renders]);

  useEffect(() => {
    function onFolderCreated(e: Event) {
      const f = (e as CustomEvent).detail;
      pendingFolderIds.current.add(f.id);
      setLocalFolders((prev) => [...prev, { id: f.id, name: f.name, renderCount: 0, pinned: false, createdAt: new Date().toISOString() }]);
    }
    function onRendersCreated(e: Event) {
      const newRenders = (e as CustomEvent).detail as Array<{ id: string; name: string; fileUrl: string; fileType: string | undefined; status: string; folderId: string | null; viewCount: number }>;
      for (const r of newRenders) pendingRenderIds.current.add(r.id);
      setLocalRenders((prev) => [
        ...prev,
        ...newRenders.map((r) => ({
          id: r.id,
          name: r.name,
          fileUrl: r.fileUrl,
          fileType: r.fileType ?? undefined,
          commentCount: 0,
          viewCount: r.viewCount ?? 0,
          status: (r.status ?? "REVIEW") as "REVIEW" | "ACCEPTED",
          folderId: r.folderId ?? null,
          pinned: false,
          createdAt: new Date().toISOString(),
        })),
      ]);
      addHighlight(newRenders.map((r) => r.id));
    }
    function onFolderRemoved(e: Event) {
      const { id } = (e as CustomEvent).detail;
      setLocalFolders((prev) => prev.filter((f) => f.id !== id));
    }
    function onRenderRemoved(e: Event) {
      const { id } = (e as CustomEvent).detail;
      setLocalRenders((prev) => prev.filter((r) => r.id !== id));
    }
    window.addEventListener("renderflow:folder-created", onFolderCreated);
    window.addEventListener("renderflow:renders-created", onRendersCreated);
    window.addEventListener("renderflow:folder-removed", onFolderRemoved);
    window.addEventListener("renderflow:render-removed", onRenderRemoved);
    return () => {
      window.removeEventListener("renderflow:folder-created", onFolderCreated);
      window.removeEventListener("renderflow:renders-created", onRendersCreated);
      window.removeEventListener("renderflow:folder-removed", onFolderRemoved);
      window.removeEventListener("renderflow:render-removed", onRenderRemoved);
    };
  }, []);

  useEffect(() => {
    if (!gridOpen) return;
    function onOutside(e: MouseEvent) {
      if (gridRef.current && !gridRef.current.contains(e.target as Node)) setGridOpen(false);
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [gridOpen]);

  useEffect(() => {
    if (!sortOpen) return;
    function onOutside(e: MouseEvent) {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortOpen(false);
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [sortOpen]);

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
      if (tab !== "active") return;
      const target = e.target as HTMLElement;
      if (target.closest('a, button, [role="button"]')) return;
      const x = Math.min(e.clientX + 2, window.innerWidth - 210);
      const y = Math.min(e.clientY + 2, window.innerHeight - 110);
      setContextMenu({ x, y });
    }
    document.addEventListener("contextmenu", onCtxMenu);
    return () => document.removeEventListener("contextmenu", onCtxMenu);
  }, [tab]);

  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const dragCounterRef = useRef(0);
  const router = useRouter();

  const { startUpload } = useUploadThing("renderUploader");

  const uploadFiles = useCallback(async (files: File[], targetFolderId: string | null = null) => {
    setIsUploading(true);
    try {
      const results = await startUpload(files);
      if (!results) throw new Error();
      const created: Render[] = [];
      for (let i = 0; i < results.length; i++) {
        const file = files[i];
        const r = results[i];
        const name = file.name.replace(/\.[^.]+$/, "");
        const fileType = file.type === "application/pdf" ? "pdf" : "image";
        const res = await fetch("/api/renders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId, name, fileUrl: r.url, fileKey: r.key, roomId, folderId: targetFolderId, fileType }),
        });
        if (res.ok) {
          const render = await res.json();
          created.push({ id: render.id, name: render.name, fileUrl: render.fileUrl, fileType: render.fileType ?? null, commentCount: 0, viewCount: 0, status: (render.status ?? "REVIEW") as "REVIEW" | "ACCEPTED", folderId: render.folderId ?? null, pinned: false, createdAt: new Date().toISOString() });
        }
      }
      if (created.length > 0 && !targetFolderId) {
        setLocalRenders((prev) => [...prev, ...created]);
        addHighlight(created.map((r) => r.id));
      }
      const count = results.length;
      const suffix = count === 1 ? t.render.fileSingular : count < 5 ? t.render.fileFew : t.render.fileMany;
      toast.success(targetFolderId
        ? `${t.render.filesAddedPrefix} ${count} ${suffix} ${t.render.addedToFolder}`
        : `${t.render.filesAddedPrefix} ${count} ${suffix}`
      );
      router.refresh();
    } catch {
      toast.error(t.render.filesUploadError);
    } finally {
      setIsUploading(false);
    }
  }, [startUpload, projectId, roomId, router, t]);

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
    await uploadFiles(files, null);
  }, [uploadFiles]);

  const handleFolderFileDrop = useCallback(async (files: File[], folderId: string) => {
    await uploadFiles(files, folderId);
  }, [uploadFiles]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function handleFolderDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = localFolders.findIndex((f) => f.id === active.id);
    const newIndex = localFolders.findIndex((f) => f.id === over.id);
    const reordered = arrayMove(localFolders, oldIndex, newIndex);
    setLocalFolders(reordered);
    fetch("/api/folders/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId, ids: reordered.map((f) => f.id) }),
    }).catch(() => {});
  }

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
    const ids = Array.from(selectedIds);
    setBulkLoading(true);
    setLocalRenders((prev) => prev.filter((r) => !ids.includes(r.id)));
    exitSelection();
    try {
      const res = await fetch("/api/renders/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, action }),
      });
      if (!res.ok) throw new Error();
      toast.success(action === "archive" ? t.render.filesArchived : t.render.filesDeleted);
      router.refresh();
    } catch {
      toast.error(t.render.operationError);
      router.refresh();
    } finally {
      setBulkLoading(false);
    }
  }

  const displayFolders = sortBy === "manual" ? localFolders : sortItems(localFolders, sortBy);
  const ungrouped = sortItems(localRenders.filter((r) => !r.folderId), sortBy === "manual" ? "manual" : sortBy);
  const hasContent = localFolders.length > 0 || localRenders.length > 0;

  function handleSetSort(s: SortBy) {
    setSortBy(s);
    setSortOpen(false);
    localStorage.setItem("renderflow-room-sort", s);
  }

  const SORT_LABELS: Record<SortBy, string> = {
    manual: t.render.sortManual,
    name: t.render.sortName,
    createdAt: t.render.sortDate,
  };

  async function handleRestore(renderId: string) {
    const res = await fetch(`/api/renders/${renderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived: false }),
    });
    if (res.ok) {
      toast.success(t.render.renderRestored);
      router.refresh();
    } else {
      toast.error(t.render.restoreError);
    }
  }

  async function handleRestoreFolder(folderId: string) {
    const res = await fetch(`/api/folders/${folderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived: false }),
    });
    if (res.ok) {
      toast.success(t.render.folderRestored);
      router.refresh();
    } else {
      toast.error(t.render.restoreError);
    }
  }

  async function handleDeleteFolder(folderId: string, name: string) {
    if (!confirm(t.render.confirmDeleteFolder.replace("{name}", name))) return;
    setLocalFolders((prev) => prev.filter((f) => f.id !== folderId));
    const res = await fetch(`/api/folders/${folderId}`, { method: "DELETE" });
    if (res.ok) {
      toast.success(t.render.folderDeleted);
      router.refresh();
    } else {
      toast.error(t.render.deleteError);
      router.refresh();
    }
  }

  async function handleDelete(renderId: string, name: string) {
    if (!confirm(t.render.confirmDeleteRender.replace("{name}", name))) return;
    setLocalRenders((prev) => prev.filter((r) => r.id !== renderId));
    const res = await fetch(`/api/renders/${renderId}`, { method: "DELETE" });
    if (res.ok) {
      toast.success(t.render.renderDeleted);
      router.refresh();
    } else {
      toast.error(t.render.deleteError);
      router.refresh();
    }
  }

  return (
    <div
      className="relative min-h-dvh"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      {(isDragOver || isUploading) && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-primary/10 backdrop-blur-[1px] pointer-events-none rounded-xl">
          <div className="flex flex-col items-center gap-3 px-10 py-8 rounded-2xl border-2 border-dashed border-primary bg-background/80 shadow-lg">
            <div className="w-14 h-14 rounded-full bg-primary/15 flex items-center justify-center">
              <Upload size={28} className="text-primary" />
            </div>
            <p className="text-base font-semibold text-primary">
              {isUploading ? t.render.uploadingFiles : t.render.dropFilesToRoom}
            </p>
            <p className="text-xs text-muted-foreground">{t.render.imagesAndPdfs}</p>
          </div>
        </div>
      )}
      {/* Tabs + view toggle */}
      <div className="flex items-center justify-between border-b border-border mb-6">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setTab("active")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === "active"
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.render.tabFiles}
            {localRenders.length > 0 && (
              <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${tab === "active" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                {localRenders.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab("archived")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === "archived"
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.render.tabArchived}
            {(archivedRenders.length + archivedFolders.length) > 0 && (
              <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${tab === "archived" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                {archivedRenders.length + archivedFolders.length}
              </span>
            )}
          </button>
        </div>
        {tab === "active" && localRenders.length > 0 && (
          <div className="flex items-center gap-2 mb-1">
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
            {/* Sort dropdown */}
            <div className="relative" ref={sortRef}>
              <button
                onClick={() => setSortOpen((v) => !v)}
                title={t.render.sorting}
                className={`flex items-center gap-1 px-2 py-1.5 rounded-md text-xs transition-colors ${sortBy !== "manual" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
              >
                <ArrowUpDown size={13} />
                <span className="hidden sm:inline">{SORT_LABELS[sortBy]}</span>
              </button>
              {sortOpen && (
                <div className="absolute right-0 top-full mt-1 z-20 bg-popover border border-border rounded-lg shadow-md py-1 min-w-[160px]">
                  {(["manual", "name", "createdAt"] as SortBy[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => handleSetSort(s)}
                      className={`flex items-center justify-between w-full px-3 py-1.5 text-sm transition-colors hover:bg-muted ${sortBy === s ? "text-foreground font-medium" : "text-muted-foreground"}`}
                    >
                      {SORT_LABELS[s]}
                      {sortBy === s && <Check size={12} />}
                    </button>
                  ))}
                </div>
              )}
            </div>
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
        )}
      </div>

      {tab === "active" ? (
        !hasContent ? (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-lg font-medium">{t.render.noFiles}</p>
            <p className="text-sm mt-1">{t.render.noFilesHint}</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Folder tiles */}
            {localFolders.length > 0 && (
              sortBy === "manual" ? (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleFolderDragEnd}>
                  <SortableContext items={localFolders.map((f) => f.id)} strategy={rectSortingStrategy}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4">
                      {localFolders.map((folder) => (
                        <SortableFolderCard key={folder.id} folder={folder} projectId={projectId} roomId={roomId} onFileDrop={(files) => handleFolderFileDrop(files, folder.id)} />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4">
                  {displayFolders.map((folder) => (
                    <FolderCard key={folder.id} folder={folder} projectId={projectId} roomId={roomId} />
                  ))}
                </div>
              )
            )}

            {/* Ungrouped renders */}
            {ungrouped.length > 0 && (
              <div>
                {localFolders.length > 0 && (
                  <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                    {t.render.remainingFiles}
                  </p>
                )}
                {viewMode === "grid" ? (
                  <div className={`grid ${GRID_COLS_CLASS[gridCols]} gap-2 sm:gap-4`}>
                    {ungrouped.map((render) => {
                      const isSelected = selectedIds.has(render.id);
                      const isNew = newRenderIds.has(render.id);
                      const cardContent = (
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
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5">
                                <span className={`flex-shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${render.status === "ACCEPTED" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>
                                  {render.status === "ACCEPTED" ? t.render.statusAccepted : t.render.statusReview}
                                </span>
                                {render.commentCount > 0 && (
                                  <span className="text-xs text-muted-foreground flex items-center gap-1"><Pin size={11} />{render.commentCount}</span>
                                )}
                                <span className="text-xs text-muted-foreground flex items-center gap-1"><Eye size={11} />{render.viewCount}</span>
                              </div>
                              {!selectionMode && (
                                <div className="flex-shrink-0" onClick={(e) => e.preventDefault()}>
                                  <RenderMenu render={{ id: render.id, name: render.name, pinned: render.pinned }} projectId={projectId} currentRoomId={roomId} currentFolderId={render.folderId} />
                                </div>
                              )}
                            </div>
                          </div>
                        </Card>
                      );
                      return selectionMode ? (
                        <div key={render.id} onClick={() => toggleSelect(render.id)} className={`rounded-xl transition-all duration-500 ${isNew ? "ring-2 ring-violet-500 ring-offset-2" : ""}`}>{cardContent}</div>
                      ) : (
                        <Link key={render.id} href={`/projekty/${projectId}/renders/${render.id}`} className={`block rounded-xl transition-all duration-500 ${isNew ? "ring-2 ring-violet-500 ring-offset-2" : ""}`}>{cardContent}</Link>
                      );
                    })}
                  </div>
                ) : (
                  <div className="bg-card border border-border rounded-xl overflow-hidden">
                    {ungrouped.map((render, i) => {
                      const isSelected = selectedIds.has(render.id);
                      const isNew = newRenderIds.has(render.id);
                      const row = (
                        <div className={`relative flex items-center gap-3 px-4 py-3 transition-all duration-500 group ${i !== ungrouped.length - 1 ? "border-b border-border" : ""} ${isSelected ? "bg-primary/5" : isNew ? "bg-violet-500/5" : "hover:bg-muted/50"} ${selectionMode ? "cursor-pointer" : ""}`}>
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
                              </div>
                            </div>
                          </div>
                          <span className={`flex-shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${render.status === "ACCEPTED" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>
                            {render.status === "ACCEPTED" ? t.render.statusAccepted : t.render.statusReview}
                          </span>
                          {!selectionMode && (
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" onClick={(e) => e.preventDefault()}>
                              <RenderMenu render={{ id: render.id, name: render.name, pinned: render.pinned }} projectId={projectId} currentRoomId={roomId} currentFolderId={render.folderId} />
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
              </div>
            )}
          </div>
        )
      ) : archivedRenders.length === 0 && archivedFolders.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-4xl mb-4">📦</p>
          <p className="text-lg">{t.render.noArchivedItems}</p>
        </div>
      ) : (
        <div className="space-y-8">
          {archivedFolders.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">{t.render.foldersLabel}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4">
                {archivedFolders.map((folder) => (
                  <Card key={folder.id} className="p-5 opacity-60">
                    <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                      <Folder size={28} className="text-primary" />
                    </div>
                    <p className="font-semibold text-foreground truncate mb-1">{folder.name}</p>
                    <p className="text-xs text-muted-foreground mb-3">
                      {folder.renderCount} {folder.renderCount === 1 ? t.render.fileSingular : folder.renderCount < 5 ? t.render.fileFew : t.render.fileMany}
                    </p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => handleRestoreFolder(folder.id)}>
                        <ArchiveRestore size={14} />
                        {t.common.restore}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-400 hover:text-red-600"
                        onClick={() => handleDeleteFolder(folder.id, folder.name)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
          {archivedRenders.length > 0 && (
            <div>
              {archivedFolders.length > 0 && (
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">{t.render.filesLabel}</p>
              )}
              <div className={`grid ${GRID_COLS_CLASS[gridCols]} gap-2 sm:gap-4`}>
                {archivedRenders.map((render) => (
                  <Card key={render.id} className="overflow-hidden opacity-60">
                    <div className="relative aspect-video bg-muted overflow-hidden flex items-center justify-center">
                      {render.fileType === "pdf" ? (
                        <PdfThumbnail fileUrl={render.fileUrl} className="w-full h-full" />
                      ) : (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={render.fileUrl} alt={render.name} className="w-full h-full object-cover" />
                      )}
                      {render.fileType === "pdf" && (
                        <span className="absolute bottom-2 left-2 z-10 bg-black/50 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">PDF</span>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="text-sm font-medium truncate mb-2">{render.name}</p>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="flex-1" onClick={() => handleRestore(render.id)}>
                          <ArchiveRestore size={14} />
                          {t.common.restore}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-400 hover:text-red-600"
                          onClick={() => handleDelete(render.id, render.name)}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
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

      {/* Hidden file input for context menu upload */}
      <input
        type="file"
        multiple
        accept="image/*,.pdf"
        className="hidden"
        ref={fileInputRef}
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []).filter(
            (f) => f.type.startsWith("image/") || f.type === "application/pdf"
          );
          e.target.value = "";
          if (files.length > 0) uploadFiles(files, null);
        }}
      />

      {/* AddFolderDialog controlled from context menu */}
      <AddFolderDialog roomId={roomId} open={addFolderOpen} onOpenChange={setAddFolderOpen} />

      {/* Context menu portal */}
      {contextMenu && createPortal(
        <div
          onMouseDown={(e) => e.stopPropagation()}
          style={{ left: contextMenu.x, top: contextMenu.y }}
          className="fixed z-[150] bg-popover border border-border rounded-lg shadow-lg py-1 min-w-[200px] overflow-hidden"
        >
          <button
            className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors text-left"
            onClick={() => { setContextMenu(null); fileInputRef.current?.click(); }}
          >
            <Upload size={14} className="text-muted-foreground shrink-0" />
            Dodaj pliki
          </button>
          <div className="h-px bg-border mx-2 my-0.5" />
          <button
            className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors text-left"
            onClick={() => { setContextMenu(null); setAddFolderOpen(true); }}
          >
            <FolderPlus size={14} className="text-muted-foreground shrink-0" />
            Nowy folder
          </button>
        </div>,
        document.body
      )}
    </div>
  );
}

function SortableFolderCard({ folder, projectId, roomId, onFileDrop }: { folder: Folder; projectId: string; roomId: string; onFileDrop?: (files: File[]) => void }) {
  const t = useT();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: folder.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };
  return (
    <div ref={setNodeRef} style={style} className="relative">
      <div
        {...attributes}
        {...listeners}
        suppressHydrationWarning
        className="absolute top-1/2 -translate-y-1/2 right-2 z-20 p-1 rounded text-muted-foreground/40 hover:text-foreground cursor-grab active:cursor-grabbing transition-colors"
        title={t.render.dragToReorder}
      >
        <GripVertical size={14} />
      </div>
      <FolderCard folder={folder} projectId={projectId} roomId={roomId} onFileDrop={onFileDrop} />
    </div>
  );
}
