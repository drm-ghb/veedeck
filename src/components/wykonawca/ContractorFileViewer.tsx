"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronRight, FileText, MessageSquare } from "@/components/ui/icons";
import ContractorFileCommentPanel from "./ContractorFileCommentPanel";

interface FileItem {
  id: string;
  name: string;
  displayUrl: string | null;
  effectiveType: string;
  unreadCount: number;
  totalComments: number;
}

interface Props {
  files: FileItem[];
  initialIndex: number;
  assignmentId: string;
  folderId: string;
  folderName: string;
  authorName: string;
  authorRole: "contractor" | "designer";
  backHref: string;
  /** When provided, component acts as overlay (no URL changes, close calls this instead of router.push) */
  onClose?: () => void;
  /** Open comments panel immediately on mount */
  initialCommentsOpen?: boolean;
}

export default function ContractorFileViewer({
  files,
  initialIndex,
  assignmentId,
  folderId,
  folderName,
  authorName,
  authorRole,
  backHref,
  onClose,
  initialCommentsOpen = false,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [index, setIndex] = useState(initialIndex);
  const [commentOpen, setCommentOpen] = useState(initialCommentsOpen);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>(
    Object.fromEntries(files.map((f) => [f.id, f.unreadCount]))
  );
  const totalComments = Object.fromEntries(files.map((f) => [f.id, f.totalComments]));

  const file = files[index];
  const isImage = file?.effectiveType === "image";
  const isPdf = file?.effectiveType === "pdf";
  const hasPrev = index > 0;
  const hasNext = index < files.length - 1;
  const unread = unreadCounts[file?.id] ?? 0;
  const total = totalComments[file?.id] ?? 0;

  const go = useCallback(
    (newIndex: number) => {
      setIndex(newIndex);
      setCommentOpen(false);
      if (!onClose) {
        router.replace(
          `/wykonawca/projekty/${assignmentId}/foldery/${folderId}/pliki/${files[newIndex].id}`,
          { scroll: false }
        );
      }
    },
    [router, assignmentId, folderId, files, onClose]
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft" && hasPrev) go(index - 1);
      if (e.key === "ArrowRight" && hasNext) go(index + 1);
      if (e.key === "Escape") { if (onClose) onClose(); else router.push(backHref); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, hasPrev, hasNext, go, router, backHref, onClose]);

  function openComments() {
    setCommentOpen(true);
    if ((unreadCounts[file.id] ?? 0) > 0) {
      setUnreadCounts((prev) => ({ ...prev, [file.id]: 0 }));
      fetch("/api/contractor-file-comments/mark-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId: file.id, role: authorRole }),
      }).catch(() => {});
    }
  }

  // Auto-open comments when navigated from a notification (?comments=1) — only for route mode
  useEffect(() => {
    if (onClose) return; // overlay mode: initialCommentsOpen handles this
    if (searchParams.get("comments") === "1" && file) {
      openComments();
      router.replace(
        `/wykonawca/projekty/${assignmentId}/foldery/${folderId}/pliki/${file.id}`,
        { scroll: false }
      );
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!file) return null;

  return (
    <div className="flex flex-col h-full bg-card rounded-tl-2xl overflow-hidden">
      {/* Header bar */}
      <div className="border-b bg-card flex-shrink-0">
        <div className="flex items-center gap-3 px-4 py-2.5">
          {/* Back arrow */}
          {onClose ? (
            <button
              onClick={onClose}
              className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
          ) : (
            <Link
              href={backHref}
              className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft size={20} />
            </Link>
          )}
          <div className="w-px h-4 bg-border flex-shrink-0" />

          {/* Breadcrumb */}
          <nav className="flex items-center gap-1 min-w-0 flex-1 text-sm overflow-hidden">
            {onClose ? (
              <button
                onClick={onClose}
                className="min-w-0 shrink text-muted-foreground hover:text-foreground transition-colors font-medium truncate max-w-[160px]"
              >
                {folderName}
              </button>
            ) : (
              <Link
                href={backHref}
                className="min-w-0 shrink text-muted-foreground hover:text-foreground transition-colors font-medium truncate max-w-[160px]"
              >
                {folderName}
              </Link>
            )}
            <ChevronLeft size={13} className="flex-shrink-0 text-muted-foreground/40 rotate-180" />
            <span className="text-foreground font-semibold truncate min-w-0 shrink">
              {file.name}
            </span>
          </nav>

          {/* Toolbar */}
          <div className="ml-auto flex items-center gap-1 flex-shrink-0">
            <button
              onClick={commentOpen ? () => setCommentOpen(false) : openComments}
              className={`relative flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md border transition-colors ${
                commentOpen
                  ? "bg-primary text-primary-foreground border-primary"
                  : unread > 0
                  ? "border-violet-400 text-violet-600 bg-violet-50 dark:bg-violet-950/30 dark:text-violet-400 dark:border-violet-700"
                  : "border-transparent text-muted-foreground hover:bg-muted"
              }`}
              title="Komentarze"
            >
              <MessageSquare size={14} />
              <span className="hidden sm:inline">Komentarze</span>
              {(unread > 0 || total > 0) && (
                <span className={`absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 text-[10px] font-bold rounded-full flex items-center justify-center leading-none ${
                  commentOpen
                    ? "bg-primary-foreground text-primary"
                    : unread > 0
                    ? "bg-violet-600 text-white"
                    : "bg-muted-foreground/30 text-foreground"
                }`}>
                  {unread > 0 ? (unread > 9 ? "9+" : unread) : total > 9 ? "9+" : total}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Content row */}
      <div className="flex flex-1 min-h-0">
        {/* Left sidebar — file thumbnails */}
        <div className="hidden md:flex w-44 border-r bg-card flex-col flex-shrink-0 overflow-hidden">
          <div className="px-3 py-2.5 border-b flex-shrink-0">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Pliki ({files.length})
            </p>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {files.map((f, i) => (
              <button
                key={f.id}
                onClick={() => go(i)}
                className={`w-full text-left rounded-lg overflow-hidden border-2 transition-colors ${
                  i === index
                    ? "border-primary"
                    : "border-transparent hover:border-border"
                }`}
              >
                <div className="aspect-video bg-muted overflow-hidden flex items-center justify-center">
                  {f.effectiveType === "image" && f.displayUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={f.displayUrl} alt={f.name} className="w-full h-full object-cover" />
                  ) : (
                    <FileText size={20} className="text-muted-foreground/40" />
                  )}
                </div>
                <p
                  className={`text-xs px-1.5 py-1 truncate ${
                    i === index ? "text-primary font-semibold" : "text-muted-foreground"
                  }`}
                >
                  {f.name}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Image area */}
        <div className="flex-1 relative bg-muted">
          {/* Left arrow */}
          {hasPrev && (
            <button
              onClick={() => go(index - 1)}
              className="absolute left-3 top-1/2 -translate-y-1/2 z-10 bg-white/80 hover:bg-white dark:bg-gray-800/80 dark:hover:bg-gray-800 border border-border rounded-full p-2 shadow-md text-muted-foreground hover:text-foreground transition-all opacity-60 hover:opacity-100"
            >
              <ChevronLeft size={20} />
            </button>
          )}
          {/* Right arrow */}
          {hasNext && (
            <button
              onClick={() => go(index + 1)}
              className="absolute right-3 top-1/2 -translate-y-1/2 z-10 bg-white/80 hover:bg-white dark:bg-gray-800/80 dark:hover:bg-gray-800 border border-border rounded-full p-2 shadow-md text-muted-foreground hover:text-foreground transition-all opacity-60 hover:opacity-100"
            >
              <ChevronRight size={20} />
            </button>
          )}

          {/* File display */}
          <div className="absolute inset-0 flex items-center justify-center p-6 overflow-auto">
            {isImage && file.displayUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={file.displayUrl}
                alt={file.name}
                className="max-w-full max-h-full object-contain"
              />
            ) : isPdf && file.displayUrl ? (
              <iframe
                src={file.displayUrl}
                className="w-full h-full bg-white rounded"
                title={file.name}
              />
            ) : (
              <div className="flex flex-col items-center gap-4 text-muted-foreground/50">
                <FileText size={64} />
                <p className="text-sm">{file.name}</p>
              </div>
            )}
          </div>

          {/* Comment panel — slides in from right */}
          {commentOpen && (
            <div className="absolute top-0 right-0 h-full z-20">
              <ContractorFileCommentPanel
                fileId={file.id}
                fileName={file.name}
                authorName={authorName}
                authorRole={authorRole}
                onClose={() => setCommentOpen(false)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
