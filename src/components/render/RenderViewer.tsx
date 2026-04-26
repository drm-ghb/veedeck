"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { pusherClient } from "@/lib/pusher";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, ChevronDown, Eye, EyeOff, Pin, X, Send, ZoomIn, ZoomOut, History, Upload, Maximize2, RotateCcw, Lock, LockOpen, SplitSquareHorizontal, ChevronsLeftRight, MessageSquare, Sparkles, Package, Trash2, ExternalLink } from "lucide-react";
import RenderUploader from "./RenderUploader";
import SearchProductDialog from "./SearchProductDialog";
import { useUploadThing } from "@/lib/uploadthing-client";

type CommentStatus = "NEW" | "IN_PROGRESS" | "DONE";

interface Reply {
  id: string;
  content: string;
  author: string;
  createdAt: string;
}

interface Comment {
  id: string;
  title?: string | null;
  content: string;
  posX: number | null;
  posY: number | null;
  status: CommentStatus;
  isInternal?: boolean;
  isAiSummary?: boolean;
  author: string;
  createdAt: string;
  replies: Reply[];
}

interface CommentWithMeta extends Comment {
  renderId: string;
  renderName: string;
}

interface RoomRender {
  id: string;
  name: string;
  fileUrl: string;
}

interface RenderVersion {
  id: string;
  fileUrl: string;
  versionNumber: number;
  archivedAt: string;
}

type RenderStatus = "REVIEW" | "ACCEPTED";

interface ProductPin {
  id: string;
  posX: number;
  posY: number;
  product: {
    id: string;
    name: string;
    imageUrl: string | null;
    url: string | null;
    price: string | null;
  };
}

interface RenderViewerProps {
  renderId: string;
  renderName?: string;
  projectId?: string;
  projectTitle?: string;
  roomId?: string;
  folderId?: string;
  folderName?: string;
  imageUrl: string;
  initialComments: Comment[];
  authorName: string;
  isDesigner?: boolean;
  roomRenders?: RoomRender[];
  roomName?: string;
  initialRenderStatus?: RenderStatus;
  allowDirectStatusChange?: boolean;
  allowClientComments?: boolean;
  allowClientAcceptance?: boolean;
  hideCommentCount?: boolean;
  versions?: RenderVersion[];
  viewCount?: number;
  allowClientVersionRestore?: boolean;
  onVersionRestore?: (versionId: string) => Promise<void>;
  onVersionRestoreRequest?: (versionId: string) => Promise<void>;
  onRenderStatusChange?: (status: RenderStatus) => Promise<void>;
  onStatusRequest?: () => Promise<void>;
  onBack?: () => void;
  onRenderSelect?: (render: RoomRender) => void;
  shareToken?: string;
  initialProductPins?: ProductPin[];
}

const STATUS_PIN_COLOR: Record<CommentStatus, string> = {
  NEW: "bg-red-500",
  IN_PROGRESS: "bg-yellow-500",
  DONE: "bg-green-500",
};

const STATUS_BADGE: Record<CommentStatus, string> = {
  NEW: "bg-red-100 text-red-700",
  IN_PROGRESS: "bg-yellow-100 text-yellow-700",
  DONE: "bg-green-100 text-green-700",
};

const STATUS_LABEL: Record<CommentStatus, string> = {
  NEW: "Nowy",
  IN_PROGRESS: "W trakcie",
  DONE: "Gotowe",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getPopupStyle(
  x: number,
  y: number,
  imgEl: HTMLElement | null,
  popupWidth = 288,
  vvHeight?: number,
  vvOffsetTop = 0,
): React.CSSProperties {
  if (!imgEl || typeof window === "undefined") {
    return {
      left: x > 55 ? `calc(${x}% - ${popupWidth}px)` : `calc(${x}% + 24px)`,
      top: y > 60 ? `calc(${y}% - 220px)` : `calc(${y}% + 10px)`,
    };
  }
  const viewportHeight = vvHeight ?? window.innerHeight;
  const rect = imgEl.getBoundingClientRect();
  const popupH = 400;
  const pad = 8;
  const pinX = rect.left + (x / 100) * rect.width;
  const pinY = rect.top + (y / 100) * rect.height;

  let left = pinX + 24;
  if (left + popupWidth > window.innerWidth - pad) left = pinX - popupWidth - 8;
  left = Math.max(pad, Math.min(left, window.innerWidth - popupWidth - pad));

  let top = pinY - 20;
  if (top + popupH > vvOffsetTop + viewportHeight - pad) top = vvOffsetTop + viewportHeight - popupH - pad;
  top = Math.max(vvOffsetTop + pad, top);

  return { position: "fixed", left, top };
}

export default function RenderViewer({
  renderId,
  renderName,
  projectId,
  projectTitle,
  roomId,
  folderId,
  folderName,
  imageUrl,
  initialComments,
  authorName,
  isDesigner = false,
  roomRenders = [],
  roomName,
  initialRenderStatus = "REVIEW",
  allowDirectStatusChange = false,
  allowClientComments = true,
  allowClientAcceptance = true,
  hideCommentCount = false,
  viewCount = 0,
  versions = [],
  allowClientVersionRestore = true,
  onVersionRestore,
  onVersionRestoreRequest,
  onRenderStatusChange,
  onStatusRequest,
  onBack,
  onRenderSelect,
  shareToken,
  initialProductPins,
}: RenderViewerProps) {
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [pending, setPending] = useState<{ x: number; y: number } | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [adding, setAdding] = useState(false);
  const [replying, setReplying] = useState(false);
  const [renderStatus, setRenderStatus] = useState<RenderStatus>(initialRenderStatus);
  const [mode, setMode] = useState<"view" | "pin">("view");
  const [showComments, setShowComments] = useState(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("renderflow_showComments") === "true";
    }
    return false;
  });
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxComments, setLightboxComments] = useState<Comment[]>([]);
  const [hidePins, setHidePins] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [restoringVersionId, setRestoringVersionId] = useState<string | null>(null);
  const [compareVersion, setCompareVersion] = useState<RenderVersion | null>(null);
  const [sliderPos, setSliderPos] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [newPinInternal, setNewPinInternal] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pinFilter, setPinFilter] = useState<"current" | "all">(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("renderflow_pinFilter") === "all" ? "all" : "current";
    }
    return "current";
  });
  const [allComments, setAllComments] = useState<CommentWithMeta[]>([]);
  const [loadingAllComments, setLoadingAllComments] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<"pins" | "chat">("pins");
  const [chatMessage, setChatMessage] = useState("");
  const [sendingChatMessage, setSendingChatMessage] = useState(false);
  const [localAiSummaries, setLocalAiSummaries] = useState<Comment[]>([]);
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [chatUnreadCount, setChatUnreadCount] = useState(() => {
    if (typeof window === "undefined") return 0;
    const lastReadAt = localStorage.getItem(`rf_chat_readAt_${renderId}`);
    const chatMessages = initialComments.filter(c => c.posX === null && c.posY === null && c.author !== authorName);
    if (!lastReadAt) return chatMessages.length;
    const lastRead = new Date(lastReadAt);
    return chatMessages.filter(c => new Date(c.createdAt) > lastRead).length;
  });
  const [productPins, setProductPins] = useState<ProductPin[]>(initialProductPins ?? []);
  const [productPinMode, setProductPinMode] = useState(false);
  const [pendingProductPos, setPendingProductPos] = useState<{ x: number; y: number; renderId: string } | null>(null);
  const [hoveredProductPinId, setHoveredProductPinId] = useState<string | null>(null);
  const [productPinsPulsing, setProductPinsPulsing] = useState(true);
  const [lightboxProductPins, setLightboxProductPins] = useState<ProductPin[]>([]);
  const productPinHoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [visualVP, setVisualVP] = useState({ height: 0, offsetTop: 0 });
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => setVisualVP({ height: vv.height, offsetTop: vv.offsetTop });
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);

  // Fetch product pins on mount (if not pre-loaded)
  useEffect(() => {
    if (initialProductPins) return; // already provided
    const url = isDesigner
      ? `/api/renders/${renderId}/product-pins`
      : shareToken
      ? `/api/share/${shareToken}/renders/${renderId}/product-pins`
      : null;
    if (!url) return;
    fetch(url)
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setProductPins(data); })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [renderId]);

  // Remove pulse after 2.5s whenever pins load
  useEffect(() => {
    if (productPins.length === 0) return;
    setProductPinsPulsing(true);
    const t = setTimeout(() => setProductPinsPulsing(false), 2500);
    return () => clearTimeout(t);
  }, [productPins.length]);

  const [highlightedChatId, setHighlightedChatId] = useState<string | null>(null);

  const imgRef = useRef<HTMLDivElement>(null);
  const lightboxImgRef = useRef<HTMLDivElement>(null);
  const versionFileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatMessageRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const showCommentsRef = useRef(showComments);
  const sidebarTabRef = useRef(sidebarTab);
  useEffect(() => { showCommentsRef.current = showComments; }, [showComments]);
  useEffect(() => { sidebarTabRef.current = sidebarTab; }, [sidebarTab]);
  const router = useRouter();
  const searchParams = useSearchParams();

  function markChatRead() {
    localStorage.setItem(`rf_chat_readAt_${renderId}`, new Date().toISOString());
    setChatUnreadCount(0);
  }

  // Auto-open pin popup and restore "all" filter when arriving via cross-render navigation
  useEffect(() => {
    const pinId = searchParams.get("pinId");
    if (pinId && comments.some((c) => c.id === pinId)) {
      setSelectedId(pinId);
      setShowComments(true);
      sessionStorage.setItem("renderflow_showComments", "true");
    }
    const chatId = searchParams.get("chatId");
    if (chatId) {
      setShowComments(true);
      setSidebarTab("chat");
      setHighlightedChatId(chatId);
      sessionStorage.setItem("renderflow_showComments", "true");
    }
    if (pinFilter === "all") {
      fetchAllComments();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const { startUpload, isUploading: isVersionUploading } = useUploadThing("renderUploader", {
    onClientUploadComplete: async (res) => {
      const file = res[0];
      if (!file) return;
      const resp = await fetch(`/api/renders/${renderId}/version`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileUrl: file.url, fileKey: file.key }),
      });
      if (resp.ok) {
        toast.success("Nowa wersja została dodana");
        setComments([]);
        setSelectedId(null);
        setPending(null);
        router.refresh();
      } else {
        const data = await resp.json().catch(() => ({}));
        toast.error(data.error || "Błąd dodawania wersji");
      }
    },
    onUploadError: () => { toast.error("Błąd przesyłania pliku"); },
  });

  useEffect(() => {
    const channel = pusherClient.subscribe(`render-${renderId}`);
    channel.unbind_all();

    channel.bind("new-comment", (comment: Comment) => {
      setComments((prev) => {
        if (prev.some((c) => c.id === comment.id)) return prev;
        return [...prev, { ...comment, replies: [] }];
      });
      // Track unread for chat messages from other authors
      if (comment.posX === null && comment.posY === null && comment.author !== authorName) {
        if (showCommentsRef.current && sidebarTabRef.current === "chat") {
          localStorage.setItem(`rf_chat_readAt_${renderId}`, new Date().toISOString());
        } else {
          setChatUnreadCount((prev) => prev + 1);
        }
      }
    });
    channel.bind("comment-updated", (updated: Comment) => {
      setComments((prev) =>
        prev.map((c) => (c.id === updated.id ? { ...updated, replies: c.replies } : c))
      );
    });
    channel.bind("comment-deleted", ({ id }: { id: string }) => {
      setComments((prev) => prev.filter((c) => c.id !== id));
      setSelectedId((prev) => (prev === id ? null : prev));
    });
    channel.bind("comment-reply", ({ commentId, reply }: { commentId: string; reply: Reply }) => {
      setComments((prev) =>
        prev.map((c) => {
          if (c.id !== commentId) return c;
          if (c.replies.some((r) => r.id === reply.id)) return c;
          return { ...c, replies: [...c.replies, reply] };
        })
      );
    });
    channel.bind("reply-deleted", ({ commentId, replyId }: { commentId: string; replyId: string }) => {
      setComments((prev) =>
        prev.map((c) =>
          c.id !== commentId ? c : { ...c, replies: c.replies.filter((r) => r.id !== replyId) }
        )
      );
    });
    channel.bind("render-status-changed", (data: { renderId: string; status: RenderStatus }) => {
      if (data.renderId === renderId) {
        setRenderStatus(data.status);
        if (!isDesigner) {
          toast(data.status === "ACCEPTED" ? "Render został zaakceptowany przez projektanta" : "Projektant zmienił status na: Do weryfikacji", { duration: 6000 });
        }
      }
    });
    channel.bind("new-reply", (data: { commentId: string; reply: Reply }) => {
      setComments((prev) =>
        prev.map((c) => {
          if (c.id !== data.commentId) return c;
          if (c.replies.some((r) => r.id === data.reply.id)) return c;
          return { ...c, replies: [...c.replies, data.reply] };
        })
      );
      if (!isDesigner && data.reply.author !== authorName) {
        toast(`Odpowiedź od ${data.reply.author}`, { duration: 5000 });
      }
    });

    return () => {
      channel.unbind_all();
      pusherClient.unsubscribe(`render-${renderId}`);
    };
  }, [renderId, isDesigner, authorName]);

  function openLightbox() {
    setZoom(1);
    setLightboxIndex(currentRenderIndex >= 0 ? currentRenderIndex : 0);
    setLightboxOpen(true);
  }

  function handleImageClick(e: React.MouseEvent<HTMLDivElement>) {
    if (productPinMode) {
      if (pending || pendingProductPos) return;
      const rect = imgRef.current!.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      setPendingProductPos({ x, y, renderId });
      return;
    }
    if (mode !== "pin") {
      openLightbox();
      return;
    }
    if (pending) return;
    const rect = imgRef.current!.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setPending({ x, y });
    setNewTitle("");
    setNewContent("");
    setSelectedId(null);
  }

  function cancelPending() {
    setPending(null);
    setNewTitle("");
    setNewContent("");
    setNewPinInternal(false);
  }

  async function submitComment() {
    if (!pending || !newContent.trim()) return;
    setAdding(true);
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          renderId: lightboxOpen ? lightboxRender.id : renderId,
          title: newTitle.trim() || null,
          content: newContent.trim(),
          posX: pending.x,
          posY: pending.y,
          author: authorName,
          isInternal: isDesigner ? newPinInternal : false,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Błąd dodawania komentarza");
        return;
      }
      const created: Comment = await res.json();
      if (lightboxOpen && lightboxRender.id !== renderId) {
        setLightboxComments((prev) => prev.some((c) => c.id === created.id) ? prev : [...prev, { ...created, replies: [] }]);
      } else {
        setComments((prev) => prev.some((c) => c.id === created.id) ? prev : [...prev, { ...created, replies: [] }]);
      }
      cancelPending();
      toast.success("Komentarz dodany");
    } catch {
      toast.error("Błąd dodawania komentarza");
    } finally {
      setAdding(false);
    }
  }

  async function submitChatMessage() {
    if (!chatMessage.trim()) return;
    setSendingChatMessage(true);
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          renderId,
          content: chatMessage.trim(),
          posX: null,
          posY: null,
          author: authorName,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Błąd wysyłania wiadomości");
        return;
      }
      setChatMessage("");
    } catch {
      toast.error("Błąd wysyłania wiadomości");
    } finally {
      setSendingChatMessage(false);
    }
  }

  async function generateAiSummary() {
    setGeneratingSummary(true);
    try {
      if (isDesigner) {
        const res = await fetch(`/api/renders/${renderId}/ai-summary`, { method: "POST" });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          toast.error(data.error || "Błąd generowania podsumowania");
          return;
        }
        // Pusher (new-comment) automatically adds to comments state — no manual setComments needed
      } else {
        const res = await fetch(`/api/share/${shareToken}/renders/${renderId}/ai-summary`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ authorName }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          toast.error(data.error || "Błąd generowania podsumowania");
          return;
        }
        const { summary } = await res.json();
        const localSummary: Comment = {
          id: `local-ai-${Date.now()}`,
          content: summary,
          posX: null,
          posY: null,
          status: "NEW",
          author: authorName,
          createdAt: new Date().toISOString(),
          replies: [],
          isAiSummary: true,
        };
        setLocalAiSummaries(prev => [...prev, localSummary]);
      }
    } catch {
      toast.error("Błąd generowania podsumowania");
    } finally {
      setGeneratingSummary(false);
    }
  }

  async function submitReply() {
    if (!selectedId || !replyContent.trim()) return;
    setReplying(true);
    try {
      const res = await fetch(`/api/comments/${selectedId}/replies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: replyContent.trim(), author: authorName }),
      });
      if (!res.ok) throw new Error();
      setReplyContent("");
    } catch {
      toast.error("Błąd dodawania odpowiedzi");
    } finally {
      setReplying(false);
    }
  }

  async function updateRenderStatus(status: RenderStatus) {
    try {
      if (onRenderStatusChange) {
        await onRenderStatusChange(status);
      } else {
        const res = await fetch(`/api/renders/${renderId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        });
        if (!res.ok) throw new Error();
      }
      setRenderStatus(status);
      toast.success(status === "ACCEPTED" ? "Plik zaakceptowany" : "Status zmieniony na: Do weryfikacji");
    } catch {
      toast.error("Błąd zmiany statusu");
    }
  }

  async function updateStatus(id: string, status: CommentStatus) {
    setComments((prev) => prev.map((c) => c.id === id ? { ...c, status } : c));
    await fetch(`/api/comments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  }

  async function deleteComment(id: string) {
    await fetch(`/api/comments/${id}`, { method: "DELETE" });
    setSelectedId(null);
    toast.success("Komentarz usunięty");
  }

  async function deleteReply(commentId: string, replyId: string) {
    await fetch(`/api/comments/${commentId}/replies/${replyId}`, { method: "DELETE" });
  }

  async function handleRestoreVersion(versionId: string) {
    setRestoringVersionId(versionId);
    try {
      if (isDesigner) {
        const res = await fetch(`/api/renders/${renderId}/restore-version`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ versionId }),
        });
        if (!res.ok) throw new Error();
        toast.success("Wersja przywrócona");
        router.refresh();
      } else if (onVersionRestore) {
        await onVersionRestore(versionId);
        toast.success("Wersja przywrócona");
      } else if (onVersionRestoreRequest) {
        await onVersionRestoreRequest(versionId);
        toast.success("Prośba o przywrócenie wysłana do projektanta");
      }
    } catch {
      toast.error("Błąd przywracania wersji");
    } finally {
      setRestoringVersionId(null);
    }
  }

  async function handleToggleInternal() {
    if (!selectedComment) return;
    const next = !selectedComment.isInternal;
    const res = await fetch(`/api/comments/${selectedComment.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isInternal: next }),
    });
    if (res.ok) {
      setComments((prev) =>
        prev.map((c) => c.id === selectedComment.id ? { ...c, isInternal: next } : c)
      );
      toast.success(next ? "Pin ukryty przed klientem" : "Pin widoczny dla klienta");
    }
  }

  function handleProductPinMouseEnter(id: string) {
    if (productPinHoverTimer.current) clearTimeout(productPinHoverTimer.current);
    setHoveredProductPinId(id);
  }
  function handleProductPinMouseLeave() {
    productPinHoverTimer.current = setTimeout(() => setHoveredProductPinId(null), 150);
  }

  async function addProductPin(
    product: { id: string; name: string; imageUrl: string | null; url: string | null; price: string | null },
    pos: { x: number; y: number },
    targetRenderId: string
  ) {
    const res = await fetch(`/api/renders/${targetRenderId}/product-pins`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: product.id, posX: pos.x, posY: pos.y }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error || "Błąd dodawania produktu");
      return;
    }
    const pin: ProductPin = await res.json();
    if (targetRenderId === renderId) {
      setProductPins((prev) => [...prev, pin]);
    } else {
      setLightboxProductPins((prev) => [...prev, pin]);
    }
  }

  async function deleteProductPin(pinId: string, targetRenderId: string) {
    const res = await fetch(`/api/renders/${targetRenderId}/product-pins/${pinId}`, { method: "DELETE" });
    if (!res.ok) { toast.error("Błąd usuwania produktu"); return; }
    setHoveredProductPinId(null);
    if (targetRenderId === renderId) {
      setProductPins((prev) => prev.filter((p) => p.id !== pinId));
    } else {
      setLightboxProductPins((prev) => prev.filter((p) => p.id !== pinId));
    }
  }

  async function fetchAllComments() {
    setLoadingAllComments(true);
    try {
      const otherRenders = roomRenders.filter((r) => r.id !== renderId);
      const results = await Promise.all(
        otherRenders.map((r) =>
          fetch(`/api/comments?renderId=${r.id}`)
            .then((res) => res.json())
            .then((data: Comment[]) =>
              (Array.isArray(data) ? data : []).map((c) => ({
                ...c,
                renderId: r.id,
                renderName: r.name,
              }))
            )
            .catch(() => [] as CommentWithMeta[])
        )
      );
      const currentWithMeta: CommentWithMeta[] = comments.map((c) => ({
        ...c,
        renderId,
        renderName: renderName ?? "",
      }));
      const renderOrder = new Map(roomRenders.map((r, i) => [r.id, i]));
      const combined: CommentWithMeta[] = [...currentWithMeta, ...results.flat()].sort((a, b) => {
        const orderDiff = (renderOrder.get(a.renderId) ?? 0) - (renderOrder.get(b.renderId) ?? 0);
        if (orderDiff !== 0) return orderDiff;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });
      setAllComments(combined);
    } finally {
      setLoadingAllComments(false);
    }
  }

  function handleSliderMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!isDragging) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = ((e.clientX - rect.left) / rect.width) * 100;
    setSliderPos(Math.max(2, Math.min(98, pos)));
  }

  function handleSliderTouchMove(e: React.TouchEvent<HTMLDivElement>) {
    if (!isDragging) return;
    const touch = e.touches[0];
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = ((touch.clientX - rect.left) / rect.width) * 100;
    setSliderPos(Math.max(2, Math.min(98, pos)));
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setCompareVersion(null);
    }
    if (compareVersion) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [compareVersion]);

  // Sync current render's comments in "all" mode when Pusher updates arrive
  useEffect(() => {
    if (pinFilter !== "all") return;
    setAllComments((prev) => {
      const withoutCurrent = prev.filter((c) => c.renderId !== renderId);
      const currentWithMeta: CommentWithMeta[] = comments.map((c) => ({
        ...c,
        renderId,
        renderName: renderName ?? "",
      }));
      const renderOrder = new Map(roomRenders.map((r, i) => [r.id, i]));
      return [...withoutCurrent, ...currentWithMeta].sort((a, b) => {
        const orderDiff = (renderOrder.get(a.renderId) ?? 0) - (renderOrder.get(b.renderId) ?? 0);
        if (orderDiff !== 0) return orderDiff;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comments, pinFilter]);

  // Re-fetch all comments when roomRenders changes and filter is "all"
  useEffect(() => {
    if (pinFilter === "all") fetchAllComments();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomRenders]);

  const currentRenderIndex = roomRenders.findIndex((r) => r.id === renderId);
  const prevRender = currentRenderIndex > 0 ? roomRenders[currentRenderIndex - 1] : null;
  const nextRender = currentRenderIndex < roomRenders.length - 1 ? roomRenders[currentRenderIndex + 1] : null;

  const lightboxRender = roomRenders[lightboxIndex] ?? { id: renderId, name: renderName ?? "", fileUrl: imageUrl };
  const lightboxPrevRender = lightboxIndex > 0 ? roomRenders[lightboxIndex - 1] : null;
  const lightboxNextRender = lightboxIndex < roomRenders.length - 1 ? roomRenders[lightboxIndex + 1] : null;

  // Subscribe to Pusher for the render currently viewed in lightbox (may differ from page render)
  useEffect(() => {
    const id = lightboxRender.id;
    if (id === renderId) {
      setLightboxComments([]);
      return;
    }
    setLightboxComments([]);
    // Fetch existing comments for this render
    fetch(`/api/comments?renderId=${id}`)
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setLightboxComments(data); })
      .catch(() => {});
    const channel = pusherClient.subscribe(`render-${id}`);
    channel.bind("new-comment", (comment: Comment) => {
      setLightboxComments((prev) => {
        if (prev.some((c) => c.id === comment.id)) return prev;
        return [...prev, { ...comment, replies: [] }];
      });
    });
    channel.bind("comment-deleted", ({ id: cid }: { id: string }) => {
      setLightboxComments((prev) => prev.filter((c) => c.id !== cid));
    });
    return () => {
      channel.unbind_all();
      pusherClient.unsubscribe(`render-${id}`);
    };
  }, [lightboxRender.id, renderId]);

  // Fetch product pins for lightbox render when it changes
  useEffect(() => {
    const id = lightboxRender.id;
    if (id === renderId) { setLightboxProductPins([]); return; }
    const url = isDesigner
      ? `/api/renders/${id}/product-pins`
      : shareToken
      ? `/api/share/${shareToken}/renders/${id}/product-pins`
      : null;
    if (!url) return;
    setLightboxProductPins([]);
    fetch(url)
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setLightboxProductPins(data); })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightboxRender.id, renderId]);

  useEffect(() => {
    if (roomRenders.length <= 1) return;
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (lightboxOpen) {
        if (e.key === "ArrowLeft" && lightboxIndex > 0) { setLightboxIndex((i) => i - 1); setZoom(1); }
        if (e.key === "ArrowRight" && lightboxIndex < roomRenders.length - 1) { setLightboxIndex((i) => i + 1); setZoom(1); }
      } else if (projectId) {
        if (e.key === "ArrowLeft" && prevRender) router.push(`/projects/${projectId}/renders/${prevRender.id}`);
        if (e.key === "ArrowRight" && nextRender) router.push(`/projects/${projectId}/renders/${nextRender.id}`);
      } else if (onRenderSelect) {
        if (e.key === "ArrowLeft" && prevRender) onRenderSelect(prevRender);
        if (e.key === "ArrowRight" && nextRender) onRenderSelect(nextRender);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [projectId, prevRender, nextRender, router, roomRenders.length, lightboxOpen, lightboxIndex]);

  const pinComments = comments.filter((c) => c.posX !== null && c.posY !== null);

  const todoCount = pinComments.filter((c) => c.status === "NEW").length;
  const inProgressCount = pinComments.filter((c) => c.status === "IN_PROGRESS").length;
  const doneCount = pinComments.filter((c) => c.status === "DONE").length;

  const selectedComment = selectedId ? pinComments.find((c) => c.id === selectedId) ?? null : null;
  const selectedIndex = selectedId ? pinComments.findIndex((c) => c.id === selectedId) : -1;

  // Auto-scroll chat to bottom on new messages
  useEffect(() => {
    if (sidebarTab === "chat" && showComments && !highlightedChatId) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [comments, sidebarTab, showComments, highlightedChatId]);

  // Scroll to and highlight a specific chat message (deep-link via ?chatId=)
  useEffect(() => {
    if (!highlightedChatId || sidebarTab !== "chat" || !showComments) return;
    const el = chatMessageRefs.current.get(highlightedChatId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      // Remove highlight after 3s
      const timer = setTimeout(() => setHighlightedChatId(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [highlightedChatId, sidebarTab, showComments, comments]);

  return (
    <div className="flex flex-col h-full bg-card">
      {/* Header bar */}
      <div className="border-b bg-card flex-shrink-0">

        {/* Row 1: Back + Breadcrumb */}
        <div className="flex items-center gap-3 px-4 py-2.5">
          {/* Back arrow */}
          {(onBack || projectId) && (
            <>
              {onBack ? (
                <button
                  onClick={onBack}
                  className="flex-shrink-0 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                >
                  <ChevronLeft size={20} />
                </button>
              ) : (
                <Link
                  href={folderId && roomId ? `/projects/${projectId}/rooms/${roomId}/folders/${folderId}` : roomId ? `/projects/${projectId}/rooms/${roomId}` : `/projects/${projectId}`}
                  className="flex-shrink-0 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                >
                  <ChevronLeft size={20} />
                </Link>
              )}
              <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
            </>
          )}
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1 min-w-0 flex-1 text-sm">
            {onBack ? (
              <>
                {projectTitle && <span className="hidden sm:block flex-shrink-0 text-gray-500 dark:text-gray-400 font-medium truncate max-w-[120px]">{projectTitle}</span>}
                {projectTitle && roomName && <ChevronLeft size={13} className="hidden sm:block flex-shrink-0 text-gray-300 rotate-180" />}
                {roomName && <span className="hidden sm:block flex-shrink-0 text-gray-500 dark:text-gray-400 font-medium truncate max-w-[120px]">{roomName}</span>}
                {roomName && folderName && <ChevronLeft size={13} className="hidden sm:block flex-shrink-0 text-gray-300 rotate-180" />}
                {folderName && <span className="hidden sm:block flex-shrink-0 text-gray-500 dark:text-gray-400 font-medium truncate max-w-[120px]">{folderName}</span>}
                {(projectTitle || roomName || folderName) && renderName && <ChevronLeft size={13} className="flex-shrink-0 text-gray-300 rotate-180" />}
                {renderName && <span className="text-gray-900 dark:text-gray-100 font-semibold truncate min-w-0">{renderName}</span>}
              </>
            ) : projectId ? (
              <>
                {projectTitle && (
                  <>
                    <Link href={`/projects/${projectId}`} className="hidden sm:block flex-shrink-0 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors font-medium truncate max-w-[120px]" title={projectTitle}>
                      {projectTitle}
                    </Link>
                    <ChevronLeft size={13} className="hidden sm:block flex-shrink-0 text-gray-300 rotate-180" />
                  </>
                )}
                {roomId && roomName && (
                  <>
                    <Link href={`/projects/${projectId}/rooms/${roomId}`} className="hidden sm:block flex-shrink-0 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors font-medium truncate max-w-[120px]" title={roomName}>
                      {roomName}
                    </Link>
                    <ChevronLeft size={13} className="hidden sm:block flex-shrink-0 text-gray-300 rotate-180" />
                  </>
                )}
                {folderId && folderName && roomId && (
                  <>
                    <Link href={`/projects/${projectId}/rooms/${roomId}/folders/${folderId}`} className="flex-shrink-0 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors font-medium truncate max-w-[120px]" title={folderName}>
                      {folderName}
                    </Link>
                    <ChevronLeft size={13} className="flex-shrink-0 text-gray-300 rotate-180" />
                  </>
                )}
                {renderName && (
                  <span className="text-gray-900 dark:text-gray-100 font-semibold truncate min-w-0" title={renderName}>
                    {renderName}
                  </span>
                )}
              </>
            ) : null}
          </nav>

          {/* Desktop toolbar (hidden on mobile) */}
          <div className="hidden sm:flex ml-auto items-center gap-2 flex-shrink-0">
            {!hideCommentCount && todoCount > 0 && (
              <span className="hidden xl:inline-flex items-center gap-1 bg-red-100 text-red-700 text-xs font-medium px-2 py-1 rounded-md">{todoCount} to do</span>
            )}
            {!hideCommentCount && inProgressCount > 0 && (
              <span className="hidden xl:inline-flex items-center gap-1 bg-yellow-100 text-yellow-700 text-xs font-medium px-2 py-1 rounded-md">{inProgressCount} in progress</span>
            )}
            {!hideCommentCount && doneCount > 0 && (
              <span className="hidden xl:inline-flex items-center gap-1 bg-green-100 text-green-700 text-xs font-medium px-2 py-1 rounded-md">{doneCount} done</span>
            )}
            {isDesigner && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground" title="Ilość wyświetleń pliku przez klienta">
                <Eye size={13} />{viewCount}
              </span>
            )}
            <div className="w-px h-4 bg-gray-200 mx-1" />
            {isDesigner ? (
              <>
                {/* Tablet: select dropdown */}
                <div className="relative flex xl:hidden flex-shrink-0">
                  <select
                    value={renderStatus}
                    onChange={(e) => updateRenderStatus(e.target.value as RenderStatus)}
                    className={`appearance-none text-xs pl-2.5 pr-7 py-1.5 rounded-md border font-medium cursor-pointer ${renderStatus === "ACCEPTED" ? "bg-green-500 text-white border-green-600" : "bg-blue-500 text-white border-blue-600"}`}
                  >
                    <option value="REVIEW" className="bg-white text-gray-900">Do weryfikacji</option>
                    <option value="ACCEPTED" className="bg-white text-gray-900">Zaakceptowany</option>
                  </select>
                  <ChevronDown size={12} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-white" />
                </div>
                {/* Desktop: two buttons */}
                <div className="hidden xl:flex items-center gap-1 bg-muted rounded-md p-0.5">
                  <button onClick={() => updateRenderStatus("REVIEW")} className={`text-xs px-2.5 py-1 rounded transition-colors font-medium ${renderStatus === "REVIEW" ? "bg-blue-500 text-white shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"}`}>Do weryfikacji</button>
                  <button onClick={() => updateRenderStatus("ACCEPTED")} className={`text-xs px-2.5 py-1 rounded transition-colors font-medium ${renderStatus === "ACCEPTED" ? "bg-green-500 text-white shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"}`}>Zaakceptowany</button>
                </div>
              </>
            ) : renderStatus === "ACCEPTED" ? (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-green-100 text-green-700">Zaakceptowany</span>
                {allowDirectStatusChange ? (
                  <button onClick={() => updateRenderStatus("REVIEW")} className="text-xs text-gray-400 hover:text-gray-600 underline transition-colors">Cofnij akceptację</button>
                ) : onStatusRequest ? (
                  <button onClick={onStatusRequest} className="text-xs text-gray-400 hover:text-gray-600 underline transition-colors">Poproś o zmianę</button>
                ) : null}
              </div>
            ) : allowClientAcceptance ? (
              <button onClick={() => updateRenderStatus("ACCEPTED")} className="text-xs font-semibold px-2.5 py-1 rounded-md bg-green-500 text-white hover:bg-green-600 transition-colors">Zaakceptuj</button>
            ) : (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-blue-100 text-blue-700">Do weryfikacji</span>
            )}
            <div className="w-px h-4 bg-gray-200 mx-1" />
            <button onClick={() => setShowVersionHistory(true)} className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md border border-transparent text-gray-500 hover:bg-muted transition-colors" title="Historia wersji">
              <History size={14} /> Wersje{versions.length > 0 ? ` (${versions.length})` : ""}
            </button>
            <button onClick={openLightbox} className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md border transition-colors ${lightboxOpen ? "bg-gray-900 text-white border-gray-900" : "border-transparent text-gray-500 dark:text-gray-400 hover:bg-muted"}`}>
              <Maximize2 size={14} /> Podgląd
            </button>
            {(isDesigner || allowClientComments) && (
              <button onClick={() => { setMode(mode === "pin" ? "view" : "pin"); setProductPinMode(false); setPendingProductPos(null); }} className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md border transition-colors ${mode === "pin" ? "bg-gray-900 text-white border-gray-900" : "border-transparent text-gray-500 dark:text-gray-400 hover:bg-muted"}`}>
                <Pin size={14} /> Dodaj pin
              </button>
            )}
            {isDesigner && (
              <button onClick={() => { setProductPinMode((v) => !v); setMode("view"); setPending(null); setPendingProductPos(null); }} className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md border transition-colors ${productPinMode ? "bg-gray-900 text-white border-gray-900" : "border-transparent text-gray-500 dark:text-gray-400 hover:bg-muted"}`}>
                <Package size={14} /> Dodaj produkt
              </button>
            )}
            <button onClick={() => setHidePins((v) => !v)} className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md border transition-colors ${hidePins ? "bg-gray-900 text-white border-gray-900" : "border-transparent text-gray-500 dark:text-gray-400 hover:bg-muted"}`}>
              {hidePins ? <EyeOff size={14} /> : <Eye size={14} />}
              {hidePins ? "Pokaż piny" : "Ukryj piny"}
            </button>
            <button
              onClick={() => setShowComments((v) => { const next = !v; sessionStorage.setItem("renderflow_showComments", String(next)); if (next && sidebarTabRef.current === "chat") markChatRead(); return next; })}
              className={`relative flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md border transition-colors ${showComments ? "bg-gray-900 text-white border-gray-900" : "border-transparent text-gray-500 dark:text-gray-400 hover:bg-muted"}`}
            >
              <MessageSquare size={14} /> Dyskusja
              {chatUnreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 bg-blue-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                  {chatUnreadCount > 99 ? "99+" : chatUnreadCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Row 2: Mobile scrollable toolbar */}
        <div className="sm:hidden border-t overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          <div className="flex items-center gap-1 px-2 py-1.5 w-max">
            {/* Status */}
            {isDesigner ? (
              <div className="relative flex-shrink-0">
                <select
                  value={renderStatus}
                  onChange={(e) => updateRenderStatus(e.target.value as RenderStatus)}
                  className={`appearance-none text-xs pl-2.5 pr-7 py-1.5 rounded-md border font-medium cursor-pointer ${renderStatus === "ACCEPTED" ? "bg-green-500 text-white border-green-600" : "bg-blue-500 text-white border-blue-600"}`}
                >
                  <option value="REVIEW" className="bg-white text-gray-900">Do weryfikacji</option>
                  <option value="ACCEPTED" className="bg-white text-gray-900">Zaakceptowany</option>
                </select>
                <ChevronDown size={12} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-white" />
              </div>
            ) : renderStatus === "ACCEPTED" ? (
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span className="text-xs font-semibold px-2 py-1.5 rounded-md bg-green-100 text-green-700">Zaakceptowany</span>
                {allowDirectStatusChange ? (
                  <button onClick={() => updateRenderStatus("REVIEW")} className="text-xs text-gray-400 underline">Cofnij</button>
                ) : onStatusRequest ? (
                  <button onClick={onStatusRequest} className="text-xs text-gray-400 underline">Zmień</button>
                ) : null}
              </div>
            ) : allowClientAcceptance ? (
              <button onClick={() => updateRenderStatus("ACCEPTED")} className="text-xs font-semibold px-2 py-1.5 rounded-md bg-green-500 text-white flex-shrink-0">Zaakceptuj</button>
            ) : (
              <span className="text-xs font-semibold px-2 py-1.5 rounded-md bg-blue-100 text-blue-700 flex-shrink-0">Do weryfikacji</span>
            )}
            <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-0.5 flex-shrink-0" />
            {/* Dodaj pin */}
            {(isDesigner || allowClientComments) && (
              <button onClick={() => { setMode(mode === "pin" ? "view" : "pin"); setProductPinMode(false); setPendingProductPos(null); }} className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md border transition-colors flex-shrink-0 ${mode === "pin" ? "bg-gray-900 text-white border-gray-900" : "border-transparent text-gray-500 dark:text-gray-400 hover:bg-muted"}`}>
                <Pin size={14} /> Dodaj pin
              </button>
            )}
            {/* Dodaj produkt */}
            {isDesigner && (
              <button onClick={() => { setProductPinMode((v) => !v); setMode("view"); setPending(null); setPendingProductPos(null); }} className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md border transition-colors flex-shrink-0 ${productPinMode ? "bg-gray-900 text-white border-gray-900" : "border-transparent text-gray-500 dark:text-gray-400 hover:bg-muted"}`}>
                <Package size={14} /> Dodaj produkt
              </button>
            )}
            {/* Dyskusja */}
            <button
              onClick={() => setShowComments((v) => { const next = !v; sessionStorage.setItem("renderflow_showComments", String(next)); if (next && sidebarTabRef.current === "chat") markChatRead(); return next; })}
              className={`relative flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md border transition-colors flex-shrink-0 ${showComments ? "bg-gray-900 text-white border-gray-900" : "border-transparent text-gray-500 dark:text-gray-400 hover:bg-muted"}`}
            >
              <MessageSquare size={14} /> Dyskusja
              {chatUnreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 bg-blue-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                  {chatUnreadCount > 99 ? "99+" : chatUnreadCount}
                </span>
              )}
            </button>
            {/* Ukryj/Pokaż piny */}
            <button onClick={() => setHidePins((v) => !v)} className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md border transition-colors flex-shrink-0 ${hidePins ? "bg-gray-900 text-white border-gray-900" : "border-transparent text-gray-500 dark:text-gray-400 hover:bg-muted"}`}>
              {hidePins ? <EyeOff size={14} /> : <Eye size={14} />}
              {hidePins ? "Pokaż" : "Ukryj"}
            </button>
            <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-0.5 flex-shrink-0" />
            {/* Wersje */}
            <button onClick={() => setShowVersionHistory(true)} className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md border border-transparent text-gray-500 hover:bg-muted transition-colors flex-shrink-0" title="Historia wersji">
              <History size={14} /> Wersje{versions.length > 0 ? ` (${versions.length})` : ""}
            </button>
            {/* Podgląd */}
            <button onClick={openLightbox} className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md border transition-colors flex-shrink-0 ${lightboxOpen ? "bg-gray-900 text-white border-gray-900" : "border-transparent text-gray-500 dark:text-gray-400 hover:bg-muted"}`}>
              <Maximize2 size={14} /> Podgląd
            </button>
          </div>
        </div>

      </div>

      {/* Content */}
      <div className="flex flex-1 min-h-0">
        {/* Thumbnails sidebar */}
        {(isDesigner || (onRenderSelect && roomRenders.length > 0)) && (
          <div className="hidden md:flex w-44 border-r bg-card flex-col flex-shrink-0 overflow-hidden">
            <div className="px-3 py-2.5 border-b flex-shrink-0 flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Pliki ({roomRenders.length})
              </p>
              {isDesigner && projectId && roomId && (
                <RenderUploader projectId={projectId} roomId={roomId} compact />
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
              {roomRenders.map((r) => (
                isDesigner ? (
                  <Link
                    key={r.id}
                    href={`/projects/${projectId}/renders/${r.id}`}
                    className={`block rounded-lg overflow-hidden border-2 transition-colors ${
                      r.id === renderId
                        ? "border-blue-500"
                        : "border-transparent hover:border-gray-200"
                    }`}
                  >
                    <div className="aspect-video bg-muted overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={r.fileUrl} alt={r.name} className="w-full h-full object-cover" />
                    </div>
                    <p className={`text-xs px-1.5 py-1 truncate ${r.id === renderId ? "text-blue-600 font-semibold" : "text-gray-600"}`}>
                      {r.name}
                    </p>
                  </Link>
                ) : (
                  <button
                    key={r.id}
                    onClick={() => onRenderSelect?.(r)}
                    className={`w-full text-left rounded-lg overflow-hidden border-2 transition-colors ${
                      r.id === renderId
                        ? "border-blue-500"
                        : "border-transparent hover:border-gray-200"
                    }`}
                  >
                    <div className="aspect-video bg-muted overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={r.fileUrl} alt={r.name} className="w-full h-full object-cover" />
                    </div>
                    <p className={`text-xs px-1.5 py-1 truncate ${r.id === renderId ? "text-blue-600 font-semibold" : "text-gray-600"}`}>
                      {r.name}
                    </p>
                  </button>
                )
              ))}
            </div>
          </div>
        )}

        {/* Image area */}
        <div className="flex-1 relative bg-muted">
          {/* Left navigation arrow */}
          {prevRender && (projectId || onRenderSelect) && (
            <button
              onClick={() => projectId ? router.push(`/projects/${projectId}/renders/${prevRender.id}`) : onRenderSelect?.(prevRender)}
              className="absolute left-3 top-1/2 -translate-y-1/2 z-10 bg-white/80 hover:bg-white dark:bg-gray-800/80 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full p-2 shadow-md text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-all opacity-60 hover:opacity-100"
              title={prevRender.name}
            >
              <ChevronLeft size={20} />
            </button>
          )}
          {/* Right navigation arrow */}
          {nextRender && (projectId || onRenderSelect) && (
            <button
              onClick={() => projectId ? router.push(`/projects/${projectId}/renders/${nextRender.id}`) : onRenderSelect?.(nextRender)}
              className="absolute right-3 top-1/2 -translate-y-1/2 z-10 bg-white/80 hover:bg-white dark:bg-gray-800/80 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full p-2 shadow-md text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-all opacity-60 hover:opacity-100"
              title={nextRender.name}
            >
              <ChevronRight size={20} />
            </button>
          )}
          <div className="absolute inset-0 overflow-auto flex items-start justify-start sm:justify-center p-2 sm:p-6">
          <div
            ref={imgRef}
            className={`relative select-none ${(mode === "pin" || productPinMode) ? "cursor-crosshair" : "cursor-default"}`}
            onClick={handleImageClick}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt="Render"
              className="block rounded-lg shadow-sm sm:max-w-full"
              style={{ maxHeight: "calc(100vh - 180px)" }}
              draggable={false}
            />

            {/* Comment pins */}
            {!hidePins && pinComments.map((c, i) => (
              <button
                key={c.id}
                className={`absolute w-7 h-7 rounded-full border-2 border-white text-white text-xs font-bold flex items-center justify-center shadow-lg z-10 transition-transform hover:scale-110 ${c.isInternal ? "bg-slate-500" : STATUS_PIN_COLOR[c.status]} ${
                  selectedId === c.id ? "scale-125 ring-2 ring-white ring-offset-1" : ""
                }`}
                style={{
                  left: `calc(${c.posX!}% - 14px)`,
                  top: `calc(${c.posY!}% - 14px)`,
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedId(c.id === selectedId ? null : c.id);
                  cancelPending();
                  setReplyContent("");
                }}
                title={c.isInternal ? "Notatka wewnętrzna — niewidoczna dla klienta" : undefined}
              >
                {i + 1}
                {c.isInternal && (
                  <Lock size={8} className="absolute -top-1 -right-1 bg-slate-700 rounded-full p-[1px] text-white" />
                )}
              </button>
            ))}

            {/* Product pins */}
            {!hidePins && productPins.map((pin) => (
              <div
                key={pin.id}
                className="absolute z-10"
                style={{ left: `calc(${pin.posX}% - 8px)`, top: `calc(${pin.posY}% - 8px)` }}
                onMouseEnter={() => handleProductPinMouseEnter(pin.id)}
                onMouseLeave={handleProductPinMouseLeave}
                onClick={(e) => e.stopPropagation()}
              >
                <div className={`w-4 h-4 rounded-full bg-gray-500 border-2 border-white shadow-lg cursor-pointer ${productPinsPulsing ? "animate-pulse" : ""}`} />
                {hoveredProductPinId === pin.id && (
                  <div
                    className="fixed z-50 bg-card rounded-xl shadow-xl border border-border p-3 w-56"
                    style={getPopupStyle(pin.posX, pin.posY, imgRef.current, 224, visualVP.height || undefined, visualVP.offsetTop)}
                    onMouseEnter={() => handleProductPinMouseEnter(pin.id)}
                    onMouseLeave={handleProductPinMouseLeave}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {pin.product.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={pin.product.imageUrl} alt={pin.product.name} className="w-full h-28 object-cover rounded-lg mb-2 border border-border" />
                    )}
                    {!pin.product.imageUrl && (
                      <div className="w-full h-16 rounded-lg bg-muted flex items-center justify-center mb-2">
                        <Package size={20} className="text-muted-foreground" />
                      </div>
                    )}
                    <p className="text-sm font-medium text-foreground truncate">{pin.product.name}</p>
                    {pin.product.price && <p className="text-xs text-muted-foreground mt-0.5">{pin.product.price}</p>}
                    <div className="flex items-center gap-2 mt-2">
                      {pin.product.url && (
                        <a href={pin.product.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600 transition-colors">
                          <ExternalLink size={12} /> Sklep
                        </a>
                      )}
                      {isDesigner && (
                        <button
                          onClick={() => deleteProductPin(pin.id, renderId)}
                          className="ml-auto text-muted-foreground hover:text-red-500 transition-colors"
                          title="Usuń produkt"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Pending pin */}
            {pending && (
              <div
                className="absolute w-7 h-7 rounded-full bg-blue-500 border-2 border-white text-white text-xs font-bold flex items-center justify-center shadow-lg z-10 animate-pulse pointer-events-none"
                style={{
                  left: `calc(${pending.x}% - 14px)`,
                  top: `calc(${pending.y}% - 14px)`,
                }}
              >
                +
              </div>
            )}

            {/* New comment popup */}
            {pending && (
              <div
                className="fixed z-50 bg-card rounded-xl shadow-xl border border-border p-4 w-64"
                style={getPopupStyle(pending.x, pending.y, imgRef.current, 256, visualVP.height || undefined, visualVP.offsetTop)}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Nowy pin</h3>
                  <button onClick={cancelPending} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
                    <X size={14} />
                  </button>
                </div>
                <Input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Tytuł (opcjonalnie)"
                  className="mb-2 text-sm"
                  onKeyDown={(e) => { if (e.key === "Escape") cancelPending(); }}
                />
                <Textarea
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Opisz co wymaga zmiany..."
                  className="mb-3 text-sm resize-none max-h-40 overflow-y-auto"
                  rows={3}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && e.ctrlKey) submitComment();
                    if (e.key === "Escape") cancelPending();
                  }}
                />
                {isDesigner && (
                  <button
                    type="button"
                    onClick={() => setNewPinInternal((v) => !v)}
                    className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded border transition-colors mb-3 ${
                      newPinInternal
                        ? "border-slate-400 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                        : "border-border text-gray-400 hover:text-gray-600"
                    }`}
                  >
                    <Lock size={11} />
                    {newPinInternal ? "Notatka wewnętrzna" : "Widoczny dla klienta"}
                  </button>
                )}
                <div className="flex gap-2 justify-end">
                  <Button size="sm" variant="outline" onClick={cancelPending}>Anuluj</Button>
                  <Button size="sm" onClick={submitComment} disabled={adding || !newContent.trim()}>
                    {adding ? "Dodawanie..." : "Dodaj pin"}
                  </Button>
                </div>
              </div>
            )}

            {/* Thread popup for existing pin */}
            {selectedComment && (
              <div
                className="fixed z-50 bg-card rounded-xl shadow-xl border border-border w-72 flex flex-col"
                style={{
                  ...getPopupStyle(selectedComment.posX!, selectedComment.posY!, imgRef.current, 288, visualVP.height || undefined, visualVP.offsetTop),
                  maxHeight: "360px",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Thread header */}
                <div className="flex items-center gap-2 px-4 py-3 border-b flex-shrink-0">
                  <span
                    className={`w-5 h-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0 ${STATUS_PIN_COLOR[selectedComment.status]}`}
                  >
                    {selectedIndex + 1}
                  </span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate flex-1">
                    {selectedComment.title || `Pin #${selectedIndex + 1}`}
                  </span>
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 ${STATUS_BADGE[selectedComment.status]}`}>
                    {STATUS_LABEL[selectedComment.status]}
                  </span>
                  {isDesigner && (
                    <button
                      onClick={handleToggleInternal}
                      className="text-gray-400 hover:text-gray-700 flex-shrink-0 transition-colors"
                      title={selectedComment.isInternal ? "Pokaż klientowi" : "Ukryj przed klientem"}
                    >
                      {selectedComment.isInternal ? <LockOpen size={13} /> : <Lock size={13} />}
                    </button>
                  )}
                  <button
                    onClick={() => { setSelectedId(null); setReplyContent(""); }}
                    className="text-gray-400 hover:text-gray-700 flex-shrink-0"
                  >
                    <X size={14} />
                  </button>
                </div>

                {/* Thread messages */}
                <div className="flex-1 overflow-y-auto divide-y divide-gray-100 min-h-0">
                  {/* Original comment */}
                  <div className="px-4 py-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">{selectedComment.author}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-gray-400">{formatDate(selectedComment.createdAt)}</span>
                        {(isDesigner || selectedComment.author === authorName) && (
                          <button
                            onClick={() => deleteComment(selectedComment.id)}
                            className="text-gray-300 hover:text-red-400 transition-colors"
                            title="Usuń"
                          >
                            <X size={11} />
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{selectedComment.content}</p>
                  </div>

                  {/* Replies */}
                  {selectedComment.replies.map((r) => (
                    <div key={r.id} className="px-4 py-3 bg-muted/50">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">{r.author}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-gray-400">{formatDate(r.createdAt)}</span>
                          {(isDesigner || r.author === authorName) && (
                            <button
                              onClick={() => deleteReply(selectedComment.id, r.id)}
                              className="text-gray-300 hover:text-red-400 transition-colors"
                              title="Usuń"
                            >
                              <X size={11} />
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{r.content}</p>
                    </div>
                  ))}
                </div>

                {/* Status buttons (designer only) + delete */}
                {(isDesigner || selectedComment.author === authorName) && (
                  <div className="px-4 py-2 border-t flex gap-1 flex-wrap flex-shrink-0">
                    {isDesigner && (["NEW", "IN_PROGRESS", "DONE"] as CommentStatus[]).map((s) => (
                      <button
                        key={s}
                        onClick={() => updateStatus(selectedComment.id, s)}
                        className={`text-xs px-2 py-1 rounded-md border transition-colors ${
                          selectedComment.status === s
                            ? "bg-gray-900 text-white border-gray-900"
                            : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500"
                        }`}
                      >
                        {STATUS_LABEL[s]}
                      </button>
                    ))}
                    {(isDesigner || selectedComment.author === authorName) && (
                      <button
                        onClick={() => deleteComment(selectedComment.id)}
                        className="ml-auto text-red-500 hover:text-red-700 transition-colors p-1"
                        title="Usuń pin"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                )}

                {/* Reply input */}
                <div className="px-4 py-3 border-t flex-shrink-0">
                  <div className="flex gap-2">
                    <Textarea
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      placeholder="Dodaj odpowiedź..."
                      className="text-sm resize-none flex-1"
                      rows={2}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && e.ctrlKey) submitReply();
                        if (e.key === "Escape") { setSelectedId(null); setReplyContent(""); }
                      }}
                    />
                    <Button
                      size="sm"
                      className="self-end flex-shrink-0"
                      onClick={submitReply}
                      disabled={replying || !replyContent.trim()}
                    >
                      <Send size={13} />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
          </div>
        </div>

        {/* Sidebar */}
        {showComments && <>
          {/* Mobile backdrop */}
          <div
            className="fixed inset-0 z-20 bg-black/30 md:hidden"
            onClick={() => { setShowComments(false); sessionStorage.setItem("renderflow_showComments", "false"); }}
          />
          <div className={`fixed md:relative inset-y-0 right-0 z-30 md:z-auto md:flex-shrink-0 transition-[width] duration-200 ${sidebarExpanded ? "md:w-[576px]" : "md:w-72"}`}>

            {/* Expand handle — absolutely positioned outside the panel, bottom-left */}
            <button
              onClick={() => setSidebarExpanded(v => !v)}
              className="hidden md:flex items-center justify-center w-5 h-12 bg-card border border-r-0 border-border rounded-l-md shadow-md text-muted-foreground hover:text-foreground transition-colors absolute left-0 bottom-0 -translate-x-full z-10"
              title={sidebarExpanded ? "Zwiń panel" : "Rozwiń panel"}
            >
              {sidebarExpanded ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
            </button>

            <div className={`h-full w-[min(288px,100vw)] flex flex-col bg-card border-l shadow-xl md:shadow-none transition-[width] duration-200 ${sidebarExpanded ? "md:w-[576px]" : "md:w-72"}`}>

            {/* Tab switcher */}
            <div className="flex border-b flex-shrink-0">
              <button
                onClick={() => setSidebarTab("pins")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-colors border-b-2 ${
                  sidebarTab === "pins"
                    ? "border-gray-900 dark:border-gray-100 text-gray-900 dark:text-gray-100"
                    : "border-transparent text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                }`}
              >
                <Pin size={13} />
                Piny {pinComments.length > 0 && <span className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-full px-1.5 py-0.5 text-[10px]">{pinComments.length}</span>}
              </button>
              <button
                onClick={() => { setSidebarTab("chat"); markChatRead(); }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-colors border-b-2 ${
                  sidebarTab === "chat"
                    ? "border-gray-900 dark:border-gray-100 text-gray-900 dark:text-gray-100"
                    : "border-transparent text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                }`}
              >
                <MessageSquare size={13} />
                Czat {comments.filter(c => c.posX === null).length > 0 && <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${chatUnreadCount > 0 ? "bg-blue-500 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300"}`}>{comments.filter(c => c.posX === null).length}</span>}
              </button>
            </div>

            {/* ── PINY TAB ── */}
            {sidebarTab === "pins" && (
              <>
                <div className="px-4 py-2.5 border-b flex-shrink-0">
                  <div className="flex gap-1">
                    <button
                      onClick={() => { setPinFilter("current"); sessionStorage.setItem("renderflow_pinFilter", "current"); }}
                      className={`text-xs px-2.5 py-1 rounded-md border transition-colors font-medium ${
                        pinFilter === "current"
                          ? "bg-gray-900 text-white border-gray-900 dark:bg-gray-100 dark:text-gray-900 dark:border-gray-100"
                          : "border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-400"
                      }`}
                    >
                      Ten render
                    </button>
                    <button
                      onClick={() => {
                        setPinFilter("all");
                        sessionStorage.setItem("renderflow_pinFilter", "all");
                        fetchAllComments();
                      }}
                      className={`text-xs px-2.5 py-1 rounded-md border transition-colors font-medium ${
                        pinFilter === "all"
                          ? "bg-gray-900 text-white border-gray-900 dark:bg-gray-100 dark:text-gray-900 dark:border-gray-100"
                          : "border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-400"
                      }`}
                    >
                      Wszystkie
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
                  {pinFilter === "all" && loadingAllComments ? (
                    <p className="text-xs text-gray-400 text-center py-8">Ładowanie pinów...</p>
                  ) : (() => {
                    const listItems: CommentWithMeta[] = pinFilter === "all"
                      ? allComments.filter(c => c.posX !== null)
                      : pinComments.map((c) => ({ ...c, renderId, renderName: renderName ?? "" }));

                    if (listItems.length === 0) {
                      return (
                        <p className="text-xs text-gray-400 text-center py-8">
                          {mode === "pin" ? "Kliknij na obraz aby dodać pin" : "Brak pinów"}
                        </p>
                      );
                    }

                    return listItems.map((c, i) => {
                      const isFromOtherRender = pinFilter === "all" && c.renderId !== renderId;
                      const isSelected = selectedId === c.id;
                      const displayTitle = c.title || `Pin #${i + 1}`;
                      const totalReplies = c.replies.length;
                      return (
                        <div
                          key={c.id}
                          className={`px-4 py-3 cursor-pointer transition-colors ${
                            isSelected ? "bg-blue-50 dark:bg-blue-900/20" : "hover:bg-muted/50"
                          }`}
                          onClick={() => {
                            if (isFromOtherRender && projectId) {
                              router.push(`/projects/${projectId}/renders/${c.renderId}?pinId=${c.id}`);
                              return;
                            }
                            setSelectedId(c.id === selectedId ? null : c.id);
                            cancelPending();
                            setReplyContent("");
                          }}
                        >
                          <div className="flex items-start gap-2">
                            <span className={`w-5 h-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5 ${c.isInternal ? "bg-slate-500" : STATUS_PIN_COLOR[c.status]}`}>
                              {i + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{displayTitle}</span>
                                {c.isInternal && <Lock size={11} className="text-slate-400 flex-shrink-0" />}
                                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${STATUS_BADGE[c.status]}`}>
                                  {STATUS_LABEL[c.status]}
                                </span>
                              </div>
                              {c.content && (
                                <p className="text-xs text-gray-700 dark:text-gray-300 mt-1 line-clamp-2">{c.content}</p>
                              )}
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                {c.author} · {formatDate(c.createdAt)}
                                {totalReplies > 0 && (
                                  <span className="ml-1 text-blue-500">{totalReplies} {totalReplies === 1 ? "odpowiedź" : "odpowiedzi"}</span>
                                )}
                              </p>
                              {isFromOtherRender && (
                                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 italic truncate">{c.renderName}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </>
            )}

            {/* ── CZAT TAB ── */}
            {sidebarTab === "chat" && (() => {
              const chatItems = [...comments, ...localAiSummaries]
                .filter(c => !c.isInternal || isDesigner)
                .filter(c => !c.isAiSummary || (isDesigner ? true : c.author === authorName))
                .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

              // Group by calendar day
              type DayGroup = { label: string; items: Comment[] };
              const groups: DayGroup[] = [];
              chatItems.forEach(item => {
                const label = new Date(item.createdAt).toLocaleDateString("pl-PL", { day: "2-digit", month: "long", year: "numeric" });
                const last = groups[groups.length - 1];
                if (!last || last.label !== label) groups.push({ label, items: [item] });
                else last.items.push(item);
              });

              return (
                <>
                  {/* AI Summary button */}
                  <div className="px-3 py-2 border-b flex-shrink-0">
                    <button
                      onClick={generateAiSummary}
                      disabled={generatingSummary || comments.filter(c => !c.isInternal || isDesigner).filter(c => !c.isAiSummary).length === 0}
                      className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 text-xs font-medium rounded-lg bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-900/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <Sparkles size={12} />
                      {generatingSummary ? "Generowanie…" : "Podsumowanie AI"}
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
                    {chatItems.length === 0 && (
                      <p className="text-xs text-gray-400 text-center py-8">Brak wiadomości — napisz pierwszą!</p>
                    )}
                    {groups.map(group => (
                      <div key={group.label}>
                        {/* Date separator */}
                        <div className="flex items-center gap-2 my-3">
                          <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                          <span className="text-[10px] text-gray-400 flex-shrink-0 select-none">{group.label}</span>
                          <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                        </div>
                        {group.items.map(item => {
                          if (item.isAiSummary) {
                            // AI Summary bubble
                            const isLocal = item.id.startsWith("local-ai-");
                            return (
                              <div key={item.id} className="mb-3">
                                <div className="rounded-xl border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-900/20 px-3 py-2.5">
                                  <div className="flex items-center gap-1.5 mb-1.5">
                                    <Sparkles size={11} className="text-violet-500 flex-shrink-0" />
                                    <span className="text-[10px] font-semibold text-violet-600 dark:text-violet-400">Podsumowanie AI</span>
                                    <span className="text-[10px] text-gray-400 ml-auto">{formatDate(item.createdAt)}</span>
                                    <button
                                      onClick={() => {
                                        if (isLocal) {
                                          setLocalAiSummaries(prev => prev.filter(s => s.id !== item.id));
                                        } else {
                                          deleteComment(item.id);
                                        }
                                      }}
                                      className="text-violet-300 hover:text-violet-600 dark:hover:text-violet-200 transition-colors flex-shrink-0"
                                      title="Usuń podsumowanie"
                                    >
                                      <X size={11} />
                                    </button>
                                  </div>
                                  <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{item.content}</p>
                                </div>
                              </div>
                            );
                          } else if (item.posX !== null) {
                            // Pin card
                            const pinIdx = pinComments.findIndex(c => c.id === item.id);
                            const isSelected = selectedId === item.id;
                            return (
                              <div
                                key={item.id}
                                className={`flex items-start gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-colors mb-1.5 border ${
                                  isSelected
                                    ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
                                    : "bg-gray-50 dark:bg-muted/40 border-gray-100 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-muted/60"
                                }`}
                                onClick={() => {
                                  setSelectedId(item.id === selectedId ? null : item.id);
                                  cancelPending();
                                  setReplyContent("");
                                }}
                              >
                                <span className={`w-5 h-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5 ${item.isInternal ? "bg-slate-500" : STATUS_PIN_COLOR[item.status]}`}>
                                  {pinIdx + 1}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1 flex-wrap">
                                    <Pin size={9} className="text-gray-400 flex-shrink-0" />
                                    <span className="text-xs font-semibold text-gray-800 dark:text-gray-100 truncate">
                                      {item.title || `Pin #${pinIdx + 1}`}
                                    </span>
                                    {item.isInternal && <Lock size={9} className="text-slate-400" />}
                                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${STATUS_BADGE[item.status]}`}>
                                      {STATUS_LABEL[item.status]}
                                    </span>
                                  </div>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2 leading-relaxed">{item.content}</p>
                                  <p className="text-[10px] text-gray-400 mt-0.5">{item.author} · {formatDate(item.createdAt)}</p>
                                </div>
                              </div>
                            );
                          } else {
                            // Chat bubble
                            const isOwn = item.author === authorName;
                            const isHighlighted = highlightedChatId === item.id;
                            return (
                              <div
                                key={item.id}
                                ref={(el) => { if (el) chatMessageRefs.current.set(item.id, el); else chatMessageRefs.current.delete(item.id); }}
                                className={`flex mb-2 rounded-xl transition-colors duration-300 ${isOwn ? "justify-end" : "justify-start"} ${isHighlighted ? "bg-yellow-100 dark:bg-yellow-900/30" : ""}`}
                              >
                                <div className={`max-w-[85%] flex flex-col ${isOwn ? "items-end" : "items-start"}`}>
                                  {!isOwn && (
                                    <span className="text-[10px] text-gray-500 dark:text-gray-400 mb-1 ml-1 font-medium">{item.author}</span>
                                  )}
                                  <div className={`px-3 py-2 text-sm leading-relaxed break-words ${
                                    isOwn
                                      ? "bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-2xl rounded-tr-sm"
                                      : "bg-gray-100 dark:bg-muted text-gray-800 dark:text-gray-200 rounded-2xl rounded-tl-sm"
                                  }`}>
                                    {item.content}
                                  </div>
                                  <div className={`flex items-center gap-1.5 mt-1 ${isOwn ? "flex-row-reverse" : "flex-row"}`}>
                                    <span className="text-[10px] text-gray-400">{formatDate(item.createdAt)}</span>
                                    {(isDesigner || item.author === authorName) && (
                                      <button
                                        onClick={() => deleteComment(item.id)}
                                        className="text-gray-300 hover:text-red-400 transition-colors"
                                        title="Usuń"
                                      >
                                        <X size={10} />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          }
                        })}
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>

                  {/* Message input */}
                  {(isDesigner || allowClientComments) && (
                    <div className="px-3 py-3 border-t flex gap-2 items-end flex-shrink-0">
                      <Textarea
                        value={chatMessage}
                        onChange={(e) => setChatMessage(e.target.value)}
                        placeholder="Napisz wiadomość…"
                        className="text-sm resize-none flex-1 max-h-28 overflow-y-auto"
                        rows={1}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            submitChatMessage();
                          }
                        }}
                      />
                      <Button
                        size="sm"
                        className="flex-shrink-0 mb-px"
                        onClick={submitChatMessage}
                        disabled={sendingChatMessage || !chatMessage.trim()}
                      >
                        <Send size={13} />
                      </Button>
                    </div>
                  )}
                </>
              );
            })()}

          </div>
          </div>
        </>}
      </div>

      {/* Lightbox */}
      {lightboxOpen && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col">
          {/* Lightbox header */}
          <div className="flex items-center justify-between px-5 py-3 flex-shrink-0 border-b border-white/10">
            <div className="flex items-center gap-1 min-w-0 text-sm">
              {projectTitle && (
                <>
                  <span className="text-white/50 truncate max-w-[100px]">{projectTitle}</span>
                  <ChevronLeft size={12} className="flex-shrink-0 text-white/30 rotate-180" />
                </>
              )}
              {roomName && (
                <>
                  <span className="text-white/50 truncate max-w-[100px]">{roomName}</span>
                  <ChevronLeft size={12} className="flex-shrink-0 text-white/30 rotate-180" />
                </>
              )}
              {folderName && (
                <>
                  <span className="text-white/50 truncate max-w-[100px]">{folderName}</span>
                  <ChevronLeft size={12} className="flex-shrink-0 text-white/30 rotate-180" />
                </>
              )}
              <span className="text-white font-semibold truncate max-w-[160px]">{lightboxRender.name || renderName}</span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {(isDesigner || allowClientComments) && (
                <button
                  onClick={() => {
                    setMode(mode === "pin" ? "view" : "pin");
                    setProductPinMode(false);
                    cancelPending();
                    setPendingProductPos(null);
                  }}
                  className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md font-medium transition-colors ${mode === "pin" ? "bg-white/20 text-white" : "bg-white text-black hover:bg-white/90"}`}
                >
                  <Pin size={14} /> {mode === "pin" ? "Anuluj" : "Dodaj pin"}
                </button>
              )}
              {isDesigner && (
                <button
                  onClick={() => {
                    setProductPinMode((v) => !v);
                    setMode("view");
                    cancelPending();
                    setPendingProductPos(null);
                  }}
                  className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md font-medium transition-colors ${productPinMode ? "bg-white/20 text-white" : "bg-white text-black hover:bg-white/90"}`}
                >
                  <Package size={14} /> {productPinMode ? "Anuluj" : "Dodaj produkt"}
                </button>
              )}
              <button
                onClick={() => {
                  setLightboxOpen(false);
                  setMode("view");
                  cancelPending();
                  if (projectId && lightboxRender.id !== renderId) {
                    router.push(`/projects/${projectId}/renders/${lightboxRender.id}`);
                  }
                }}
                className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-md transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Lightbox image area */}
          <div className="flex-1 relative">
          {/* Left navigation arrow */}
          {lightboxPrevRender && (
            <button
              onClick={() => { setLightboxIndex((i) => i - 1); setZoom(1); cancelPending(); }}
              className="absolute left-3 top-1/2 -translate-y-1/2 z-10 bg-white/10 hover:bg-white/20 border border-white/20 rounded-full p-2 text-white/70 hover:text-white transition-all opacity-60 hover:opacity-100"
              title={lightboxPrevRender.name}
            >
              <ChevronLeft size={20} />
            </button>
          )}
          {/* Right navigation arrow */}
          {lightboxNextRender && (
            <button
              onClick={() => { setLightboxIndex((i) => i + 1); setZoom(1); cancelPending(); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 z-10 bg-white/10 hover:bg-white/20 border border-white/20 rounded-full p-2 text-white/70 hover:text-white transition-all opacity-60 hover:opacity-100"
              title={lightboxNextRender.name}
            >
              <ChevronRight size={20} />
            </button>
          )}
          <div
            className="absolute inset-0 overflow-auto flex items-start justify-center p-8"
            onWheel={(e) => {
              e.preventDefault();
              const delta = e.deltaY > 0 ? -0.12 : 0.12;
              setZoom((z) => Math.max(0.25, Math.min(5, z + delta)));
            }}
          >
            <div
              ref={lightboxImgRef}
              className={`relative flex-shrink-0 select-none ${(mode === "pin" || productPinMode) ? "cursor-crosshair" : "cursor-default"}`}
              style={{ width: `${Math.max(60, 75 * zoom)}vw` }}
              onClick={(e) => {
                if (productPinMode) {
                  if (pending || pendingProductPos) return;
                  const rect = lightboxImgRef.current!.getBoundingClientRect();
                  const x = ((e.clientX - rect.left) / rect.width) * 100;
                  const y = ((e.clientY - rect.top) / rect.height) * 100;
                  setPendingProductPos({ x, y, renderId: lightboxRender.id });
                  return;
                }
                if (mode !== "pin") return;
                if (pending) return;
                const rect = lightboxImgRef.current!.getBoundingClientRect();
                const x = ((e.clientX - rect.left) / rect.width) * 100;
                const y = ((e.clientY - rect.top) / rect.height) * 100;
                setPending({ x, y });
                setNewTitle("");
                setNewContent("");
                setSelectedId(null);
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={lightboxRender.fileUrl}
                alt="Render"
                className="w-full h-auto block rounded-lg"
                draggable={false}
              />

              {/* Product pins in lightbox */}
              {!hidePins && (lightboxRender.id === renderId ? productPins : lightboxProductPins).map((pin) => (
                <div
                  key={pin.id}
                  className="absolute z-10"
                  style={{ left: `calc(${pin.posX}% - 8px)`, top: `calc(${pin.posY}% - 8px)` }}
                  onMouseEnter={() => handleProductPinMouseEnter(pin.id)}
                  onMouseLeave={handleProductPinMouseLeave}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className={`w-4 h-4 rounded-full bg-gray-400 border-2 border-white shadow-lg cursor-pointer ${productPinsPulsing ? "animate-pulse" : ""}`} />
                  {hoveredProductPinId === pin.id && (
                    <div
                      className="fixed z-50 bg-card rounded-xl shadow-xl border border-border p-3 w-56"
                      style={getPopupStyle(pin.posX, pin.posY, lightboxImgRef.current, 224)}
                      onMouseEnter={() => handleProductPinMouseEnter(pin.id)}
                      onMouseLeave={handleProductPinMouseLeave}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {pin.product.imageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={pin.product.imageUrl} alt={pin.product.name} className="w-full h-28 object-cover rounded-lg mb-2 border border-border" />
                      )}
                      {!pin.product.imageUrl && (
                        <div className="w-full h-16 rounded-lg bg-muted flex items-center justify-center mb-2">
                          <Package size={20} className="text-muted-foreground" />
                        </div>
                      )}
                      <p className="text-sm font-medium text-foreground truncate">{pin.product.name}</p>
                      {pin.product.price && <p className="text-xs text-muted-foreground mt-0.5">{pin.product.price}</p>}
                      <div className="flex items-center gap-2 mt-2">
                        {pin.product.url && (
                          <a href={pin.product.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600 transition-colors">
                            <ExternalLink size={12} /> Sklep
                          </a>
                        )}
                        {isDesigner && (
                          <button
                            onClick={() => deleteProductPin(pin.id, lightboxRender.id)}
                            className="ml-auto text-muted-foreground hover:text-red-500 transition-colors"
                            title="Usuń produkt"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Pins overlay — interactive */}
              {!hidePins && (lightboxRender.id === renderId ? pinComments : lightboxComments.filter(c => c.posX !== null)).map((c, i) => (
                <button
                  key={c.id}
                  className={`absolute w-7 h-7 rounded-full border-2 border-white text-white text-xs font-bold flex items-center justify-center shadow-lg z-10 transition-transform hover:scale-110 ${STATUS_PIN_COLOR[c.status]} ${
                    selectedId === c.id ? "scale-125 ring-2 ring-white ring-offset-1" : ""
                  }`}
                  style={{
                    left: `calc(${c.posX!}% - 14px)`,
                    top: `calc(${c.posY!}% - 14px)`,
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedId(c.id === selectedId ? null : c.id);
                    cancelPending();
                    setReplyContent("");
                  }}
                >
                  {i + 1}
                </button>
              ))}

              {/* Pending pin */}
              {pending && (
                <div
                  className="absolute w-7 h-7 rounded-full bg-blue-500 border-2 border-white text-white text-xs font-bold flex items-center justify-center shadow-lg z-10 animate-pulse pointer-events-none"
                  style={{
                    left: `calc(${pending.x}% - 14px)`,
                    top: `calc(${pending.y}% - 14px)`,
                  }}
                >
                  +
                </div>
              )}

              {/* New comment popup */}
              {pending && (
                <div
                  className="fixed z-50 bg-card rounded-xl shadow-xl border border-border p-4 w-64"
                  style={getPopupStyle(pending.x, pending.y, lightboxImgRef.current, 256, visualVP.height || undefined, visualVP.offsetTop)}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Nowy pin</h3>
                    <button onClick={cancelPending} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
                      <X size={14} />
                    </button>
                  </div>
                  <Input
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Tytuł (opcjonalnie)"
                    className="mb-2 text-sm"
                    onKeyDown={(e) => { if (e.key === "Escape") cancelPending(); }}
                  />
                  <Textarea
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    placeholder="Opisz co wymaga zmiany..."
                    className="mb-3 text-sm resize-none max-h-40 overflow-y-auto"
                    rows={3}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && e.ctrlKey) submitComment();
                      if (e.key === "Escape") cancelPending();
                    }}
                  />
                  <div className="flex gap-2 justify-end">
                    <button onClick={cancelPending} className="text-sm text-gray-400 hover:text-gray-600 transition-colors px-2">Anuluj</button>
                    <Button size="sm" onClick={submitComment} disabled={adding || !newContent.trim()}>
                      {adding ? "Dodawanie..." : "Dodaj"}
                    </Button>
                  </div>
                </div>
              )}

              {/* Thread popup for existing pin */}
              {selectedComment && !pending && (
                <div
                  className="fixed z-50 bg-card rounded-xl shadow-xl border border-border w-72 flex flex-col"
                  style={{
                    ...getPopupStyle(selectedComment.posX!, selectedComment.posY!, lightboxImgRef.current, 288, visualVP.height || undefined, visualVP.offsetTop),
                    maxHeight: "360px",
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center gap-2 px-4 py-3 border-b flex-shrink-0">
                    <span className={`w-5 h-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0 ${STATUS_PIN_COLOR[selectedComment.status]}`}>
                      {selectedIndex + 1}
                    </span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate flex-1">
                      {selectedComment.title || `Pin #${selectedIndex + 1}`}
                    </span>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 ${STATUS_BADGE[selectedComment.status]}`}>
                      {STATUS_LABEL[selectedComment.status]}
                    </span>
                    <button
                      onClick={() => { setSelectedId(null); setReplyContent(""); }}
                      className="text-gray-400 hover:text-gray-700 flex-shrink-0"
                    >
                      <X size={14} />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto divide-y divide-gray-100 min-h-0">
                    <div className="px-4 py-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">{selectedComment.author}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-gray-400">{formatDate(selectedComment.createdAt)}</span>
                          {(isDesigner || selectedComment.author === authorName) && (
                            <button onClick={() => deleteComment(selectedComment.id)} className="text-gray-300 hover:text-red-400 transition-colors">
                              <X size={11} />
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{selectedComment.content}</p>
                    </div>
                    {selectedComment.replies.map((r) => (
                      <div key={r.id} className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">{r.author}</span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-gray-400">{formatDate(r.createdAt)}</span>
                            {(isDesigner || r.author === authorName) && (
                              <button onClick={() => deleteReply(selectedComment.id, r.id)} className="text-gray-300 hover:text-red-400 transition-colors">
                                <X size={11} />
                              </button>
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{r.content}</p>
                      </div>
                    ))}
                  </div>

                  {isDesigner && (
                    <div className="px-4 py-2 border-t flex gap-1 flex-wrap flex-shrink-0">
                      {(["NEW", "IN_PROGRESS", "DONE"] as CommentStatus[]).map((s) => (
                        <button
                          key={s}
                          onClick={() => updateStatus(selectedComment.id, s)}
                          className={`text-xs px-2 py-1 rounded-md border transition-colors ${
                            selectedComment.status === s
                              ? "bg-gray-900 text-white border-gray-900"
                              : "border-gray-200 text-gray-500 hover:border-gray-400"
                          }`}
                        >
                          {STATUS_LABEL[s]}
                        </button>
                      ))}
                      <button
                        onClick={() => deleteComment(selectedComment.id)}
                        className="ml-auto text-red-500 hover:text-red-700 transition-colors p-1"
                        title="Usuń pin"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}

                  <div className="px-4 py-3 border-t flex-shrink-0">
                    <div className="flex gap-2">
                      <Textarea
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        placeholder="Dodaj odpowiedź..."
                        className="text-sm resize-none flex-1"
                        rows={2}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && e.ctrlKey) submitReply();
                          if (e.key === "Escape") { setSelectedId(null); setReplyContent(""); }
                        }}
                      />
                      <Button
                        size="sm"
                        className="self-end flex-shrink-0"
                        onClick={submitReply}
                        disabled={replying || !replyContent.trim()}
                      >
                        <Send size={13} />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          </div>

          {/* Zoom controls */}
          <div className="flex items-center justify-center gap-3 py-4 flex-shrink-0 border-t border-white/10">
            <button
              onClick={() => setZoom((z) => Math.max(0.25, z - 0.25))}
              className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"
            >
              <ZoomOut size={18} />
            </button>
            <button
              onClick={() => setZoom(1)}
              className="text-xs text-white/60 hover:text-white w-14 text-center transition-colors"
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              onClick={() => setZoom((z) => Math.min(5, z + 0.25))}
              className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"
            >
              <ZoomIn size={18} />
            </button>
          </div>
        </div>
      )}

      {/* SearchProductDialog */}
      <SearchProductDialog
        open={pendingProductPos !== null}
        onClose={() => setPendingProductPos(null)}
        onSelect={(product) => {
          if (!pendingProductPos) return;
          addProductPin(product, { x: pendingProductPos.x, y: pendingProductPos.y }, pendingProductPos.renderId);
          setPendingProductPos(null);
          setProductPinMode(false);
        }}
      />

      {/* Version History Modal */}
      {/* Compare overlay */}
      {compareVersion && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
          <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 flex-shrink-0">
            <div>
              <span className="text-white font-semibold text-sm">Porównanie wersji</span>
              {renderName && <span className="text-white/40 text-sm ml-2">— {renderName}</span>}
            </div>
            <button
              onClick={() => setCompareVersion(null)}
              className="text-white/60 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>
          <div
            className="flex-1 relative overflow-hidden select-none"
            style={{ cursor: isDragging ? "col-resize" : "default" }}
            onMouseMove={handleSliderMouseMove}
            onMouseUp={() => setIsDragging(false)}
            onMouseLeave={() => setIsDragging(false)}
            onTouchMove={handleSliderTouchMove}
            onTouchEnd={() => setIsDragging(false)}
          >
            {/* Left — old version */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={compareVersion.fileUrl}
              alt={`Wersja ${compareVersion.versionNumber}`}
              className="absolute inset-0 w-full h-full object-contain"
              style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
              draggable={false}
            />
            {/* Right — current */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt="Aktualna"
              className="absolute inset-0 w-full h-full object-contain"
              style={{ clipPath: `inset(0 0 0 ${sliderPos}%)` }}
              draggable={false}
            />
            {/* Divider */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-white z-10"
              style={{ left: `${sliderPos}%` }}
              onMouseDown={(e) => { e.preventDefault(); setIsDragging(true); }}
              onTouchStart={(e) => { e.preventDefault(); setIsDragging(true); }}
            >
              <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-9 h-9 bg-white rounded-full flex items-center justify-center shadow-xl cursor-col-resize">
                <ChevronsLeftRight size={16} className="text-gray-700" />
              </div>
            </div>
            {/* Labels */}
            <div className="absolute top-4 left-4 bg-black/60 text-white text-xs px-2.5 py-1 rounded-full pointer-events-none">
              Wersja {compareVersion.versionNumber}
            </div>
            <div className="absolute top-4 right-4 bg-black/60 text-white text-xs px-2.5 py-1 rounded-full pointer-events-none">
              Aktualna
            </div>
          </div>
        </div>
      )}

      {showVersionHistory && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          onClick={() => setShowVersionHistory(false)}
        >
          <div
            className={`bg-card border border-border rounded-2xl shadow-2xl w-full max-h-[80vh] flex flex-col ${onVersionRestoreRequest ? "max-w-2xl" : "max-w-lg"}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
              <div>
                <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Historia wersji</h2>
                {renderName && (
                  <p className="text-xs text-gray-400 mt-0.5">{renderName}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {isDesigner && (
                  <>
                    <input
                      ref={versionFileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) startUpload([file]);
                        e.target.value = "";
                      }}
                    />
                    <button
                      onClick={() => versionFileInputRef.current?.click()}
                      disabled={isVersionUploading}
                      className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md bg-muted text-gray-700 dark:text-gray-300 hover:bg-muted/80 transition-colors disabled:opacity-50"
                    >
                      <Upload size={14} />
                      {isVersionUploading ? "Wgrywanie..." : "Dodaj wersję"}
                    </button>
                  </>
                )}
                <button
                  onClick={() => setShowVersionHistory(false)}
                  className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-border">
              {versions.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                  <History size={32} className="mb-3 opacity-30" />
                  <p className="text-sm font-medium">Brak wersji</p>
                  <p className="text-xs mt-1 text-center text-gray-300 max-w-xs">
                    {isDesigner
                      ? "Wgraj nowy plik używając przycisku \"Dodaj wersję\", aby zapisać historię zmian"
                      : "Tu znajdziesz poprzednie wersje tego pliku dodane przez projektanta. Na razie nie ma żadnych wersji do wyświetlenia."}
                  </p>
                </div>
              )}
              {[...versions].sort((a, b) => b.versionNumber - a.versionNumber).map((v) => {
                const date = new Date(v.archivedAt);
                const formatted = date.toLocaleDateString("pl-PL", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                });
                return (
                  <div key={v.id} className="flex items-center gap-4 px-6 py-4">
                    <a
                      href={v.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-shrink-0 w-20 h-14 rounded-lg overflow-hidden border border-border bg-muted hover:opacity-80 transition-opacity"
                      title="Otwórz pełny rozmiar"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={v.fileUrl}
                        alt={`Wersja ${v.versionNumber}`}
                        className="w-full h-full object-cover"
                      />
                    </a>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                        Wersja {v.versionNumber}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Zarchiwizowano: {formatted}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setCompareVersion(v);
                        setSliderPos(50);
                        setShowVersionHistory(false);
                      }}
                      className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border border-border text-gray-600 dark:text-gray-300 hover:bg-muted transition-colors flex-shrink-0"
                      title="Porównaj z aktualną wersją"
                    >
                      <SplitSquareHorizontal size={12} />
                      Porównaj
                    </button>
                    {(isDesigner || onVersionRestore || onVersionRestoreRequest) && (
                      <button
                        onClick={() => handleRestoreVersion(v.id)}
                        disabled={restoringVersionId === v.id}
                        className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border border-border text-gray-600 dark:text-gray-300 hover:bg-muted transition-colors disabled:opacity-50 flex-shrink-0"
                        title={
                          !isDesigner && !allowClientVersionRestore
                            ? "Wyślij prośbę o przywrócenie do projektanta"
                            : "Przywróć tę wersję"
                        }
                      >
                        <RotateCcw size={12} />
                        {restoringVersionId === v.id
                          ? "..."
                          : !isDesigner && !allowClientVersionRestore
                          ? "Poproś o przywrócenie"
                          : "Przywróć"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
