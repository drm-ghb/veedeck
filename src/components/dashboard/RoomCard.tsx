"use client";

import Link from "next/link";
import { Pin } from "@/components/ui/icons";
import { getRoomIcon } from "@/lib/roomIcons";
import RoomMenu from "./RoomMenu";
import { useT } from "@/lib/i18n";

interface RoomCardProps {
  room: {
    id: string;
    name: string;
    type: string;
    icon?: string | null;
    pinned: boolean;
    _count: { renders: number };
  };
  projectId: string;
}

export default function RoomCard({ room, projectId }: RoomCardProps) {
  const t = useT();
  const Icon = getRoomIcon(room.type, room.icon);
  const count = room._count.renders;

  return (
    <Link
      href={`/projekty/${projectId}/rooms/${room.id}`}
      className="block group relative bg-card border border-border rounded-2xl p-5 shadow-sm hover:shadow-[0_4px_16px_rgba(25,33,61,0.2)] hover:border-primary/30 transition-all"
    >
      {/* Icon */}
      <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
        <Icon size={28} className="text-primary" />
      </div>

      {/* Name */}
      <p className="font-semibold text-foreground truncate flex items-center gap-1.5">
        {room.pinned && <Pin size={13} className="text-red-500 fill-red-500 shrink-0 translate-y-px" />}
        {room.name}
      </p>

      {/* Count */}
      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
        <span>☰</span>
        {count} {count === 1 ? t.render.fileSingular : count < 5 ? t.render.fileFew : t.render.fileMany}
      </p>

      {/* Menu */}
      <div
        className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => e.preventDefault()}
      >
        <RoomMenu room={{ id: room.id, name: room.name, type: room.type, icon: room.icon, pinned: room.pinned }} />
      </div>
    </Link>
  );
}
