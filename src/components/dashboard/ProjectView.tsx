"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArchiveRestore, FolderOpen, LayoutGrid, List, Trash2, Pin } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import RoomCard from "./RoomCard";
import RoomMenu from "./RoomMenu";
import { getRoomIcon } from "@/lib/roomIcons";

interface Room {
  id: string;
  name: string;
  type: string;
  icon?: string | null;
  pinned: boolean;
  _count: { renders: number };
}

interface ProjectViewProps {
  projectId: string;
  rooms: Room[];
  archivedRooms: Room[];
}

export default function ProjectView({ projectId, rooms, archivedRooms }: ProjectViewProps) {
  const [tab, setTab] = useState<"active" | "archived">("active");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const router = useRouter();

  const sortedRooms = [...rooms].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return 0;
  });

  async function handleRestore(roomId: string) {
    const res = await fetch(`/api/rooms/${roomId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived: false }),
    });
    if (res.ok) {
      toast.success("Pomieszczenie przywrócone");
      router.refresh();
    } else {
      toast.error("Błąd przywracania");
    }
  }

  async function handleDelete(roomId: string, name: string) {
    if (!confirm(`Usunąć pomieszczenie "${name}"?`)) return;
    const res = await fetch(`/api/rooms/${roomId}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Pomieszczenie usunięte");
      router.refresh();
    } else {
      toast.error("Błąd usuwania");
    }
  }

  return (
    <>
      {/* Tabs + view toggle */}
      <div className="flex items-center justify-between border-b border-border mb-6">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setTab("active")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === "active"
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Pomieszczenia
            {rooms.length > 0 && (
              <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${tab === "active" ? "bg-foreground text-background" : "bg-muted text-muted-foreground"}`}>
                {rooms.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab("archived")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === "archived"
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Zarchiwizowane
            {archivedRooms.length > 0 && (
              <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${tab === "archived" ? "bg-foreground text-background" : "bg-muted text-muted-foreground"}`}>
                {archivedRooms.length}
              </span>
            )}
          </button>
        </div>
        {tab === "active" && rooms.length > 0 && (
          <div className="flex items-center gap-0.5 bg-gray-100 rounded-md p-0.5 mb-1">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded transition-colors ${viewMode === "grid" ? "bg-white shadow-sm text-gray-900" : "text-gray-400 hover:text-gray-600"}`}
            >
              <LayoutGrid size={15} />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded transition-colors ${viewMode === "list" ? "bg-white shadow-sm text-gray-900" : "text-gray-400 hover:text-gray-600"}`}
            >
              <List size={15} />
            </button>
          </div>
        )}
      </div>

      {tab === "active" ? (
        rooms.length === 0 ? (
          <div className="border-2 border-dashed border-gray-200 rounded-xl p-12 text-center">
            <FolderOpen className="mx-auto mb-3 text-gray-300" size={48} />
            <p className="text-gray-400 font-medium">Brak pomieszczeń</p>
            <p className="text-gray-300 text-sm mt-1">
              Kliknij „+ Dodaj pomieszczenie" aby zacząć
            </p>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {sortedRooms.map((room) => (
              <RoomCard key={room.id} room={room} projectId={projectId} />
            ))}
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            {sortedRooms.map((room, i) => {
              const Icon = getRoomIcon(room.type, room.icon);
              const count = room._count.renders;
              return (
                <div
                  key={room.id}
                  className={`flex items-center gap-4 px-4 py-3 hover:bg-gray-50 transition-colors group ${
                    i !== sortedRooms.length - 1 ? "border-b border-gray-100" : ""
                  }`}
                >
                  <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon size={16} className="text-primary" />
                  </div>
                  <a href={`/projects/${projectId}/rooms/${room.id}`} className="flex-1 min-w-0 flex items-center gap-1.5">
                    {room.pinned && <Pin size={11} className="text-red-500 fill-red-500 flex-shrink-0" />}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{room.name}</p>
                      <p className="text-xs text-gray-400">
                        {count} render{count === 1 ? "" : count < 5 ? "y" : "ów"}
                      </p>
                    </div>
                  </a>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" onClick={(e) => e.preventDefault()}>
                    <RoomMenu room={{ id: room.id, name: room.name, type: room.type, icon: room.icon, pinned: room.pinned }} />
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        archivedRooms.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-4">📦</p>
            <p className="text-lg">Brak zarchiwizowanych pomieszczeń</p>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            {archivedRooms.map((room, i) => (
              <div
                key={room.id}
                className={`flex items-center justify-between px-5 py-4 ${
                  i !== archivedRooms.length - 1 ? "border-b border-gray-100" : ""
                }`}
              >
                <div>
                  <p className="font-medium text-gray-700">{room.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {room._count.renders} render{room._count.renders === 1 ? "" : room._count.renders < 5 ? "y" : "ów"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleRestore(room.id)}>
                    <ArchiveRestore size={14} />
                    Przywróć
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-400 hover:text-red-600"
                    onClick={() => handleDelete(room.id, room.name)}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </>
  );
}
