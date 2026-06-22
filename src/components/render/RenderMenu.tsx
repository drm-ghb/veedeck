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
import { useT } from "@/lib/i18n";

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
  const t = useT();
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
      toast.success(render.pinned ? t.render.renderUnpinned : t.render.renderPinned);
      router.refresh();
    } else {
      toast.error(t.render.operationError);
    }
  }

  async function handleArchive() {
    const res = await fetch(`/api/renders/${render.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived: true }),
    });
    if (res.ok) {
      toast.success(t.render.renderArchived);
      window.dispatchEvent(new CustomEvent("renderflow:render-removed", { detail: { id: render.id } }));
      router.refresh();
    } else {
      toast.error(t.render.archiveError);
    }
  }

  async function handleDelete() {
    if (!confirm(`${t.render.renderDeleted} "${render.name}"?`)) return;
    const res = await fetch(`/api/renders/${render.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success(t.render.renderDeleted);
      window.dispatchEvent(new CustomEvent("renderflow:render-removed", { detail: { id: render.id } }));
      router.refresh();
    } else {
      toast.error(t.render.deleteError);
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
      toast.success(t.render.titleUpdated);
      setEditOpen(false);
      router.refresh();
    } else {
      toast.error(t.common.saving);
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
            {render.pinned ? t.common.unpin : t.common.pin}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={(e) => { e.preventDefault(); handleDownload(render.id); }}>
            <Download size={14} />
            {t.render.download}
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
            {t.render.editTitle}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={(e) => { e.preventDefault(); setMoveOpen(true); }}>
            <FolderInput size={14} />
            {t.render.move}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleArchive}>
            <Archive size={14} />
            {t.common.archive}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={handleDelete}>
            <Trash2 size={14} />
            {t.common.delete}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={editOpen} onOpenChange={(o) => { if (!saving) setEditOpen(o); }}>
        <DialogContent className="sm:max-w-sm" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>{t.render.editFileTitle}</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5 py-1">
            <Label htmlFor="edit-render-name">{t.render.titleLabel}</Label>
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
              {saving ? t.common.saving : t.common.save}
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
