"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useUploadThing } from "@/lib/uploadthing-client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Image, Check, FileText, FolderPlus, ChevronRight, ChevronDown } from "@/components/ui/icons";

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
  renders: RenderItem[]; // renders directly on room (no folder)
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contractorId: string;
  assignmentId: string;
  folderId: string;
  projectId: string;
  rooms: Room[];
  onAdded: () => void;
}

function RenderThumbnail({ render, selected, onToggle }: { render: RenderItem; selected: boolean; onToggle: (id: string) => void }) {
  return (
    <button
      onClick={() => onToggle(render.id)}
      className={`relative flex flex-col items-center gap-1.5 rounded-lg overflow-hidden border-2 transition-all ${selected ? "border-primary" : "border-transparent hover:border-border"}`}
    >
      <div className="w-full aspect-video bg-muted flex items-center justify-center overflow-hidden">
        {render.fileType === "image" ? (
          <img src={render.fileUrl} alt={render.name} className="w-full h-full object-cover" />
        ) : render.fileType === "pdf" ? (
          <iframe
            src={`${render.fileUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
            className="w-full h-full pointer-events-none"
            title={render.name}
          />
        ) : (
          <Image size={32} className="text-muted-foreground" />
        )}
      </div>
      <span className="w-full text-xs text-center truncate px-1 pb-1">{render.name}</span>
      {selected && (
        <div className="absolute top-1.5 right-1.5 bg-primary rounded-full p-0.5">
          <Check size={12} className="text-primary-foreground" />
        </div>
      )}
    </button>
  );
}

export default function AddContractorFileDialog({
  open, onOpenChange, contractorId, assignmentId, folderId, projectId, rooms, onAdded,
}: Props) {
  const [tab, setTab] = useState<"upload" | "renderflow">("renderflow");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedRenderIds, setSelectedRenderIds] = useState<string[]>([]);
  const [expandedRoom, setExpandedRoom] = useState<string | null>(null);
  const [expandedFolder, setExpandedFolder] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const { startUpload, isUploading } = useUploadThing("contractorFileUploader");

  useEffect(() => {
    if (open && rooms.length > 0 && expandedRoom === null) {
      setExpandedRoom(rooms[0].id);
    }
  }, [open]);

  function allRendersInRoom(room: Room): RenderItem[] {
    return [...room.renders, ...room.folders.flatMap((f) => f.renders)];
  }

  function reset() {
    setSelectedFile(null);
    setSelectedRenderIds([]);
    setExpandedRoom(null);
    setExpandedFolder(null);
    setTab("renderflow");
  }

  function switchTab(t: "upload" | "renderflow") {
    setTab(t);
    if (t === "renderflow" && expandedRoom === null && rooms.length > 0) {
      setExpandedRoom(rooms[0].id);
    }
  }

  function toggleRender(renderId: string) {
    setSelectedRenderIds((prev) =>
      prev.includes(renderId) ? prev.filter((id) => id !== renderId) : [...prev, renderId]
    );
  }

  function toggleAllInFolder(folder: ProjectFolder) {
    const ids = folder.renders.map((r) => r.id);
    const allSelected = ids.every((id) => selectedRenderIds.includes(id));
    if (allSelected) {
      setSelectedRenderIds((prev) => prev.filter((id) => !ids.includes(id)));
    } else {
      setSelectedRenderIds((prev) => [...new Set([...prev, ...ids])]);
    }
  }

  async function addFolderFromProjectFolder(name: string, renders: RenderItem[]) {
    if (renders.length === 0) {
      toast.error("Ten folder nie ma plików");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `/api/contractors/${contractorId}/assignments/${assignmentId}/folders/${folderId}/subfolders`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            renders: renders.map((r) => ({ renderId: r.id, name: r.name, fileType: r.fileType })),
          }),
        }
      );
      if (!res.ok) {
        toast.error("Błąd podczas tworzenia folderu");
        return;
      }
      toast.success(`Folder "${name}" dodany`);
      onOpenChange(false);
      reset();
      onAdded();
    } finally {
      setLoading(false);
    }
  }

  async function addFolderFromRoom(room: Room) {
    // Create one subfolder per ProjectFlow folder in the room
    const foldersToCreate = room.folders.filter((f) => f.renders.length > 0);
    if (foldersToCreate.length === 0 && room.renders.length === 0) {
      toast.error("Ten pokój nie ma żadnych plików");
      return;
    }
    setLoading(true);
    try {
      // One subfolder per ProjectFlow folder
      for (const f of foldersToCreate) {
        await fetch(
          `/api/contractors/${contractorId}/assignments/${assignmentId}/folders/${folderId}/subfolders`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: f.name,
              renders: f.renders.map((r) => ({ renderId: r.id, name: r.name, fileType: r.fileType })),
            }),
          }
        );
      }
      // Direct renders on room (no folder) → one subfolder named after the room
      if (room.renders.length > 0) {
        await fetch(
          `/api/contractors/${contractorId}/assignments/${assignmentId}/folders/${folderId}/subfolders`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: room.name,
              renders: room.renders.map((r) => ({ renderId: r.id, name: r.name, fileType: r.fileType })),
            }),
          }
        );
      }
      const total = foldersToCreate.length + (room.renders.length > 0 ? 1 : 0);
      toast.success(`Dodano ${total} ${total === 1 ? "folder" : "foldery"}`);
      onOpenChange(false);
      reset();
      onAdded();
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload() {
    if (!selectedFile) {
      toast.error("Wybierz plik do przesłania");
      return;
    }
    setLoading(true);
    try {
      const uploaded = await startUpload([selectedFile]);
      if (!uploaded?.[0]) {
        toast.error("Błąd podczas przesyłania pliku");
        return;
      }
      const { url, key, name } = uploaded[0] as { url: string; key: string; name: string };
      const ext = name.split(".").pop()?.toLowerCase() ?? "";
      const fileType = ["pdf"].includes(ext) ? "pdf" : ["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext) ? "image" : "file";

      const res = await fetch(`/api/contractors/${contractorId}/assignments/${assignmentId}/folders/${folderId}/files`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, fileUrl: url, fileKey: key, fileType }),
      });
      if (!res.ok) {
        toast.error("Błąd podczas dodawania pliku");
        return;
      }
      toast.success("Plik dodany");
      onOpenChange(false);
      reset();
      onAdded();
    } finally {
      setLoading(false);
    }
  }

  async function handleRenderflowAdd() {
    if (selectedRenderIds.length === 0) {
      toast.error("Wybierz co najmniej jeden render");
      return;
    }
    setLoading(true);
    try {
      const allRenders = rooms.flatMap((r) => [...r.renders, ...r.folders.flatMap((f) => f.renders)]);
      await Promise.all(
        selectedRenderIds.map(async (renderId) => {
          const render = allRenders.find((r) => r.id === renderId);
          if (!render) return;
          await fetch(`/api/contractors/${contractorId}/assignments/${assignmentId}/folders/${folderId}/files`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ renderId, name: render.name, fileType: render.fileType }),
          });
        })
      );
      toast.success(`Dodano ${selectedRenderIds.length} ${selectedRenderIds.length === 1 ? "render" : "renderów"}`);
      onOpenChange(false);
      reset();
      onAdded();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[64rem] sm:max-w-[64rem]">
        <DialogHeader>
          <DialogTitle>Dodaj plik</DialogTitle>
        </DialogHeader>

        <div className="flex gap-1 border border-border rounded-lg p-1 mb-2">
          <button
            onClick={() => switchTab("upload")}
            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${tab === "upload" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            Prześlij plik
          </button>
          <button
            onClick={() => switchTab("renderflow")}
            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${tab === "renderflow" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            Wybierz z ProjectFlow
          </button>
        </div>

        <div className="h-[60vh] flex flex-col">
        {tab === "upload" ? (
          <div className="flex flex-col flex-1">
            <div
              className={`flex flex-col items-center justify-center w-full flex-1 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 hover:bg-muted/30"}`}
              onClick={() => document.getElementById("contractor-file-input")?.click()}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragEnter={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                const file = e.dataTransfer.files?.[0];
                if (file) setSelectedFile(file);
              }}
            >
              <Upload size={24} className={`mb-2 ${isDragging ? "text-primary" : "text-muted-foreground"}`} />
              {selectedFile ? (
                <span className="text-sm text-foreground font-medium">{selectedFile.name}</span>
              ) : (
                <span className="text-sm text-muted-foreground">{isDragging ? "Upuść plik tutaj" : "Kliknij lub przeciągnij plik tutaj"}</span>
              )}
              <input
                id="contractor-file-input"
                type="file"
                className="hidden"
                onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-2 flex-1 overflow-y-auto">
            {rooms.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Brak pomieszczeń w tym projekcie</p>
            ) : (
              rooms.map((room) => {
                const roomRenders = allRendersInRoom(room);
                const totalCount = roomRenders.length;
                if (totalCount === 0) return null;
                return (
                  <div key={room.id} className="border border-border rounded-lg overflow-hidden">
                    {/* Room header */}
                    <div className="flex items-center px-3 py-2.5 hover:bg-muted/50 transition-colors gap-2">
                      <button
                        onClick={() => setExpandedRoom(expandedRoom === room.id ? null : room.id)}
                        className="flex-1 flex items-center gap-2 text-sm font-semibold text-left"
                      >
                        {expandedRoom === room.id ? <ChevronDown size={15} className="flex-shrink-0" /> : <ChevronRight size={15} className="flex-shrink-0" />}
                        <span>{room.name}</span>
                        <span className="text-xs text-muted-foreground font-normal">{totalCount} plików</span>
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); addFolderFromRoom(room); }}
                        className="flex items-center gap-1 text-xs border border-border rounded px-2 py-0.5 hover:bg-muted transition-colors shrink-0"
                        title="Dodaj cały pokój jako folder"
                      >
                        <FolderPlus size={12} />
                        Dodaj folder
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); const ids = roomRenders.map((r) => r.id); const allSel = ids.every((id) => selectedRenderIds.includes(id)); setSelectedRenderIds(allSel ? selectedRenderIds.filter((id) => !ids.includes(id)) : [...new Set([...selectedRenderIds, ...ids])]); }}
                        className="text-xs border border-border rounded px-2 py-0.5 hover:bg-muted transition-colors shrink-0"
                      >
                        {roomRenders.every((r) => selectedRenderIds.includes(r.id)) ? "Odznacz" : "Zaznacz wszystkie"}
                      </button>
                    </div>

                    {expandedRoom === room.id && (
                      <div className="border-t border-border divide-y divide-border">
                        {/* Folders */}
                        {room.folders.filter((f) => f.renders.length > 0).map((folder) => (
                          <div key={folder.id}>
                            <div className="flex items-center px-4 py-2 bg-muted/30 gap-2">
                              <button
                                onClick={() => setExpandedFolder(expandedFolder === folder.id ? null : folder.id)}
                                className="flex-1 flex items-center gap-2 text-sm font-medium text-left"
                              >
                                {expandedFolder === folder.id ? <ChevronDown size={14} className="flex-shrink-0" /> : <ChevronRight size={14} className="flex-shrink-0" />}
                                <span>{folder.name}</span>
                                <span className="text-xs text-muted-foreground font-normal">{folder.renders.length} plików</span>
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); addFolderFromProjectFolder(folder.name, folder.renders); }}
                                className="flex items-center gap-1 text-xs border border-border rounded px-2 py-0.5 hover:bg-muted transition-colors shrink-0"
                                title="Dodaj cały folder"
                              >
                                <FolderPlus size={12} />
                                Dodaj folder
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); toggleAllInFolder(folder); }}
                                className="text-xs border border-border rounded px-2 py-0.5 hover:bg-muted transition-colors shrink-0"
                              >
                                {folder.renders.every((r) => selectedRenderIds.includes(r.id)) ? "Odznacz" : "Zaznacz wszystkie"}
                              </button>
                            </div>
                            {expandedFolder === folder.id && (
                              <div className="p-3 grid grid-cols-3 gap-3">
                                {folder.renders.map((render) => (
                                  <RenderThumbnail
                                    key={render.id}
                                    render={render}
                                    selected={selectedRenderIds.includes(render.id)}
                                    onToggle={toggleRender}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                        {/* Direct renders (no folder) */}
                        {room.renders.length > 0 && (
                          <div className="p-3 grid grid-cols-3 gap-3">
                            {room.renders.map((render) => (
                              <RenderThumbnail
                                key={render.id}
                                render={render}
                                selected={selectedRenderIds.includes(render.id)}
                                onToggle={toggleRender}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { onOpenChange(false); reset(); }}>Anuluj</Button>
          <Button
            onClick={tab === "upload" ? handleUpload : handleRenderflowAdd}
            disabled={loading || isUploading || (tab === "upload" ? !selectedFile : selectedRenderIds.length === 0)}
          >
            {loading || isUploading ? "Dodawanie…" : tab === "renderflow" && selectedRenderIds.length > 0 ? `Dodaj zaznaczone (${selectedRenderIds.length})` : "Dodaj"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
