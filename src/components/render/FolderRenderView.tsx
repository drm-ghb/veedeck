"use client";

import { useState } from "react";
import { Eye, LayoutGrid, List, Pin } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import RenderMenu from "./RenderMenu";

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
  renders: Render[];
}

export default function FolderRenderView({ projectId, renders }: FolderRenderViewProps) {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

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
      <div className="flex justify-end mb-4">
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
          {sorted.map((render) => (
            <Link key={render.id} href={`/projects/${projectId}/renders/${render.id}`}>
              <Card className="overflow-hidden hover:shadow-[0_4px_16px_rgba(25,33,61,0.2)] hover:border-primary/30 transition-all cursor-pointer group relative">
                {render.pinned && (
                  <div className="absolute top-2 left-2 z-10">
                    <Pin size={13} className="text-red-500 fill-red-500 drop-shadow" />
                  </div>
                )}
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
                      {render.commentCount > 0 && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Pin size={11} />
                          {render.commentCount}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Eye size={11} />
                        {render.viewCount}
                      </span>
                    </div>
                    <div className="flex-shrink-0" onClick={(e) => e.preventDefault()}>
                      <RenderMenu render={{ id: render.id, name: render.name, pinned: render.pinned }} />
                    </div>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {sorted.map((render, i) => (
            <div
              key={render.id}
              className={`flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors group ${
                i !== sorted.length - 1 ? "border-b border-border" : ""
              }`}
            >
              <Link href={`/projects/${projectId}/renders/${render.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-14 h-10 rounded-md overflow-hidden bg-muted flex-shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={render.fileUrl} alt={render.name} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate flex items-center gap-1.5">
                    {render.pinned && <Pin size={11} className="text-red-500 fill-red-500 flex-shrink-0" />}
                    {render.name}
                  </p>
                  <div className="flex items-center gap-2">
                    {render.commentCount > 0 && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Pin size={10} />
                        {render.commentCount}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Eye size={10} />
                      {render.viewCount}
                    </span>
                  </div>
                </div>
              </Link>
              <span className={`flex-shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                render.status === "ACCEPTED"
                  ? "bg-green-100 text-green-700"
                  : "bg-blue-100 text-blue-700"
              }`}>
                {render.status === "ACCEPTED" ? "Zaakceptowany" : "Do weryfikacji"}
              </span>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" onClick={(e) => e.preventDefault()}>
                <RenderMenu render={{ id: render.id, name: render.name, pinned: render.pinned }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
