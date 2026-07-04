"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Eye, EyeOff, Plus, FileText, Image, Ruler, Trash2, ChevronLeft, ChevronDown, ChevronRight, Download, FolderPlus, Folder, Pencil, Check, X, CheckSquare, GripVertical, Info, MessageSquare, MoreHorizontal, Pin, RefreshCw, LayoutGrid, List } from "@/components/ui/icons";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import AddContractorFileDialog from "./AddContractorFileDialog";
import EditProjectInfoDialog, { type ProjectInfoData } from "./EditProjectInfoDialog";
import { useT } from "@/lib/i18n";
import { useViewPreference } from "@/hooks/useViewPreference";

interface ContractorFile {
  id: string;
  name: string;
  fileUrl: string | null;
  fileType: string;
  createdAt: string;
  render: { id: string; name: string; fileUrl: string; fileType: string } | null;
}

interface ContractorSubfolder {
  id: string;
  name: string;
  sourceFolderName?: string | null;
  _count: { files: number };
  files: ContractorFile[];
}

interface ContractorFolder {
  id: string;
  name: string;
  type: string;
  visible: boolean;
  _count: { files: number };
  files: ContractorFile[];
  subfolders: ContractorSubfolder[];
}

interface RenderItem {
  id: string;
  name: string;
  fileUrl: string;
  fileType: string;
}

interface ProjectFolder {
  id: string;
  name: string;
  renders: RenderItem[];
}

interface Room {
  id: string;
  name: string;
  folders: ProjectFolder[];
  renders: RenderItem[];
}

interface Props {
  contractorId: string;
  contractorName: string;
  assignmentId: string;
  projectTitle: string;
  projectId: string;
  folders: ContractorFolder[];
  rooms: Room[];
  info: ProjectInfoData;
  unreadPerFile?: Record<string, number>;
  totalPerFile?: Record<string, number>;
  unreadPinsPerFile?: Record<string, number>;
  totalPinsPerFile?: Record<string, number>;
  designerName?: string;
  initialFolderId?: string;
  initialSubFolderId?: string;
}

function SortableSubfolderWrapper({ id, children }: { id: string; children: (dragHandleProps: { ref: (el: HTMLElement | null) => void; style: React.CSSProperties; dragListeners: object | undefined; dragAttributes: object | undefined }) => React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <>
      {children({
        ref: setNodeRef,
        style: { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 },
        dragListeners: listeners,
        dragAttributes: attributes,
      })}
    </>
  );
}

function FileRow({ file, onDelete, bulkMode, selected, onSelect, unreadCount = 0, totalCount = 0, unreadPinCount = 0, totalPinCount = 0, onFileClick, onCommentClick }: {
  file: ContractorFile;
  onDelete: () => void;
  bulkMode?: boolean;
  selected?: boolean;
  onSelect?: () => void;
  unreadCount?: number;
  totalCount?: number;
  unreadPinCount?: number;
  totalPinCount?: number;
  onFileClick?: () => void;
  onCommentClick?: () => void;
}) {
  const t = useT();
  const displayUrl = file.render?.fileUrl ?? file.fileUrl ?? null;
  const displayName = file.name;
  const effectiveType = file.render?.fileType ?? file.fileType;
  const isImage = effectiveType === "image";
  const isPdf = effectiveType === "pdf";
  return (
    <div className={`flex items-center gap-3 px-4 py-3 ${bulkMode && selected ? "bg-primary/5" : ""}`}>
      {bulkMode && (
        <button onClick={onSelect} className="shrink-0 text-muted-foreground hover:text-primary transition-colors">
          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${selected ? "bg-primary border-primary" : "border-border"}`}>
            {selected && <Check size={10} className="text-primary-foreground" />}
          </div>
        </button>
      )}
      <button
        onClick={onFileClick}
        className="w-10 h-10 rounded-md bg-muted overflow-hidden shrink-0 flex items-center justify-center hover:opacity-80 transition-opacity"
      >
        {isImage && displayUrl ? (
          <img src={displayUrl} alt={displayName} className="w-full h-full object-cover" />
        ) : isPdf && displayUrl ? (
          <iframe src={`${displayUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`} className="w-full h-full pointer-events-none" title={displayName} />
        ) : (
          <FileText size={18} className="text-muted-foreground" />
        )}
      </button>
      <button onClick={onFileClick} className="flex-1 min-w-0 text-left hover:opacity-80 transition-opacity">
        <p className="text-sm font-medium truncate">{displayName}</p>
        <p className="text-xs text-muted-foreground">{new Date(file.createdAt).toLocaleDateString()}</p>
      </button>
      <div className="flex items-center gap-1 shrink-0">
        {(unreadPinCount > 0 || totalPinCount > 0) && (
          <button
            onClick={onFileClick}
            className={`relative p-1.5 rounded-lg hover:bg-muted transition-colors ${unreadPinCount > 0 ? "text-primary hover:text-primary/80" : "text-muted-foreground hover:text-foreground"}`}
            title={t.wykonawcy.pinsBtn}
          >
            <Pin size={15} />
            <span className={`absolute -top-1 -right-1 min-w-[14px] h-3.5 px-0.5 text-[9px] font-bold rounded-full flex items-center justify-center leading-none transition-colors ${unreadPinCount > 0 ? "bg-primary text-primary-foreground" : "bg-muted-foreground/40 text-white"}`}>
              {(unreadPinCount > 0 ? unreadPinCount : totalPinCount) > 99 ? "99+" : (unreadPinCount > 0 ? unreadPinCount : totalPinCount)}
            </span>
          </button>
        )}
        <button
          onClick={onCommentClick}
          className={`relative p-1.5 rounded-lg hover:bg-muted transition-colors ${unreadCount > 0 ? "text-primary hover:text-primary/80" : "text-muted-foreground hover:text-foreground"}`}
          title={t.wykonawcy.commentsBtn}
        >
          <MessageSquare size={15} />
          {totalCount > 0 && (
            <span className={`absolute -top-1 -right-1 min-w-[14px] h-3.5 px-0.5 text-[9px] font-bold rounded-full flex items-center justify-center leading-none transition-colors ${unreadCount > 0 ? "bg-primary text-primary-foreground" : "bg-muted-foreground/40 text-white"}`}>
              {(unreadCount > 0 ? unreadCount : totalCount) > 99 ? "99+" : (unreadCount > 0 ? unreadCount : totalCount)}
            </span>
          )}
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger render={<button className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground" title={t.wykonawcy.moreOptions} />}>
            <MoreHorizontal size={15} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36">
            {displayUrl && (
              <DropdownMenuItem render={<a href={displayUrl} target="_blank" rel="noopener noreferrer" />}>
                <Download size={13} className="mr-2" />
                {t.wykonawcy.downloadBtn}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
              <Trash2 size={13} className="mr-2" />
              {t.common.delete}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

function FileGridTile({ file, onDelete, onFileClick, onCommentClick, unreadCount = 0, totalCount = 0, unreadPinCount = 0, totalPinCount = 0 }: {
  file: ContractorFile;
  onDelete: () => void;
  onFileClick: () => void;
  onCommentClick: () => void;
  unreadCount?: number;
  totalCount?: number;
  unreadPinCount?: number;
  totalPinCount?: number;
}) {
  const t = useT();
  const displayUrl = file.render?.fileUrl ?? file.fileUrl ?? null;
  const effectiveType = file.render?.fileType ?? file.fileType;
  const isImage = effectiveType === "image";
  const isPdf = effectiveType === "pdf";
  const hasUnread = unreadCount > 0 || unreadPinCount > 0;

  return (
    <div className={`group relative rounded-xl border bg-card overflow-hidden transition-all ${hasUnread ? "border-violet-400 shadow-[0_0_12px_2px_rgba(139,92,246,0.35)]" : "border-border"}`}>
      <button onClick={onFileClick} className="w-full aspect-square bg-muted flex items-center justify-center overflow-hidden">
        {isImage && displayUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={displayUrl} alt={file.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" />
        ) : isPdf && displayUrl ? (
          <iframe src={`${displayUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`} className="w-full h-full pointer-events-none" title={file.name} />
        ) : (
          <FileText size={32} className="text-muted-foreground/40" />
        )}
      </button>
      {displayUrl && (
        <a
          href={displayUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/50 text-white opacity-0 group-hover:opacity-100 hover:bg-black/70 transition-all"
          title={t.wykonawcy.downloadOpen}
        >
          <Download size={14} />
        </a>
      )}
      <div className="flex items-center gap-1 px-2 py-1.5">
        <button onClick={onFileClick} className="flex-1 min-w-0 text-left">
          <p className="text-xs font-medium truncate">{file.name}</p>
          <p className="text-xs text-muted-foreground">{new Date(file.createdAt).toLocaleDateString()}</p>
        </button>
        <div className="flex items-center gap-0.5 shrink-0">
          {(unreadPinCount > 0 || totalPinCount > 0) && (
            <button
              onClick={onFileClick}
              className={`flex items-center gap-0.5 p-1 rounded-lg ${unreadPinCount > 0 ? "text-violet-600" : "text-muted-foreground"}`}
              title={t.wykonawcy.pinsBtn}
            >
              <Pin size={13} />
              <span className="text-[10px] font-medium">{unreadPinCount > 0 ? unreadPinCount : totalPinCount}</span>
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onCommentClick(); }}
            className={`flex items-center gap-0.5 p-1 rounded-lg transition-colors ${unreadCount > 0 ? "text-violet-600" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
            title={t.wykonawcy.commentsBtn}
          >
            <MessageSquare size={13} />
            {totalCount > 0 && <span className="text-[10px] font-medium">{unreadCount > 0 ? unreadCount : totalCount}</span>}
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger render={<button className="p-1 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground" />}>
              <MoreHorizontal size={13} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
              {displayUrl && (
                <DropdownMenuItem render={<a href={displayUrl} target="_blank" rel="noopener noreferrer" />}>
                  <Download size={13} className="mr-2" />
                  {t.wykonawcy.downloadBtn}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
                <Trash2 size={13} className="mr-2" />
                {t.common.delete}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}

function folderIconLarge(type: string) {
  if (type === "rysunki") return <Ruler size={28} className="text-primary" />;
  if (type === "wizualizacje") return <Image size={28} className="text-primary" />;
  return <FileText size={28} className="text-primary" />;
}

function folderIcon(type: string) {
  if (type === "rysunki") return <Ruler size={20} />;
  if (type === "wizualizacje") return <Image size={20} />;
  return <FileText size={20} />;
}

function folderUnreadTotal(folder: ContractorFolder, unreadCounts: Record<string, number>, unreadPinCounts: Record<string, number>): number {
  let total = folder.files.reduce((s, f) => s + (unreadCounts[f.id] ?? 0) + (unreadPinCounts[f.id] ?? 0), 0);
  for (const sub of folder.subfolders) {
    total += sub.files.reduce((s, f) => s + (unreadCounts[f.id] ?? 0) + (unreadPinCounts[f.id] ?? 0), 0);
  }
  return total;
}

function subfolderUnreadTotal(sub: ContractorSubfolder, unreadCounts: Record<string, number>, unreadPinCounts: Record<string, number>): number {
  return sub.files.reduce((s, f) => s + (unreadCounts[f.id] ?? 0) + (unreadPinCounts[f.id] ?? 0), 0);
}

function totalFilesInFolder(folder: ContractorFolder): number {
  return folder._count.files + folder.subfolders.reduce((s, sub) => s + sub._count.files, 0);
}

export default function ContractorProjectView({
  contractorId, contractorName, assignmentId, projectTitle, projectId, folders, rooms, info,
  unreadPerFile = {}, totalPerFile = {}, unreadPinsPerFile = {}, totalPinsPerFile = {}, designerName = "Projektant",
  initialFolderId, initialSubFolderId,
}: Props) {
  const t = useT();
  const router = useRouter();
  const [viewMode, setViewMode] = useViewPreference("wykonawcy-project", "grid");
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(initialFolderId ?? null);
  const [selectedSubfolderId, setSelectedSubfolderId] = useState<string | null>(initialSubFolderId ?? null);
  const [infoOpen, setInfoOpen] = useState(false);
  const [unreadCounts] = useState<Record<string, number>>(unreadPerFile);
  const [unreadPinCounts] = useState<Record<string, number>>(unreadPinsPerFile);

  // Auto-expand folders/subfolders with unread on mount (list view)
  const firstUnreadFolderId = (() => {
    for (const folder of folders) {
      const hasDirect = folder.files.some((f) => (unreadPerFile[f.id] ?? 0) > 0);
      const hasSub = folder.subfolders.some((sub) => sub.files.some((f) => (unreadPerFile[f.id] ?? 0) > 0));
      if (hasDirect || hasSub) return folder.id;
    }
    return null;
  })();
  const firstUnreadSubfolderId = (() => {
    for (const folder of folders) {
      for (const sub of folder.subfolders) {
        if (sub.files.some((f) => (unreadPerFile[f.id] ?? 0) > 0)) return sub.id;
      }
    }
    return null;
  })();

  const [expandedFolder, setExpandedFolder] = useState<string | null>(firstUnreadFolderId);
  const [expandedSubfolder, setExpandedSubfolder] = useState<string | null>(firstUnreadSubfolderId);
  const [addFileDialog, setAddFileDialog] = useState<string | null>(null);
  const [addFileSubfolder, setAddFileSubfolder] = useState<string | null>(null);
  const [newFolderParentId, setNewFolderParentId] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderDialogOpen, setNewFolderDialogOpen] = useState(false);
  const [newFolderDialogLoading, setNewFolderDialogLoading] = useState(false);
  const [subfolderOrder, setSubfolderOrder] = useState<Record<string, ContractorSubfolder[]>>(
    () => Object.fromEntries(folders.map((f) => [f.id, f.subfolders]))
  );

  useEffect(() => {
    setSubfolderOrder(Object.fromEntries(folders.map((f) => [f.id, f.subfolders])));
  }, [folders]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  async function handleSubfolderDragEnd(event: DragEndEvent, parentFolderId: string) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const current = subfolderOrder[parentFolderId] ?? [];
    const oldIdx = current.findIndex((s) => s.id === active.id);
    const newIdx = current.findIndex((s) => s.id === over.id);
    const reordered = arrayMove(current, oldIdx, newIdx);
    setSubfolderOrder((prev) => ({ ...prev, [parentFolderId]: reordered }));
    await Promise.all(
      reordered.map((sub, idx) =>
        fetch(`/api/contractors/${contractorId}/assignments/${assignmentId}/folders/${sub.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order: idx }),
        })
      )
    );
  }

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [bulkFolderId, setBulkFolderId] = useState<string | null>(null);
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);

  function toggleBulk(folderId: string) {
    if (bulkFolderId === folderId) {
      setBulkFolderId(null);
      setSelectedFileIds([]);
    } else {
      setBulkFolderId(folderId);
      setSelectedFileIds([]);
    }
  }

  function toggleFileSelect(fileId: string) {
    setSelectedFileIds((prev) => prev.includes(fileId) ? prev.filter((id) => id !== fileId) : [...prev, fileId]);
  }

  async function deleteSelected(folderId: string) {
    if (selectedFileIds.length === 0) return;
    if (!confirm(t.wykonawcy.confirmDeleteFiles)) return;
    await Promise.all(
      selectedFileIds.map((fileId) =>
        fetch(`/api/contractors/${contractorId}/assignments/${assignmentId}/folders/${folderId}/files/${fileId}`, { method: "DELETE" })
      )
    );
    toast.success(t.wykonawcy.filesDeletedOk);
    setBulkFolderId(null);
    setSelectedFileIds([]);
    router.refresh();
  }

  async function createFolder(parentId: string, fromDialog = false) {
    if (!newFolderName.trim()) return;
    if (fromDialog) setNewFolderDialogLoading(true);
    const res = await fetch(
      `/api/contractors/${contractorId}/assignments/${assignmentId}/folders/${parentId}/subfolders`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newFolderName.trim(), renders: [] }),
      }
    );
    if (fromDialog) setNewFolderDialogLoading(false);
    if (res.ok) {
      toast.success(t.wykonawcy.folderCreated);
      setNewFolderParentId(null);
      setNewFolderName("");
      if (fromDialog) setNewFolderDialogOpen(false);
      router.refresh();
    } else {
      toast.error(t.wykonawcy.folderCreateError);
    }
  }

  async function deleteSubfolder(subfolderId: string, name: string) {
    if (!confirm(`"${name}" — ${t.wykonawcy.confirmDeleteFolder}`)) return;
    const res = await fetch(
      `/api/contractors/${contractorId}/assignments/${assignmentId}/folders/${subfolderId}`,
      { method: "DELETE" }
    );
    if (res.ok) {
      toast.success(t.wykonawcy.folderDeleted);
      router.refresh();
    } else {
      toast.error(t.wykonawcy.folderDeleteError);
    }
  }

  async function saveRename(subfolderId: string) {
    if (!renameValue.trim()) return;
    const res = await fetch(
      `/api/contractors/${contractorId}/assignments/${assignmentId}/folders/${subfolderId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: renameValue.trim() }),
      }
    );
    if (res.ok) {
      toast.success(t.wykonawcy.nameChanged);
      setRenamingId(null);
      router.refresh();
    } else {
      toast.error(t.wykonawcy.renameError);
    }
  }

  async function toggleVisible(folder: ContractorFolder) {
    const res = await fetch(
      `/api/contractors/${contractorId}/assignments/${assignmentId}/folders/${folder.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visible: !folder.visible }),
      }
    );
    if (res.ok) {
      toast.success(folder.visible ? t.wykonawcy.folderHidden : t.wykonawcy.folderVisible);
      router.refresh();
    } else {
      toast.error(t.wykonawcy.visibilityError);
    }
  }

  async function deleteFile(folderId: string, fileId: string, fileName: string) {
    if (!confirm(`"${fileName}" — ${t.wykonawcy.confirmDeleteFile}`)) return;
    const res = await fetch(
      `/api/contractors/${contractorId}/assignments/${assignmentId}/folders/${folderId}/files/${fileId}`,
      { method: "DELETE" }
    );
    if (res.ok) {
      toast.success(t.wykonawcy.fileDeletedOk);
      router.refresh();
    } else {
      toast.error(t.wykonawcy.fileDeleteError);
    }
  }

  const filteredFolders = folders.filter((f) => ["rysunki", "wizualizacje", "dokumenty"].includes(f.type));

  // ── Grid view ──────────────────────────────────────────────────────────────

  function renderGridTopLevel() {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {filteredFolders.map((folder) => {
          const unreadTotal = folderUnreadTotal(folder, unreadCounts, unreadPinCounts);
          const fileTotal = totalFilesInFolder(folder);
          return (
            <button
              key={folder.id}
              onClick={() => setSelectedFolderId(folder.id)}
              className="group relative bg-card border border-border rounded-2xl p-5 shadow-sm transition-all hover:shadow-[0_4px_16px_rgba(25,33,61,0.2)] hover:border-primary/30 text-left w-full"
            >
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-4 transition-colors ${folder.visible ? "bg-primary/10 group-hover:bg-primary/20" : "bg-muted"}`}>
                {folderIconLarge(folder.type)}
              </div>
              <p className="font-semibold text-foreground truncate">
                {folder.name}
              </p>
              {!folder.visible && (
                <div className="flex items-center gap-1 mt-0.5">
                  <EyeOff size={11} className="text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{t.wykonawcy.hiddenBadge}</span>
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {fileTotal} {t.wykonawcy.filesPlural}
              </p>
              {unreadTotal > 0 && (
                <div className="absolute top-3 right-3">
                  <span className="min-w-[20px] h-5 px-1.5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                    {unreadTotal > 9 ? "9+" : unreadTotal}
                  </span>
                </div>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  function renderGridInsideFolder(folder: ContractorFolder) {
    const subs = subfolderOrder[folder.id] ?? folder.subfolders;

    return (
      <div className="space-y-6">
        {/* New subfolder dialog */}
        <Dialog
          open={newFolderDialogOpen && newFolderParentId === folder.id}
          onOpenChange={(v) => { if (!newFolderDialogLoading) { setNewFolderDialogOpen(v); if (!v) { setNewFolderParentId(null); setNewFolderName(""); } } }}
        >
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>{t.wykonawcy.newFolder}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-1">
              <div className="space-y-1.5">
                <Label htmlFor="subfolder-name">{t.wykonawcy.folderNamePlaceholder}</Label>
                <Input
                  id="subfolder-name"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder={t.wykonawcy.folderNamePlaceholder}
                  disabled={newFolderDialogLoading}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); createFolder(folder.id, true); } }}
                  autoFocus
                />
              </div>
              <Button
                onClick={() => createFolder(folder.id, true)}
                disabled={newFolderDialogLoading || !newFolderName.trim()}
                className="w-full"
              >
                {newFolderDialogLoading ? t.render.creating : t.render.createFolder}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Subfolder cards grid */}
        {subs.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {subs.map((sub) => {
              const subUnread = subfolderUnreadTotal(sub, unreadCounts, unreadPinCounts);
              return (
                <div
                  key={sub.id}
                  className="group relative bg-card border border-border rounded-2xl p-5 shadow-sm transition-all hover:shadow-[0_4px_16px_rgba(25,33,61,0.2)] hover:border-primary/30"
                >
                  <button onClick={() => setSelectedSubfolderId(sub.id)} className="block w-full text-left">
                    <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-4 bg-primary/10 group-hover:bg-primary/20 transition-colors">
                      <Folder size={28} className="text-primary" />
                    </div>
                    {renamingId !== sub.id && (
                      <>
                        <p className="font-semibold text-foreground truncate pr-8">{sub.name}</p>
                        {sub.sourceFolderName && (
                          <p className="flex items-center gap-1 text-xs text-primary mt-0.5">
                            <RefreshCw size={10} />
                            <span className="truncate">{sub.sourceFolderName}</span>
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {sub._count.files} {t.wykonawcy.filesPlural}
                        </p>
                      </>
                    )}
                  </button>

                  {/* Inline rename form */}
                  {renamingId === sub.id && (
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        autoFocus
                        className="flex-1 text-sm border border-border rounded px-2 py-1 bg-background"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveRename(sub.id);
                          if (e.key === "Escape") setRenamingId(null);
                        }}
                      />
                      <button onClick={() => saveRename(sub.id)} className="text-primary hover:text-primary/70"><Check size={14} /></button>
                      <button onClick={() => setRenamingId(null)} className="text-muted-foreground hover:text-foreground"><X size={14} /></button>
                    </div>
                  )}

                  {/* Unread badge */}
                  {subUnread > 0 && (
                    <div className="absolute top-3 left-3">
                      <span className="min-w-[20px] h-5 px-1.5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                        {subUnread > 9 ? "9+" : subUnread}
                      </span>
                    </div>
                  )}

                  {/* Actions menu */}
                  {renamingId !== sub.id && (
                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <DropdownMenu>
                        <DropdownMenuTrigger render={<button className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground" />}>
                          <MoreHorizontal size={14} />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem onClick={() => { setRenamingId(sub.id); setRenameValue(sub.name); }}>
                            <Pencil size={13} className="mr-2" />
                            {t.wykonawcy.rename}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => deleteSubfolder(sub.id, sub.name)} className="text-destructive focus:text-destructive">
                            <Trash2 size={13} className="mr-2" />
                            {t.wykonawcy.deleteFolderBtn}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Direct files at bottom */}
        {folder.files.length > 0 && (
          <div>
            {subs.length > 0 && (
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                Pliki bezpośrednie
              </p>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {folder.files.map((file) => (
                <FileGridTile
                  key={file.id}
                  file={file}
                  onDelete={() => deleteFile(folder.id, file.id, file.name)}
                  onFileClick={() => router.push(`/wykonawcy/${contractorId}/projekty/${assignmentId}/foldery/${folder.id}/pliki/${file.id}`)}
                  onCommentClick={() => router.push(`/wykonawcy/${contractorId}/projekty/${assignmentId}/foldery/${folder.id}/pliki/${file.id}?comments=1`)}
                  unreadCount={unreadCounts[file.id] ?? 0}
                  totalCount={totalPerFile[file.id] ?? 0}
                  unreadPinCount={unreadPinCounts[file.id] ?? 0}
                  totalPinCount={totalPinsPerFile[file.id] ?? 0}
                />
              ))}
            </div>
          </div>
        )}

        {folder.files.length === 0 && subs.length === 0 && (
          <p className="text-sm text-muted-foreground">{t.wykonawcy.noFilesInFolder}</p>
        )}

        {addFileDialog === folder.id && (
          <AddContractorFileDialog
            open={true}
            onOpenChange={(v) => !v && setAddFileDialog(null)}
            contractorId={contractorId}
            assignmentId={assignmentId}
            folderId={folder.id}
            projectId={projectId}
            rooms={rooms}
            onAdded={() => { setAddFileDialog(null); router.refresh(); }}
          />
        )}
      </div>
    );
  }

  function renderGridInsideSubfolder(folder: ContractorFolder, sub: ContractorSubfolder) {
    return (
      <div className="space-y-6">
        {/* Files grid */}
        {sub.files.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t.wykonawcy.noFiles}</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {sub.files.map((file) => (
              <FileGridTile
                key={file.id}
                file={file}
                onDelete={() => deleteFile(sub.id, file.id, file.name)}
                onFileClick={() => router.push(`/wykonawcy/${contractorId}/projekty/${assignmentId}/foldery/${sub.id}/pliki/${file.id}`)}
                onCommentClick={() => router.push(`/wykonawcy/${contractorId}/projekty/${assignmentId}/foldery/${sub.id}/pliki/${file.id}?comments=1`)}
                unreadCount={unreadCounts[file.id] ?? 0}
                totalCount={totalPerFile[file.id] ?? 0}
                unreadPinCount={unreadPinCounts[file.id] ?? 0}
                totalPinCount={totalPinsPerFile[file.id] ?? 0}
              />
            ))}
          </div>
        )}

        {addFileSubfolder === sub.id && (
          <AddContractorFileDialog
            open={true}
            onOpenChange={(v) => !v && setAddFileSubfolder(null)}
            contractorId={contractorId}
            assignmentId={assignmentId}
            folderId={sub.id}
            projectId={projectId}
            rooms={rooms}
            isSubfolder={true}
            onAdded={() => { setAddFileSubfolder(null); router.refresh(); }}
          />
        )}
      </div>
    );
  }

  // ── List view ──────────────────────────────────────────────────────────────

  function renderList() {
    return (
      <div className="space-y-3">
        {filteredFolders.map((folder) => (
          <div key={folder.id} className={`border border-border rounded-xl overflow-hidden transition-all ${expandedFolder === folder.id ? "border-l-2 border-l-primary" : ""}`}>
            <div
              className="flex items-center gap-3 p-4 cursor-pointer select-none hover:bg-muted/40 transition-colors"
              onClick={() => setExpandedFolder(expandedFolder === folder.id ? null : folder.id)}
            >
              <div className={`text-muted-foreground ${folder.visible ? "" : "opacity-40"}`}>
                {folderIcon(folder.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{folder.name}</span>
                  {!folder.visible && <Badge variant="secondary" className="text-xs">{t.wykonawcy.hiddenBadge}</Badge>}
                </div>
                <p className="text-xs text-muted-foreground">{folder._count.files + folder.subfolders.reduce((s, sub) => s + sub._count.files, 0)} {t.wykonawcy.filesPlural}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                {(() => { const u = folderUnreadTotal(folder, unreadCounts, unreadPinCounts); return u > 0 ? <Badge variant="default" className="text-xs">{t.wykonawcy.unread} {u}</Badge> : null; })()}
                {bulkFolderId === folder.id && selectedFileIds.length > 0 && (
                  <Button size="sm" variant="destructive" onClick={() => deleteSelected(folder.id)} className="gap-1.5">
                    <Trash2 size={14} />
                    <span className="hidden sm:inline">{t.common.delete} ({selectedFileIds.length})</span>
                    <span className="sm:hidden">{selectedFileIds.length}</span>
                  </Button>
                )}
                <button
                  onClick={() => toggleBulk(folder.id)}
                  title={bulkFolderId === folder.id ? t.wykonawcy.deselectFiles : t.wykonawcy.selectFiles}
                  className={`p-1.5 rounded-lg hover:bg-muted transition-colors ${bulkFolderId === folder.id ? "text-primary" : "text-muted-foreground"}`}
                >
                  <CheckSquare size={16} />
                </button>
                <button
                  onClick={() => toggleVisible(folder)}
                  title={folder.visible ? t.wykonawcy.hideFromContractor : t.wykonawcy.showToContractor}
                  className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
                >
                  {folder.visible ? <Eye size={16} /> : <EyeOff size={16} />}
                </button>
                <button
                  onClick={() => { setNewFolderParentId(folder.id); setNewFolderName(""); setExpandedFolder(folder.id); }}
                  title={t.wykonawcy.newFolder}
                  className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
                >
                  <FolderPlus size={16} />
                </button>
                <button
                  onClick={() => setAddFileDialog(folder.id)}
                  title={t.wykonawcy.addFileBtn}
                  className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
                >
                  <Plus size={16} />
                </button>
              </div>
              {expandedFolder === folder.id ? <ChevronDown size={16} className="text-muted-foreground shrink-0" /> : <ChevronRight size={16} className="text-muted-foreground shrink-0" />}
            </div>

            {expandedFolder === folder.id && (
              <div className="border-t border-border">
                {newFolderParentId === folder.id && (
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-muted/20 border-b border-border">
                    <FolderPlus size={14} className="text-muted-foreground shrink-0" />
                    <input
                      autoFocus
                      className="flex-1 text-sm border border-border rounded px-2 py-0.5 bg-background"
                      placeholder={t.wykonawcy.folderNamePlaceholder}
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") createFolder(folder.id);
                        if (e.key === "Escape") setNewFolderParentId(null);
                      }}
                    />
                    <button onClick={() => createFolder(folder.id)} className="text-primary hover:text-primary/70"><Check size={14} /></button>
                    <button onClick={() => setNewFolderParentId(null)} className="text-muted-foreground hover:text-foreground"><X size={14} /></button>
                  </div>
                )}
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleSubfolderDragEnd(e, folder.id)}>
                  <SortableContext items={(subfolderOrder[folder.id] ?? []).map((s) => s.id)} strategy={verticalListSortingStrategy}>
                    {(subfolderOrder[folder.id] ?? folder.subfolders).map((sub) => (
                      <SortableSubfolderWrapper key={sub.id} id={sub.id}>
                        {({ ref, style, dragListeners, dragAttributes }) => (
                          <div ref={ref as React.Ref<HTMLDivElement>} style={style} className="border-b border-border last:border-b-0">
                            <div className="flex items-center gap-2 px-4 py-2.5 bg-muted/30">
                              {renamingId === sub.id ? (
                                <div className="flex items-center gap-2 flex-1">
                                  <input
                                    autoFocus
                                    className="flex-1 text-sm border border-border rounded px-2 py-0.5 bg-background"
                                    value={renameValue}
                                    onChange={(e) => setRenameValue(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") saveRename(sub.id);
                                      if (e.key === "Escape") setRenamingId(null);
                                    }}
                                  />
                                  <button onClick={() => saveRename(sub.id)} className="text-primary hover:text-primary/70"><Check size={14} /></button>
                                  <button onClick={() => setRenamingId(null)} className="text-muted-foreground hover:text-foreground"><X size={14} /></button>
                                </div>
                              ) : (
                                <>
                                  <span
                                    {...dragListeners}
                                    {...dragAttributes}
                                    className="p-0.5 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground shrink-0 touch-none"
                                    title={t.wykonawcy.dragToReorder}
                                  >
                                    <GripVertical size={14} />
                                  </span>
                                  <button
                                    onClick={() => setExpandedSubfolder(expandedSubfolder === sub.id ? null : sub.id)}
                                    className="flex-1 flex items-center gap-2 text-sm font-medium text-left min-w-0"
                                  >
                                    <span className="truncate">{sub.name}</span>
                                    {sub.sourceFolderName && (
                                      <span className="flex items-center gap-1 text-xs text-primary shrink-0 font-normal" title={`Zsynchronizowany z: ${sub.sourceFolderName}`}>
                                        <RefreshCw size={11} />
                                        <span className="max-w-[100px] truncate">{sub.sourceFolderName}</span>
                                      </span>
                                    )}
                                    <span className="text-xs text-muted-foreground font-normal shrink-0">{sub._count.files} {t.wykonawcy.filesPlural}</span>
                                  </button>
                                  {(() => { const u = subfolderUnreadTotal(sub, unreadCounts, unreadPinCounts); return u > 0 ? <span className="shrink-0 min-w-[18px] h-[18px] px-1 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center leading-none">{u > 9 ? "9+" : u}</span> : null; })()}
                                  <button
                                    onClick={() => setAddFileSubfolder(sub.id)}
                                    className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                                    title={t.wykonawcy.addFileBtn}
                                  >
                                    <Plus size={13} />
                                  </button>
                                  {bulkFolderId === sub.id && selectedFileIds.length > 0 && (
                                    <Button size="sm" variant="destructive" onClick={() => deleteSelected(sub.id)} className="gap-1 h-7 text-xs">
                                      <Trash2 size={12} />
                                      {t.common.delete} ({selectedFileIds.length})
                                    </Button>
                                  )}
                                  <button
                                    onClick={() => toggleBulk(sub.id)}
                                    title={bulkFolderId === sub.id ? t.wykonawcy.deselectFiles : t.wykonawcy.selectFiles}
                                    className={`p-1 rounded hover:bg-muted transition-colors ${bulkFolderId === sub.id ? "text-primary" : "text-muted-foreground"}`}
                                  >
                                    <CheckSquare size={14} />
                                  </button>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger render={<button className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground" title={t.wykonawcy.moreOptions} />}>
                                      <MoreHorizontal size={14} />
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-40">
                                      <DropdownMenuItem onClick={() => { setRenamingId(sub.id); setRenameValue(sub.name); }}>
                                        <Pencil size={13} className="mr-2" />
                                        {t.wykonawcy.rename}
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem onClick={() => deleteSubfolder(sub.id, sub.name)} className="text-destructive focus:text-destructive">
                                        <Trash2 size={13} className="mr-2" />
                                        {t.wykonawcy.deleteFolderBtn}
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                  <button
                                    onClick={() => setExpandedSubfolder(expandedSubfolder === sub.id ? null : sub.id)}
                                    className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground"
                                    title={expandedSubfolder === sub.id ? t.listy.collapse : t.listy.expand}
                                  >
                                    {expandedSubfolder === sub.id ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                                  </button>
                                </>
                              )}
                            </div>
                            {expandedSubfolder === sub.id && (
                              <div className="divide-y divide-border">
                                {sub.files.length === 0 ? (
                                  <p className="px-6 py-3 text-sm text-muted-foreground">{t.wykonawcy.noFiles}</p>
                                ) : (
                                  sub.files.map((file) => <FileRow key={file.id} file={file} onDelete={() => deleteFile(sub.id, file.id, file.name)} bulkMode={bulkFolderId === sub.id} selected={selectedFileIds.includes(file.id)} onSelect={() => toggleFileSelect(file.id)} unreadCount={unreadCounts[file.id] ?? 0} totalCount={totalPerFile[file.id] ?? 0} unreadPinCount={unreadPinCounts[file.id] ?? 0} totalPinCount={totalPinsPerFile[file.id] ?? 0} onFileClick={() => router.push(`/wykonawcy/${contractorId}/projekty/${assignmentId}/foldery/${sub.id}/pliki/${file.id}`)} onCommentClick={() => router.push(`/wykonawcy/${contractorId}/projekty/${assignmentId}/foldery/${sub.id}/pliki/${file.id}?comments=1`)} />)
                                )}
                              </div>
                            )}
                            {addFileSubfolder === sub.id && (
                              <AddContractorFileDialog
                                open={true}
                                onOpenChange={(v) => !v && setAddFileSubfolder(null)}
                                contractorId={contractorId}
                                assignmentId={assignmentId}
                                folderId={sub.id}
                                projectId={projectId}
                                rooms={rooms}
                                isSubfolder={true}
                                onAdded={() => { setAddFileSubfolder(null); router.refresh(); }}
                              />
                            )}
                          </div>
                        )}
                      </SortableSubfolderWrapper>
                    ))}
                  </SortableContext>
                </DndContext>
                {folder.files.length === 0 && folder.subfolders.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-muted-foreground">{t.wykonawcy.noFilesInFolder}</p>
                ) : folder.files.length > 0 ? (
                  <div className="divide-y divide-border">
                    {folder.files.map((file) => <FileRow key={file.id} file={file} onDelete={() => deleteFile(folder.id, file.id, file.name)} bulkMode={bulkFolderId === folder.id} selected={selectedFileIds.includes(file.id)} onSelect={() => toggleFileSelect(file.id)} unreadCount={unreadCounts[file.id] ?? 0} totalCount={totalPerFile[file.id] ?? 0} unreadPinCount={unreadPinCounts[file.id] ?? 0} totalPinCount={totalPinsPerFile[file.id] ?? 0} onFileClick={() => router.push(`/wykonawcy/${contractorId}/projekty/${assignmentId}/foldery/${folder.id}/pliki/${file.id}`)} onCommentClick={() => router.push(`/wykonawcy/${contractorId}/projekty/${assignmentId}/foldery/${folder.id}/pliki/${file.id}?comments=1`)} />)}
                  </div>
                ) : null}
              </div>
            )}

            {addFileDialog === folder.id && (
              <AddContractorFileDialog
                open={true}
                onOpenChange={(v) => !v && setAddFileDialog(null)}
                contractorId={contractorId}
                assignmentId={assignmentId}
                folderId={folder.id}
                projectId={projectId}
                rooms={rooms}
                onAdded={() => { setAddFileDialog(null); router.refresh(); }}
              />
            )}
          </div>
        ))}
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const selectedFolder = selectedFolderId ? filteredFolders.find((f) => f.id === selectedFolderId) ?? null : null;
  const selectedSubfolder = selectedFolder && selectedSubfolderId
    ? (subfolderOrder[selectedFolder.id] ?? selectedFolder.subfolders).find((s) => s.id === selectedSubfolderId) ?? null
    : null;

  return (
    <>
      <div className="space-y-6">
        {/* Breadcrumb — dynamic, mirrors ProjectFlow style */}
        <nav className="flex items-center gap-2 mb-6">
          {/* Back arrow */}
          {selectedFolder ? (
            <>
              <button
                onClick={() => {
                  if (selectedSubfolder) { setSelectedSubfolderId(null); }
                  else { setSelectedFolderId(null); setSelectedSubfolderId(null); setNewFolderParentId(null); setNewFolderName(""); }
                }}
                className="flex-shrink-0 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
              >
                <ChevronLeft size={20} />
              </button>
              <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
            </>
          ) : (
            <>
              <Link href={`/wykonawcy/${contractorId}`} className="flex-shrink-0 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
                <ChevronLeft size={20} />
              </Link>
              <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
            </>
          )}
          <ol className="flex items-center gap-1 text-sm min-w-0 overflow-hidden">
            <li className="flex items-center gap-1 min-w-0">
              <Link href="/wykonawcy" className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors truncate max-w-[70px]" title={t.wykonawcy.title}>
                {t.wykonawcy.title}
              </Link>
            </li>
            <li className="flex items-center gap-1 min-w-0">
              <ChevronRight size={13} className="flex-shrink-0 text-gray-300 dark:text-gray-600" />
              <Link href={`/wykonawcy/${contractorId}`} className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors truncate max-w-[90px]" title={contractorName}>
                {contractorName}
              </Link>
            </li>
            <li className="flex items-center gap-1 min-w-0">
              <ChevronRight size={13} className="flex-shrink-0 text-gray-300 dark:text-gray-600" />
              {selectedFolder ? (
                <button
                  onClick={() => { setSelectedFolderId(null); setSelectedSubfolderId(null); setNewFolderParentId(null); setNewFolderName(""); }}
                  className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors truncate max-w-[120px] text-left"
                  title={projectTitle}
                >
                  {projectTitle}
                </button>
              ) : (
                <span className="text-gray-900 dark:text-gray-100 truncate max-w-[140px]" title={projectTitle}>{projectTitle}</span>
              )}
            </li>
            {selectedFolder && (
              <li className="flex items-center gap-1 min-w-0">
                <ChevronRight size={13} className="flex-shrink-0 text-gray-300 dark:text-gray-600" />
                {selectedSubfolder ? (
                  <button
                    onClick={() => setSelectedSubfolderId(null)}
                    className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors truncate max-w-[120px] text-left"
                    title={selectedFolder.name}
                  >
                    {selectedFolder.name}
                  </button>
                ) : (
                  <span className="text-gray-900 dark:text-gray-100 truncate max-w-[140px]" title={selectedFolder.name}>{selectedFolder.name}</span>
                )}
              </li>
            )}
            {selectedSubfolder && (
              <li className="flex items-center gap-1 min-w-0">
                <ChevronRight size={13} className="flex-shrink-0 text-gray-300 dark:text-gray-600" />
                <span className="text-gray-900 dark:text-gray-100 truncate max-w-[140px]" title={selectedSubfolder.name}>{selectedSubfolder.name}</span>
              </li>
            )}
          </ol>
        </nav>

        {/* Row 1: title + action buttons */}
        <div className="flex items-start justify-between mb-2">
          <div>
            <h1 className="text-2xl font-bold">
              {selectedSubfolder?.name ?? selectedFolder?.name ?? projectTitle}
            </h1>
            {selectedFolder && !selectedSubfolder && !selectedFolder.visible && (
              <Badge variant="secondary" className="text-xs mt-1">{t.wykonawcy.hiddenBadge}</Badge>
            )}
            {selectedSubfolder?.sourceFolderName && (
              <p className="flex items-center gap-1 text-xs text-primary mt-0.5">
                <RefreshCw size={10} />
                <span>{selectedSubfolder.sourceFolderName}</span>
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {viewMode === "grid" && selectedFolder && !selectedSubfolder && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setNewFolderParentId(selectedFolder.id); setNewFolderName(""); setNewFolderDialogOpen(true); }}
                  className="gap-1.5"
                >
                  <FolderPlus size={14} />
                  {t.wykonawcy.newFolder}
                </Button>
                <Button
                  size="sm"
                  onClick={() => setAddFileDialog(selectedFolder.id)}
                  className="gap-1.5"
                >
                  <Plus size={14} />
                  {t.wykonawcy.addFileBtn}
                </Button>
                <button
                  onClick={() => toggleVisible(selectedFolder)}
                  title={selectedFolder.visible ? t.wykonawcy.hideFromContractor : t.wykonawcy.showToContractor}
                  className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                >
                  {selectedFolder.visible ? <Eye size={16} /> : <EyeOff size={16} />}
                </button>
              </>
            )}
            {viewMode === "grid" && selectedSubfolder && (
              <Button size="sm" onClick={() => setAddFileSubfolder(selectedSubfolder.id)} className="gap-1.5">
                <Plus size={14} />
                {t.wykonawcy.addFileBtn}
              </Button>
            )}
          </div>
        </div>

        {/* Row 2: tab-bar style separator with controls on the right */}
        <div className="flex items-center justify-end gap-2 border-b border-border mb-6 py-1">
          <Button variant="outline" size="sm" onClick={() => setInfoOpen(true)} className="gap-2">
            <Info size={15} />
            {t.wykonawcy.projectInfoBtn}
          </Button>
          <div className="flex items-center gap-0.5 bg-muted rounded-md p-0.5">
            <button
              onClick={() => setViewMode("grid")}
              title="Widok grid"
              className={`p-1.5 rounded transition-colors ${viewMode === "grid" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              <LayoutGrid size={15} />
            </button>
            <button
              onClick={() => { setViewMode("list"); setSelectedFolderId(null); setSelectedSubfolderId(null); }}
              title="Widok lista"
              className={`p-1.5 rounded transition-colors ${viewMode === "list" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              <List size={15} />
            </button>
          </div>
        </div>

        {viewMode === "grid" ? (
          selectedFolder
            ? selectedSubfolder
              ? renderGridInsideSubfolder(selectedFolder, selectedSubfolder)
              : renderGridInsideFolder(selectedFolder)
            : renderGridTopLevel()
        ) : (
          renderList()
        )}
      </div>

      <EditProjectInfoDialog
        open={infoOpen}
        onOpenChange={setInfoOpen}
        contractorId={contractorId}
        assignmentId={assignmentId}
        info={info}
      />
    </>
  );
}
