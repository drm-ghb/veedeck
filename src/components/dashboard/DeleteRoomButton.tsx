"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { X } from "@/components/ui/icons";
import { useT } from "@/lib/i18n";
import TrialGate from "@/components/ui/TrialGate";

interface DeleteRoomButtonProps {
  roomId: string;
  roomName: string;
}

export default function DeleteRoomButton({ roomId, roomName }: DeleteRoomButtonProps) {
  const t = useT();
  const router = useRouter();

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm(t.projekty.confirmDeleteRoom)) return;

    const res = await fetch(`/api/rooms/${roomId}`, { method: "DELETE" });
    if (res.ok) {
      toast.success(t.projekty.roomDeleted);
      router.refresh();
    } else {
      toast.error(t.projekty.roomDeleteError);
    }
  }

  return (
    <TrialGate>
      <button
        onClick={handleDelete}
        className="text-gray-400 hover:text-red-500 transition-colors ml-1"
        title={t.projekty.deleteRoom}
      >
        <X size={14} />
      </button>
    </TrialGate>
  );
}
