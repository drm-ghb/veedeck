"use client";

import { useState } from "react";
import Link from "next/link";
import { FileText, Download, MessageSquare } from "@/components/ui/icons";
import ContractorFileCommentPanel from "./ContractorFileCommentPanel";

interface FileItem {
  id: string;
  name: string;
  createdAt: string;
  displayUrl: string | null;
  effectiveType: string;
}

interface Props {
  files: FileItem[];
  assignmentId: string;
  folderId: string;
  authorName: string;
  authorRole: "contractor" | "designer";
  initialUnreadCounts?: Record<string, number>;
}

export default function ContractorFilesGrid({
  files,
  assignmentId,
  folderId,
  authorName,
  authorRole,
  initialUnreadCounts = {},
}: Props) {
  const [commentFileId, setCommentFileId] = useState<string | null>(null);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>(initialUnreadCounts);

  function openComments(e: React.MouseEvent, fileId: string) {
    e.preventDefault();
    e.stopPropagation();
    setCommentFileId(fileId);
    if ((unreadCounts[fileId] ?? 0) > 0) {
      setUnreadCounts((prev) => ({ ...prev, [fileId]: 0 }));
      fetch("/api/contractor-file-comments/mark-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId, role: authorRole }),
      }).catch(() => {});
    }
  }

  const activeCommentFile = files.find((f) => f.id === commentFileId) ?? null;

  if (files.length === 0) {
    return (
      <div className="py-16 text-center text-muted-foreground">
        <FileText size={40} className="mx-auto mb-3 opacity-40" />
        <p>Brak plików w tym folderze</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {files.map((file) => {
          const isImage = file.effectiveType === "image";
          const isPdf = file.effectiveType === "pdf";
          const unread = unreadCounts[file.id] ?? 0;

          return (
            <Link
              key={file.id}
              href={`/wykonawca/projekty/${assignmentId}/foldery/${folderId}/pliki/${file.id}`}
              className="group relative rounded-xl border border-border bg-card overflow-hidden block"
            >
              <div className="aspect-square bg-muted flex items-center justify-center overflow-hidden">
                {isImage && file.displayUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={file.displayUrl} alt={file.name} className="w-full h-full object-cover" />
                ) : isPdf && file.displayUrl ? (
                  <iframe
                    src={`${file.displayUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
                    className="w-full h-full pointer-events-none"
                    title={file.name}
                  />
                ) : (
                  <FileText size={32} className="text-muted-foreground/40" />
                )}
              </div>

              <div className="flex items-center gap-1 px-2 py-1.5">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(file.createdAt).toLocaleDateString("pl-PL")}
                  </p>
                </div>
                <button
                  onClick={(e) => openComments(e, file.id)}
                  className="relative p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
                  title="Komentarze"
                >
                  <MessageSquare size={14} />
                  {unread > 0 && (
                    <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-primary text-primary-foreground text-[8px] font-bold flex items-center justify-center">
                      {unread > 9 ? "9+" : unread}
                    </span>
                  )}
                </button>
              </div>

              {/* Download — hover overlay on image */}
              {file.displayUrl && (
                <a
                  href={file.displayUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/50 text-white opacity-0 group-hover:opacity-100 hover:bg-black/70 transition-all"
                  title="Pobierz / Otwórz"
                >
                  <Download size={14} />
                </a>
              )}
            </Link>
          );
        })}
      </div>

      {commentFileId && activeCommentFile && (
        <ContractorFileCommentPanel
          fileId={commentFileId}
          fileName={activeCommentFile.name}
          authorName={authorName}
          authorRole={authorRole}
          onClose={() => setCommentFileId(null)}
        />
      )}
    </>
  );
}
