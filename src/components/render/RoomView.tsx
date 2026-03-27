"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArchiveRestore, LayoutGrid, List, MessageSquare, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import RenderMenu from "./RenderMenu";

type RenderStatus = "REVIEW" | "ACCEPTED";

interface Render {
  id: string;
  name: string;
  fileUrl: string;
  commentCount: number;
  status: RenderStatus;
}

interface RoomViewProps {
  projectId: string;
  roomId: string;
  renders: Render[];
  archivedRenders: Render[];
}

export default function RoomView({ projectId, roomId, renders, archivedRenders }: RoomViewProps) {
  const [tab, setTab] = useState<"active" | "archived">("active");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const router = useRouter();

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
            Rendery
            {renders.length > 0 && (
              <span className="ml-1.5 text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">
                {renders.length}
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
            {archivedRenders.length > 0 && (
              <span className="ml-1.5 text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">
                {archivedRenders.length}
              </span>
            )}
          </button>
        </div>
        {tab === "active" && renders.length > 0 && (
          <div className="flex items-center gap-0.5 bg-muted rounded-md p-0.5 mb-1">
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
        )}
      </div>

      {tab === "active" ? (
        renders.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-lg font-medium">Brak plików</p>
            <p className="text-sm mt-1">Dodaj pierwszy render klikając przycisk powyżej.</p>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {renders.map((render) => (
              <Link key={render.id} href={`/projects/${projectId}/renders/${render.id}`}>
                <Card className="overflow-hidden hover:shadow-[0_4px_16px_rgba(25,33,61,0.2)] hover:border-[#19213D]/30 transition-all cursor-pointer group relative">
                  <div className="aspect-video bg-muted overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={render.fileUrl}
                      alt={render.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-medium truncate mb-1">{render.name}</p>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className={`flex-shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                          render.status === "ACCEPTED"
                            ? "bg-green-100 text-green-700"
                            : "bg-blue-100 text-blue-700"
                        }`}>
                          {render.status === "ACCEPTED" ? "Zaakceptowany" : "Do weryfikacji"}
                        </span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <MessageSquare size={11} />
                          {render.commentCount > 0 ? `${render.commentCount} uwag` : "Brak uwag"}
                        </span>
                      </div>
                      <div
                        className="flex-shrink-0"
                        onClick={(e) => e.preventDefault()}
                      >
                        <RenderMenu render={{ id: render.id, name: render.name }} />
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            {renders.map((render, i) => (
              <div
                key={render.id}
                className={`flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors group ${
                  i !== renders.length - 1 ? "border-b border-border" : ""
                }`}
              >
                <Link href={`/projects/${projectId}/renders/${render.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-14 h-10 rounded-md overflow-hidden bg-muted flex-shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={render.fileUrl} alt={render.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{render.name}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <MessageSquare size={10} />
                      {render.commentCount > 0 ? `${render.commentCount} uwag` : "Brak uwag"}
                    </p>
                  </div>
                </Link>
                <span className={`flex-shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                  render.status === "ACCEPTED"
                    ? "bg-green-100 text-green-700"
                    : "bg-blue-100 text-blue-700"
                }`}>
                  {render.status === "ACCEPTED" ? "Zaakceptowany" : "Do weryfikacji"}
                </span>
                <div
                  className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                  onClick={(e) => e.preventDefault()}
                >
                  <RenderMenu render={{ id: render.id, name: render.name }} />
                </div>
              </div>
            ))}
          </div>
        )
      ) : archivedRenders.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-4xl mb-4">📦</p>
          <p className="text-lg">Brak zarchiwizowanych renderów</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
      )}
    </>
  );
}
