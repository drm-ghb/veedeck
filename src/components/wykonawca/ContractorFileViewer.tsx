"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronRight, FileText, MessageSquare, ZoomIn, ZoomOut, X, Maximize2, Pin, Send, Trash2, Edit2, Loader2 } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import ContractorFileCommentPanel from "./ContractorFileCommentPanel";
import PdfViewer from "@/components/render/PdfViewer";
import { pusherClient } from "@/lib/pusher";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";

interface FileItem {
  id: string;
  name: string;
  displayUrl: string | null;
  effectiveType: string;
  unreadCount: number;
  totalComments: number;
}

interface PinReply {
  id: string;
  content: string;
  author: string;
  authorRole: string;
  createdAt: string;
}

interface PinComment {
  id: string;
  title: string | null;
  content: string;
  author: string;
  authorRole: string;
  posX: number;
  posY: number;
  createdAt: string;
  replies: PinReply[];
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
  fileRouteBase?: string;
  onClose?: () => void;
  initialCommentsOpen?: boolean;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getPopupStyle(
  x: number,
  y: number,
  imgEl: HTMLDivElement | null,
  popupWidth = 288,
): React.CSSProperties {
  if (!imgEl || typeof window === "undefined") {
    return {
      left: x > 55 ? `calc(${x}% - ${popupWidth}px)` : `calc(${x}% + 24px)`,
      top: y > 60 ? `calc(${y}% - 220px)` : `calc(${y}% + 10px)`,
    };
  }
  const rect = imgEl.getBoundingClientRect();
  const popupH = 400;
  const pad = 8;
  const pinX = rect.left + (x / 100) * rect.width;
  const pinY = rect.top + (y / 100) * rect.height;
  let left = pinX + 24;
  if (left + popupWidth > window.innerWidth - pad) left = pinX - popupWidth - 8;
  left = Math.max(pad, Math.min(left, window.innerWidth - popupWidth - pad));
  let top = pinY - 20;
  if (top + popupH > window.innerHeight - pad) top = window.innerHeight - popupH - pad;
  top = Math.max(pad, top);
  return { position: "fixed", left, top };
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
  fileRouteBase,
  onClose,
  initialCommentsOpen = false,
}: Props) {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [index, setIndex] = useState(initialIndex);
  const [commentOpen, setCommentOpen] = useState(initialCommentsOpen);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>(
    Object.fromEntries(files.map((f) => [f.id, f.unreadCount]))
  );
  const totalComments = Object.fromEntries(files.map((f) => [f.id, f.totalComments]));

  // Lightbox
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const lastPinchDistRef = useRef(0);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const touchPanRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const lightboxContainerRef = useRef<HTMLDivElement>(null);
  const lightboxImgRef = useRef<HTMLDivElement>(null);

  // PDF
  const [pdfPage, setPdfPage] = useState(1);
  const [, setPdfTotalPages] = useState(1);
  const [pdfZoom, setPdfZoom] = useState(1);

  // Pins
  const [pinMode, setPinMode] = useState(false);
  const [hidePins, setHidePins] = useState(false);
  const [pins, setPins] = useState<PinComment[]>([]);
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  const [pending, setPending] = useState<{ x: number; y: number } | null>(null);
  const [newPinContent, setNewPinContent] = useState("");
  const [newPinTitle, setNewPinTitle] = useState("");
  const [addingPin, setAddingPin] = useState(false);
  const [pinReplyContent, setPinReplyContent] = useState("");
  const [replyingPin, setReplyingPin] = useState(false);
  const [dragPos, setDragPos] = useState<{ id: string; x: number; y: number } | null>(null);
  const [hoveredPinId, setHoveredPinId] = useState<string | null>(null);
  const [openPinMenu, setOpenPinMenu] = useState(false);
  const [editingPinId, setEditingPinId] = useState<string | null>(null);
  const [editingPinText, setEditingPinText] = useState("");
  const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
  const [editingReplyText, setEditingReplyText] = useState("");

  const imgRef = useRef<HTMLDivElement>(null);
  const draggingPinRef = useRef<{ pinId: string; imgEl: HTMLDivElement } | null>(null);
  const dragPosRef = useRef<{ id: string; x: number; y: number } | null>(null);
  const dragStartPxRef = useRef<{ x: number; y: number } | null>(null);
  const didDragRef = useRef(false);
  const pendingActionsRef = useRef<{ submit: () => void; cancel: () => void; hasContent: () => boolean }>({
    submit: () => {},
    cancel: () => {},
    hasContent: () => false,
  });
  const pinHoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const file = files[index];
  const isImage = file?.effectiveType === "image";
  const isPdf = file?.effectiveType === "pdf";
  const hasPrev = index > 0;
  const hasNext = index < files.length - 1;
  const unread = unreadCounts[file?.id] ?? 0;
  const total = totalComments[file?.id] ?? 0;
  const selectedPin = selectedPinId ? pins.find((p) => p.id === selectedPinId) ?? null : null;
  const selectedPinIndex = selectedPinId ? pins.findIndex((p) => p.id === selectedPinId) : -1;

  const go = useCallback(
    (newIndex: number) => {
      setIndex(newIndex);
      setCommentOpen(false);
      setLightboxOpen(false);
      setZoom(1);
      setPanX(0);
      setPanY(0);
      setPdfPage(1);
      setPinMode(false);
      setPending(null);
      setSelectedPinId(null);
      setNewPinContent("");
      setNewPinTitle("");
      setPins([]);
      if (!onClose) {
        const base = fileRouteBase ?? `/wykonawca/projekty/${assignmentId}/foldery/${folderId}/pliki`;
        router.replace(`${base}/${files[newIndex].id}`, { scroll: false });
      }
    },
    [router, assignmentId, folderId, files, onClose, fileRouteBase]
  );

  // Load pins when file changes
  useEffect(() => {
    if (!file) return;
    let cancelled = false;
    fetch(`/api/contractor-file-comments?fileId=${file.id}`)
      .then((r) => r.json())
      .then((data: Array<PinComment & { posX: number | null; posY: number | null }>) => {
        if (!cancelled) {
          setPins(data.filter((c) => c.posX != null && c.posY != null) as PinComment[]);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [file?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Pusher subscription for real-time pin updates
  useEffect(() => {
    if (!file) return;
    const channel = pusherClient.subscribe(`contractor-file-${file.id}`);

    channel.bind("new-comment", (comment: PinComment & { posX: number | null; posY: number | null }) => {
      if (comment.posX == null || comment.posY == null) return;
      setPins((prev) => {
        if (prev.find((p) => p.id === comment.id)) return prev;
        return [...prev, { ...comment, posX: comment.posX!, posY: comment.posY! }];
      });
    });

    channel.bind("comment-deleted", ({ id }: { id: string }) => {
      setPins((prev) => prev.filter((p) => p.id !== id));
      setSelectedPinId((prev) => (prev === id ? null : prev));
    });

    channel.bind("pin-moved", ({ id, posX, posY }: { id: string; posX: number; posY: number }) => {
      setPins((prev) => prev.map((p) => p.id === id ? { ...p, posX, posY } : p));
    });

    channel.bind("comment-edited", ({ id, content }: { id: string; content: string }) => {
      setPins((prev) => prev.map((p) => p.id === id ? { ...p, content } : p));
    });

    channel.bind("comment-reply", ({ commentId, reply }: { commentId: string; reply: PinReply }) => {
      setPins((prev) =>
        prev.map((p) =>
          p.id === commentId
            ? { ...p, replies: p.replies.find((r) => r.id === reply.id) ? p.replies : [...p.replies, reply] }
            : p
        )
      );
    });

    channel.bind("reply-deleted", ({ commentId, replyId }: { commentId: string; replyId: string }) => {
      setPins((prev) =>
        prev.map((p) =>
          p.id === commentId ? { ...p, replies: p.replies.filter((r) => r.id !== replyId) } : p
        )
      );
    });

    return () => {
      channel.unbind_all();
      pusherClient.unsubscribe(`contractor-file-${file.id}`);
    };
  }, [file?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft" && hasPrev) go(index - 1);
      if (e.key === "ArrowRight" && hasNext) go(index + 1);
      if (e.key === "Escape") {
        if (pending) { cancelPending(); return; }
        if (selectedPinId) { setSelectedPinId(null); return; }
        if (lightboxOpen) { setLightboxOpen(false); setZoom(1); setPanX(0); setPanY(0); return; }
        if (onClose) onClose(); else router.push(backHref);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, hasPrev, hasNext, go, router, backHref, onClose, lightboxOpen, pending, selectedPinId]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // Auto-open from notification
  useEffect(() => {
    if (onClose) return;
    const pinId = searchParams.get("pinId");
    if (pinId) {
      // Will auto-select pin once pins load — handled after load
      return;
    }
    if (searchParams.get("comments") === "1" && file) {
      openComments();
      const base = fileRouteBase ?? `/wykonawca/projekty/${assignmentId}/foldery/${folderId}/pliki`;
      router.replace(`${base}/${file.id}`, { scroll: false });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-select pin from URL ?pinId=
  useEffect(() => {
    const pinId = searchParams.get("pinId");
    if (pinId && pins.some((p) => p.id === pinId)) {
      setSelectedPinId(pinId);
      if (!onClose) {
        const base = fileRouteBase ?? `/wykonawca/projekty/${assignmentId}/foldery/${folderId}/pliki`;
        router.replace(`${base}/${file.id}`, { scroll: false });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pins]);

  // Click outside pending pin popup → submit or cancel
  useEffect(() => {
    if (!pending) return;
    function handleMouseDown(e: MouseEvent) {
      const popups = document.querySelectorAll("[data-new-pin-popup]");
      if (Array.from(popups).some((p) => p.contains(e.target as Node))) return;
      if (pendingActionsRef.current.hasContent()) {
        pendingActionsRef.current.submit();
      } else {
        pendingActionsRef.current.cancel();
      }
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [pending]);

  // Global drag listeners
  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!draggingPinRef.current) return;
      if (dragStartPxRef.current) {
        const dx = Math.abs(e.clientX - dragStartPxRef.current.x);
        const dy = Math.abs(e.clientY - dragStartPxRef.current.y);
        if (dx > 5 || dy > 5) {
          didDragRef.current = true;
          document.body.style.cursor = "grabbing";
        }
      }
      const rect = draggingPinRef.current.imgEl.getBoundingClientRect();
      const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
      const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
      const pos = { id: draggingPinRef.current.pinId, x, y };
      dragPosRef.current = pos;
      setDragPos({ ...pos });
    }

    async function onMouseUp() {
      if (!draggingPinRef.current) return;
      const { pinId } = draggingPinRef.current;
      const pos = dragPosRef.current ? { ...dragPosRef.current } : null;
      draggingPinRef.current = null;
      dragPosRef.current = null;
      dragStartPxRef.current = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";

      if (!didDragRef.current || !pos) {
        didDragRef.current = false;
        setDragPos(null);
        return;
      }

      setPins((prev) => prev.map((p) => p.id === pinId ? { ...p, posX: pos.x, posY: pos.y } : p));
      setDragPos(null);
      setTimeout(() => { didDragRef.current = false; }, 50);

      const res = await fetch(`/api/contractor-file-comments/${pinId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ posX: pos.x, posY: pos.y }),
      });
      if (!res.ok) toast.error(t.wykonawcy.pinSaveError);
    }

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function startPinDrag(e: React.MouseEvent, pinId: string, imgEl: HTMLDivElement | null) {
    if (!imgEl) return;
    e.stopPropagation();
    e.preventDefault();
    didDragRef.current = false;
    dragStartPxRef.current = { x: e.clientX, y: e.clientY };
    draggingPinRef.current = { pinId, imgEl };
    document.body.style.userSelect = "none";
    const rect = imgEl.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    const pos = { id: pinId, x, y };
    dragPosRef.current = pos;
    setDragPos(pos);
  }

  function handleImageClick(e: React.MouseEvent<HTMLDivElement>) {
    if (didDragRef.current) return;
    if (!pinMode) {
      if (isImage) setLightboxOpen(true);
      return;
    }
    if (pending) return;
    const rect = imgRef.current!.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setPending({ x, y });
    setNewPinContent("");
    setNewPinTitle("");
    setSelectedPinId(null);
  }

  function cancelPending() {
    setPending(null);
    setNewPinContent("");
    setNewPinTitle("");
  }

  async function submitPin() {
    if (!pending || !newPinContent.trim()) return;
    setAddingPin(true);
    try {
      const res = await fetch("/api/contractor-file-comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileId: file.id,
          title: newPinTitle.trim() || null,
          content: newPinContent.trim(),
          posX: pending.x,
          posY: pending.y,
          author: authorName,
          authorRole,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || t.wykonawcy.pinAddError);
        return;
      }
      const created: PinComment = await res.json();
      setPins((prev) => prev.some((p) => p.id === created.id) ? prev : [...prev, created]);
      cancelPending();
      toast.success(t.wykonawcy.pinAdded);
    } catch {
      toast.error(t.wykonawcy.pinAddError);
    } finally {
      setAddingPin(false);
    }
  }

  async function deletePin(pinId: string) {
    const res = await fetch(`/api/contractor-file-comments/${pinId}`, { method: "DELETE" });
    if (res.ok) {
      setPins((prev) => prev.filter((p) => p.id !== pinId));
      setSelectedPinId(null);
      toast.success(t.wykonawcy.pinDeleted);
    } else {
      toast.error(t.wykonawcy.pinDeleteError);
    }
  }

  async function submitPinReply(pinId: string) {
    const content = pinReplyContent.trim();
    if (!content || replyingPin) return;
    setReplyingPin(true);
    try {
      const res = await fetch(`/api/contractor-file-comments/${pinId}/replies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, author: authorName, authorRole }),
      });
      if (!res.ok) throw new Error();
      setPinReplyContent("");
    } catch {
      toast.error(t.wykonawcy.replyError);
    } finally {
      setReplyingPin(false);
    }
  }

  async function handleEditPin(pinId: string, content: string) {
    const trimmed = content.trim();
    if (!trimmed) return;
    const res = await fetch(`/api/contractor-file-comments/${pinId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: trimmed }),
    });
    if (res.ok) {
      setPins((prev) => prev.map((p) => p.id === pinId ? { ...p, content: trimmed } : p));
      setEditingPinId(null);
    } else {
      toast.error(t.wykonawcy.pinEditError);
    }
  }

  async function handleEditReply(pinId: string, replyId: string, content: string) {
    const trimmed = content.trim();
    if (!trimmed) return;
    const res = await fetch(`/api/contractor-file-comments/${pinId}/replies/${replyId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: trimmed }),
    });
    if (res.ok) {
      setPins((prev) =>
        prev.map((p) =>
          p.id !== pinId ? p : { ...p, replies: p.replies.map((r) => r.id === replyId ? { ...r, content: trimmed } : r) }
        )
      );
      setEditingReplyId(null);
    } else {
      toast.error(t.wykonawcy.replyEditError);
    }
  }

  async function handleDeleteReply(pinId: string, replyId: string) {
    const res = await fetch(`/api/contractor-file-comments/${pinId}/replies/${replyId}`, { method: "DELETE" });
    if (!res.ok) toast.error(t.wykonawcy.replyDeleteError);
  }

  function handlePinMouseEnter(id: string) {
    if (pinHoverTimer.current) clearTimeout(pinHoverTimer.current);
    setHoveredPinId(id);
  }
  function handlePinMouseLeave() {
    pinHoverTimer.current = setTimeout(() => setHoveredPinId(null), 150);
  }

  pendingActionsRef.current = {
    submit: submitPin,
    cancel: cancelPending,
    hasContent: () => !!newPinContent.trim(),
  };

  const isDesigner = authorRole === "designer";

  if (!file) return null;

  return (
    <>
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
            {/* Pin mode toggle (images only) */}
            {isImage && (
              <>
                <button
                  onClick={() => { setPinMode((v) => !v); setPending(null); setSelectedPinId(null); }}
                  className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md border transition-colors ${
                    pinMode
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-transparent text-muted-foreground hover:bg-muted"
                  }`}
                  title={t.wykonawcy.addPin}
                >
                  <Pin size={14} />
                  <span className="hidden sm:inline">{t.wykonawcy.addPin}</span>
                </button>
                <button
                  onClick={() => setHidePins((v) => !v)}
                  title={hidePins ? t.wykonawcy.showPins : t.wykonawcy.hidePins}
                  className={`flex items-center justify-center w-8 h-8 rounded-md border transition-colors ${
                    hidePins
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-transparent text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <svg viewBox="0 0 24 24" className="w-[15px] h-[15px]" fill="currentColor"><path d="M16 9V4h1c.55 0 1-.45 1-1s-.45-1-1-1H7c-.55 0-1 .45-1 1s.45 1 1 1h1v5c0 1.66-1.34 3-3 3h10c-1.66 0-3-1.34-3-3zm-3 12v-6h-2v6c0 .55.45 1 1 1s1-.45 1-1z"/><path d="M3.51 3.51c-.39.39-.39 1.02 0 1.41l15.56 15.57c.39.39 1.02.39 1.41 0s.39-1.02 0-1.41L4.93 3.51c-.39-.39-1.02-.39-1.42 0z"/></svg>
                </button>
                {/* Separator */}
                <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-1" />
              </>
            )}
            {/* Comments button */}
            <button
              onClick={commentOpen ? () => setCommentOpen(false) : openComments}
              className={`relative flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md border transition-colors ${
                commentOpen
                  ? "bg-primary text-primary-foreground border-primary"
                  : unread > 0
                  ? "border-violet-400 text-violet-600 bg-violet-50 dark:bg-violet-950/30 dark:text-violet-400 dark:border-violet-700"
                  : "border-transparent text-muted-foreground hover:bg-muted"
              }`}
              title={t.wykonawcy.commentsTitle}
            >
              <MessageSquare size={14} />
              <span className="hidden sm:inline">{t.wykonawcy.commentsTitle}</span>
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
              {t.wykonawcy.filesLabel} ({files.length})
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

          {/* PDF zoom controls */}
          {isPdf && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 bg-black/50 backdrop-blur-sm rounded-full px-3 py-1.5 text-white text-sm select-none">
              <button
                onClick={() => setPdfZoom((z) => Math.max(0.5, Math.round((z - 0.25) * 100) / 100))}
                disabled={pdfZoom <= 0.5}
                className="p-0.5 rounded hover:bg-white/20 disabled:opacity-40 transition-colors"
              >
                <ZoomOut size={14} />
              </button>
              <span className="tabular-nums w-10 text-center">{Math.round(pdfZoom * 100)}%</span>
              <button
                onClick={() => setPdfZoom((z) => Math.min(3, Math.round((z + 0.25) * 100) / 100))}
                disabled={pdfZoom >= 3}
                className="p-0.5 rounded hover:bg-white/20 disabled:opacity-40 transition-colors"
              >
                <ZoomIn size={14} />
              </button>
            </div>
          )}

          {/* Pin mode cursor hint */}
          {pinMode && isImage && !pending && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 bg-primary/90 text-primary-foreground text-xs px-3 py-1.5 rounded-full shadow pointer-events-none select-none">
              {t.wykonawcy.clickToAddPin}
            </div>
          )}

          {/* File display */}
          <div className="absolute inset-0 z-0 flex items-center overflow-hidden p-4 sm:p-6">
            {isImage && file.displayUrl ? (
              <div
                ref={imgRef}
                className={`relative select-none max-w-full mx-auto ${pinMode ? "cursor-crosshair" : "cursor-zoom-in"}`}
                onClick={handleImageClick}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={file.displayUrl}
                  alt={file.name}
                  className="block rounded-lg shadow-sm max-w-full"
                  style={{ maxHeight: "calc(100vh - 180px)" }}
                  draggable={false}
                />
                {!pinMode && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setLightboxOpen(true); }}
                    className="absolute top-2 right-2 p-1.5 bg-black/40 hover:bg-black/60 text-white rounded-md transition-colors"
                    title={t.wykonawcy.fullscreen}
                  >
                    <Maximize2 size={14} />
                  </button>
                )}

                {/* Comment pins */}
                {!hidePins && pins.map((pin, i) => {
                  const canDrag = selectedPinId !== pin.id && pin.author === authorName;
                  const pinX = dragPos?.id === pin.id ? dragPos.x : pin.posX;
                  const pinY = dragPos?.id === pin.id ? dragPos.y : pin.posY;
                  return (
                    <div
                      key={pin.id}
                      className="absolute z-10"
                      style={{ left: `calc(${pinX}% - 14px)`, top: `calc(${pinY}% - 14px)` }}
                      onMouseEnter={() => !draggingPinRef.current && handlePinMouseEnter(pin.id)}
                      onMouseLeave={handlePinMouseLeave}
                    >
                      <button
                        className={`w-7 h-7 rounded-full border-2 border-white text-white text-xs font-bold flex items-center justify-center shadow-lg ${
                          dragPos?.id === pin.id
                            ? "transition-none cursor-grabbing"
                            : `transition-transform hover:scale-110 ${canDrag ? "cursor-grab" : ""}`
                        } ${pin.authorRole === "designer" ? "bg-slate-400" : "bg-violet-500"} ${selectedPinId === pin.id ? "scale-125 ring-2 ring-white ring-offset-1" : ""}`}
                        onMouseDown={canDrag ? (e) => startPinDrag(e, pin.id, imgRef.current) : undefined}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (didDragRef.current) { didDragRef.current = false; return; }
                          setSelectedPinId(pin.id === selectedPinId ? null : pin.id);
                          setPending(null);
                          setPinReplyContent("");
                          setOpenPinMenu(false);
                        }}
                      >
                        {i + 1}
                      </button>

                      {/* Hover preview */}
                      {hoveredPinId === pin.id && selectedPinId !== pin.id && (
                        <div
                          className="fixed z-50 bg-card rounded-xl shadow-xl border border-border p-3 w-56"
                          style={getPopupStyle(pin.posX, pin.posY, imgRef.current, 224)}
                          onMouseEnter={() => handlePinMouseEnter(pin.id)}
                          onMouseLeave={handlePinMouseLeave}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <p className="text-xs font-medium text-muted-foreground mb-1 truncate">{pin.author}</p>
                          <p className="text-sm text-foreground leading-snug line-clamp-3">
                            {pin.title || pin.content}
                          </p>
                          {pin.replies.length > 0 && (
                            <p className="text-xs text-muted-foreground mt-1.5">
                              {pin.replies.length} {pin.replies.length === 1 ? t.wykonawcy.reply1 : t.wykonawcy.replyMany}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Pending pin dot */}
                {pending && (
                  <div
                    className={`absolute w-7 h-7 rounded-full border-2 border-white text-white text-xs font-bold flex items-center justify-center shadow-lg z-10 animate-pulse pointer-events-none ${authorRole === "designer" ? "bg-slate-400" : "bg-violet-500"}`}
                    style={{
                      left: `calc(${pending.x}% - 14px)`,
                      top: `calc(${pending.y}% - 14px)`,
                    }}
                  >
                    +
                  </div>
                )}

                {/* New pin popup */}
                {pending && (
                  <div
                    data-new-pin-popup=""
                    className="fixed z-50 bg-card rounded-xl shadow-xl border border-border p-4 w-64"
                    style={getPopupStyle(pending.x, pending.y, imgRef.current, 256)}
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t.wykonawcy.newPin}</h3>
                      <button onClick={cancelPending} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
                        <X size={14} />
                      </button>
                    </div>
                    <Input
                      value={newPinTitle}
                      onChange={(e) => setNewPinTitle(e.target.value)}
                      placeholder={t.wykonawcy.pinTitlePlaceholder}
                      className="mb-2 text-sm"
                      onKeyDown={(e) => { if (e.key === "Escape") cancelPending(); }}
                    />
                    <div className="relative mb-3">
                      <Textarea
                        value={newPinContent}
                        onChange={(e) => setNewPinContent(e.target.value)}
                        placeholder={t.wykonawcy.pinContentPlaceholder}
                        className="text-sm resize-none pr-10 max-h-40 overflow-y-auto"
                        rows={3}
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && e.ctrlKey) submitPin();
                          if (e.key === "Escape") cancelPending();
                        }}
                      />
                      <button
                        type="button"
                        disabled={addingPin}
                        onClick={newPinContent.trim() ? submitPin : undefined}
                        title={t.wykonawcy.addPin}
                        className="absolute right-2 bottom-2 z-10 flex items-center justify-center w-8 h-8 rounded-md transition-colors text-muted-foreground hover:text-foreground disabled:opacity-40"
                      >
                        {addingPin ? (
                          <Loader2 size={30} className="animate-spin" />
                        ) : (
                          <Send size={30} />
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Thread popup for existing pin */}
                {selectedPin && (
                  <div
                    className="fixed z-50 bg-card rounded-xl shadow-xl border border-border w-72 flex flex-col"
                    style={{
                      ...getPopupStyle(selectedPin.posX, selectedPin.posY, imgRef.current, 288),
                      maxHeight: "360px",
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Thread header */}
                    <div className="flex items-center gap-2 px-4 py-3 border-b flex-shrink-0">
                      <span className={`w-5 h-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0 ${selectedPin.authorRole === "designer" ? "bg-slate-400" : "bg-violet-500"}`}>
                        {selectedPinIndex + 1}
                      </span>
                      <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate flex-1">
                        {selectedPin.title || `Pin #${selectedPinIndex + 1}`}
                      </span>
                      {(isDesigner || selectedPin.author === authorName) && (
                        <div className="relative flex-shrink-0">
                          <button
                            onClick={() => setOpenPinMenu((v) => !v)}
                            className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-muted transition-colors"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                          </button>
                          {openPinMenu && (
                            <div className="absolute right-0 top-full mt-1 bg-popover border border-border rounded-xl shadow-lg z-[60] py-1 min-w-[130px]">
                              {selectedPin.author === authorName && (
                                <button
                                  onClick={() => { setEditingPinId(selectedPin.id); setEditingPinText(selectedPin.content); setOpenPinMenu(false); }}
                                  className="w-full text-left px-3 py-2 text-xs hover:bg-muted flex items-center gap-2 transition-colors"
                                >
                                  <Edit2 size={12} className="text-muted-foreground" /> {t.common.edit}
                                </button>
                              )}
                              {(isDesigner || selectedPin.author === authorName) && (
                                <button
                                  onClick={() => { deletePin(selectedPin.id); setOpenPinMenu(false); }}
                                  className="w-full text-left px-3 py-2 text-xs text-destructive hover:bg-destructive/10 flex items-center gap-2 transition-colors"
                                >
                                  <Trash2 size={12} /> {t.wykonawcy.deletePin}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                      <button
                        onClick={() => { setSelectedPinId(null); setPinReplyContent(""); setOpenPinMenu(false); }}
                        className="text-gray-400 hover:text-gray-700 flex-shrink-0"
                      >
                        <X size={14} />
                      </button>
                    </div>

                    {/* Thread messages */}
                    <div className="flex-1 overflow-y-auto divide-y divide-gray-100 min-h-0">
                      {/* Original comment */}
                      <div className="px-4 py-3 group">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">{selectedPin.author}</span>
                          <span className="text-[10px] text-gray-400">{formatDate(selectedPin.createdAt)}</span>
                        </div>
                        {editingPinId === selectedPin.id ? (
                          <div className="flex flex-col gap-1">
                            <textarea
                              autoFocus
                              value={editingPinText}
                              onChange={(e) => setEditingPinText(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleEditPin(selectedPin.id, editingPinText); }
                                if (e.key === "Escape") setEditingPinId(null);
                              }}
                              className="w-full px-2 py-1.5 text-sm rounded-lg border border-primary bg-background focus:outline-none focus:ring-1 focus:ring-primary/30 resize-none"
                              rows={2}
                            />
                            <div className="flex gap-1 justify-end">
                              <button onClick={() => setEditingPinId(null)} className="px-2 py-1 text-xs text-gray-400 hover:text-gray-700 transition-colors">{t.common.cancel}</button>
                              <button onClick={() => handleEditPin(selectedPin.id, editingPinText)} className="px-2 py-1 text-xs bg-primary text-primary-foreground rounded-lg hover:opacity-90">{t.common.save}</button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{selectedPin.content}</p>
                        )}
                      </div>

                      {/* Replies */}
                      {selectedPin.replies.map((r) => (
                        <div key={r.id} className="px-4 py-3 bg-muted/50 group">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">{r.author}</span>
                            <span className="text-[10px] text-gray-400">{formatDate(r.createdAt)}</span>
                            {(r.author === authorName || isDesigner) && (
                              <div className="ml-auto opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity">
                                {r.author === authorName && (
                                  <button
                                    onClick={() => { setEditingReplyId(r.id); setEditingReplyText(r.content); }}
                                    className="p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-muted transition-colors"
                                  >
                                    <Edit2 size={11} />
                                  </button>
                                )}
                                {(isDesigner || r.author === authorName) && (
                                  <button
                                    onClick={() => handleDeleteReply(selectedPin.id, r.id)}
                                    className="p-1 rounded text-gray-400 hover:text-destructive hover:bg-destructive/10 transition-colors"
                                  >
                                    <Trash2 size={11} />
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                          {editingReplyId === r.id ? (
                            <div className="flex flex-col gap-1">
                              <textarea
                                autoFocus
                                value={editingReplyText}
                                onChange={(e) => setEditingReplyText(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleEditReply(selectedPin.id, r.id, editingReplyText); }
                                  if (e.key === "Escape") setEditingReplyId(null);
                                }}
                                className="w-full px-2 py-1.5 text-sm rounded-lg border border-primary bg-background focus:outline-none focus:ring-1 focus:ring-primary/30 resize-none"
                                rows={2}
                              />
                              <div className="flex gap-1 justify-end">
                                <button onClick={() => setEditingReplyId(null)} className="px-2 py-1 text-xs text-gray-400 hover:text-gray-700 transition-colors">{t.common.cancel}</button>
                                <button onClick={() => handleEditReply(selectedPin.id, r.id, editingReplyText)} className="px-2 py-1 text-xs bg-primary text-primary-foreground rounded-lg hover:opacity-90">{t.common.save}</button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{r.content}</p>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Reply input */}
                    <div className="px-3 py-2.5 border-t flex-shrink-0 flex items-end gap-2">
                      <textarea
                        value={pinReplyContent}
                        onChange={(e) => setPinReplyContent(e.target.value)}
                        placeholder={t.wykonawcy.replyPlaceholder}
                        rows={1}
                        style={{ height: "36px", overflowY: "hidden" }}
                        className="flex-1 min-h-9 px-3 py-2 text-sm resize-none rounded-xl bg-muted focus:outline-none max-h-32"
                        onInput={(e) => {
                          const t = e.currentTarget;
                          t.style.height = "auto";
                          t.style.height = Math.min(t.scrollHeight, 128) + "px";
                          t.style.overflowY = t.scrollHeight > 128 ? "auto" : "hidden";
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitPinReply(selectedPin.id); }
                        }}
                      />
                      <button
                        onClick={() => submitPinReply(selectedPin.id)}
                        disabled={!pinReplyContent.trim() || replyingPin}
                        className="flex-shrink-0 flex items-center justify-center w-8 h-8 text-primary disabled:opacity-40 hover:opacity-90 transition-colors"
                      >
                        <Send size={18} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : isPdf && file.displayUrl ? (
              <PdfViewer
                url={file.displayUrl}
                page={pdfPage}
                onTotalPages={setPdfTotalPages}
                onPageChange={setPdfPage}
                zoom={pdfZoom}
              />
            ) : (
              <div className="flex flex-col items-center gap-4 text-muted-foreground/50">
                <FileText size={64} />
                <p className="text-sm">{file.name}</p>
              </div>
            )}
          </div>

        </div>

        {/* Comment panel — right of image area */}
        {commentOpen && (
          <ContractorFileCommentPanel
            fileId={file.id}
            fileName={file.name}
            authorName={authorName}
            authorRole={authorRole}
            onClose={() => setCommentOpen(false)}
            mode="sidebar"
          />
        )}
      </div>
    </div>

    {/* Lightbox */}
    {lightboxOpen && isImage && file.displayUrl && (
      <div className="fixed inset-0 z-50 bg-black/95 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 flex-shrink-0 border-b border-white/10">
          <span className="text-white font-semibold truncate max-w-[40vw]">{file.name}</span>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => { setPinMode((v) => !v); setPending(null); setSelectedPinId(null); }}
              className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md font-medium transition-colors ${pinMode ? "bg-white/20 text-white" : "bg-white text-black hover:bg-white/90"}`}
            >
              <Pin size={14} /> {pinMode ? t.common.cancel : t.wykonawcy.addPin}
            </button>
            <button
              onClick={() => setHidePins((v) => !v)}
              title={hidePins ? t.wykonawcy.showPins : t.wykonawcy.hidePins}
              className={`p-2 rounded-md transition-colors ${hidePins ? "bg-white/20 text-white" : "text-white/60 hover:text-white hover:bg-white/10"}`}
            >
              <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]" fill="currentColor"><path d="M16 9V4h1c.55 0 1-.45 1-1s-.45-1-1-1H7c-.55 0-1 .45-1 1s.45 1 1 1h1v5c0 1.66-1.34 3-3 3h10c-1.66 0-3-1.34-3-3zm-3 12v-6h-2v6c0 .55.45 1 1 1s1-.45 1-1z"/><path d="M3.51 3.51c-.39.39-.39 1.02 0 1.41l15.56 15.57c.39.39 1.02.39 1.41 0s.39-1.02 0-1.41L4.93 3.51c-.39-.39-1.02-.39-1.42 0z"/></svg>
            </button>
            <button
              onClick={() => { setLightboxOpen(false); setZoom(1); setPanX(0); setPanY(0); setPinMode(false); cancelPending(); }}
              className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-md transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Pin mode hint */}
        {pinMode && !pending && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-10 bg-primary/90 text-primary-foreground text-xs px-3 py-1.5 rounded-full shadow pointer-events-none select-none">
            {t.wykonawcy.clickToAddPin}
          </div>
        )}

        {/* Image area with zoom + pan */}
        <div
          ref={lightboxContainerRef}
          className={`flex-1 overflow-hidden flex items-center justify-center select-none ${pinMode ? "cursor-crosshair" : isDragging ? "cursor-grabbing" : zoom > 1 ? "cursor-grab" : "cursor-default"}`}
          onWheel={(e) => {
            e.preventDefault();
            const rect = lightboxContainerRef.current!.getBoundingClientRect();
            const cx = e.clientX - rect.left - rect.width / 2;
            const cy = e.clientY - rect.top - rect.height / 2;
            setZoom((z) => {
              const delta = e.deltaY > 0 ? -0.12 : 0.12;
              const newZ = Math.max(0.25, Math.min(5, z + delta));
              const ratio = newZ / z;
              if (newZ <= 1) { setPanX(0); setPanY(0); }
              else {
                setPanX((px) => cx * (1 - ratio) + px * ratio);
                setPanY((py) => cy * (1 - ratio) + py * ratio);
              }
              return newZ;
            });
          }}
          onMouseDown={(e) => {
            if (pinMode || zoom <= 1) return;
            isDraggingRef.current = true;
            setIsDragging(true);
            dragStartRef.current = { x: e.clientX, y: e.clientY, panX, panY };
          }}
          onMouseMove={(e) => {
            if (!isDraggingRef.current) return;
            setPanX(dragStartRef.current.panX + e.clientX - dragStartRef.current.x);
            setPanY(dragStartRef.current.panY + e.clientY - dragStartRef.current.y);
          }}
          onMouseUp={() => { isDraggingRef.current = false; setIsDragging(false); }}
          onMouseLeave={() => { isDraggingRef.current = false; setIsDragging(false); }}
          onTouchStart={(e) => {
            if (e.touches.length === 2) {
              const dx = e.touches[0].clientX - e.touches[1].clientX;
              const dy = e.touches[0].clientY - e.touches[1].clientY;
              lastPinchDistRef.current = Math.hypot(dx, dy);
            } else if (e.touches.length === 1 && !pinMode) {
              touchPanRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, panX, panY };
            }
          }}
          onTouchMove={(e) => {
            if (e.touches.length === 2) {
              const dx = e.touches[0].clientX - e.touches[1].clientX;
              const dy = e.touches[0].clientY - e.touches[1].clientY;
              const dist = Math.hypot(dx, dy);
              if (lastPinchDistRef.current > 0) {
                const ratio = dist / lastPinchDistRef.current;
                setZoom((z) => Math.max(0.25, Math.min(5, z * ratio)));
              }
              lastPinchDistRef.current = dist;
            } else if (e.touches.length === 1 && !pinMode) {
              setPanX(touchPanRef.current.panX + e.touches[0].clientX - touchPanRef.current.x);
              setPanY(touchPanRef.current.panY + e.touches[0].clientY - touchPanRef.current.y);
            }
          }}
        >
          {/* Inner div: gets transform, holds image + pins */}
          <div
            ref={lightboxImgRef}
            className="relative flex-shrink-0 select-none"
            style={{
              width: "fit-content",
              height: "fit-content",
              transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
              transformOrigin: "center center",
              willChange: "transform",
            }}
            onClick={(e) => {
              if (didDragRef.current) return;
              if (!pinMode || pending) return;
              const rect = lightboxImgRef.current!.getBoundingClientRect();
              const x = ((e.clientX - rect.left) / rect.width) * 100;
              const y = ((e.clientY - rect.top) / rect.height) * 100;
              setPending({ x, y });
              setNewPinContent("");
              setNewPinTitle("");
              setSelectedPinId(null);
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={file.displayUrl}
              alt={file.name}
              style={{
                maxWidth: "calc(100vw - 2rem)",
                maxHeight: "calc(100vh - 120px)",
                width: "auto",
                height: "auto",
              }}
              className="block rounded-lg"
              draggable={false}
            />

            {/* Pins */}
            {!hidePins && pins.map((pin, i) => {
              const canDrag = selectedPinId !== pin.id && pin.author === authorName;
              const pinX = dragPos?.id === pin.id ? dragPos.x : pin.posX;
              const pinY = dragPos?.id === pin.id ? dragPos.y : pin.posY;
              return (
                <div
                  key={pin.id}
                  className="absolute z-10"
                  style={{ left: `calc(${pinX}% - 14px)`, top: `calc(${pinY}% - 14px)` }}
                  onMouseEnter={() => !draggingPinRef.current && handlePinMouseEnter(pin.id)}
                  onMouseLeave={handlePinMouseLeave}
                >
                  <button
                    className={`w-7 h-7 rounded-full border-2 border-white text-white text-xs font-bold flex items-center justify-center shadow-lg ${
                      dragPos?.id === pin.id ? "transition-none cursor-grabbing" : `transition-transform hover:scale-110 ${canDrag ? "cursor-grab" : ""}`
                    } ${pin.authorRole === "designer" ? "bg-slate-400" : "bg-violet-500"} ${selectedPinId === pin.id ? "scale-125 ring-2 ring-white ring-offset-1" : ""}`}
                    onMouseDown={canDrag ? (e) => startPinDrag(e, pin.id, lightboxImgRef.current) : undefined}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (didDragRef.current) { didDragRef.current = false; return; }
                      setSelectedPinId(pin.id === selectedPinId ? null : pin.id);
                      setPending(null);
                      setPinReplyContent("");
                      setOpenPinMenu(false);
                    }}
                  >
                    {i + 1}
                  </button>
                  {hoveredPinId === pin.id && selectedPinId !== pin.id && createPortal(
                    <div
                      className="fixed z-[200] bg-card rounded-xl shadow-xl border border-border p-3 w-56"
                      style={getPopupStyle(pin.posX, pin.posY, lightboxImgRef.current, 224)}
                      onMouseEnter={() => handlePinMouseEnter(pin.id)}
                      onMouseLeave={handlePinMouseLeave}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <p className="text-xs font-medium text-muted-foreground mb-1 truncate">{pin.author}</p>
                      <p className="text-sm text-foreground leading-snug line-clamp-3">{pin.title || pin.content}</p>
                      {pin.replies.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-1.5">
                          {pin.replies.length} {pin.replies.length === 1 ? t.wykonawcy.reply1 : t.wykonawcy.replyMany}
                        </p>
                      )}
                    </div>
                  , document.body)}
                </div>
              );
            })}

            {/* Pending pin dot */}
            {pending && (
              <div
                className={`absolute w-7 h-7 rounded-full border-2 border-white text-white text-xs font-bold flex items-center justify-center shadow-lg z-10 animate-pulse pointer-events-none ${authorRole === "designer" ? "bg-slate-400" : "bg-violet-500"}`}
                style={{ left: `calc(${pending.x}% - 14px)`, top: `calc(${pending.y}% - 14px)` }}
              >
                +
              </div>
            )}
          </div>
        </div>

        {/* New pin popup — portal to escape transform */}
        {pending && createPortal(
          <div
            data-new-pin-popup=""
            className="fixed z-[200] bg-card rounded-xl shadow-xl border border-border p-4 w-64"
            style={getPopupStyle(pending.x, pending.y, lightboxImgRef.current, 256)}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t.wykonawcy.newPin}</h3>
              <button onClick={cancelPending} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
                <X size={14} />
              </button>
            </div>
            <Input
              value={newPinTitle}
              onChange={(e) => setNewPinTitle(e.target.value)}
              placeholder={t.wykonawcy.pinTitlePlaceholder}
              className="mb-2 text-sm"
              onKeyDown={(e) => { if (e.key === "Escape") cancelPending(); }}
            />
            <div className="relative mb-3">
              <Textarea
                value={newPinContent}
                onChange={(e) => setNewPinContent(e.target.value)}
                placeholder={t.wykonawcy.pinContentPlaceholder}
                className="text-sm resize-none pr-10 max-h-40 overflow-y-auto"
                rows={3}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter" && e.ctrlKey) submitPin();
                  if (e.key === "Escape") cancelPending();
                }}
              />
              <button
                type="button"
                disabled={addingPin}
                onClick={newPinContent.trim() ? submitPin : undefined}
                title={t.wykonawcy.addPin}
                className="absolute right-2 bottom-2 z-10 flex items-center justify-center w-8 h-8 rounded-md transition-colors text-muted-foreground hover:text-foreground disabled:opacity-40"
              >
                {addingPin ? <Loader2 size={30} className="animate-spin" /> : <Send size={30} />}
              </button>
            </div>
          </div>
        , document.body)}

        {/* Thread popup for selected pin — portal to escape transform */}
        {selectedPin && createPortal(
          <div
            className="fixed z-[200] bg-card rounded-xl shadow-xl border border-border w-72 flex flex-col"
            style={{ ...getPopupStyle(selectedPin.posX, selectedPin.posY, lightboxImgRef.current, 288), maxHeight: "360px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 px-4 py-3 border-b flex-shrink-0">
              <span className={`w-5 h-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0 ${selectedPin.authorRole === "designer" ? "bg-slate-400" : "bg-violet-500"}`}>
                {selectedPinIndex + 1}
              </span>
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate flex-1">
                {selectedPin.title || `Pin #${selectedPinIndex + 1}`}
              </span>
              {(isDesigner || selectedPin.author === authorName) && (
                <div className="relative flex-shrink-0">
                  <button onClick={() => setOpenPinMenu((v) => !v)} className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-muted transition-colors">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                  </button>
                  {openPinMenu && (
                    <div className="absolute right-0 top-full mt-1 bg-popover border border-border rounded-xl shadow-lg z-[60] py-1 min-w-[130px]">
                      {selectedPin.author === authorName && (
                        <button onClick={() => { setEditingPinId(selectedPin.id); setEditingPinText(selectedPin.content); setOpenPinMenu(false); }} className="w-full text-left px-3 py-2 text-xs hover:bg-muted flex items-center gap-2 transition-colors">
                          <Edit2 size={12} className="text-muted-foreground" /> {t.common.edit}
                        </button>
                      )}
                      {(isDesigner || selectedPin.author === authorName) && (
                        <button onClick={() => { deletePin(selectedPin.id); setOpenPinMenu(false); }} className="w-full text-left px-3 py-2 text-xs text-destructive hover:bg-destructive/10 flex items-center gap-2 transition-colors">
                          <Trash2 size={12} /> {t.wykonawcy.deletePin}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
              <button onClick={() => { setSelectedPinId(null); setPinReplyContent(""); setOpenPinMenu(false); }} className="text-gray-400 hover:text-gray-700 flex-shrink-0">
                <X size={14} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-gray-100 min-h-0">
              <div className="px-4 py-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">{selectedPin.author}</span>
                  <span className="text-[10px] text-gray-400">{formatDate(selectedPin.createdAt)}</span>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{selectedPin.content}</p>
              </div>
              {selectedPin.replies.map((r) => (
                <div key={r.id} className="px-4 py-3 bg-muted/50">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">{r.author}</span>
                    <span className="text-[10px] text-gray-400">{formatDate(r.createdAt)}</span>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{r.content}</p>
                </div>
              ))}
            </div>
            <div className="px-3 py-2.5 border-t flex-shrink-0 flex items-end gap-2">
              <textarea
                value={pinReplyContent}
                onChange={(e) => setPinReplyContent(e.target.value)}
                placeholder={t.wykonawcy.replyPlaceholder}
                rows={1}
                style={{ height: "36px", overflowY: "hidden" }}
                className="flex-1 min-h-9 px-3 py-2 text-sm resize-none rounded-xl bg-muted focus:outline-none max-h-32"
                onInput={(e) => {
                  const t = e.currentTarget;
                  t.style.height = "auto";
                  t.style.height = Math.min(t.scrollHeight, 128) + "px";
                  t.style.overflowY = t.scrollHeight > 128 ? "auto" : "hidden";
                }}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitPinReply(selectedPin.id); } }}
              />
              <button
                onClick={() => submitPinReply(selectedPin.id)}
                disabled={!pinReplyContent.trim() || replyingPin}
                className="flex-shrink-0 flex items-center justify-center w-8 h-8 text-primary disabled:opacity-40 hover:opacity-90 transition-colors"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        , document.body)}
      </div>
    )}
    </>
  );
}
