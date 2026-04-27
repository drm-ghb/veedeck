"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArchiveRestore, CheckSquare, Eye, Folder, LayoutGrid, List, Pin, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import RenderMenu from "./RenderMenu";
import FolderCard from "./FolderCard";
import BulkActionBar from "./BulkActionBar";
import BulkMoveDialog from "./BulkMoveDialog";

type RenderStatus = "REVIEW" | "ACCEPTED";

interface Render {
  id: string;
  name: string;
  fileUrl: string;
  commentCount: number;
  viewCount: number;
  status: RenderStatus;
  folderId: string | null;
  pinned: boolean;
}

interface Folder {
  id: string;
  name: string;
  renderCount: number;
  pinned: boolean;
}

interface ArchivedFolder {
  id: string;
  name: string;
  renderCount: number;
}

interface RoomViewProps {
  projectId: string;
  roomId: string;
  renders: Render[];
  archivedRenders: Render[];
  folders: Folder[];
  archivedFolders: ArchivedFolder[];
}

export default function RoomView({ projectId, roomId, renders, archivedRenders, folders, archivedFolders }: RoomViewProps) {
  const [tab, setTab] = useState<"active" | "archived">("active");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const router = useRouter();

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function exitSelection() {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }

  async function handleBulkAction(action: "archive" | "delete") {
    if (action === "delete" && !confirm(`Usunąć ${selectedIds.size} ${selectedIds.size === 1 ? "plik" : "pliki/plików"}?`)) return;
    setBulkLoading(true);
    try {
      const res = await fetch("/api/renders/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds), action }),
      });
      if (!res.ok) throw new Error();
      toast.success(action === "archive" ? "Zarchiwizowano pliki" : "Usunięto pliki");
      exitSelection();
      router.refresh();
    } catch {
      toast.error("Błąd operacji");
    } finally {
      setBulkLoading(false);
    }
  }

  const ungrouped = [...renders.filter((r) => !r.folderId)].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return 0;
  });
  const sortedFolders = [...folders].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return 0;
  });
  const hasContent = folders.length > 0 || renders.length > 0;

  async function handleRestore(renderId: string) {
    const res = await fetch(`/api/renders/${renderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived: false }),
    });
    if (res.ok) {
      toast.success("Render przywrócony");
      router.refresh();
    } else {
      toast.error("Błąd przywracania");
    }
  }

  async function handleRestoreFolder(folderId: string) {
    const res = await fetch(`/api/folders/${folderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived: false }),
    });
    if (res.ok) {
      toast.success("Folder przywrócony");
      router.refresh();
    } else {
      toast.error("Błąd przywracania");
    }
  }

  async function handleDeleteFolder(folderId: string, name: string) {
    if (!confirm(`Usunąć folder "${name}"? Pliki w folderze nie zostaną usunięte.`)) return;
    const res = await fetch(`/api/folders/${folderId}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Folder usunięty");
      router.refresh();
    } else {
      toast.error("Błąd usuwania folderu");
    }
  }

  async function handleDelete(renderId: string, name: string) {
    if (!confirm(`Usunąć render "${name}"?`)) return;
    const res = await fetch(`/api/renders/${renderId}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Render usunięty");
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
            Pliki
            {(folders.length > 0 || renders.length > 0) && (
              <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${tab === "active" ? "bg-foreground text-background" : "bg-muted text-muted-foreground"}`}>
                {folders.length + renders.length}
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
            {(archivedRenders.length + archivedFolders.length) > 0 && (
              <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${tab === "archived" ? "bg-foreground text-background" : "bg-muted text-muted-foreground"}`}>
                {archivedRenders.length + archivedFolders.length}
              </span>
            )}
          </button>
        </div>
        {tab === "active" && ungrouped.length > 0 && (
          <div className="flex items-center gap-2 mb-1">
            <button
              onClick={() => { setSelectionMode((v) => !v); setSelectedIds(new Set()); }}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${selectionMode ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
            >
              <CheckSquare size={13} />
              {selectionMode ? `Zaznaczono: ${selectedIds.size}` : "Zaznacz"}
            </button>
          <div className="flex items-center gap-0.5 bg-muted rounded-md p-0.5">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded transition-colors ${viewMode === "grid" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              <LayoutGrid size={15} />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded transition-colors ${viewMode === "list" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              <List size={15} />
            </button>
          </div>
          </div>
        )}
      </div>

      {tab === "active" ? (
        !hasContent ? (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-lg font-medium">Brak plików</p>
            <p className="text-sm mt-1">Dodaj pierwszy plik lub folder klikając przyciski powyżej.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Folder tiles */}
            {sortedFolders.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4">
                {sortedFolders.map((folder) => (
                  <FolderCard key={folder.id} folder={folder} projectId={projectId} roomId={roomId} />
                ))}
              </div>
            )}

            {/* Ungrouped renders */}
            {ungrouped.length > 0 && (
              <div>
                {folders.length > 0 && (
                  <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                    Pozostałe pliki
                  </p>
                )}
                {viewMode === "grid" ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
                    {ungrouped.map((render) => {
                      const isSelected = selectedIds.has(render.id);
                      const cardContent = (
                        <Card className={`overflow-hidden transition-all cursor-pointer group relative ${isSelected ? "ring-2 ring-primary border-primary" : "hover:shadow-[0_4px_16px_rgba(25,33,61,0.2)] hover:border-primary/30"}`}>
                          {selectionMode && (
                            <div className="absolute top-2 left-2 z-10">
                              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${isSelected ? "bg-primary border-primary" : "bg-white/80 border-gray-400"}`}>
                                {isSelected && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L4 7L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                              </div>
                            </div>
                          )}
                          {!selectionMode && render.pinned && (
                            <div className="absolute top-2 left-2 z-10">
                              <Pin size={13} className="text-red-500 fill-red-500 drop-shadow" />
                            </div>
                          )}
                          <div className="aspect-video bg-muted overflow-hidden">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={render.fileUrl} alt={render.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" />
                          </div>
                          <div className="p-3">
                            <p className="text-sm font-medium truncate mb-1">{render.name}</p>
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5">
                                <span className={`flex-shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${render.status === "ACCEPTED" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>
                                  {render.status === "ACCEPTED" ? "Zaakceptowany" : "Do weryfikacji"}
                                </span>
                                {render.commentCount > 0 && (
                                  <span className="text-xs text-muted-foreground flex items-center gap-1"><Pin size={11} />{render.commentCount}</span>
                                )}
                                <span className="text-xs text-muted-foreground flex items-center gap-1"><Eye size={11} />{render.viewCount}</span>
                              </div>
                              {!selectionMode && (
                                <div className="flex-shrink-0" onClick={(e) => e.preventDefault()}>
                                  <RenderMenu render={{ id: render.id, name: render.name, pinned: render.pinned }} projectId={projectId} currentRoomId={roomId} currentFolderId={render.folderId} />
                                </div>
                              )}
                            </div>
                          </div>
                        </Card>
                      );
                      return selectionMode ? (
                        <div key={render.id} onClick={() => toggleSelect(render.id)}>{cardContent}</div>
                      ) : (
                        <Link key={render.id} href={`/projects/${projectId}/renders/${render.id}`}>{cardContent}</Link>
                      );
                    })}
                  </div>
                ) : (
                  <div className="bg-card border border-border rounded-xl overflow-hidden">
                    {ungrouped.map((render, i) => {
                      const isSelected = selectedIds.has(render.id);
                      const row = (
                        <div className={`flex items-center gap-3 px-4 py-3 transition-colors group ${i !== ungrouped.length - 1 ? "border-b border-border" : ""} ${isSelected ? "bg-primary/5" : "hover:bg-muted/50"} ${selectionMode ? "cursor-pointer" : ""}`}>
                          {selectionMode && (
                            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${isSelected ? "bg-primary border-primary" : "border-gray-400"}`}>
                              {isSelected && <svg width="8" height="6" viewBox="0 0 10 8" fill="none"><path d="M1 4L4 7L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                            </div>
                          )}
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="w-14 h-10 rounded-md overflow-hidden bg-muted flex-shrink-0">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={render.fileUrl} alt={render.name} className="w-full h-full object-cover" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate flex items-center gap-1.5">
                                {!selectionMode && render.pinned && <Pin size={11} className="text-red-500 fill-red-500 flex-shrink-0" />}
                                {render.name}
                              </p>
                              <div className="flex items-center gap-2">
                                {render.commentCount > 0 && <span className="text-xs text-muted-foreground flex items-center gap-1"><Pin size={10} />{render.commentCount}</span>}
                                <span className="text-xs text-muted-foreground flex items-center gap-1"><Eye size={10} />{render.viewCount}</span>
                              </div>
                            </div>
                          </div>
                          <span className={`flex-shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${render.status === "ACCEPTED" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>
                            {render.status === "ACCEPTED" ? "Zaakceptowany" : "Do weryfikacji"}
                          </span>
                          {!selectionMode && (
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" onClick={(e) => e.preventDefault()}>
                              <RenderMenu render={{ id: render.id, name: render.name, pinned: render.pinned }} projectId={projectId} currentRoomId={roomId} currentFolderId={render.folderId} />
                            </div>
                          )}
                        </div>
                      );
                      return selectionMode ? (
                        <div key={render.id} onClick={() => toggleSelect(render.id)}>{row}</div>
                      ) : (
                        <Link key={render.id} href={`/projects/${projectId}/renders/${render.id}`}>{row}</Link>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      ) : archivedRenders.length === 0 && archivedFolders.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-4xl mb-4">📦</p>
          <p className="text-lg">Brak zarchiwizowanych elementów</p>
        </div>
      ) : (
        <div className="space-y-8">
          {archivedFolders.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Foldery</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4">
                {archivedFolders.map((folder) => (
                  <Card key={folder.id} className="p-5 opacity-60">
                    <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                      <Folder size={28} className="text-primary" />
                    </div>
                    <p className="font-semibold text-foreground truncate mb-1">{folder.name}</p>
                    <p className="text-xs text-muted-foreground mb-3">
                      {folder.renderCount} plik{folder.renderCount === 1 ? "" : folder.renderCount < 5 ? "i" : "ów"}
                    </p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => handleRestoreFolder(folder.id)}>
                        <ArchiveRestore size={14} />
                        Przywróć
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-400 hover:text-red-600"
                        onClick={() => handleDeleteFolder(folder.id, folder.name)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
          {archivedRenders.length > 0 && (
            <div>
              {archivedFolders.length > 0 && (
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Pliki</p>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
                {archivedRenders.map((render) => (
                  <Card key={render.id} className="overflow-hidden opacity-60">
                    <div className="aspect-video bg-muted overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={render.fileUrl}
                        alt={render.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-3">
                      <p className="text-sm font-medium truncate mb-2">{render.name}</p>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="flex-1" onClick={() => handleRestore(render.id)}>
                          <ArchiveRestore size={14} />
                          Przywróć
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-400 hover:text-red-600"
                          onClick={() => handleDelete(render.id, render.name)}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      {selectionMode && selectedIds.size > 0 && (
        <BulkActionBar
          count={selectedIds.size}
          loading={bulkLoading}
          onArchive={() => handleBulkAction("archive")}
          onMove={() => setMoveOpen(true)}
          onDelete={() => handleBulkAction("delete")}
          onCancel={exitSelection}
        />
      )}

      <BulkMoveDialog
        open={moveOpen}
        onOpenChange={setMoveOpen}
        ids={Array.from(selectedIds)}
        projectId={projectId}
        onSuccess={exitSelection}
      />
    </>
  );
}
