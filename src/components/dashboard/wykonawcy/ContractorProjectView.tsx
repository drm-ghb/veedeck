"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Eye, EyeOff, Plus, FileText, Image, Ruler, Trash2, ChevronLeft, ChevronDown, ChevronRight, Download, FolderPlus, Pencil, Check, X, CheckSquare, GripVertical, Info, MessageSquare, MoreHorizontal } from "@/components/ui/icons";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import ContractorFileCommentPanel from "@/components/wykonawca/ContractorFileCommentPanel";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import AddContractorFileDialog from "./AddContractorFileDialog";
import EditProjectInfoDialog, { type ProjectInfoData } from "./EditProjectInfoDialog";

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
  designerName?: string;
  autoOpenFileId?: string;
  autoOpenFolderId?: string;
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

function FileRow({ file, onDelete, bulkMode, selected, onSelect, unreadCount = 0, totalCount = 0, onCommentClick }: {
  file: ContractorFile;
  onDelete: () => void;
  bulkMode?: boolean;
  selected?: boolean;
  onSelect?: () => void;
  unreadCount?: number;
  totalCount?: number;
  onCommentClick?: () => void;
}) {
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
      <div className="w-10 h-10 rounded-md bg-muted overflow-hidden shrink-0 flex items-center justify-center">
        {isImage && displayUrl ? (
          <img src={displayUrl} alt={displayName} className="w-full h-full object-cover" />
        ) : isPdf && displayUrl ? (
          <iframe src={`${displayUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`} className="w-full h-full pointer-events-none" title={displayName} />
        ) : (
          <FileText size={18} className="text-muted-foreground" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{displayName}</p>
        <p className="text-xs text-muted-foreground">{new Date(file.createdAt).toLocaleDateString("pl-PL")}</p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={onCommentClick}
          className={`relative p-1.5 rounded-lg hover:bg-muted transition-colors ${unreadCount > 0 ? "text-primary hover:text-primary/80" : "text-muted-foreground hover:text-foreground"}`}
          title="Komentarze"
        >
          <MessageSquare size={15} />
          {totalCount > 0 && (
            <span className={`absolute -top-1 -right-1 min-w-[14px] h-3.5 px-0.5 text-[9px] font-bold rounded-full flex items-center justify-center leading-none transition-colors ${unreadCount > 0 ? "bg-primary text-primary-foreground" : "bg-muted-foreground/40 text-white"}`}>
              {(unreadCount > 0 ? unreadCount : totalCount) > 99 ? "99+" : (unreadCount > 0 ? unreadCount : totalCount)}
            </span>
          )}
        </button>
        {displayUrl && (
          <a href={displayUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground" title="Pobierz">
            <Download size={15} />
          </a>
        )}
        <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-muted-foreground hover:text-red-500 transition-colors" title="Usuń">
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  );
}

function folderIcon(type: string) {
  if (type === "rysunki") return <Ruler size={20} />;
  if (type === "wizualizacje") return <Image size={20} />;
  return <FileText size={20} />;
}

function folderUnreadTotal(folder: ContractorFolder, unreadCounts: Record<string, number>): number {
  let total = folder.files.reduce((s, f) => s + (unreadCounts[f.id] ?? 0), 0);
  for (const sub of folder.subfolders) {
    total += sub.files.reduce((s, f) => s + (unreadCounts[f.id] ?? 0), 0);
  }
  return total;
}

function subfolderUnreadTotal(sub: ContractorSubfolder, unreadCounts: Record<string, number>): number {
  return sub.files.reduce((s, f) => s + (unreadCounts[f.id] ?? 0), 0);
}

export default function ContractorProjectView({
  contractorId, contractorName, assignmentId, projectTitle, projectId, folders, rooms, info,
  unreadPerFile = {}, totalPerFile = {}, designerName = "Projektant",
  autoOpenFileId, autoOpenFolderId,
}: Props) {
  const router = useRouter();
  const [infoOpen, setInfoOpen] = useState(false);
  const [commentFile, setCommentFile] = useState<{ id: string; name: string; thumbnailUrl?: string | null } | null>(null);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>(unreadPerFile);

  function openComments(fileId: string, fileName: string, thumbnailUrl?: string | null) {
    setCommentFile({ id: fileId, name: fileName, thumbnailUrl });
    if ((unreadCounts[fileId] ?? 0) > 0) {
      setUnreadCounts((prev) => ({ ...prev, [fileId]: 0 }));
      fetch("/api/contractor-file-comments/mark-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId, role: "designer" }),
      }).catch(() => {});
    }
  }
  // Auto-expand folders/subfolders with unread on mount
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

  const [expandedFolder, setExpandedFolder] = useState<string | null>(() => {
    if (autoOpenFolderId) {
      // find top-level folder that contains this folderId (could be top-level or subfolder)
      for (const f of folders) {
        if (f.id === autoOpenFolderId) return f.id;
        if (f.subfolders.some((s) => s.id === autoOpenFolderId)) return f.id;
      }
    }
    return firstUnreadFolderId;
  });
  const [expandedSubfolder, setExpandedSubfolder] = useState<string | null>(() => {
    if (autoOpenFolderId) {
      for (const f of folders) {
        if (f.subfolders.some((s) => s.id === autoOpenFolderId)) return autoOpenFolderId;
      }
    }
    return firstUnreadSubfolderId;
  });
  const [addFileDialog, setAddFileDialog] = useState<string | null>(null);
  const [addFileSubfolder, setAddFileSubfolder] = useState<string | null>(null);
  const [newFolderParentId, setNewFolderParentId] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState("");
  // Local subfolder order: folderId → subfolder[]
  const [subfolderOrder, setSubfolderOrder] = useState<Record<string, ContractorSubfolder[]>>(
    () => Object.fromEntries(folders.map((f) => [f.id, f.subfolders]))
  );

  useEffect(() => {
    setSubfolderOrder(Object.fromEntries(folders.map((f) => [f.id, f.subfolders])));
  }, [folders]);

  // Auto-open comment panel when navigating from a notification
  useEffect(() => {
    if (!autoOpenFileId) return;
    for (const folder of folders) {
      const file = [...folder.files, ...folder.subfolders.flatMap((s) => s.files)].find((f) => f.id === autoOpenFileId);
      if (file) {
        openComments(file.id, file.name, file.render?.fileUrl ?? file.fileUrl);
        return;
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    if (!confirm(`Usunąć ${selectedFileIds.length} plików?`)) return;
    await Promise.all(
      selectedFileIds.map((fileId) =>
        fetch(`/api/contractors/${contractorId}/assignments/${assignmentId}/folders/${folderId}/files/${fileId}`, { method: "DELETE" })
      )
    );
    toast.success(`Usunięto ${selectedFileIds.length} plików`);
    setBulkFolderId(null);
    setSelectedFileIds([]);
    router.refresh();
  }

  async function createFolder(parentId: string) {
    if (!newFolderName.trim()) return;
    const res = await fetch(
      `/api/contractors/${contractorId}/assignments/${assignmentId}/folders/${parentId}/subfolders`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newFolderName.trim(), renders: [] }),
      }
    );
    if (res.ok) {
      toast.success("Folder utworzony");
      setNewFolderParentId(null);
      setNewFolderName("");
      router.refresh();
    } else {
      toast.error("Błąd podczas tworzenia folderu");
    }
  }

  async function deleteSubfolder(subfolderId: string, name: string) {
    if (!confirm(`Usunąć folder "${name}" wraz z wszystkimi plikami?`)) return;
    const res = await fetch(
      `/api/contractors/${contractorId}/assignments/${assignmentId}/folders/${subfolderId}`,
      { method: "DELETE" }
    );
    if (res.ok) {
      toast.success("Folder usunięty");
      router.refresh();
    } else {
      toast.error("Błąd podczas usuwania folderu");
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
      toast.success("Nazwa zmieniona");
      setRenamingId(null);
      router.refresh();
    } else {
      toast.error("Błąd podczas zmiany nazwy");
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
      toast.success(folder.visible ? "Folder ukryty dla wykonawcy" : "Folder widoczny dla wykonawcy");
      router.refresh();
    } else {
      toast.error("Błąd podczas aktualizacji widoczności");
    }
  }

  async function deleteFile(folderId: string, fileId: string, fileName: string) {
    if (!confirm(`Usunąć plik "${fileName}"?`)) return;
    const res = await fetch(
      `/api/contractors/${contractorId}/assignments/${assignmentId}/folders/${folderId}/files/${fileId}`,
      { method: "DELETE" }
    );
    if (res.ok) {
      toast.success("Plik usunięty");
      router.refresh();
    } else {
      toast.error("Błąd podczas usuwania pliku");
    }
  }

  return (
    <>
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link href={`/wykonawcy/${contractorId}`} className="text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft size={20} />
        </Link>
        <nav className="flex items-center gap-1 text-sm text-muted-foreground">
          <Link href="/wykonawcy" className="hover:text-foreground transition-colors min-w-0 shrink truncate max-w-[80px]">Wykonawcy</Link>
          <span className="flex-shrink-0">/</span>
          <Link href={`/wykonawcy/${contractorId}`} className="hover:text-foreground transition-colors min-w-0 shrink truncate max-w-[100px]">{contractorName}</Link>
          <span className="flex-shrink-0">/</span>
          <span className="text-foreground font-medium min-w-0 shrink truncate max-w-[140px]">{projectTitle}</span>
        </nav>
      </div>

      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold flex-1">{projectTitle}</h1>
        <Button variant="outline" size="sm" onClick={() => setInfoOpen(true)} className="gap-2 shrink-0">
          <Info size={15} />
          Informacje o projekcie
        </Button>
      </div>

      <div className="space-y-3">
        {folders.filter((f) => ["rysunki", "wizualizacje", "dokumenty"].includes(f.type)).map((folder) => (
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
                  {!folder.visible && <Badge variant="secondary" className="text-xs">Ukryty</Badge>}
                </div>
                <p className="text-xs text-muted-foreground">{folder._count.files + folder.subfolders.reduce((s, sub) => s + sub._count.files, 0)} plików</p>
              </div>
              <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                {(() => { const u = folderUnreadTotal(folder, unreadCounts); return u > 0 ? <Badge variant="default" className="text-xs">Nieprzeczytane: {u}</Badge> : null; })()}
                {bulkFolderId === folder.id && selectedFileIds.length > 0 && (
                  <Button size="sm" variant="destructive" onClick={() => deleteSelected(folder.id)} className="gap-1.5">
                    <Trash2 size={14} />
                    <span className="hidden sm:inline">Usuń ({selectedFileIds.length})</span>
                    <span className="sm:hidden">{selectedFileIds.length}</span>
                  </Button>
                )}
                <button
                  onClick={() => toggleBulk(folder.id)}
                  title={bulkFolderId === folder.id ? "Wyłącz zaznaczanie" : "Zaznacz pliki"}
                  className={`p-1.5 rounded-lg hover:bg-muted transition-colors ${bulkFolderId === folder.id ? "text-primary" : "text-muted-foreground"}`}
                >
                  <CheckSquare size={16} />
                </button>
                <button
                  onClick={() => toggleVisible(folder)}
                  title={folder.visible ? "Ukryj dla wykonawcy" : "Pokaż wykonawcy"}
                  className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
                >
                  {folder.visible ? <Eye size={16} /> : <EyeOff size={16} />}
                </button>
                <button
                  onClick={() => { setNewFolderParentId(folder.id); setNewFolderName(""); setExpandedFolder(folder.id); }}
                  title="Nowy folder"
                  className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
                >
                  <FolderPlus size={16} />
                </button>
                <button
                  onClick={() => setAddFileDialog(folder.id)}
                  title="Dodaj plik"
                  className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
                >
                  <Plus size={16} />
                </button>
              </div>
              {expandedFolder === folder.id ? <ChevronDown size={16} className="text-muted-foreground shrink-0" /> : <ChevronRight size={16} className="text-muted-foreground shrink-0" />}
            </div>

            {expandedFolder === folder.id && (
              <div className="border-t border-border">
                {/* New folder inline form */}
                {newFolderParentId === folder.id && (
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-muted/20 border-b border-border">
                    <FolderPlus size={14} className="text-muted-foreground shrink-0" />
                    <input
                      autoFocus
                      className="flex-1 text-sm border border-border rounded px-2 py-0.5 bg-background"
                      placeholder="Nazwa folderu…"
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
                {/* Subfolders */}
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
                            title="Przeciągnij, aby zmienić kolejność"
                          >
                            <GripVertical size={14} />
                          </span>
                          <button
                            onClick={() => setExpandedSubfolder(expandedSubfolder === sub.id ? null : sub.id)}
                            className="flex-1 flex items-center gap-2 text-sm font-medium text-left min-w-0"
                          >
                            <span className="truncate">{sub.name}</span>
                            <span className="text-xs text-muted-foreground font-normal shrink-0">{sub._count.files} plików</span>
                          </button>
                          {(() => { const u = subfolderUnreadTotal(sub, unreadCounts); return u > 0 ? <span className="shrink-0 min-w-[18px] h-[18px] px-1 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center leading-none">{u > 9 ? "9+" : u}</span> : null; })()}
                          <button
                            onClick={() => setAddFileSubfolder(sub.id)}
                            className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                            title="Dodaj plik"
                          >
                            <Plus size={13} />
                          </button>
                          {bulkFolderId === sub.id && selectedFileIds.length > 0 && (
                            <Button size="sm" variant="destructive" onClick={() => deleteSelected(sub.id)} className="gap-1 h-7 text-xs">
                              <Trash2 size={12} />
                              Usuń ({selectedFileIds.length})
                            </Button>
                          )}
                          <button
                            onClick={() => toggleBulk(sub.id)}
                            title={bulkFolderId === sub.id ? "Wyłącz zaznaczanie" : "Zaznacz pliki"}
                            className={`p-1 rounded hover:bg-muted transition-colors ${bulkFolderId === sub.id ? "text-primary" : "text-muted-foreground"}`}
                          >
                            <CheckSquare size={14} />
                          </button>
                          <DropdownMenu>
                            <DropdownMenuTrigger render={<button className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground" title="Więcej opcji" />}>
                              <MoreHorizontal size={14} />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                              <DropdownMenuItem onClick={() => { setRenamingId(sub.id); setRenameValue(sub.name); }}>
                                <Pencil size={13} className="mr-2" />
                                Zmień nazwę
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => deleteSubfolder(sub.id, sub.name)} className="text-destructive focus:text-destructive">
                                <Trash2 size={13} className="mr-2" />
                                Usuń folder
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                          <button
                            onClick={() => setExpandedSubfolder(expandedSubfolder === sub.id ? null : sub.id)}
                            className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground"
                            title={expandedSubfolder === sub.id ? "Zwiń" : "Rozwiń"}
                          >
                            {expandedSubfolder === sub.id ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                          </button>
                        </>
                      )}
                    </div>
                    {expandedSubfolder === sub.id && (
                      <div className="divide-y divide-border">
                        {sub.files.length === 0 ? (
                          <p className="px-6 py-3 text-sm text-muted-foreground">Brak plików</p>
                        ) : (
                          sub.files.map((file) => <FileRow key={file.id} file={file} onDelete={() => deleteFile(sub.id, file.id, file.name)} bulkMode={bulkFolderId === sub.id} selected={selectedFileIds.includes(file.id)} onSelect={() => toggleFileSelect(file.id)} unreadCount={unreadCounts[file.id] ?? 0} totalCount={totalPerFile[file.id] ?? 0} onCommentClick={() => openComments(file.id, file.name, file.render?.fileUrl ?? file.fileUrl)} />)
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
                        onAdded={() => { setAddFileSubfolder(null); router.refresh(); }}
                      />
                    )}
                  </div>
                    )}
                  </SortableSubfolderWrapper>
                ))}
                  </SortableContext>
                </DndContext>
                {/* Direct files */}
                {folder.files.length === 0 && folder.subfolders.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-muted-foreground">Brak plików w tym folderze</p>
                ) : folder.files.length > 0 ? (
                  <div className="divide-y divide-border">
                    {folder.files.map((file) => <FileRow key={file.id} file={file} onDelete={() => deleteFile(folder.id, file.id, file.name)} bulkMode={bulkFolderId === folder.id} selected={selectedFileIds.includes(file.id)} onSelect={() => toggleFileSelect(file.id)} unreadCount={unreadCounts[file.id] ?? 0} totalCount={totalPerFile[file.id] ?? 0} onCommentClick={() => openComments(file.id, file.name, file.render?.fileUrl ?? file.fileUrl)} />)}
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
    </div>

    {commentFile && (
      <ContractorFileCommentPanel
        fileId={commentFile.id}
        fileName={commentFile.name}
        thumbnailUrl={commentFile.thumbnailUrl}
        authorName={designerName}
        authorRole="designer"
        onClose={() => setCommentFile(null)}
      />
    )}

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
