"use client";

import { useState } from "react";
import { MoreHorizontal, Archive, Trash2, Pencil, Pin, PinOff, FolderInput, Download } from "@/components/ui/icons";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import MoveRenderDialog from "./MoveRenderDialog";

interface RenderMenuProps {
  render: { id: string; name: string; pinned?: boolean };
  projectId: string;
  currentRoomId: string;
  currentFolderId?: string | null;
}

function handleDownload(renderId: string) {
  window.location.href = `/api/renders/${renderId}/download`;
}

export default function RenderMenu({ render, projectId, currentRoomId, currentFolderId = null }: RenderMenuProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);

  async function handlePin() {
    const res = await fetch(`/api/renders/${render.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pinned: !render.pinned }),
    });
    if (res.ok) {
      toast.success(render.pinned ? "Odpięto render" : "Render przypięty");
      router.refresh();
    } else {
      toast.error("Błąd operacji");
    }
  }

  async function handleArchive() {
    const res = await fetch(`/api/renders/${render.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived: true }),
    });
    if (res.ok) {
      toast.success("Render zarchiwizowany");
      window.dispatchEvent(new CustomEvent("renderflow:render-removed", { detail: { id: render.id } }));
      router.refresh();
    } else {
      toast.error("Błąd archiwizacji");
    }
  }

  async function handleDelete() {
    if (!confirm(`Usunąć render "${render.name}"?`)) return;
    const res = await fetch(`/api/renders/${render.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Render usunięty");
      window.dispatchEvent(new CustomEvent("renderflow:render-removed", { detail: { id: render.id } }));
      router.refresh();
    } else {
      toast.error("Błąd usuwania");
    }
  }

  async function handleSaveName() {
    if (!editName.trim()) return;
    setSaving(true);
    const res = await fetch(`/api/renders/${render.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName.trim() }),
    });
    setSaving(false);
    if (res.ok) {
      toast.success("Tytuł zaktualizowany");
      setEditOpen(false);
      router.refresh();
    } else {
      toast.error("Błąd zapisu");
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          onClick={(e) => e.preventDefault()}
        >
          <MoreHorizontal size={16} />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={(e) => { e.preventDefault(); handlePin(); }}>
            {render.pinned ? <PinOff size={14} /> : <Pin size={14} />}
            {render.pinned ? "Odepnij" : "Przypnij"}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={(e) => { e.preventDefault(); handleDownload(render.id); }}>
            <Download size={14} />
            Pobierz
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={(e) => {
              e.preventDefault();
              setEditName(render.name);
              setEditOpen(true);
            }}
          >
            <Pencil size={14} />
            Edytuj tytuł
          </DropdownMenuItem>
          <DropdownMenuItem onClick={(e) => { e.preventDefault(); setMoveOpen(true); }}>
            <FolderInput size={14} />
            Przenieś
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleArchive}>
            <Archive size={14} />
            Archiwizuj
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={handleDelete}>
            <Trash2 size={14} />
            Usuń
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={editOpen} onOpenChange={(o) => { if (!saving) setEditOpen(o); }}>
        <DialogContent className="sm:max-w-sm" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Edytuj tytuł pliku</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5 py-1">
            <Label htmlFor="edit-render-name">Tytuł</Label>
            <Input
              id="edit-render-name"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              disabled={saving}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveName();
                if (e.key === "Escape") setEditOpen(false);
              }}
            />
          </div>
          <DialogFooter showCloseButton>
            <Button onClick={handleSaveName} disabled={saving || !editName.trim()}>
              {saving ? "Zapisywanie..." : "Zapisz"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <MoveRenderDialog
        open={moveOpen}
        onOpenChange={setMoveOpen}
        render={{ id: render.id, name: render.name }}
        projectId={projectId}
        currentRoomId={currentRoomId}
        currentFolderId={currentFolderId}
      />
    </>
  );
}
