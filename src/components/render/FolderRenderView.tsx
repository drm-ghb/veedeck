"use client";

import { useState } from "react";
import { CheckSquare, Eye, LayoutGrid, List, Pin } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import RenderMenu from "./RenderMenu";
import BulkActionBar from "./BulkActionBar";
import BulkMoveDialog from "./BulkMoveDialog";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type RenderStatus = "REVIEW" | "ACCEPTED";

interface Render {
  id: string;
  name: string;
  fileUrl: string;
  commentCount: number;
  viewCount: number;
  status: RenderStatus;
  pinned: boolean;
}

interface FolderRenderViewProps {
  projectId: string;
  roomId: string;
  folderId: string;
  renders: Render[];
}

export default function FolderRenderView({ projectId, roomId, folderId, renders }: FolderRenderViewProps) {
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

  const sorted = [...renders].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return 0;
  });

  if (renders.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p className="text-lg font-medium">Brak plików</p>
        <p className="text-sm mt-1">Dodaj pierwszy plik klikając przycisk powyżej.</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-between items-center mb-4">
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

      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
          {sorted.map((render) => {
            const isSelected = selectedIds.has(render.id);
            const card = (
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
                      {render.commentCount > 0 && <span className="text-xs text-muted-foreground flex items-center gap-1"><Pin size={11} />{render.commentCount}</span>}
                      <span className="text-xs text-muted-foreground flex items-center gap-1"><Eye size={11} />{render.viewCount}</span>
                    </div>
                    {!selectionMode && (
                      <div className="flex-shrink-0" onClick={(e) => e.preventDefault()}>
                        <RenderMenu render={{ id: render.id, name: render.name, pinned: render.pinned }} projectId={projectId} currentRoomId={roomId} currentFolderId={folderId} />
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
            return selectionMode ? (
              <div key={render.id} onClick={() => toggleSelect(render.id)}>{card}</div>
            ) : (
              <Link key={render.id} href={`/projects/${projectId}/renders/${render.id}`}>{card}</Link>
            );
          })}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {sorted.map((render, i) => {
            const isSelected = selectedIds.has(render.id);
            const row = (
              <div className={`flex items-center gap-3 px-4 py-3 transition-colors group ${i !== sorted.length - 1 ? "border-b border-border" : ""} ${isSelected ? "bg-primary/5" : "hover:bg-muted/50"} ${selectionMode ? "cursor-pointer" : ""}`}>
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
                    <RenderMenu render={{ id: render.id, name: render.name, pinned: render.pinned }} projectId={projectId} currentRoomId={roomId} currentFolderId={folderId} />
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
