"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Folder, Home, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface FolderItem {
  id: string;
  name: string;
}

interface Room {
  id: string;
  name: string;
  folders: FolderItem[];
}

interface BulkMoveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ids: string[];
  projectId: string;
  onSuccess: () => void;
}

type Target =
  | { type: "room"; roomId: string; roomName: string }
  | { type: "folder"; roomId: string; folderId: string; folderName: string; roomName: string };

export default function BulkMoveDialog({ open, onOpenChange, ids, projectId, onSuccess }: BulkMoveDialogProps) {
  const router = useRouter();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<Target | null>(null);

  useEffect(() => {
    if (!open) return;
    setSelected(null);
    setLoading(true);
    fetch(`/api/rooms?projectId=${projectId}`)
      .then((r) => r.json())
      .then((data) => setRooms(Array.isArray(data) ? data : []))
      .catch(() => toast.error("Błąd pobierania pomieszczeń"))
      .finally(() => setLoading(false));
  }, [open, projectId]);

  async function handleMove() {
    if (!selected) return;
    setSaving(true);
    try {
      const body =
        selected.type === "folder"
          ? { roomId: selected.roomId, folderId: selected.folderId }
          : { roomId: selected.roomId, folderId: null };

      const res = await fetch("/api/renders/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, action: "move", ...body }),
      });
      if (!res.ok) throw new Error();
      toast.success(`Przeniesiono ${ids.length} ${ids.length === 1 ? "plik" : ids.length < 5 ? "pliki" : "plików"}`);
      onOpenChange(false);
      onSuccess();
      router.refresh();
    } catch {
      toast.error("Błąd przenoszenia");
    } finally {
      setSaving(false);
    }
  }

  const selectedLabel = selected
    ? selected.type === "folder"
      ? `${selected.roomName} / ${selected.folderName}`
      : selected.roomName
    : null;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!saving) onOpenChange(o); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Przenieś {ids.length} {ids.length === 1 ? "plik" : ids.length < 5 ? "pliki" : "plików"}</DialogTitle>
        </DialogHeader>

        <p className="text-xs text-muted-foreground -mt-1 mb-1">
          Wybierz pomieszczenie lub folder docelowy.
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={20} className="animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="max-h-64 overflow-y-auto space-y-1 border border-border rounded-lg p-1.5">
            {rooms.map((room) => {
              const roomTarget: Target = { type: "room", roomId: room.id, roomName: room.name };
              const isSelected = selected?.type === "room" && selected.roomId === room.id;
              return (
                <div key={room.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(roomTarget)}
                    className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-sm transition-colors text-left ${
                      isSelected ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                    }`}
                  >
                    <Home size={14} className="flex-shrink-0" />
                    <span className="flex-1 font-medium truncate">{room.name}</span>
                  </button>
                  {room.folders.map((folder) => {
                    const folderTarget: Target = {
                      type: "folder",
                      roomId: room.id,
                      folderId: folder.id,
                      folderName: folder.name,
                      roomName: room.name,
                    };
                    const isFolderSelected = selected?.type === "folder" && selected.folderId === folder.id;
                    return (
                      <button
                        key={folder.id}
                        type="button"
                        onClick={() => setSelected(folderTarget)}
                        className={`w-full flex items-center gap-2 pl-7 pr-2.5 py-1.5 rounded-md text-sm transition-colors text-left ${
                          isFolderSelected ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                        }`}
                      >
                        <ChevronRight size={11} className="flex-shrink-0 opacity-40" />
                        <Folder size={13} className="flex-shrink-0" />
                        <span className="flex-1 truncate">{folder.name}</span>
                      </button>
                    );
                  })}
                </div>
              );
            })}
            {rooms.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Brak pomieszczeń</p>
            )}
          </div>
        )}

        <DialogFooter showCloseButton>
          <Button onClick={handleMove} disabled={saving || !selected}>
            {saving ? (
              <><Loader2 size={14} className="animate-spin" /> Przenoszenie…</>
            ) : selectedLabel ? (
              `Przenieś do: ${selectedLabel}`
            ) : (
              "Przenieś"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
