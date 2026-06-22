"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Folder, Pin, Upload } from "@/components/ui/icons";
import FolderMenu from "./FolderMenu";
import { useT } from "@/lib/i18n";

interface FolderCardProps {
  folder: { id: string; name: string; renderCount: number; pinned: boolean };
  projectId: string;
  roomId: string;
  onFileDrop?: (files: File[]) => void;
}

export default function FolderCard({ folder, projectId, roomId, onFileDrop }: FolderCardProps) {
  const t = useT();
  const count = folder.renderCount;
  const [isDragOver, setIsDragOver] = useState(false);
  const dragCounter = useRef(0);

  function handleDragEnter(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current += 1;
    if (dragCounter.current === 1) setIsDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current === 0) setIsDragOver(false);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current = 0;
    setIsDragOver(false);
    if (!onFileDrop) return;
    const files = Array.from(e.dataTransfer.files).filter(
      (f) => f.type.startsWith("image/") || f.type === "application/pdf"
    );
    if (files.length > 0) onFileDrop(files);
  }

  return (
    <Link
      href={`/projects/${projectId}/rooms/${roomId}/folders/${folder.id}`}
      className={`block group relative bg-card border rounded-2xl p-5 shadow-sm transition-all ${isDragOver ? "border-primary bg-primary/5 shadow-[0_4px_16px_rgba(25,33,61,0.2)]" : "border-border hover:shadow-[0_4px_16px_rgba(25,33,61,0.2)] hover:border-primary/30"}`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {isDragOver && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl pointer-events-none">
          <div className="flex flex-col items-center gap-1">
            <Upload size={20} className="text-primary" />
            <span className="text-xs font-semibold text-primary">{t.render.dropHere}</span>
          </div>
        </div>
      )}
      <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-4 transition-colors ${isDragOver ? "bg-primary/20" : "bg-primary/10 group-hover:bg-primary/20"}`}>
        <Folder size={28} className="text-primary" />
      </div>
      <p className="font-semibold text-foreground truncate flex items-center gap-1.5">
        {folder.pinned && <Pin size={13} className="text-red-500 fill-red-500 shrink-0 translate-y-px" />}
        {folder.name}
      </p>
      <p className="text-xs text-muted-foreground mt-1">
        {count} {count === 1 ? t.render.fileSingular : count < 5 ? t.render.fileFew : t.render.fileMany}
      </p>
      <div
        className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => e.preventDefault()}
      >
        <FolderMenu folder={{ id: folder.id, name: folder.name, pinned: folder.pinned }} projectId={projectId} currentRoomId={roomId} />
      </div>
    </Link>
  );
}
