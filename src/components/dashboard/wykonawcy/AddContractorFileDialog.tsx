"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useUploadThing } from "@/lib/uploadthing-client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Image, Check } from "@/components/ui/icons";

interface Room {
  id: string;
  name: string;
  renders: { id: string; name: string; fileUrl: string; fileType: string }[];
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

export default function AddContractorFileDialog({
  open, onOpenChange, contractorId, assignmentId, folderId, projectId, rooms, onAdded,
}: Props) {
  const [tab, setTab] = useState<"upload" | "renderflow">("upload");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedRenderIds, setSelectedRenderIds] = useState<string[]>([]);
  const [expandedRoom, setExpandedRoom] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { startUpload, isUploading } = useUploadThing("contractorFileUploader");

  function reset() {
    setSelectedFile(null);
    setSelectedRenderIds([]);
    setExpandedRoom(null);
    setTab("upload");
  }

  function toggleRender(renderId: string) {
    setSelectedRenderIds((prev) =>
      prev.includes(renderId) ? prev.filter((id) => id !== renderId) : [...prev, renderId]
    );
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
      const allRenders = rooms.flatMap((r) => r.renders);
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
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Dodaj plik</DialogTitle>
        </DialogHeader>

        <div className="flex gap-1 border border-border rounded-lg p-1 mb-2">
          <button
            onClick={() => setTab("upload")}
            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${tab === "upload" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            Prześlij plik
          </button>
          <button
            onClick={() => setTab("renderflow")}
            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${tab === "renderflow" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            Wybierz z RenderFlow
          </button>
        </div>

        {tab === "upload" ? (
          <div className="space-y-3">
            <label
              className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/40 hover:bg-muted/30 transition-colors"
              onClick={() => document.getElementById("contractor-file-input")?.click()}
            >
              <Upload size={24} className="text-muted-foreground mb-2" />
              {selectedFile ? (
                <span className="text-sm text-foreground font-medium">{selectedFile.name}</span>
              ) : (
                <span className="text-sm text-muted-foreground">Kliknij, aby wybrać plik</span>
              )}
              <input
                id="contractor-file-input"
                type="file"
                className="hidden"
                onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {rooms.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Brak pomieszczeń z renderami w tym projekcie</p>
            ) : (
              rooms.map((room) => (
                <div key={room.id} className="border border-border rounded-lg overflow-hidden">
                  <button
                    onClick={() => setExpandedRoom(expandedRoom === room.id ? null : room.id)}
                    className="flex items-center justify-between w-full px-3 py-2.5 text-sm font-medium hover:bg-muted/50 transition-colors"
                  >
                    <span>{room.name}</span>
                    <span className="text-xs text-muted-foreground">{room.renders.length} renderów</span>
                  </button>
                  {expandedRoom === room.id && (
                    <div className="border-t border-border divide-y divide-border">
                      {room.renders.map((render) => {
                        const selected = selectedRenderIds.includes(render.id);
                        return (
                          <button
                            key={render.id}
                            onClick={() => toggleRender(render.id)}
                            className={`flex items-center gap-3 w-full px-3 py-2 text-left transition-colors ${selected ? "bg-primary/5" : "hover:bg-muted/50"}`}
                          >
                            <div className="w-10 h-10 rounded-md bg-muted overflow-hidden shrink-0 flex items-center justify-center">
                              {render.fileType === "image" ? (
                                <img src={render.fileUrl} alt={render.name} className="w-full h-full object-cover" />
                              ) : (
                                <Image size={18} className="text-muted-foreground" />
                              )}
                            </div>
                            <span className="flex-1 text-sm truncate">{render.name}</span>
                            {selected && <Check size={16} className="text-primary shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

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
