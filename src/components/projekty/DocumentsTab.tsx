"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  FolderIcon,
  FolderOpenIcon,
  FileIcon,
  PlusIcon,
  Trash2Icon,
  PencilIcon,
  GripVerticalIcon,
  UploadIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  SearchIcon,
  XIcon,
  ExternalLinkIcon,
} from "lucide-react";
import { toast } from "sonner";
import { useUploadThing } from "@/lib/uploadthing-client";
import { useT } from "@/lib/i18n";

interface ClientDoc {
  id: string;
  clientId: string;
  folderId: string | null;
  name: string;
  fileUrl: string;
  fileKey: string;
  fileType: string;
  order: number;
  createdAt: string;
}

interface ClientDocFolder {
  id: string;
  clientId: string;
  name: string;
  order: number;
  docs: ClientDoc[];
}

interface DocumentsTabProps {
  clientId: string;
}

// ---- File trigger button (no upload logic — parent handles it) ----
function FilePickerButton({
  label,
  onFiles,
  disabled,
}: {
  label: string;
  onFiles: (files: File[]) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        className={`flex items-center gap-1 text-xs px-2 py-1 rounded border border-dashed border-gray-300 hover:bg-gray-50 transition-colors ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
      >
        <UploadIcon className="w-3 h-3" />
        {label}
      </button>
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          if (files.length) onFiles(files);
          e.target.value = "";
        }}
      />
    </>
  );
}

// ---- Sortable doc row ----
function DocRow({
  doc,
  onRename,
  onDelete,
}: {
  doc: ClientDoc;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: doc.id });
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(doc.name);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const commitRename = () => {
    const trimmed = editName.trim();
    if (trimmed && trimmed !== doc.name) onRename(doc.id, trimmed);
    setEditing(false);
  };

  const ext = doc.name.split(".").pop()?.toLowerCase() ?? "";
  const isImage = ["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 px-3 py-2 rounded hover:bg-gray-50 group"
    >
      <button className="cursor-grab text-gray-300 hover:text-gray-500 touch-none" {...attributes} {...listeners}>
        <GripVerticalIcon className="w-3.5 h-3.5" />
      </button>
      {isImage ? (
        <img src={doc.fileUrl} alt="" className="w-5 h-5 rounded object-cover flex-shrink-0" />
      ) : (
        <FileIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
      )}
      {editing ? (
        <input
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onBlur={commitRename}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitRename();
            if (e.key === "Escape") { setEditName(doc.name); setEditing(false); }
          }}
          className="flex-1 text-sm border-b border-blue-400 outline-none bg-transparent"
          autoFocus
        />
      ) : (
        <span className="flex-1 text-sm truncate">{doc.name}</span>
      )}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="p-1 rounded hover:bg-gray-200">
          <ExternalLinkIcon className="w-3.5 h-3.5 text-gray-500" />
        </a>
        <button
          onClick={() => { setEditing(true); setEditName(doc.name); }}
          className="p-1 rounded hover:bg-gray-200"
        >
          <PencilIcon className="w-3.5 h-3.5 text-gray-500" />
        </button>
        <button onClick={() => onDelete(doc.id)} className="p-1 rounded hover:bg-red-100">
          <Trash2Icon className="w-3.5 h-3.5 text-red-400" />
        </button>
      </div>
    </div>
  );
}

// ---- Sortable folder row ----
function FolderRow({
  folder,
  isOpen,
  onToggle,
  onRename,
  onDelete,
  onPickFiles,
  onDocRename,
  onDocDelete,
  uploading,
}: {
  folder: ClientDocFolder;
  isOpen: boolean;
  onToggle: () => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onPickFiles: (files: File[], folderId: string | null) => void;
  onDocRename: (id: string, name: string) => void;
  onDocDelete: (id: string) => void;
  uploading: boolean;
}) {
  const t = useT();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: folder.id });
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(folder.name);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const commitRename = () => {
    const trimmed = editName.trim();
    if (trimmed && trimmed !== folder.name) onRename(folder.id, trimmed);
    setEditing(false);
  };

  const docIds = folder.docs.map((d) => d.id);

  return (
    <div ref={setNodeRef} style={style} className="mb-1">
      <div
        className="flex items-center gap-2 px-2 py-2 rounded hover:bg-gray-50 group cursor-pointer"
        onClick={onToggle}
      >
        <button
          className="cursor-grab text-gray-300 hover:text-gray-500 touch-none"
          onClick={(e) => e.stopPropagation()}
          {...attributes}
          {...listeners}
        >
          <GripVerticalIcon className="w-3.5 h-3.5" />
        </button>
        <span className="text-gray-400 flex-shrink-0">
          {isOpen ? <ChevronDownIcon className="w-4 h-4" /> : <ChevronRightIcon className="w-4 h-4" />}
        </span>
        {isOpen ? (
          <FolderOpenIcon className="w-4 h-4 text-yellow-500 flex-shrink-0" />
        ) : (
          <FolderIcon className="w-4 h-4 text-yellow-500 flex-shrink-0" />
        )}
        {editing ? (
          <input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={commitRename}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === "Enter") commitRename();
              if (e.key === "Escape") { setEditName(folder.name); setEditing(false); }
            }}
            className="flex-1 text-sm font-medium border-b border-blue-400 outline-none bg-transparent"
            autoFocus
          />
        ) : (
          <span className="flex-1 text-sm font-medium">{folder.name}</span>
        )}
        <span className="text-xs text-gray-400 mr-1">{folder.docs.length}</span>
        <div
          className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          <FilePickerButton
            label={t.documents.addFile}
            disabled={uploading}
            onFiles={(files) => onPickFiles(files, folder.id)}
          />
          <button
            onClick={(e) => { e.stopPropagation(); setEditing(true); setEditName(folder.name); }}
            className="p-1 rounded hover:bg-gray-200"
          >
            <PencilIcon className="w-3.5 h-3.5 text-gray-500" />
          </button>
          <button onClick={() => onDelete(folder.id)} className="p-1 rounded hover:bg-red-100">
            <Trash2Icon className="w-3.5 h-3.5 text-red-400" />
          </button>
        </div>
      </div>
      {isOpen && (
        <div className="ml-6 border-l border-gray-100 pl-2">
          <SortableContext items={docIds} strategy={verticalListSortingStrategy}>
            {folder.docs.map((doc) => (
              <DocRow key={doc.id} doc={doc} onRename={onDocRename} onDelete={onDocDelete} />
            ))}
          </SortableContext>
          {folder.docs.length === 0 && (
            <div className="text-xs text-gray-400 px-3 py-2">{t.documents.noFilesInFolder}</div>
          )}
        </div>
      )}
    </div>
  );
}

// ---- Main component ----
export default function DocumentsTab({ clientId }: DocumentsTabProps) {
  const t = useT();
  const [folders, setFolders] = useState<ClientDocFolder[]>([]);
  const [looseDocs, setLooseDocs] = useState<ClientDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [openFolders, setOpenFolders] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [newFolderName, setNewFolderName] = useState("");
  const [addingFolder, setAddingFolder] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const dragCounterRef = useRef(0);

  const { startUpload } = useUploadThing("noteAttachmentUploader");

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const load = useCallback(async () => {
    if (!clientId) { setLoading(false); return; }
    try {
      const [foldersRes, docsRes] = await Promise.all([
        fetch(`/api/client-docs/folders?clientId=${clientId}`),
        fetch(`/api/client-docs/files?clientId=${clientId}`),
      ]);
      if (!foldersRes.ok || !docsRes.ok) throw new Error();
      const [foldersData, allDocs]: [ClientDocFolder[], ClientDoc[]] = await Promise.all([
        foldersRes.json(),
        docsRes.json(),
      ]);
      setFolders(foldersData);
      setLooseDocs(allDocs.filter((d) => d.folderId === null));
    } catch {
      toast.error(t.documents.loadError);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  // ---- Upload handler (centralized) ----
  // Uses noteAttachmentUploader (maxFileCount:1) — uploads files one by one
  const handleUploadFiles = useCallback(async (files: File[], folderId: string | null) => {
    if (!files.length) return;
    setUploading(true);
    const created: ClientDoc[] = [];
    try {
      for (const file of files) {
        const uploaded = await startUpload([file]);
        if (!uploaded?.[0]) throw new Error(t.documents.noServerResponse);
        const u = uploaded[0];
        const res = await fetch("/api/client-docs/files", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clientId,
            folderId,
            name: file.name,
            fileUrl: u.url,
            fileKey: u.key,
          }),
        });
        if (!res.ok) throw new Error(t.documents.saveError);
        created.push(await res.json());
      }
      if (folderId) {
        setFolders((prev) =>
          prev.map((f) => (f.id === folderId ? { ...f, docs: [...f.docs, ...created] } : f))
        );
      } else {
        setLooseDocs((prev) => [...prev, ...created]);
      }
      toast.success(`${t.documents.addedFile} ${created.length} ${created.length === 1 ? t.render.compareFileSingular : created.length < 5 ? t.render.compareFileFew : t.render.compareFileMany}`);
    } catch (err) {
      if (created.length > 0) {
        // Some files succeeded — update state with what we have
        if (folderId) {
          setFolders((prev) =>
            prev.map((f) => (f.id === folderId ? { ...f, docs: [...f.docs, ...created] } : f))
          );
        } else {
          setLooseDocs((prev) => [...prev, ...created]);
        }
      }
      toast.error(err instanceof Error ? err.message : t.documents.uploadError);
    } finally {
      setUploading(false);
    }
  }, [clientId, startUpload]);

  // ---- Native drag & drop from desktop ----
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes("Files")) return;
    e.preventDefault();
    dragCounterRef.current += 1;
    if (dragCounterRef.current === 1) setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes("Files")) return;
    e.preventDefault();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current === 0) setIsDragOver(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (e.dataTransfer.types.includes("Files")) e.preventDefault();
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes("Files")) return;
    e.preventDefault();
    dragCounterRef.current = 0;
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (!files.length) return;
    await handleUploadFiles(files, null);
  }, [handleUploadFiles]);

  // ---- Folder / doc CRUD ----
  const handleAddFolder = async () => {
    const name = newFolderName.trim();
    if (!name) return;
    try {
      const res = await fetch("/api/client-docs/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, name }),
      });
      if (!res.ok) throw new Error();
      const folder: ClientDocFolder = await res.json();
      setFolders((prev) => [...prev, folder]);
      setOpenFolders((prev) => new Set([...prev, folder.id]));
      setNewFolderName("");
      setAddingFolder(false);
    } catch {
      toast.error(t.documents.folderCreateError);
    }
  };

  const handleRenameFolder = async (id: string, name: string) => {
    try {
      const res = await fetch(`/api/client-docs/folders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error();
      const updated: ClientDocFolder = await res.json();
      setFolders((prev) => prev.map((f) => (f.id === id ? { ...f, name: updated.name } : f)));
    } catch {
      toast.error(t.documents.folderRenameError);
    }
  };

  const handleDeleteFolder = async (id: string) => {
    try {
      const res = await fetch(`/api/client-docs/folders/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      const folder = folders.find((f) => f.id === id);
      if (folder) {
        setLooseDocs((prev) => [...prev, ...folder.docs.map((d) => ({ ...d, folderId: null }))]);
      }
      setFolders((prev) => prev.filter((f) => f.id !== id));
    } catch {
      toast.error(t.documents.folderDeleteError);
    }
  };

  const handleRenameDoc = async (id: string, name: string) => {
    try {
      const res = await fetch(`/api/client-docs/files/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error();
      const updated: ClientDoc = await res.json();
      setFolders((prev) =>
        prev.map((f) => ({
          ...f,
          docs: f.docs.map((d) => (d.id === id ? { ...d, name: updated.name } : d)),
        }))
      );
      setLooseDocs((prev) => prev.map((d) => (d.id === id ? { ...d, name: updated.name } : d)));
    } catch {
      toast.error(t.documents.docRenameError);
    }
  };

  const handleDeleteDoc = async (id: string) => {
    try {
      const res = await fetch(`/api/client-docs/files/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setFolders((prev) =>
        prev.map((f) => ({ ...f, docs: f.docs.filter((d) => d.id !== id) }))
      );
      setLooseDocs((prev) => prev.filter((d) => d.id !== id));
    } catch {
      toast.error(t.documents.docDeleteError);
    }
  };

  // ---- Drag & drop helpers ----
  const findDoc = (id: string): ClientDoc | undefined => {
    for (const f of folders) {
      const d = f.docs.find((d) => d.id === id);
      if (d) return d;
    }
    return looseDocs.find((d) => d.id === id);
  };

  const findFolder = (id: string) => folders.find((f) => f.id === id);

  const handleDragStart = (e: DragStartEvent) => {
    setActiveId(e.active.id as string);
  };

  const handleDragEnd = async (e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over || active.id === over.id) return;

    const activeIsFolder = !!findFolder(active.id as string);
    const overIsFolder = !!findFolder(over.id as string);

    if (activeIsFolder && overIsFolder) {
      const oldIdx = folders.findIndex((f) => f.id === active.id);
      const newIdx = folders.findIndex((f) => f.id === over.id);
      const reordered = arrayMove(folders, oldIdx, newIdx);
      setFolders(reordered);
      await fetch("/api/client-docs/folders/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds: reordered.map((f) => f.id) }),
      });
      return;
    }

    if (!activeIsFolder && overIsFolder) {
      // Drop doc onto folder header → move into folder
      const activeDoc = findDoc(active.id as string);
      if (!activeDoc || activeDoc.folderId === (over.id as string)) return;
      const newFolderId = over.id as string;
      await fetch(`/api/client-docs/files/${activeDoc.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderId: newFolderId }),
      });
      const movedDoc = { ...activeDoc, folderId: newFolderId };
      setFolders((prev) =>
        prev.map((f) => ({
          ...f,
          docs:
            f.id === activeDoc.folderId
              ? f.docs.filter((d) => d.id !== activeDoc.id)
              : f.id === newFolderId
                ? [...f.docs, movedDoc]
                : f.docs,
        }))
      );
      if (activeDoc.folderId === null) setLooseDocs((prev) => prev.filter((d) => d.id !== activeDoc.id));
      setOpenFolders((prev) => new Set([...prev, newFolderId]));
      return;
    }

    if (!activeIsFolder && !overIsFolder) {
      const activeDoc = findDoc(active.id as string);
      const overDoc = findDoc(over.id as string);
      if (!activeDoc || !overDoc) return;

      if (activeDoc.folderId === overDoc.folderId) {
        if (activeDoc.folderId === null) {
          const oldIdx = looseDocs.findIndex((d) => d.id === active.id);
          const newIdx = looseDocs.findIndex((d) => d.id === over.id);
          const reordered = arrayMove(looseDocs, oldIdx, newIdx);
          setLooseDocs(reordered);
          await fetch("/api/client-docs/files/reorder", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderedIds: reordered.map((d) => d.id) }),
          });
        } else {
          const folder = folders.find((f) => f.id === activeDoc.folderId);
          if (!folder) return;
          const oldIdx = folder.docs.findIndex((d) => d.id === active.id);
          const newIdx = folder.docs.findIndex((d) => d.id === over.id);
          const reordered = arrayMove(folder.docs, oldIdx, newIdx);
          setFolders((prev) =>
            prev.map((f) => (f.id === activeDoc.folderId ? { ...f, docs: reordered } : f))
          );
          await fetch("/api/client-docs/files/reorder", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderedIds: reordered.map((d) => d.id) }),
          });
        }
      } else {
        const newFolderId = overDoc.folderId;
        await fetch(`/api/client-docs/files/${activeDoc.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ folderId: newFolderId }),
        });
        const movedDoc = { ...activeDoc, folderId: newFolderId };
        setFolders((prev) =>
          prev.map((f) => ({
            ...f,
            docs:
              f.id === activeDoc.folderId
                ? f.docs.filter((d) => d.id !== activeDoc.id)
                : f.id === newFolderId
                  ? [...f.docs, movedDoc]
                  : f.docs,
          }))
        );
        if (activeDoc.folderId === null) setLooseDocs((prev) => prev.filter((d) => d.id !== activeDoc.id));
        if (newFolderId === null) setLooseDocs((prev) => [...prev, movedDoc]);
      }
    }
  };

  const toggleFolder = (id: string) => {
    setOpenFolders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const filterDoc = (doc: ClientDoc) => !search || doc.name.toLowerCase().includes(search.toLowerCase());
  const filterFolder = (folder: ClientDocFolder) =>
    !search || folder.name.toLowerCase().includes(search.toLowerCase()) || folder.docs.some(filterDoc);

  const visibleFolders = folders.filter(filterFolder);
  const visibleLoose = looseDocs.filter(filterDoc);
  const folderIds = folders.map((f) => f.id);
  const looseDocIds = looseDocs.map((d) => d.id);
  const activeDoc = activeId ? findDoc(activeId) : null;
  const activeFolder = activeId ? findFolder(activeId) : null;

  if (loading) {
    return <div className="flex items-center justify-center py-16 text-sm text-gray-400">{t.documents.loading}</div>;
  }

  return (
    <div
      className="relative space-y-4"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Desktop drag & drop overlay */}
      {(isDragOver || uploading) && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-primary/10 backdrop-blur-[1px] pointer-events-none rounded-xl">
          <div className="flex flex-col items-center gap-3 px-10 py-8 rounded-2xl border-2 border-dashed border-primary bg-background/80 shadow-lg">
            <UploadIcon className="w-8 h-8 text-primary" />
            <p className="text-sm font-semibold text-primary">
              {uploading ? t.documents.uploadingFiles : t.documents.dropFilesHere}
            </p>
            {!uploading && (
              <p className="text-xs text-muted-foreground">{t.documents.filesAddedWithoutFolder}</p>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[160px]">
          <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.documents.searchPlaceholder}
            className="w-full pl-8 pr-7 py-1.5 text-sm border rounded-md outline-none focus:ring-1 focus:ring-blue-400"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2">
              <XIcon className="w-3.5 h-3.5 text-gray-400" />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => setAddingFolder(true)}
          className="flex items-center gap-1 text-sm px-3 py-1.5 rounded-md border hover:bg-gray-50 transition-colors"
        >
          <PlusIcon className="w-3.5 h-3.5" />
          {t.documents.newFolder}
        </button>
        <FilePickerButton
          label={uploading ? t.documents.uploading : t.documents.addFile}
          disabled={uploading}
          onFiles={(files) => handleUploadFiles(files, null)}
        />
      </div>

      {/* Add folder input */}
      {addingFolder && (
        <div className="flex items-center gap-2">
          <FolderIcon className="w-4 h-4 text-yellow-500 flex-shrink-0" />
          <input
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddFolder();
              if (e.key === "Escape") { setAddingFolder(false); setNewFolderName(""); }
            }}
            placeholder={t.documents.folderNamePlaceholder}
            className="flex-1 text-sm border-b border-blue-400 outline-none py-0.5"
            autoFocus
          />
          <button onClick={handleAddFolder} className="text-sm text-blue-600 hover:underline">{t.documents.save}</button>
          <button
            onClick={() => { setAddingFolder(false); setNewFolderName(""); }}
            className="text-sm text-gray-400 hover:text-gray-600"
          >
            {t.documents.cancel}
          </button>
        </div>
      )}

      {/* Content */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={folderIds} strategy={verticalListSortingStrategy}>
          {visibleFolders.map((folder) => (
            <FolderRow
              key={folder.id}
              folder={search ? { ...folder, docs: folder.docs.filter(filterDoc) } : folder}
              isOpen={openFolders.has(folder.id) || !!search}
              onToggle={() => toggleFolder(folder.id)}
              onRename={handleRenameFolder}
              onDelete={handleDeleteFolder}
              onPickFiles={handleUploadFiles}
              onDocRename={handleRenameDoc}
              onDocDelete={handleDeleteDoc}
              uploading={uploading}
            />
          ))}
        </SortableContext>

        {visibleLoose.length > 0 && (
          <div className={folders.length > 0 ? "mt-3 border-t pt-3" : ""}>
            {folders.length > 0 && (
              <div className="text-xs text-gray-400 px-3 mb-1">{t.documents.filesWithoutFolder}</div>
            )}
            <SortableContext items={looseDocIds} strategy={verticalListSortingStrategy}>
              {visibleLoose.map((doc) => (
                <DocRow key={doc.id} doc={doc} onRename={handleRenameDoc} onDelete={handleDeleteDoc} />
              ))}
            </SortableContext>
          </div>
        )}

        <DragOverlay>
          {activeDoc && (
            <div className="flex items-center gap-2 px-3 py-2 rounded bg-white shadow-lg border text-sm">
              <FileIcon className="w-4 h-4 text-gray-400" />
              <span>{activeDoc.name}</span>
            </div>
          )}
          {activeFolder && (
            <div className="flex items-center gap-2 px-3 py-2 rounded bg-white shadow-lg border text-sm font-medium">
              <FolderIcon className="w-4 h-4 text-yellow-500" />
              <span>{activeFolder.name}</span>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Empty state */}
      {folders.length === 0 && looseDocs.length === 0 && !addingFolder && (
        <div className="text-center py-12 text-gray-400">
          <UploadIcon className="w-10 h-10 mx-auto mb-3 text-gray-200" />
          <p className="text-sm">{t.documents.empty}</p>
          <p className="text-xs mt-1">{t.documents.emptyHint}</p>
        </div>
      )}

      {/* Drop hint at bottom when not empty */}
      {(folders.length > 0 || looseDocs.length > 0) && !isDragOver && !uploading && (
        <p className="text-xs text-gray-300 text-center pt-2">
          {t.documents.dropHint}
        </p>
      )}
    </div>
  );
}
