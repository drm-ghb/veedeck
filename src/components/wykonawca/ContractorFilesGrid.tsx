"use client";

import { useState } from "react";
import Link from "next/link";
import { FileText, Download, MessageSquare, Pin } from "@/components/ui/icons";
import ContractorFileCommentPanel from "./ContractorFileCommentPanel";
import { useT } from "@/lib/i18n";

interface FileItem {
  id: string;
  name: string;
  createdAt: string;
  displayUrl: string | null;
  effectiveType: string;
  totalComments?: number;
  totalPins?: number;
}

interface Props {
  files: FileItem[];
  assignmentId: string;
  folderId: string;
  authorName: string;
  authorRole: "contractor" | "designer";
  initialUnreadCounts?: Record<string, number>;
  initialUnreadPinCounts?: Record<string, number>;
}

export default function ContractorFilesGrid({
  files,
  assignmentId,
  folderId,
  authorName,
  authorRole,
  initialUnreadCounts = {},
  initialUnreadPinCounts = {},
}: Props) {
  const t = useT();
  const [commentFileId, setCommentFileId] = useState<string | null>(null);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>(initialUnreadCounts);
  const [unreadPinCounts, setUnreadPinCounts] = useState<Record<string, number>>(initialUnreadPinCounts);

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
        <p>{t.wykonawcy.noFilesInFolder}</p>
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
          const unreadPins = unreadPinCounts[file.id] ?? 0;
          const hasUnread = unread > 0 || unreadPins > 0;

          return (
            <Link
              key={file.id}
              href={`/wykonawca/projekty/${assignmentId}/foldery/${folderId}/pliki/${file.id}`}
              onClick={() => {
                if (unreadPins > 0) setUnreadPinCounts((prev) => ({ ...prev, [file.id]: 0 }));
              }}
              className={`group relative rounded-xl border bg-card overflow-hidden block transition-all ${
                hasUnread
                  ? "border-violet-400 shadow-[0_0_12px_2px_rgba(139,92,246,0.35)]"
                  : "border-border"
              }`}
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
                    {new Date(file.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                  {/* Pin badge */}
                  {(unreadPins > 0 || (file.totalPins ?? 0) > 0) && (
                    <span
                      className={`flex items-center gap-0.5 p-1 rounded-lg ${
                        unreadPins > 0
                          ? "text-violet-600 dark:text-violet-400"
                          : "text-muted-foreground"
                      }`}
                      title={t.wykonawcy.pinsBtn}
                    >
                      <Pin size={13} />
                      <span className="text-[10px] font-medium">
                        {unreadPins > 0 ? unreadPins : (file.totalPins ?? 0)}
                      </span>
                    </span>
                  )}
                  {/* Comments button */}
                  {unread > 0 ? (
                    <button
                      onClick={(e) => openComments(e, file.id)}
                      className="flex items-center gap-0.5 p-1 rounded-lg text-violet-600 dark:text-violet-400 hover:bg-muted transition-colors"
                      title={t.wykonawcy.commentsBtn}
                    >
                      <MessageSquare size={13} />
                      <span className="text-[10px] font-medium">{unread}</span>
                    </button>
                  ) : (
                    <button
                      onClick={(e) => openComments(e, file.id)}
                      className="flex items-center gap-0.5 p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      title={t.wykonawcy.commentsBtn}
                    >
                      <MessageSquare size={13} />
                      {(file.totalComments ?? 0) > 0 && (
                        <span className="text-[10px] font-medium">{file.totalComments}</span>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Download — hover overlay on image */}
              {file.displayUrl && (
                <a
                  href={file.displayUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/50 text-white opacity-0 group-hover:opacity-100 hover:bg-black/70 transition-all"
                  title={t.wykonawcy.downloadOpen}
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
