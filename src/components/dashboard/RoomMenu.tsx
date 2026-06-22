"use client";

import { useState } from "react";
import { MoreHorizontal, Pencil, Archive, Trash2, Pin, PinOff, Download } from "@/components/ui/icons";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import EditRoomDialog from "./EditRoomDialog";
import { useT } from "@/lib/i18n";

interface RoomMenuProps {
  room: {
    id: string;
    name: string;
    type: string;
    icon?: string | null;
    pinned?: boolean;
  };
}

export default function RoomMenu({ room }: RoomMenuProps) {
  const t = useT();
  const [editOpen, setEditOpen] = useState(false);
  const router = useRouter();

  async function handlePin() {
    const res = await fetch(`/api/rooms/${room.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pinned: !room.pinned }),
    });
    if (res.ok) {
      toast.success(room.pinned ? t.projekty.roomUnpinned : t.projekty.roomPinned);
      router.refresh();
    } else {
      toast.error(t.render.operationError);
    }
  }

  async function handleArchive() {
    const res = await fetch(`/api/rooms/${room.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived: true }),
    });
    if (res.ok) {
      toast.success(t.projekty.roomArchived);
      router.refresh();
    } else {
      toast.error(t.projekty.roomArchiveError);
    }
  }

  async function handleDelete() {
    if (!confirm(t.projekty.confirmDeleteRoom)) return;
    const res = await fetch(`/api/rooms/${room.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success(t.projekty.roomDeleted);
      router.refresh();
    } else {
      toast.error(t.projekty.roomDeleteError);
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
          <DropdownMenuItem onClick={handlePin}>
            {room.pinned ? <PinOff size={14} /> : <Pin size={14} />}
            {room.pinned ? t.common.unpinAction : t.common.pinAction}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => { window.location.href = `/api/rooms/${room.id}/download`; }}>
            <Download size={14} />
            {t.render.download}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <Pencil size={14} />
            {t.common.edit}
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

      <EditRoomDialog
        room={room}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </>
  );
}
