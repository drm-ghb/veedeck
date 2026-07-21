"use client";

import { useState } from "react";
import { MoreHorizontal, Pencil, Trash2, Pin, PinOff, Archive, FolderInput, Download } from "@/components/ui/icons";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import MoveFolderDialog from "./MoveFolderDialog";
import { useT } from "@/lib/i18n";
import { useIsTrialExpired } from "@/lib/trial-context";

interface FolderMenuProps {
  folder: { id: string; name: string; pinned?: boolean; archived?: boolean };
  projectId: string;
  currentRoomId: string;
}

export default function FolderMenu({ folder, projectId, currentRoomId }: FolderMenuProps) {
  const router = useRouter();
  const t = useT();
  const expired = useIsTrialExpired();
  const [renameOpen, setRenameOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [name, setName] = useState(folder.name);
  const [loading, setLoading] = useState(false);

  async function handlePin() {
    const res = await fetch(`/api/folders/${folder.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pinned: !folder.pinned }),
    });
    if (res.ok) {
      toast.success(folder.pinned ? t.render.folderUnpinned : t.render.folderPinned);
      router.refresh();
    } else {
      toast.error(t.render.operationError);
    }
  }

  async function handleRename() {
    if (!name.trim()) return;
    setLoading(true);
    const res = await fetch(`/api/folders/${folder.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });
    setLoading(false);
    if (res.ok) {
      toast.success(t.render.folderRenamed);
      setRenameOpen(false);
      router.refresh();
    } else {
      toast.error(t.render.renameError);
    }
  }

  async function handleArchive() {
    const res = await fetch(`/api/folders/${folder.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived: true }),
    });
    if (res.ok) {
      toast.success(t.render.folderArchived);
      window.dispatchEvent(new CustomEvent("renderflow:folder-removed", { detail: { id: folder.id } }));
      router.refresh();
    } else {
      toast.error(t.render.folderArchiveError);
    }
  }

  async function handleDelete() {
    if (!confirm(`${t.render.deleteFolder} "${folder.name}"?`)) return;
    const res = await fetch(`/api/folders/${folder.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success(t.render.folderDeleted);
      window.dispatchEvent(new CustomEvent("renderflow:folder-removed", { detail: { id: folder.id } }));
      router.refresh();
    } else {
      toast.error(t.render.deleteFolderError);
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-white/80 transition-colors"
          onClick={(e) => e.preventDefault()}
        >
          <MoreHorizontal size={16} />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem disabled={expired} title={expired ? "Dostępne w płatnym planie" : undefined} onClick={handlePin}>
            {folder.pinned ? <PinOff size={14} /> : <Pin size={14} />}
            {folder.pinned ? t.common.unpin : t.common.pin}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => { window.location.href = `/api/folders/${folder.id}/download`; }}>
            <Download size={14} />
            {t.render.download}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled={expired} title={expired ? "Dostępne w płatnym planie" : undefined} onClick={() => { setName(folder.name); setRenameOpen(true); }}>
            <Pencil size={14} />
            {t.render.rename}
          </DropdownMenuItem>
          <DropdownMenuItem disabled={expired} title={expired ? "Dostępne w płatnym planie" : undefined} onClick={(e) => { e.preventDefault(); setMoveOpen(true); }}>
            <FolderInput size={14} />
            {t.render.move}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled={expired} title={expired ? "Dostępne w płatnym planie" : undefined} onClick={handleArchive}>
            <Archive size={14} />
            {t.common.archive}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" disabled={expired} title={expired ? "Dostępne w płatnym planie" : undefined} onClick={handleDelete}>
            <Trash2 size={14} />
            {t.render.deleteFolder}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={renameOpen} onOpenChange={(v) => { if (!loading) setRenameOpen(v); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t.render.renameFolder}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
              autoFocus
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleRename(); } }}
            />
            <Button onClick={handleRename} disabled={loading || !name.trim()} className="w-full">
              {loading ? t.common.saving : t.common.save}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <MoveFolderDialog
        open={moveOpen}
        onOpenChange={setMoveOpen}
        folder={{ id: folder.id, name: folder.name }}
        projectId={projectId}
        currentRoomId={currentRoomId}
      />
    </>
  );
}
