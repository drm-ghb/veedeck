"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArchiveRestore, FolderOpen, LayoutGrid, List, Trash2, Pin, Eye, Search, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import RoomCard from "./RoomCard";
import RoomMenu from "./RoomMenu";
import { getRoomIcon } from "@/lib/roomIcons";
import Link from "next/link";
import { Card } from "@/components/ui/card";

interface Room {
  id: string;
  name: string;
  type: string;
  icon?: string | null;
  pinned: boolean;
  _count: { renders: number };
}

interface AllRender {
  id: string;
  name: string;
  fileUrl: string;
  status: "REVIEW" | "ACCEPTED";
  commentCount: number;
  viewCount: number;
  pinned: boolean;
  folderId: string | null;
  roomId: string | null;
  roomName: string | null;
  folderName: string | null;
}

interface ProjectViewProps {
  projectId: string;
  rooms: Room[];
  archivedRooms: Room[];
  allRenders: AllRender[];
}

export default function ProjectView({ projectId, rooms, archivedRooms, allRenders }: ProjectViewProps) {
  const [tab, setTab] = useState<"active" | "archived" | "all">("active");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [filterRoom, setFilterRoom] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "REVIEW" | "ACCEPTED">("all");
  const [search, setSearch] = useState("");
  const router = useRouter();

  const uniqueRooms = Array.from(new Map(allRenders.filter(r => r.roomId).map(r => [r.roomId, { id: r.roomId!, name: r.roomName! }])).values());

  const filteredRenders = allRenders.filter((r) => {
    if (filterRoom !== "all" && r.roomId !== filterRoom) return false;
    if (filterStatus !== "all" && r.status !== filterStatus) return false;
    if (search && !r.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

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
              <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${tab === "active" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                {rooms.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab("all")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === "all"
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Wszystkie pliki
            {allRenders.length > 0 && (
              <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${tab === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                {allRenders.length}
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
              <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${tab === "archived" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                {archivedRooms.length}
              </span>
            )}
          </button>
        </div>
        {((tab === "active" && rooms.length > 0) || (tab === "all" && allRenders.length > 0)) && (
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

      {tab === "all" ? (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Szukaj pliku..."
                className="w-full pl-8 pr-8 py-1.5 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X size={13} />
                </button>
              )}
            </div>
            {uniqueRooms.length > 1 && (
              <select
                value={filterRoom}
                onChange={(e) => setFilterRoom(e.target.value)}
                className="text-sm border border-border rounded-lg px-2.5 py-1.5 bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="all">Wszystkie pokoje</option>
                {uniqueRooms.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            )}
            <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
              {(["all", "REVIEW", "ACCEPTED"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setFilterStatus(s)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${filterStatus === s ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {s === "all" ? "Wszystkie" : s === "REVIEW" ? "Do weryfikacji" : "Zaakceptowane"}
                </button>
              ))}
            </div>
          </div>

          {filteredRenders.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <p className="text-lg font-medium">Brak wyników</p>
              <p className="text-sm mt-1">Zmień filtry lub dodaj pliki do projektu.</p>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
              {filteredRenders.map((render) => (
                <Link key={render.id} href={`/projects/${projectId}/renders/${render.id}`}>
                  <Card className="overflow-hidden hover:shadow-[0_4px_16px_rgba(25,33,61,0.2)] hover:border-primary/30 transition-all cursor-pointer group relative">
                    {render.pinned && (
                      <div className="absolute top-2 left-2 z-10">
                        <Pin size={13} className="text-red-500 fill-red-500 drop-shadow" />
                      </div>
                    )}
                    <div className="aspect-video bg-muted overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={render.fileUrl} alt={render.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" />
                    </div>
                    <div className="p-3">
                      <p className="text-sm font-medium truncate mb-0.5">{render.name}</p>
                      {(render.roomName || render.folderName) && (
                        <p className="text-xs text-muted-foreground truncate mb-1.5">
                          {[render.roomName, render.folderName].filter(Boolean).join(" / ")}
                        </p>
                      )}
                      <div className="flex items-center gap-1.5">
                        <span className={`flex-shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${render.status === "ACCEPTED" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>
                          {render.status === "ACCEPTED" ? "Zaakceptowany" : "Do weryfikacji"}
                        </span>
                        {render.commentCount > 0 && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1"><Pin size={11} />{render.commentCount}</span>
                        )}
                        <span className="text-xs text-muted-foreground flex items-center gap-1"><Eye size={11} />{render.viewCount}</span>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              {filteredRenders.map((render, i) => (
                <Link
                  key={render.id}
                  href={`/projects/${projectId}/renders/${render.id}`}
                  className={`flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors group ${i !== filteredRenders.length - 1 ? "border-b border-border" : ""}`}
                >
                  <div className="w-14 h-10 rounded-md overflow-hidden bg-muted flex-shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={render.fileUrl} alt={render.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate flex items-center gap-1.5">
                      {render.pinned && <Pin size={11} className="text-red-500 fill-red-500 flex-shrink-0" />}
                      {render.name}
                    </p>
                    {(render.roomName || render.folderName) && (
                      <p className="text-xs text-muted-foreground truncate">
                        {[render.roomName, render.folderName].filter(Boolean).join(" / ")}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${render.status === "ACCEPTED" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>
                      {render.status === "ACCEPTED" ? "Zaakceptowany" : "Do weryfikacji"}
                    </span>
                    {render.commentCount > 0 && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1"><Pin size={11} />{render.commentCount}</span>
                    )}
                    <span className="text-xs text-muted-foreground flex items-center gap-1"><Eye size={11} />{render.viewCount}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      ) : tab === "active" ? (
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
