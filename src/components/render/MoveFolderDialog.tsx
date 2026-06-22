"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Home, Loader2 } from "@/components/ui/icons";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";

interface Room {
  id: string;
  name: string;
}

interface MoveFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folder: { id: string; name: string };
  projectId: string;
  currentRoomId: string;
}

export default function MoveFolderDialog({
  open,
  onOpenChange,
  folder,
  projectId,
  currentRoomId,
}: MoveFolderDialogProps) {
  const router = useRouter();
  const t = useT();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setSelectedRoomId(null);
    setLoading(true);
    fetch(`/api/rooms?projectId=${projectId}`)
      .then((r) => r.json())
      .then((data) => setRooms(Array.isArray(data) ? data : []))
      .catch(() => toast.error(t.render.fetchRoomsError))
      .finally(() => setLoading(false));
  }, [open, projectId]);

  async function handleMove() {
    if (!selectedRoomId || selectedRoomId === currentRoomId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/folders/${folder.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId: selectedRoomId }),
      });
      if (!res.ok) throw new Error();
      toast.success(t.render.folderMoved);
      onOpenChange(false);
      router.refresh();
    } catch {
      toast.error(t.render.moveFolderError);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!saving) onOpenChange(o); }}>
      <DialogContent className="sm:max-w-sm" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>{t.render.moveFolder}</DialogTitle>
        </DialogHeader>

        <p className="text-xs text-muted-foreground -mt-1 mb-1">
          {t.render.selectTargetRoomForFolder} <span className="font-medium text-foreground">{folder.name}</span>.
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={20} className="animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="max-h-64 overflow-y-auto space-y-1 border border-border rounded-lg p-1.5">
            {rooms.map((room) => {
              const isCurrent = room.id === currentRoomId;
              const isSelected = selectedRoomId === room.id;
              return (
                <button
                  key={room.id}
                  type="button"
                  disabled={isCurrent}
                  onClick={() => setSelectedRoomId(room.id)}
                  className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-sm transition-colors text-left ${
                    isCurrent
                      ? "opacity-40 cursor-not-allowed"
                      : isSelected
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  }`}
                >
                  <Home size={14} className="flex-shrink-0" />
                  <span className="flex-1 font-medium truncate">{room.name}</span>
                  {isCurrent && <span className="text-[10px] opacity-60">{t.render.currentLocation}</span>}
                </button>
              );
            })}
            {rooms.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">{t.render.noRooms}</p>
            )}
          </div>
        )}

        <DialogFooter showCloseButton>
          <Button
            onClick={handleMove}
            disabled={saving || !selectedRoomId || selectedRoomId === currentRoomId}
          >
            {saving ? (
              <><Loader2 size={14} className="animate-spin" /> {t.render.moving}</>
            ) : selectedRoomId ? (
              `${t.render.moveTo} ${rooms.find((r) => r.id === selectedRoomId)?.name}`
            ) : (
              t.render.move
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
