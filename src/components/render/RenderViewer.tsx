"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { pusherClient } from "@/lib/pusher";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, ChevronDown, Pin, X, Send, ZoomIn, ZoomOut, History, Upload, Maximize2, RotateCcw, Lock, LockOpen, SplitSquareHorizontal, ChevronsLeftRight, Sparkles, Package, Trash2, Edit2, ExternalLink, Mic, StopCircle, CheckCircle2, Armchair, Loader2, FileText, MoreVertical, CornerDownLeft, Paperclip, Download } from "@/components/ui/icons";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import RenderUploader from "./RenderUploader";
import { SwipeableMessage } from "@/components/ui/swipeable-message";
import SearchProductDialog from "./SearchProductDialog";
import { useUploadThing } from "@/lib/uploadthing-client";

type CommentStatus = "NEW" | "IN_PROGRESS" | "DONE";

interface Reply {
  id: string;
  content: string;
  author: string;
  voiceUrl?: string | null;
  replyToId?: string | null;
  replyToContent?: string | null;
  replyToAuthor?: string | null;
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
  voiceUrl?: string | null;
  imageUrl?: string | null;
  replyToId?: string | null;
  replyToContent?: string | null;
  replyToAuthor?: string | null;
}

interface CommentWithMeta extends Comment {
  renderId: string;
  renderName: string;
}

interface RoomRender {
  id: string;
  name: string;
  fileUrl: string;
  fileType?: string | null;
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
  fileType?: string;
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
  authorAvatarUrl?: string | null;
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

function Avatar({ name, logoUrl }: { name: string; logoUrl?: string | null }) {
  if (logoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={logoUrl} alt={name} title={name} className="w-6 h-6 rounded-full object-cover shrink-0 cursor-default" />;
  }
  const initials = name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  return (
    <div title={name} className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-semibold text-primary shrink-0 cursor-default">
      {initials}
    </div>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatChatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 1) return "wczoraj";
  if (diffDays < 7) return d.toLocaleDateString("pl-PL", { weekday: "short" });
  return d.toLocaleDateString("pl-PL", { day: "numeric", month: "short" });
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
  fileType,
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
  authorAvatarUrl,
}: RenderViewerProps) {
  const isPdf = fileType === "pdf";

  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [pending, setPending] = useState<{ x: number; y: number } | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [adding, setAdding] = useState(false);
  const [replying, setReplying] = useState(false);
  const [editingCommentMode, setEditingCommentMode] = useState(false);
  const [editingCommentText, setEditingCommentText] = useState("");
  const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
  const [editingReplyText, setEditingReplyText] = useState("");
  const [chatOpenMenuId, setChatOpenMenuId] = useState<string | null>(null);
  const [openPinMenu, setOpenPinMenu] = useState(false);
  const [editingTitleMode, setEditingTitleMode] = useState(false);
  const [editingTitleText, setEditingTitleText] = useState("");
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editingChatText, setEditingChatText] = useState("");
  const [replyingToMsg, setReplyingToMsg] = useState<{ id: string; content: string; author: string } | null>(null);
  const [renderStatus, setRenderStatus] = useState<RenderStatus>(initialRenderStatus);
  const [mode, setMode] = useState<"view" | "pin">("view");
  const [showComments, setShowComments] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxComments, setLightboxComments] = useState<Comment[]>([]);
  const [hidePins, setHidePins] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
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
  const [sidebarTab, setSidebarTab] = useState<"pins" | "chat">("chat");
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
  const [hoveredCommentPinId, setHoveredCommentPinId] = useState<string | null>(null);
  const commentPinHoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [pendingVoiceUrl, setPendingVoiceUrl] = useState<string | null>(null);
  const [uploadingVoice, setUploadingVoice] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingActionsRef = useRef<{
    submit: () => void;
    cancel: () => void;
    hasContent: () => boolean;
  }>({
    submit: () => {},
    cancel: () => {},
    hasContent: () => false,
  });

  const [isChatRecording, setIsChatRecording] = useState(false);
  const [chatRecordingSeconds, setChatRecordingSeconds] = useState(0);
  const [chatPendingVoiceUrl, setChatPendingVoiceUrl] = useState<string | null>(null);
  const [chatUploadingVoice, setChatUploadingVoice] = useState(false);
  const chatMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chatAudioChunksRef = useRef<Blob[]>([]);
  const chatRecordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [chatPendingImageUrl, setChatPendingImageUrl] = useState<string | null>(null);
  const [chatUploadingImage, setChatUploadingImage] = useState(false);
  const chatImageInputRef = useRef<HTMLInputElement | null>(null);
  const chatTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  const [isReplyRecording, setIsReplyRecording] = useState(false);
  const [replyRecordingSeconds, setReplyRecordingSeconds] = useState(0);
  const [replyPendingVoiceUrl, setReplyPendingVoiceUrl] = useState<string | null>(null);
  const [replyUploadingVoice, setReplyUploadingVoice] = useState(false);
  const replyMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const replyAudioChunksRef = useRef<Blob[]>([]);
  const replyRecordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [isDragOverSidebar, setIsDragOverSidebar] = useState(false);
  const [sidebarUploading, setSidebarUploading] = useState(false);
  const sidebarDragCounterRef = useRef(0);

  const draggingPinRef = useRef<{
    pinId: string;
    type: "comment" | "product";
    imgEl: HTMLDivElement;
  } | null>(null);
  const dragPosRef = useRef<{ id: string; x: number; y: number } | null>(null);
  const [dragPos, setDragPos] = useState<{ id: string; x: number; y: number } | null>(null);
  const didDragRef = useRef(false);
  const dragStartPxRef = useRef<{ x: number; y: number } | null>(null);

  const [visualVP, setVisualVP] = useState({ height: 0, offsetTop: 0 });
  useEffect(() => {
    if (sessionStorage.getItem("renderflow_showComments") === "true") {
      setShowComments(true);
    }
  }, []);

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
  const lastPinchDistRef = useRef(0);
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
    if (isDesigner) {
      fetch(`/api/renders/${renderId}/mark-chat-read`, { method: "POST" }).catch(() => {});
    }
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


  const { startUpload: startVoiceUpload } = useUploadThing(
    isDesigner ? "pinVoiceUploader" : "clientPinVoiceUploader",
    {
      headers: !isDesigner && shareToken ? { "x-share-token": shareToken } : undefined,
      onClientUploadComplete: (res) => {
        const url = res[0]?.url;
        if (url) setPendingVoiceUrl(url);
        setUploadingVoice(false);
      },
      onUploadError: () => {
        toast.error("Błąd przesyłania nagrania głosowego");
        setUploadingVoice(false);
      },
    }
  );

  const { startUpload: startChatVoiceUpload } = useUploadThing(
    isDesigner ? "pinVoiceUploader" : "clientPinVoiceUploader",
    {
      headers: !isDesigner && shareToken ? { "x-share-token": shareToken } : undefined,
      onClientUploadComplete: (res) => {
        const url = res[0]?.url;
        if (url) setChatPendingVoiceUrl(url);
        setChatUploadingVoice(false);
      },
      onUploadError: () => {
        toast.error("Błąd przesyłania nagrania głosowego");
        setChatUploadingVoice(false);
      },
    }
  );

  const { startUpload: startReplyVoiceUpload } = useUploadThing(
    isDesigner ? "pinVoiceUploader" : "clientPinVoiceUploader",
    {
      headers: !isDesigner && shareToken ? { "x-share-token": shareToken } : undefined,
      onClientUploadComplete: (res) => {
        const url = res[0]?.url;
        if (url) setReplyPendingVoiceUrl(url);
        setReplyUploadingVoice(false);
      },
      onUploadError: () => {
        toast.error("Błąd przesyłania nagrania głosowego");
        setReplyUploadingVoice(false);
      },
    }
  );

  const { startUpload: startChatImageUpload } = useUploadThing(
    isDesigner ? "chatImageUploader" : "clientChatImageUploader",
    {
      headers: !isDesigner && shareToken ? { "x-share-token": shareToken } : undefined,
      onClientUploadComplete: (res) => {
        const url = res[0]?.url;
        if (url) setChatPendingImageUrl(url);
        setChatUploadingImage(false);
      },
      onUploadError: () => {
        toast.error("Błąd przesyłania zdjęcia");
        setChatUploadingImage(false);
      },
    }
  );

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

  const { startUpload: startSidebarUpload } = useUploadThing("renderUploader", {
    onClientUploadComplete: async (res) => {
      await Promise.all(res.map(async (file) => {
        const ext = file.name.split(".").pop()?.toLowerCase();
        const fileType = ext === "pdf" ? "pdf" : "image";
        await fetch("/api/renders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId,
            roomId,
            folderId,
            name: file.name.replace(/\.[^.]+$/, ""),
            fileUrl: file.url,
            fileKey: file.key,
            fileType,
          }),
        });
      }));
      setSidebarUploading(false);
      toast.success(res.length > 1 ? `Dodano ${res.length} pliki` : "Plik dodany");
      router.refresh();
    },
    onUploadError: () => {
      setSidebarUploading(false);
      toast.error("Błąd przesyłania pliku");
    },
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
    channel.bind("reply-updated", ({ commentId, reply }: { commentId: string; reply: Reply }) => {
      setComments((prev) =>
        prev.map((c) =>
          c.id !== commentId ? c : { ...c, replies: c.replies.map((r) => r.id === reply.id ? reply : r) }
        )
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

  async function deleteRender() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/renders/${renderId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Błąd usuwania pliku");
        return;
      }
      toast.success("Plik został usunięty");
      if (roomId && projectId) {
        router.push(`/projects/${projectId}/rooms/${roomId}`);
      } else if (projectId) {
        router.push(`/projects/${projectId}`);
      } else {
        router.back();
      }
    } catch {
      toast.error("Błąd usuwania pliku");
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  }

  async function downloadFile() {
    try {
      const res = await fetch(imageUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const ext = imageUrl.split("?")[0].split(".").pop() ?? "";
      a.download = renderName ? `${renderName}${ext ? `.${ext}` : ""}` : "render";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Błąd pobierania pliku");
    }
  }

  function handleImageClick(e: React.MouseEvent<HTMLDivElement>) {
    if (didDragRef.current) return; // pin was just dragged — don't open lightbox / place pin
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

  function getAudioMimeType(): string {
    const types = ["audio/webm", "audio/mp4", "audio/ogg", "audio/wav"];
    return types.find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getAudioMimeType();
      const mediaRecorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const type = mediaRecorder.mimeType || "audio/webm";
        const ext = type.includes("mp4") ? "mp4" : type.includes("ogg") ? "ogg" : type.includes("wav") ? "wav" : "webm";
        const blob = new Blob(audioChunksRef.current, { type });
        const file = new File([blob], `voice-${Date.now()}.${ext}`, { type });
        setUploadingVoice(true);
        startVoiceUpload([file]);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      setPendingVoiceUrl(null);
      recordingTimerRef.current = setInterval(
        () => setRecordingSeconds((s) => s + 1),
        1000
      );
    } catch {
      toast.error("Brak dostępu do mikrofonu");
    }
  }

  function stopRecording() {
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  }

  function cancelPending() {
    if (isRecording) stopRecording();
    setPending(null);
    setNewTitle("");
    setNewContent("");
    setNewPinInternal(false);
    setPendingVoiceUrl(null);
    setUploadingVoice(false);
  }

  async function submitComment() {
    if (!pending || (!newContent.trim() && !pendingVoiceUrl)) return;
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
          voiceUrl: pendingVoiceUrl ?? null,
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

  // Keep ref in sync so the mousedown handler always calls latest closures
  pendingActionsRef.current = {
    submit: submitComment,
    cancel: cancelPending,
    hasContent: () => !!(newContent.trim() || pendingVoiceUrl),
  };

  // Submit (or cancel if empty) when user clicks outside the new-pin popup
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

  useEffect(() => {
    function onPinMouseMove(e: MouseEvent) {
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

    async function onPinMouseUp() {
      if (!draggingPinRef.current) return;
      const { pinId, type } = draggingPinRef.current;
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

      // Update local state optimistically BEFORE clearing dragPos so both changes
      // land in the same React render — prevents the pin from flashing back to its old position.
      if (type === "comment") {
        setComments((prev) => prev.map((c) => c.id === pinId ? { ...c, posX: pos.x, posY: pos.y } : c));
        setLightboxComments((prev) => prev.map((c) => c.id === pinId ? { ...c, posX: pos.x, posY: pos.y } : c));
      } else {
        setProductPins((prev) => prev.map((p) => p.id === pinId ? { ...p, posX: pos.x, posY: pos.y } : p));
        setLightboxProductPins((prev) => prev.map((p) => p.id === pinId ? { ...p, posX: pos.x, posY: pos.y } : p));
      }
      setDragPos(null);

      // Reset after a tick — gives onClick time to check it first (prevents popup after drag),
      // but also resets if mouse was released off the pin button (no onClick fires).
      setTimeout(() => { didDragRef.current = false; }, 50);

      if (type === "comment") {
        const res = await fetch(`/api/comments/${pinId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ posX: pos.x, posY: pos.y }),
        });
        if (!res.ok) toast.error("Nie udało się zapisać pozycji pinu");
      } else {
        const res = await fetch(`/api/renders/${renderId}/product-pins/${pinId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ posX: pos.x, posY: pos.y }),
        });
        if (!res.ok) toast.error("Nie udało się zapisać pozycji pinu");
      }
    }

    document.addEventListener("mousemove", onPinMouseMove);
    document.addEventListener("mouseup", onPinMouseUp);
    return () => {
      document.removeEventListener("mousemove", onPinMouseMove);
      document.removeEventListener("mouseup", onPinMouseUp);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function startChatRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getAudioMimeType();
      const mediaRecorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      chatMediaRecorderRef.current = mediaRecorder;
      chatAudioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chatAudioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const type = mediaRecorder.mimeType || "audio/webm";
        const ext = type.includes("mp4") ? "mp4" : type.includes("ogg") ? "ogg" : type.includes("wav") ? "wav" : "webm";
        const blob = new Blob(chatAudioChunksRef.current, { type });
        const file = new File([blob], `voice-chat-${Date.now()}.${ext}`, { type });
        setChatUploadingVoice(true);
        startChatVoiceUpload([file]);
      };

      mediaRecorder.start();
      setIsChatRecording(true);
      setChatRecordingSeconds(0);
      setChatPendingVoiceUrl(null);
      chatRecordingTimerRef.current = setInterval(
        () => setChatRecordingSeconds((s) => s + 1),
        1000
      );
    } catch {
      toast.error("Brak dostępu do mikrofonu");
    }
  }

  function stopChatRecording() {
    if (chatRecordingTimerRef.current) clearInterval(chatRecordingTimerRef.current);
    chatMediaRecorderRef.current?.stop();
    setIsChatRecording(false);
  }

  async function startReplyRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getAudioMimeType();
      const mediaRecorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      replyMediaRecorderRef.current = mediaRecorder;
      replyAudioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) replyAudioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const type = mediaRecorder.mimeType || "audio/webm";
        const ext = type.includes("mp4") ? "mp4" : type.includes("ogg") ? "ogg" : type.includes("wav") ? "wav" : "webm";
        const blob = new Blob(replyAudioChunksRef.current, { type });
        const file = new File([blob], `voice-reply-${Date.now()}.${ext}`, { type });
        setReplyUploadingVoice(true);
        startReplyVoiceUpload([file]);
      };

      mediaRecorder.start();
      setIsReplyRecording(true);
      setReplyRecordingSeconds(0);
      setReplyPendingVoiceUrl(null);
      replyRecordingTimerRef.current = setInterval(
        () => setReplyRecordingSeconds((s) => s + 1),
        1000
      );
    } catch {
      toast.error("Brak dostępu do mikrofonu");
    }
  }

  function stopReplyRecording() {
    if (replyRecordingTimerRef.current) clearInterval(replyRecordingTimerRef.current);
    replyMediaRecorderRef.current?.stop();
    setIsReplyRecording(false);
  }

  async function submitChatMessage() {
    if (!chatMessage.trim() && !chatPendingVoiceUrl && !chatPendingImageUrl) return;
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
          voiceUrl: chatPendingVoiceUrl ?? null,
          imageUrl: chatPendingImageUrl ?? null,
          replyToId: replyingToMsg?.id ?? null,
          replyToContent: replyingToMsg?.content ?? null,
          replyToAuthor: replyingToMsg?.author ?? null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Błąd wysyłania wiadomości");
        return;
      }
      setChatMessage("");
      setChatPendingVoiceUrl(null);
      setChatPendingImageUrl(null);
      setReplyingToMsg(null);
      if (chatTextareaRef.current) { chatTextareaRef.current.style.height = "40px"; }
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
    if (!selectedId || (!replyContent.trim() && !replyPendingVoiceUrl)) return;
    setReplying(true);
    try {
      const res = await fetch(`/api/comments/${selectedId}/replies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: replyContent.trim(),
          author: authorName,
          voiceUrl: replyPendingVoiceUrl ?? null,
          replyToId: replyingToMsg?.id ?? null,
          replyToContent: replyingToMsg?.content ?? null,
          replyToAuthor: replyingToMsg?.author ?? null,
        }),
      });
      if (!res.ok) throw new Error();
      setReplyContent("");
      setReplyPendingVoiceUrl(null);
      setReplyingToMsg(null);
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

  function startPinDrag(
    e: React.MouseEvent,
    pinId: string,
    type: "comment" | "product",
    imgEl: HTMLDivElement | null
  ) {
    if (!imgEl) return;
    e.stopPropagation();
    e.preventDefault();
    didDragRef.current = false;
    dragStartPxRef.current = { x: e.clientX, y: e.clientY };
    draggingPinRef.current = { pinId, type, imgEl };
    document.body.style.userSelect = "none";
    const rect = imgEl.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    const pos = { id: pinId, x, y };
    dragPosRef.current = pos;
    setDragPos(pos);
  }

  function handleSidebarDragEnter(e: React.DragEvent) {
    e.preventDefault();
    sidebarDragCounterRef.current++;
    setIsDragOverSidebar(true);
  }
  function handleSidebarDragLeave(e: React.DragEvent) {
    e.preventDefault();
    sidebarDragCounterRef.current--;
    if (sidebarDragCounterRef.current === 0) setIsDragOverSidebar(false);
  }
  function handleSidebarDragOver(e: React.DragEvent) {
    e.preventDefault();
  }
  function handleSidebarDrop(e: React.DragEvent) {
    e.preventDefault();
    sidebarDragCounterRef.current = 0;
    setIsDragOverSidebar(false);
    const files = Array.from(e.dataTransfer.files).filter(
      (f) => f.type.startsWith("image/") || f.type === "application/pdf"
    );
    if (!files.length) {
      toast.error("Akceptowane są tylko obrazy i PDF");
      return;
    }
    setSidebarUploading(true);
    startSidebarUpload(files);
  }

  async function handleEditTitle(id: string, title: string) {
    const res = await fetch(`/api/comments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim() || null }),
    });
    if (res.ok) {
      const updated = await res.json();
      setComments((prev) => prev.map((c) => c.id === id ? { ...c, title: updated.title } : c));
      setLightboxComments((prev) => prev.map((c) => c.id === id ? { ...c, title: updated.title } : c));
      setEditingTitleMode(false);
    } else {
      toast.error("Nie udało się edytować tytułu");
    }
  }

  async function handleEditComment(id: string, content: string) {
    const res = await fetch(`/api/comments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, authorName }),
    });
    if (res.ok) {
      setComments((prev) => prev.map((c) => c.id === id ? { ...c, content } : c));
      setEditingCommentMode(false);
    } else {
      toast.error("Nie udało się edytować komentarza");
    }
  }

  async function handleEditReply(commentId: string, replyId: string, content: string) {
    const res = await fetch(`/api/comments/${commentId}/replies/${replyId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    if (res.ok) {
      setComments((prev) =>
        prev.map((c) =>
          c.id !== commentId ? c : { ...c, replies: c.replies.map((r) => r.id === replyId ? { ...r, content } : r) }
        )
      );
      setEditingReplyId(null);
    } else {
      toast.error("Nie udało się edytować odpowiedzi");
    }
  }

  async function deleteComment(id: string) {
    await fetch(`/api/comments/${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ authorName }),
    });
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
  function handleCommentPinMouseEnter(id: string) {
    if (commentPinHoverTimer.current) clearTimeout(commentPinHoverTimer.current);
    setHoveredCommentPinId(id);
  }
  function handleCommentPinMouseLeave() {
    commentPinHoverTimer.current = setTimeout(() => setHoveredCommentPinId(null), 150);
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
    <div className="flex flex-col h-full bg-card rounded-tl-2xl overflow-hidden">
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
          <nav className="hidden lg:flex items-center gap-1 min-w-0 flex-1 text-sm">
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
          <div className="hidden sm:flex ml-auto items-center gap-1 flex-shrink-0">
            {/* Zone 1: Primary actions */}
            {(isDesigner || allowClientComments) && (
              <button onClick={() => { setMode(mode === "pin" ? "view" : "pin"); setProductPinMode(false); setPendingProductPos(null); }} className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md border transition-colors ${mode === "pin" ? "bg-primary text-primary-foreground border-primary" : "border-transparent text-gray-500 dark:text-gray-400 hover:bg-muted"}`}>
                <Pin size={14} /> Dodaj pin
              </button>
            )}
            {isDesigner && (
              <button onClick={() => { setProductPinMode((v) => !v); setMode("view"); setPending(null); setPendingProductPos(null); }} className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md border transition-colors ${productPinMode ? "bg-primary text-primary-foreground border-primary" : "border-transparent text-gray-500 dark:text-gray-400 hover:bg-muted"}`}>
                <Package size={14} /> Dodaj produkt
              </button>
            )}

            {/* Separator */}
            <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-1" />

            {/* Zone 2: View controls — icon only */}
            <button onClick={() => setHidePins((v) => !v)} title={hidePins ? "Pokaż piny" : "Ukryj piny"} className={`flex items-center justify-center w-8 h-8 rounded-md border transition-colors ${hidePins ? "bg-primary text-primary-foreground border-primary" : "border-transparent text-gray-500 dark:text-gray-400 hover:bg-muted"}`}>
              <svg viewBox="0 0 24 24" className="w-[15px] h-[15px]" fill="currentColor"><path d="M16 9V4h1c.55 0 1-.45 1-1s-.45-1-1-1H7c-.55 0-1 .45-1 1s.45 1 1 1h1v5c0 1.66-1.34 3-3 3h10c-1.66 0-3-1.34-3-3zm-3 12v-6h-2v6c0 .55.45 1 1 1s1-.45 1-1z"/><path d="M3.51 3.51c-.39.39-.39 1.02 0 1.41l15.56 15.57c.39.39 1.02.39 1.41 0s.39-1.02 0-1.41L4.93 3.51c-.39-.39-1.02-.39-1.42 0z"/></svg>
            </button>
            <button onClick={openLightbox} title="Podgląd pełnoekranowy" className={`flex items-center justify-center w-8 h-8 rounded-md border transition-colors ${lightboxOpen ? "bg-primary text-primary-foreground border-primary" : "border-transparent text-gray-500 dark:text-gray-400 hover:bg-muted"}`}>
              <Maximize2 size={15} />
            </button>
            {isDesigner && (
              <button onClick={() => setShowVersionHistory(true)} title={`Historia wersji${versions.length > 0 ? ` (${versions.length})` : ""}`} className="relative flex items-center justify-center w-8 h-8 rounded-md border border-transparent text-gray-500 dark:text-gray-400 hover:bg-muted transition-colors">
                <History size={15} />
                {versions.length > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[14px] h-3.5 px-0.5 bg-gray-400 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">{versions.length}</span>
                )}
              </button>
            )}
            <button onClick={downloadFile} title="Pobierz plik" className="flex items-center justify-center w-8 h-8 rounded-md border border-transparent text-gray-500 dark:text-gray-400 hover:bg-muted transition-colors">
              <Download size={15} />
            </button>
            {isDesigner && (
              <button onClick={() => setShowDeleteConfirm(true)} title="Usuń plik" className="flex items-center justify-center w-8 h-8 rounded-md border border-transparent text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors">
                <Trash2 size={15} />
              </button>
            )}

            {/* Separator */}
            <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-1" />

            {/* Zone 3: Render status */}
            {isDesigner ? (
              <DropdownMenu>
                <DropdownMenuTrigger className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-md border transition-colors ${renderStatus === "ACCEPTED" ? "bg-green-500 text-white border-green-600" : "bg-blue-500 text-white border-blue-600"}`}>
                  {renderStatus === "ACCEPTED" ? "Zaakceptowany" : "Do weryfikacji"}
                  <ChevronDown size={11} />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => updateRenderStatus("REVIEW")} className={renderStatus === "REVIEW" ? "font-semibold" : ""}>
                    Do weryfikacji
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => updateRenderStatus("ACCEPTED")} className={renderStatus === "ACCEPTED" ? "font-semibold" : ""}>
                    Zaakceptowany
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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

            {/* Separator */}
            <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-1" />

            {/* Zone 4: Discussion */}
            <button
              onClick={() => setShowComments((v) => { const next = !v; sessionStorage.setItem("renderflow_showComments", String(next)); if (next && sidebarTabRef.current === "chat") markChatRead(); return next; })}
              className={`relative flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md border transition-colors ${showComments ? "bg-primary text-primary-foreground border-primary" : "border-transparent text-gray-500 dark:text-gray-400 hover:bg-muted"}`}
            >
              <svg viewBox="0 0 24 24" className="w-[14px] h-[14px]" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg> Dyskusja
              {chatUnreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 bg-blue-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                  {chatUnreadCount > 99 ? "99+" : chatUnreadCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Row 2: Mobile toolbar */}
        <div className="sm:hidden border-t">
          {/* Sub-row 1: Actions + view controls (scrollable) */}
          <div className="overflow-x-auto" style={{ scrollbarWidth: "none" }}>
            <div className="flex items-center gap-1 px-2 py-1.5 w-max">
              {/* Zone 1: Primary actions */}
              {(isDesigner || allowClientComments) && (
                <button onClick={() => { setMode(mode === "pin" ? "view" : "pin"); setProductPinMode(false); setPendingProductPos(null); }} className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md border transition-colors flex-shrink-0 ${mode === "pin" ? "bg-primary text-primary-foreground border-primary" : "border-transparent text-gray-500 dark:text-gray-400 hover:bg-muted"}`}>
                  <Pin size={14} /> Dodaj pin
                </button>
              )}
              {isDesigner && (
                <button onClick={() => { setProductPinMode((v) => !v); setMode("view"); setPending(null); setPendingProductPos(null); }} className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md border transition-colors flex-shrink-0 ${productPinMode ? "bg-primary text-primary-foreground border-primary" : "border-transparent text-gray-500 dark:text-gray-400 hover:bg-muted"}`}>
                  <Package size={14} /> Dodaj produkt
                </button>
              )}

              <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-0.5 flex-shrink-0" />

              {/* Zone 2: View controls — icon only */}
              <button onClick={() => setHidePins((v) => !v)} title={hidePins ? "Pokaż piny" : "Ukryj piny"} className={`flex items-center justify-center w-8 h-8 rounded-md border transition-colors flex-shrink-0 ${hidePins ? "bg-primary text-primary-foreground border-primary" : "border-transparent text-gray-500 dark:text-gray-400 hover:bg-muted"}`}>
                <svg viewBox="0 0 24 24" className="w-[15px] h-[15px]" fill="currentColor"><path d="M16 9V4h1c.55 0 1-.45 1-1s-.45-1-1-1H7c-.55 0-1 .45-1 1s.45 1 1 1h1v5c0 1.66-1.34 3-3 3h10c-1.66 0-3-1.34-3-3zm-3 12v-6h-2v6c0 .55.45 1 1 1s1-.45 1-1z"/><path d="M3.51 3.51c-.39.39-.39 1.02 0 1.41l15.56 15.57c.39.39 1.02.39 1.41 0s.39-1.02 0-1.41L4.93 3.51c-.39-.39-1.02-.39-1.42 0z"/></svg>
              </button>
              <button onClick={openLightbox} title="Podgląd pełnoekranowy" className={`flex items-center justify-center w-8 h-8 rounded-md border transition-colors flex-shrink-0 ${lightboxOpen ? "bg-primary text-primary-foreground border-primary" : "border-transparent text-gray-500 dark:text-gray-400 hover:bg-muted"}`}>
                <Maximize2 size={15} />
              </button>
              {isDesigner && (
                <button onClick={() => setShowVersionHistory(true)} title={`Historia wersji${versions.length > 0 ? ` (${versions.length})` : ""}`} className="relative flex items-center justify-center w-8 h-8 rounded-md border border-transparent text-gray-500 dark:text-gray-400 hover:bg-muted transition-colors flex-shrink-0">
                  <History size={15} />
                  {versions.length > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[14px] h-3.5 px-0.5 bg-gray-400 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">{versions.length}</span>
                  )}
                </button>
              )}
              <button onClick={downloadFile} title="Pobierz plik" className="flex items-center justify-center w-8 h-8 rounded-md border border-transparent text-gray-500 dark:text-gray-400 hover:bg-muted transition-colors flex-shrink-0">
                <Download size={15} />
              </button>
              {isDesigner && (
                <button onClick={() => setShowDeleteConfirm(true)} title="Usuń plik" className="flex items-center justify-center w-8 h-8 rounded-md border border-transparent text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors flex-shrink-0">
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          </div>

          {/* Sub-row 2: Status + Discussion (full width) */}
          <div className="flex items-center justify-between gap-2 px-2 py-1.5 border-t">
            {/* Zone 3: Status (fits content) */}
            <div className="flex items-center gap-1.5 min-w-0">
              {isDesigner ? (
                <DropdownMenu>
                  <DropdownMenuTrigger className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-md border transition-colors ${renderStatus === "ACCEPTED" ? "bg-green-500 text-white border-green-600" : "bg-blue-500 text-white border-blue-600"}`}>
                    {renderStatus === "ACCEPTED" ? "Zaakceptowany" : "Do weryfikacji"}
                    <ChevronDown size={11} />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem onClick={() => updateRenderStatus("REVIEW")} className={renderStatus === "REVIEW" ? "font-semibold" : ""}>
                      Do weryfikacji
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => updateRenderStatus("ACCEPTED")} className={renderStatus === "ACCEPTED" ? "font-semibold" : ""}>
                      Zaakceptowany
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : renderStatus === "ACCEPTED" ? (
                <>
                  <span className="text-xs font-semibold px-2 py-1.5 rounded-md bg-green-100 text-green-700">Zaakceptowany</span>
                  {allowDirectStatusChange ? (
                    <button onClick={() => updateRenderStatus("REVIEW")} className="text-xs text-gray-400 underline">Cofnij</button>
                  ) : onStatusRequest ? (
                    <button onClick={onStatusRequest} className="text-xs text-gray-400 underline">Zmień</button>
                  ) : null}
                </>
              ) : allowClientAcceptance ? (
                <button onClick={() => updateRenderStatus("ACCEPTED")} className="text-xs font-semibold px-2 py-1.5 rounded-md bg-green-500 text-white">Zaakceptuj</button>
              ) : (
                <span className="text-xs font-semibold px-2 py-1.5 rounded-md bg-blue-100 text-blue-700">Do weryfikacji</span>
              )}
            </div>

            {/* Zone 4: Discussion */}
            <button
              onClick={() => setShowComments((v) => { const next = !v; sessionStorage.setItem("renderflow_showComments", String(next)); if (next && sidebarTabRef.current === "chat") markChatRead(); return next; })}
              className={`relative flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md border transition-colors flex-shrink-0 ${showComments ? "bg-primary text-primary-foreground border-primary" : "border-transparent text-gray-500 dark:text-gray-400 hover:bg-muted"}`}
            >
              <svg viewBox="0 0 24 24" className="w-[14px] h-[14px]" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg> Dyskusja
              {chatUnreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 bg-blue-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                  {chatUnreadCount > 99 ? "99+" : chatUnreadCount}
                </span>
              )}
            </button>
          </div>
        </div>

      </div>

      {/* Content */}
      <div className="flex flex-1 min-h-0">
        {/* Thumbnails sidebar */}
        {(isDesigner || (onRenderSelect && roomRenders.length > 0)) && (
          <div
            className="hidden md:flex w-44 border-r bg-card flex-col flex-shrink-0 overflow-hidden relative"
            onDragEnter={isDesigner && projectId && roomId ? handleSidebarDragEnter : undefined}
            onDragLeave={isDesigner && projectId && roomId ? handleSidebarDragLeave : undefined}
            onDragOver={isDesigner && projectId && roomId ? handleSidebarDragOver : undefined}
            onDrop={isDesigner && projectId && roomId ? handleSidebarDrop : undefined}
          >
            {/* Drag-over overlay */}
            {isDragOverSidebar && (
              <div className="absolute inset-0 z-20 bg-blue-500/10 border-2 border-dashed border-blue-400 rounded flex flex-col items-center justify-center gap-1 pointer-events-none">
                <Upload size={20} className="text-blue-500" />
                <span className="text-xs text-blue-600 font-medium text-center px-2">Upuść pliki tutaj</span>
              </div>
            )}
            {/* Upload in progress overlay */}
            {sidebarUploading && !isDragOverSidebar && (
              <div className="absolute inset-0 z-20 bg-card/80 flex flex-col items-center justify-center gap-1 pointer-events-none">
                <Loader2 size={20} className="text-blue-500 animate-spin" />
                <span className="text-xs text-gray-500">Przesyłanie…</span>
              </div>
            )}
            <div className="px-3 py-2.5 border-b flex-shrink-0 flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Pliki ({roomRenders.length})
              </p>
              {isDesigner && projectId && roomId && (
                <RenderUploader projectId={projectId} roomId={roomId} folderId={folderId} compact />
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
                    <div className="aspect-video bg-muted overflow-hidden flex items-center justify-center">
                      {r.fileType === "pdf" ? (
                        <FileText size={24} className="text-red-400" />
                      ) : (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={r.fileUrl} alt={r.name} className="w-full h-full object-cover" />
                      )}
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
                    <div className="aspect-video bg-muted overflow-hidden flex items-center justify-center">
                      {r.fileType === "pdf" ? (
                        <FileText size={24} className="text-red-400" />
                      ) : (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={r.fileUrl} alt={r.name} className="w-full h-full object-cover" />
                      )}
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
              className="absolute left-3 top-1/2 -translate-y-1/2 z-10 bg-white/80 hover:bg-white dark:bg-gray-800/80 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full p-2 shadow-md text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-all sm:opacity-60 sm:hover:opacity-100"
              title={prevRender.name}
            >
              <ChevronLeft size={20} />
            </button>
          )}
          {/* Right navigation arrow */}
          {nextRender && (projectId || onRenderSelect) && (
            <button
              onClick={() => projectId ? router.push(`/projects/${projectId}/renders/${nextRender.id}`) : onRenderSelect?.(nextRender)}
              className="absolute right-3 top-1/2 -translate-y-1/2 z-10 bg-white/80 hover:bg-white dark:bg-gray-800/80 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full p-2 shadow-md text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-all sm:opacity-60 sm:hover:opacity-100"
              title={nextRender.name}
            >
              <ChevronRight size={20} />
            </button>
          )}
          <div className={`absolute inset-0 flex items-start justify-start sm:justify-center ${isPdf ? "" : "overflow-auto"} p-2 sm:p-6`}>
          <div
            ref={imgRef}
            className={`relative select-none ${isPdf ? "w-full h-full" : ""} ${(mode === "pin" || productPinMode) && !isPdf ? "cursor-crosshair" : "cursor-default"}`}
            onClick={!isPdf ? handleImageClick : undefined}
          >
            {isPdf ? (
              <iframe
                src={imageUrl}
                className="block rounded-lg shadow-sm w-full"
                style={{ height: "calc(100vh - 180px)", border: "none" }}
                title="PDF"
              />
            ) : (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={imageUrl}
                alt="Render"
                className="block rounded-lg shadow-sm sm:max-w-full"
                style={{ maxHeight: "calc(100vh - 180px)" }}
                draggable={false}
              />
            )}

            {/* Comment pins */}
            {!hidePins && pinComments.map((c, i) => {
              const canDrag = selectedId !== c.id && (isDesigner || c.author === authorName);
              const pinX = dragPos?.id === c.id ? dragPos.x : c.posX!;
              const pinY = dragPos?.id === c.id ? dragPos.y : c.posY!;
              return (
                <div
                  key={c.id}
                  className="absolute z-10"
                  style={{ left: `calc(${pinX}% - 14px)`, top: `calc(${pinY}% - 14px)` }}
                  onMouseEnter={() => !draggingPinRef.current && handleCommentPinMouseEnter(c.id)}
                  onMouseLeave={handleCommentPinMouseLeave}
                >
                  <button
                    className={`w-7 h-7 rounded-full border-2 border-white text-white text-xs font-bold flex items-center justify-center shadow-lg ${dragPos?.id === c.id ? "transition-none cursor-grabbing" : `transition-transform hover:scale-110 ${canDrag ? "cursor-grab" : ""}`} ${c.isInternal ? "bg-slate-500" : STATUS_PIN_COLOR[c.status]} ${selectedId === c.id ? "scale-125 ring-2 ring-white ring-offset-1" : ""}`}
                    onMouseDown={canDrag ? (e) => startPinDrag(e, c.id, "comment", imgRef.current) : undefined}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (didDragRef.current) { didDragRef.current = false; return; }
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
                  {hoveredCommentPinId === c.id && selectedId !== c.id && (
                    <div
                      className="fixed z-50 bg-card rounded-xl shadow-xl border border-border p-3 w-56"
                      style={getPopupStyle(c.posX!, c.posY!, imgRef.current, 224, visualVP.height || undefined, visualVP.offsetTop)}
                      onMouseEnter={() => handleCommentPinMouseEnter(c.id)}
                      onMouseLeave={handleCommentPinMouseLeave}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <p className="text-xs font-medium text-muted-foreground mb-1 truncate">{c.author}</p>
                      <p className="text-sm text-foreground leading-snug line-clamp-3">
                        {c.title || c.content}
                      </p>
                      {c.replies.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-1.5">
                          {c.replies.length} {c.replies.length === 1 ? "odpowiedź" : c.replies.length < 5 ? "odpowiedzi" : "odpowiedzi"}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Product pins */}
            {!hidePins && productPins.map((pin) => {
              const pinX = dragPos?.id === pin.id ? dragPos.x : pin.posX;
              const pinY = dragPos?.id === pin.id ? dragPos.y : pin.posY;
              return (
              <div
                key={pin.id}
                className="absolute z-10"
                style={{ left: `calc(${pinX}% - 13px)`, top: `calc(${pinY}% - 13px)` }}
                onMouseEnter={() => !draggingPinRef.current && handleProductPinMouseEnter(pin.id)}
                onMouseLeave={handleProductPinMouseLeave}
                onClick={(e) => e.stopPropagation()}
              >
                <div
                  className={`w-[26px] h-[26px] rounded-lg bg-black/60 backdrop-blur-sm border border-white/20 shadow-lg flex items-center justify-center ${dragPos?.id === pin.id ? "transition-none cursor-grabbing" : `transition-transform hover:scale-110 hover:bg-black/80 ${isDesigner ? "cursor-grab" : "cursor-pointer"}`} ${productPinsPulsing && !draggingPinRef.current ? "animate-pulse" : ""}`}
                  onMouseDown={isDesigner ? (e) => startPinDrag(e, pin.id, "product", imgRef.current) : undefined}
                >
                  <Armchair size={14} className="text-white" />
                </div>
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
                      <img src={pin.product.imageUrl} alt={pin.product.name} className="w-full h-28 object-contain rounded-lg mb-2 border border-border bg-muted" />
                    )}
                    {!pin.product.imageUrl && (
                      <div className="w-full h-16 rounded-lg bg-muted flex items-center justify-center mb-2">
                        <Package size={20} className="text-muted-foreground" />
                      </div>
                    )}
                    <p className="text-sm font-medium text-foreground truncate">{pin.product.name}</p>
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
              );
            })}

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
                data-new-pin-popup=""
                className="fixed z-50 bg-card rounded-xl shadow-xl border border-border p-4 w-64"
                style={getPopupStyle(pending.x, pending.y, imgRef.current, 256, visualVP.height || undefined, visualVP.offsetTop)}
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
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
                {pendingVoiceUrl && (
                  <div className="flex items-center gap-2 mb-3 px-2 py-1.5 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
                    <CheckCircle2 size={12} className="text-green-600 dark:text-green-400 flex-shrink-0" />
                    <audio src={pendingVoiceUrl} controls className="h-6 flex-1 min-w-0" />
                    <button onClick={() => setPendingVoiceUrl(null)} className="text-gray-400 hover:text-red-400 flex-shrink-0 transition-colors">
                      <X size={12} />
                    </button>
                  </div>
                )}
                {isRecording ? (
                  <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/30 mb-3">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
                    <span className="text-sm text-red-600 dark:text-red-400 flex-1 font-medium tabular-nums">
                      {Math.floor(recordingSeconds / 60)}:{String(recordingSeconds % 60).padStart(2, "0")}
                    </span>
                    <button
                      type="button"
                      onClick={stopRecording}
                      className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 transition-colors"
                    >
                      <StopCircle size={16} />
                      <span>Zatrzymaj</span>
                    </button>
                  </div>
                ) : (
                  <div className="relative mb-3">
                    <Textarea
                      value={newContent}
                      onChange={(e) => setNewContent(e.target.value)}
                      placeholder="Opisz co wymaga zmiany..."
                      className="text-sm resize-none pr-10 max-h-40 overflow-y-auto"
                      rows={3}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && e.ctrlKey) submitComment();
                        if (e.key === "Escape") cancelPending();
                      }}
                    />
                    <button
                      type="button"
                      disabled={uploadingVoice || adding}
                      onClick={
                        newContent.trim() || pendingVoiceUrl
                          ? submitComment
                          : startRecording
                      }
                      title={
                        newContent.trim() || pendingVoiceUrl
                          ? "Dodaj pin"
                          : "Nagraj wiadomość głosową"
                      }
                      className="absolute right-2 bottom-2 z-10 flex items-center justify-center w-8 h-8 rounded-md transition-colors text-muted-foreground hover:text-foreground disabled:opacity-40"
                    >
                      {uploadingVoice || adding ? (
                        <Loader2 size={30} className="animate-spin" />
                      ) : newContent.trim() || pendingVoiceUrl ? (
                        <Send size={30} />
                      ) : (
                        <Mic size={30} />
                      )}
                    </button>
                  </div>
                )}
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
                  {editingTitleMode ? (
                    <>
                      <Input
                        autoFocus
                        value={editingTitleText}
                        onChange={(e) => setEditingTitleText(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") handleEditTitle(selectedComment.id, editingTitleText); if (e.key === "Escape") setEditingTitleMode(false); }}
                        placeholder="Tytuł pinu..."
                        className="flex-1 h-7 text-sm min-w-0"
                      />
                      <button onClick={() => setEditingTitleMode(false)} className="text-xs text-gray-400 hover:text-gray-700 flex-shrink-0 transition-colors">Anuluj</button>
                      <button onClick={() => handleEditTitle(selectedComment.id, editingTitleText)} className="text-xs text-primary font-medium hover:opacity-80 flex-shrink-0 transition-colors">Zapisz</button>
                    </>
                  ) : (
                    <>
                      <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate flex-1">
                        {selectedComment.title || `Pin #${selectedIndex + 1}`}
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
                      {isDesigner && (
                        <div className="relative flex-shrink-0">
                          <button
                            onClick={() => setOpenPinMenu((v) => !v)}
                            className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-muted transition-colors"
                          >
                            <MoreVertical size={14} />
                          </button>
                          {openPinMenu && (
                            <div className="absolute right-0 top-full mt-1 bg-popover border border-border rounded-xl shadow-lg z-[60] py-1 min-w-[130px]">
                              <button
                                onClick={() => { setEditingTitleText(selectedComment.title ?? ""); setEditingTitleMode(true); setOpenPinMenu(false); }}
                                className="w-full text-left px-3 py-2 text-xs hover:bg-muted flex items-center gap-2 transition-colors"
                              >
                                <Edit2 size={12} className="text-muted-foreground" /> Edytuj tytuł
                              </button>
                              <button
                                onClick={() => { deleteComment(selectedComment.id); setOpenPinMenu(false); }}
                                className="w-full text-left px-3 py-2 text-xs text-destructive hover:bg-destructive/10 flex items-center gap-2 transition-colors"
                              >
                                <Trash2 size={12} /> Usuń pin
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                  <button
                    onClick={() => { setSelectedId(null); setReplyContent(""); setOpenPinMenu(false); setEditingTitleMode(false); }}
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
                      <Avatar name={selectedComment.author} />
                      <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">{selectedComment.author}</span>
                      <span className="text-[10px] text-gray-400">{formatDate(selectedComment.createdAt)}</span>
                    </div>
                    {editingCommentMode && selectedComment.content !== "[wiadomość głosowa]" ? (
                      <div className="flex flex-col gap-1">
                        <textarea
                          autoFocus
                          value={editingCommentText}
                          onChange={(e) => setEditingCommentText(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleEditComment(selectedComment.id, editingCommentText); } if (e.key === "Escape") setEditingCommentMode(false); }}
                          className="w-full px-2 py-1.5 text-sm rounded-lg border border-primary bg-background focus:outline-none focus:ring-1 focus:ring-primary/30 resize-none"
                          rows={2}
                        />
                        <div className="flex gap-1 justify-end">
                          <button onClick={() => setEditingCommentMode(false)} className="px-2 py-1 text-xs text-gray-400 hover:text-gray-700 transition-colors">Anuluj</button>
                          <button onClick={() => handleEditComment(selectedComment.id, editingCommentText)} className="px-2 py-1 text-xs bg-primary text-primary-foreground rounded-lg hover:opacity-90">Zapisz</button>
                        </div>
                      </div>
                    ) : (
                      <SwipeableMessage
                        isOwn={selectedComment.author === authorName}
                        onReply={() => setReplyingToMsg({ id: selectedComment.id, content: selectedComment.content, author: selectedComment.author })}
                      >
                      <div className="flex items-center gap-1">
                        <div className="flex-1">
                          {selectedComment.content !== "[wiadomość głosowa]" && (
                            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{selectedComment.content}</p>
                          )}
                          {selectedComment.voiceUrl && (
                            <audio src={selectedComment.voiceUrl} controls className="w-full h-8 mt-1" />
                          )}
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 flex-shrink-0 self-start mt-0.5">
                          <button
                            onClick={() => setReplyingToMsg({ id: selectedComment.id, content: selectedComment.content, author: selectedComment.author })}
                            title="Odpowiedz"
                            className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-muted transition-colors"
                          >
                            <CornerDownLeft size={13} />
                          </button>
                          {(isDesigner || selectedComment.author === authorName) && selectedComment.content !== "[wiadomość głosowa]" && (
                            <button
                              onClick={() => { setEditingCommentText(selectedComment.content); setEditingCommentMode(true); }}
                              title="Edytuj"
                              className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-muted transition-colors"
                            >
                              <Edit2 size={13} />
                            </button>
                          )}
                          {!isDesigner && selectedComment.author === authorName && (
                            <button
                              onClick={() => deleteComment(selectedComment.id)}
                              title="Usuń"
                              className="p-1 rounded-lg text-gray-400 hover:text-destructive hover:bg-destructive/10 transition-colors"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </div>
                      </SwipeableMessage>
                    )}
                  </div>

                  {/* Replies */}
                  {selectedComment.replies.map((r) => (
                    <div key={r.id} className="px-4 py-3 bg-muted/50 group">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">{r.author}</span>
                        <span className="text-[10px] text-gray-400">{formatDate(r.createdAt)}</span>
                      </div>
                      {r.replyToContent && (
                        <div className="px-2 py-1 rounded-lg text-[11px] border-l-2 border-primary/40 bg-muted/60 mb-1">
                          <span className="font-semibold text-foreground/70">{r.replyToAuthor}: </span>
                          <span className="text-muted-foreground">{r.replyToContent.length > 80 ? r.replyToContent.slice(0, 80) + "…" : r.replyToContent}</span>
                        </div>
                      )}
                      {editingReplyId === r.id ? (
                        <div className="flex flex-col gap-1">
                          <textarea
                            autoFocus
                            value={editingReplyText}
                            onChange={(e) => setEditingReplyText(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleEditReply(selectedComment.id, r.id, editingReplyText); } if (e.key === "Escape") setEditingReplyId(null); }}
                            className="w-full px-2 py-1.5 text-sm rounded-lg border border-primary bg-background focus:outline-none focus:ring-1 focus:ring-primary/30 resize-none"
                            rows={2}
                          />
                          <div className="flex gap-1 justify-end">
                            <button onClick={() => setEditingReplyId(null)} className="px-2 py-1 text-xs text-gray-400 hover:text-gray-700 transition-colors">Anuluj</button>
                            <button onClick={() => handleEditReply(selectedComment.id, r.id, editingReplyText)} className="px-2 py-1 text-xs bg-primary text-primary-foreground rounded-lg hover:opacity-90">Zapisz</button>
                          </div>
                        </div>
                      ) : (
                        <SwipeableMessage
                          isOwn={r.author === authorName}
                          onReply={() => setReplyingToMsg({ id: r.id, content: r.content, author: r.author })}
                        >
                        <div className="flex items-center gap-1">
                          <div className="flex-1">
                            {r.content !== "[wiadomość głosowa]" && (
                              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{r.content}</p>
                            )}
                            {r.voiceUrl && (
                              <audio src={r.voiceUrl} controls className="w-full h-8 mt-1" />
                            )}
                          </div>
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 flex-shrink-0 self-start mt-0.5">
                            <button
                              onClick={() => setReplyingToMsg({ id: r.id, content: r.content, author: r.author })}
                              title="Odpowiedz"
                              className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-muted transition-colors"
                            >
                              <CornerDownLeft size={13} />
                            </button>
                            {(isDesigner || r.author === authorName) && r.content !== "[wiadomość głosowa]" && (
                              <button
                                onClick={() => { setEditingReplyText(r.content); setEditingReplyId(r.id); }}
                                title="Edytuj"
                                className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-muted transition-colors"
                              >
                                <Edit2 size={13} />
                              </button>
                            )}
                            {(isDesigner || r.author === authorName) && (
                              <button
                                onClick={() => deleteReply(selectedComment.id, r.id)}
                                title="Usuń"
                                className="p-1 rounded-lg text-gray-400 hover:text-destructive hover:bg-destructive/10 transition-colors"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </div>
                        </SwipeableMessage>
                      )}
                    </div>
                  ))}
                </div>

                {/* Status dropdown */}
                {isDesigner && (
                  <div className="px-4 py-2 border-t flex items-center gap-2 flex-shrink-0">
                    <DropdownMenu>
                      <DropdownMenuTrigger className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-colors ${STATUS_BADGE[selectedComment.status]}`}>
                        {STATUS_LABEL[selectedComment.status]}
                        <ChevronDown size={11} />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        {(["NEW", "IN_PROGRESS", "DONE"] as CommentStatus[]).map((s) => (
                          <DropdownMenuItem
                            key={s}
                            onClick={() => updateStatus(selectedComment.id, s)}
                            className={selectedComment.status === s ? "font-semibold" : ""}
                          >
                            {STATUS_LABEL[s]}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}

                {/* Reply input */}
                <div className="px-4 py-3 border-t flex-shrink-0">
                  {replyingToMsg && (
                    <div className="flex items-center gap-2 px-2 py-1.5 mb-2 bg-muted/60 rounded-lg border-l-2 border-primary/50">
                      <CornerDownLeft size={11} className="text-primary flex-shrink-0" />
                      <span className="flex-1 text-xs text-muted-foreground truncate">
                        <span className="font-medium text-foreground">{replyingToMsg.author}:</span>{" "}
                        {replyingToMsg.content.slice(0, 80)}{replyingToMsg.content.length > 80 ? "…" : ""}
                      </span>
                      <button onClick={() => setReplyingToMsg(null)} className="text-muted-foreground hover:text-foreground flex-shrink-0">
                        <X size={12} />
                      </button>
                    </div>
                  )}
                  {replyPendingVoiceUrl && (
                    <div className="flex items-center gap-2 mb-2 px-2 py-1.5 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
                      <CheckCircle2 size={12} className="text-green-600 dark:text-green-400 flex-shrink-0" />
                      <audio src={replyPendingVoiceUrl} controls className="h-6 flex-1 min-w-0" />
                      <button onClick={() => setReplyPendingVoiceUrl(null)} className="text-gray-400 hover:text-red-400 flex-shrink-0 transition-colors">
                        <X size={12} />
                      </button>
                    </div>
                  )}
                  {isReplyRecording ? (
                    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/30">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
                      <span className="text-sm text-red-600 dark:text-red-400 flex-1 font-medium tabular-nums">
                        {Math.floor(replyRecordingSeconds / 60)}:{String(replyRecordingSeconds % 60).padStart(2, "0")}
                      </span>
                      <button
                        type="button"
                        onClick={stopReplyRecording}
                        className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 transition-colors"
                      >
                        <StopCircle size={16} />
                        <span>Zatrzymaj</span>
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <Textarea
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        placeholder="Dodaj odpowiedź..."
                        className="text-sm resize-none pr-10"
                        rows={2}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && e.ctrlKey) submitReply();
                          if (e.key === "Escape") { setSelectedId(null); setReplyContent(""); setReplyPendingVoiceUrl(null); setReplyingToMsg(null); }
                        }}
                      />
                      <button
                        type="button"
                        disabled={replyUploadingVoice || replying}
                        onClick={replyContent.trim() || replyPendingVoiceUrl ? submitReply : startReplyRecording}
                        title={replyContent.trim() || replyPendingVoiceUrl ? "Wyślij" : "Nagraj wiadomość głosową"}
                        className="absolute right-2 bottom-2 z-10 flex items-center justify-center w-6 h-6 rounded-md transition-colors text-muted-foreground hover:text-foreground disabled:opacity-40"
                      >
                        {replyUploadingVoice || replying ? <Loader2 size={15} className="animate-spin" /> : replyContent.trim() || replyPendingVoiceUrl ? <Send size={15} /> : <Mic size={15} />}
                      </button>
                    </div>
                  )}
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
          <div className={`fixed md:relative inset-y-0 right-0 left-0 md:left-auto z-30 md:z-auto md:flex-shrink-0 transition-[width] duration-200 ${sidebarExpanded ? "md:w-[576px]" : "md:w-72"}`}>

            {/* Expand handle — absolutely positioned outside the panel, bottom-left */}
            <button
              onClick={() => setSidebarExpanded(v => !v)}
              className="hidden md:flex items-center justify-center w-5 h-12 bg-card border border-r-0 border-border rounded-l-md shadow-md text-muted-foreground hover:text-foreground transition-colors absolute left-0 bottom-0 -translate-x-full z-10"
              title={sidebarExpanded ? "Zwiń panel" : "Rozwiń panel"}
            >
              {sidebarExpanded ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
            </button>

            <div className={`h-full w-full flex flex-col bg-card border-l shadow-xl md:shadow-none transition-[width] duration-200 ${sidebarExpanded ? "md:w-[576px]" : "md:w-72"}`}>

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
                <svg viewBox="0 0 24 24" className="w-[13px] h-[13px]" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>
                Czat {comments.filter(c => c.posX === null).length > 0 && <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${chatUnreadCount > 0 ? "bg-blue-500 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300"}`}>{comments.filter(c => c.posX === null).length}</span>}
              </button>
              <button
                onClick={() => { setShowComments(false); sessionStorage.setItem("renderflow_showComments", "false"); }}
                className="md:hidden flex items-center justify-center w-10 border-l text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                title="Zamknij"
              >
                <X size={16} />
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
                          ? "bg-primary text-primary-foreground border-primary"
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
                          ? "bg-primary text-primary-foreground border-primary"
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
                              {c.content && c.content !== "[wiadomość głosowa]" && (
                                <p className="text-xs text-gray-700 dark:text-gray-300 mt-1 line-clamp-2">{c.content}</p>
                              )}
                              {c.voiceUrl && (
                                <span className="inline-flex items-center gap-0.5 text-[10px] text-blue-500 mt-0.5">
                                  <Mic size={9} />
                                  wiadomość głosowa
                                </span>
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
                                className={`flex mb-2 items-end gap-1.5 group transition-colors duration-300 ${isOwn ? "justify-end" : "justify-start"} ${isHighlighted ? "bg-yellow-100 dark:bg-yellow-900/30 rounded-xl" : ""}`}
                              >
                                {!isOwn && <Avatar name={item.author} />}
                                <div className="max-w-[75%]">
                                <SwipeableMessage
                                  isOwn={isOwn}
                                  onReply={() => setReplyingToMsg({ id: item.id, content: item.content, author: item.author })}
                                  onLongPress={(isDesigner || item.author === authorName) ? () => setChatOpenMenuId(item.id) : undefined}
                                >
                                {editingChatId === item.id ? (
                                  <div className="flex flex-col gap-1">
                                    <textarea
                                      autoFocus
                                      value={editingChatText}
                                      onChange={(e) => setEditingChatText(e.target.value)}
                                      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleEditComment(item.id, editingChatText); setEditingChatId(null); } if (e.key === "Escape") setEditingChatId(null); }}
                                      className="w-full px-2 py-1.5 text-sm rounded-lg border border-primary bg-background focus:outline-none resize-none"
                                      rows={2}
                                    />
                                    <div className="flex gap-1 justify-end">
                                      <button onClick={() => setEditingChatId(null)} className="px-2 py-1 text-xs text-muted-foreground hover:text-foreground rounded-lg border">Anuluj</button>
                                      <button onClick={() => { handleEditComment(item.id, editingChatText); setEditingChatId(null); }} className="px-2 py-1 text-xs bg-primary text-primary-foreground rounded-lg hover:opacity-90">Zapisz</button>
                                    </div>
                                  </div>
                                ) : (
                                <div className={`flex flex-col ${isOwn ? "items-end" : "items-start"}`}>
                                  {item.replyToContent && (
                                    <div className="px-2 py-1 rounded-lg text-[11px] border-l-2 border-primary/40 bg-muted/60 mb-1 max-w-full">
                                      <span className="font-semibold text-foreground/70">{item.replyToAuthor}: </span>
                                      <span className="text-muted-foreground">{item.replyToContent.length > 60 ? item.replyToContent.slice(0, 60) + "…" : item.replyToContent}</span>
                                    </div>
                                  )}
                                  <div className="relative">
                                    <div className={`px-3 py-2 text-sm leading-relaxed break-words ${
                                      isOwn
                                        ? "bg-violet-600 text-white rounded-2xl rounded-tr-sm"
                                        : "bg-gray-100 dark:bg-muted text-gray-800 dark:text-gray-200 rounded-2xl rounded-tl-sm"
                                    }`}>
                                      {item.content !== "[wiadomość głosowa]" && item.content !== "[zdjęcie]" && item.content}
                                      {item.voiceUrl && (
                                        <audio src={item.voiceUrl} controls className="mt-1 h-8 w-48 max-w-full" />
                                      )}
                                      {item.imageUrl && (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={item.imageUrl} alt="zdjęcie" className="mt-1 max-w-[200px] max-h-[200px] rounded-lg object-cover cursor-pointer" onClick={() => window.open(item.imageUrl!, "_blank")} />
                                      )}
                                    </div>
                                    <div className={`absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 ${isOwn ? "right-full pr-1 flex-row-reverse" : "left-full pl-1"}`}>
                                      <button
                                        onClick={() => setReplyingToMsg({ id: item.id, content: item.content, author: item.author })}
                                        title="Odpowiedz"
                                        className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-muted transition-colors"
                                      >
                                        <CornerDownLeft size={13} />
                                      </button>
                                      {(isDesigner || item.author === authorName) && (
                                        <div className="relative">
                                          <button
                                            onClick={() => setChatOpenMenuId(chatOpenMenuId === item.id ? null : item.id)}
                                            className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-muted transition-colors"
                                          >
                                            <MoreVertical size={13} />
                                          </button>
                                          {chatOpenMenuId === item.id && (
                                            <div className={`absolute ${isOwn ? "right-0" : "left-0"} top-full mt-1 bg-popover border border-border rounded-xl shadow-lg z-50 py-1 min-w-[110px]`}>
                                              {item.content !== "[wiadomość głosowa]" && (
                                                <button
                                                  onClick={() => { setEditingChatText(item.content); setEditingChatId(item.id); setChatOpenMenuId(null); }}
                                                  className="w-full text-left px-3 py-2 text-xs hover:bg-muted flex items-center gap-2 transition-colors"
                                                >
                                                  <Edit2 size={12} className="text-muted-foreground" /> Edytuj
                                                </button>
                                              )}
                                              <button
                                                onClick={() => { deleteComment(item.id); setChatOpenMenuId(null); }}
                                                className="w-full text-left px-3 py-2 text-xs text-destructive hover:bg-destructive/10 flex items-center gap-2 transition-colors"
                                              >
                                                <Trash2 size={12} /> Usuń
                                              </button>
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <span className="text-[10px] text-gray-400 mt-1 whitespace-nowrap">{formatChatTime(item.createdAt)}</span>
                                </div>
                                )}
                                </SwipeableMessage>
                                </div>
                                {isOwn && <Avatar name={item.author} logoUrl={authorAvatarUrl} />}
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
                    <div className="px-3 py-3 border-t flex-shrink-0">
                      {/* Reply quote preview */}
                      {replyingToMsg && (
                        <div className="flex items-center gap-2 px-2 py-1.5 mb-2 bg-muted/60 rounded-lg border-l-2 border-primary/50">
                          <CornerDownLeft size={11} className="text-primary flex-shrink-0" />
                          <span className="flex-1 text-xs text-muted-foreground truncate">
                            <span className="font-medium text-foreground">{replyingToMsg.author}:</span>{" "}
                            {replyingToMsg.content.slice(0, 80)}{replyingToMsg.content.length > 80 ? "…" : ""}
                          </span>
                          <button onClick={() => setReplyingToMsg(null)} className="text-muted-foreground hover:text-foreground flex-shrink-0">
                            <X size={12} />
                          </button>
                        </div>
                      )}
                      {/* Pending voice preview */}
                      {chatPendingVoiceUrl && (
                        <div className="flex items-center gap-2 mb-2 px-2 py-1.5 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
                          <CheckCircle2 size={12} className="text-green-600 dark:text-green-400 flex-shrink-0" />
                          <audio src={chatPendingVoiceUrl} controls className="h-6 flex-1 min-w-0" />
                          <button onClick={() => setChatPendingVoiceUrl(null)} className="text-gray-400 hover:text-red-400 flex-shrink-0 transition-colors">
                            <X size={12} />
                          </button>
                        </div>
                      )}

                      {/* Pending image preview */}
                      {chatPendingImageUrl && (
                        <div className="flex items-start gap-2 mb-2">
                          <div className="relative">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={chatPendingImageUrl} alt="podgląd" className="h-20 w-20 rounded-lg object-cover border" />
                            <button
                              onClick={() => setChatPendingImageUrl(null)}
                              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-gray-800 text-white flex items-center justify-center hover:bg-red-500 transition-colors"
                            >
                              <X size={10} />
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Recording state */}
                      {isChatRecording ? (
                        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/30">
                          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
                          <span className="text-sm text-red-600 dark:text-red-400 flex-1 font-medium tabular-nums">
                            {Math.floor(chatRecordingSeconds / 60)}:{String(chatRecordingSeconds % 60).padStart(2, "0")}
                          </span>
                          <button
                            type="button"
                            onClick={stopChatRecording}
                            title="Zatrzymaj nagrywanie"
                            className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 transition-colors"
                          >
                            <StopCircle size={16} />
                            <span>Zatrzymaj</span>
                          </button>
                        </div>
                      ) : (
                        /* Textarea + dynamic button (Messenger-style) */
                        <div className="flex items-end gap-2">
                          {/* Hidden file input for image attachment */}
                          <input
                            ref={chatImageInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              setChatUploadingImage(true);
                              startChatImageUpload([file]);
                              e.target.value = "";
                            }}
                          />

                          {/* Attachment button */}
                          <button
                            type="button"
                            disabled={chatUploadingImage || sendingChatMessage}
                            onClick={() => chatImageInputRef.current?.click()}
                            title="Dodaj zdjęcie"
                            className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-primary text-white transition-colors disabled:opacity-40 hover:opacity-90"
                          >
                            {chatUploadingImage ? (
                              <Loader2 size={16} className="animate-spin" />
                            ) : (
                              <Paperclip size={16} />
                            )}
                          </button>

                          <Textarea
                            ref={chatTextareaRef}
                            value={chatMessage}
                            onChange={(e) => {
                              setChatMessage(e.target.value);
                              e.target.style.height = "auto";
                              e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px";
                              e.target.style.overflowY = e.target.scrollHeight > 160 ? "auto" : "hidden";
                            }}
                            placeholder="Napisz wiadomość…"
                            className="text-sm resize-none flex-1 min-h-10 max-h-40 rounded-2xl"
                            rows={1}
                            style={{ height: "40px", overflowY: "hidden" }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                submitChatMessage();
                              }
                            }}
                          />
                          <button
                            type="button"
                            disabled={chatUploadingVoice || chatUploadingImage || sendingChatMessage}
                            onClick={
                              chatMessage.trim() || chatPendingVoiceUrl || chatPendingImageUrl
                                ? submitChatMessage
                                : startChatRecording
                            }
                            title={
                              chatMessage.trim() || chatPendingVoiceUrl || chatPendingImageUrl
                                ? "Wyślij"
                                : "Nagraj wiadomość głosową"
                            }
                            className="flex-shrink-0 flex items-center justify-center w-8 h-8 text-primary transition-colors disabled:opacity-40 hover:opacity-90"
                          >
                            {chatUploadingVoice || chatUploadingImage || sendingChatMessage ? (
                              <Loader2 className="w-7 h-7 animate-spin" />
                            ) : chatMessage.trim() || chatPendingVoiceUrl || chatPendingImageUrl ? (
                              <Send className="w-7 h-7" />
                            ) : (
                              <Mic className="w-7 h-7" />
                            )}
                          </button>
                        </div>
                      )}
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
                onClick={() => setHidePins((v) => !v)}
                title={hidePins ? "Pokaż piny" : "Ukryj piny"}
                className={`p-2 rounded-md transition-colors ${hidePins ? "bg-white/20 text-white" : "text-white/60 hover:text-white hover:bg-white/10"}`}
              >
                <Pin size={18} />
              </button>
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
              className="absolute left-3 top-1/2 -translate-y-1/2 z-10 bg-white/10 hover:bg-white/20 border border-white/20 rounded-full p-2 text-white/70 hover:text-white transition-all sm:opacity-60 sm:hover:opacity-100"
              title={lightboxPrevRender.name}
            >
              <ChevronLeft size={20} />
            </button>
          )}
          {/* Right navigation arrow */}
          {lightboxNextRender && (
            <button
              onClick={() => { setLightboxIndex((i) => i + 1); setZoom(1); cancelPending(); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 z-10 bg-white/10 hover:bg-white/20 border border-white/20 rounded-full p-2 text-white/70 hover:text-white transition-all sm:opacity-60 sm:hover:opacity-100"
              title={lightboxNextRender.name}
            >
              <ChevronRight size={20} />
            </button>
          )}
          <div
            className="absolute inset-0 overflow-auto flex items-start justify-center p-4 sm:p-8"
            onWheel={(e) => {
              e.preventDefault();
              const delta = e.deltaY > 0 ? -0.12 : 0.12;
              setZoom((z) => Math.max(0.25, Math.min(5, z + delta)));
            }}
            onTouchStart={(e) => {
              if (e.touches.length === 2) {
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                lastPinchDistRef.current = Math.hypot(dx, dy);
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
              }
            }}
          >
            <div
              ref={lightboxImgRef}
              className={`relative flex-shrink-0 select-none ${(mode === "pin" || productPinMode) ? "cursor-crosshair" : "cursor-default"}`}
              style={{ width: "fit-content", height: "fit-content" }}
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
                style={{
                  maxWidth: `calc((100vw - 2rem) * ${zoom})`,
                  maxHeight: `calc((100vh - 120px - 2rem) * ${zoom})`,
                  width: "auto",
                  height: "auto",
                }}
                className="block rounded-lg"
                draggable={false}
              />

              {/* Product pins in lightbox */}
              {!hidePins && (lightboxRender.id === renderId ? productPins : lightboxProductPins).map((pin) => {
                const pinX = dragPos?.id === pin.id ? dragPos.x : pin.posX;
                const pinY = dragPos?.id === pin.id ? dragPos.y : pin.posY;
                return (
                <div
                  key={pin.id}
                  className="absolute z-10"
                  style={{ left: `calc(${pinX}% - 13px)`, top: `calc(${pinY}% - 13px)` }}
                  onMouseEnter={() => !draggingPinRef.current && handleProductPinMouseEnter(pin.id)}
                  onMouseLeave={handleProductPinMouseLeave}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div
                    className={`w-[26px] h-[26px] rounded-lg bg-black/60 backdrop-blur-sm border border-white/20 shadow-lg flex items-center justify-center ${dragPos?.id === pin.id ? "transition-none cursor-grabbing" : `transition-transform hover:scale-110 hover:bg-black/80 ${isDesigner ? "cursor-grab" : "cursor-pointer"}`} ${productPinsPulsing && !draggingPinRef.current ? "animate-pulse" : ""}`}
                    onMouseDown={isDesigner ? (e) => startPinDrag(e, pin.id, "product", lightboxImgRef.current) : undefined}
                  >
                    <Armchair size={14} className="text-white" />
                  </div>
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
                        <img src={pin.product.imageUrl} alt={pin.product.name} className="w-full h-28 object-contain rounded-lg mb-2 border border-border bg-muted" />
                      )}
                      {!pin.product.imageUrl && (
                        <div className="w-full h-16 rounded-lg bg-muted flex items-center justify-center mb-2">
                          <Package size={20} className="text-muted-foreground" />
                        </div>
                      )}
                      <p className="text-sm font-medium text-foreground truncate">{pin.product.name}</p>
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
                );
              })}

              {/* Pins overlay — interactive */}
              {!hidePins && (lightboxRender.id === renderId ? pinComments : lightboxComments.filter(c => c.posX !== null)).map((c, i) => {
                const canDrag = selectedId !== c.id && (isDesigner || c.author === authorName);
                const pinX = dragPos?.id === c.id ? dragPos.x : c.posX!;
                const pinY = dragPos?.id === c.id ? dragPos.y : c.posY!;
                return (
                  <div
                    key={c.id}
                    className="absolute z-10"
                    style={{ left: `calc(${pinX}% - 14px)`, top: `calc(${pinY}% - 14px)` }}
                    onMouseEnter={() => !draggingPinRef.current && handleCommentPinMouseEnter(c.id)}
                    onMouseLeave={handleCommentPinMouseLeave}
                  >
                    <button
                      className={`w-7 h-7 rounded-full border-2 border-white text-white text-xs font-bold flex items-center justify-center shadow-lg ${dragPos?.id === c.id ? "transition-none cursor-grabbing" : `transition-transform hover:scale-110 ${canDrag ? "cursor-grab" : ""}`} ${STATUS_PIN_COLOR[c.status]} ${selectedId === c.id ? "scale-125 ring-2 ring-white ring-offset-1" : ""}`}
                      onMouseDown={canDrag ? (e) => startPinDrag(e, c.id, "comment", lightboxImgRef.current) : undefined}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (didDragRef.current) { didDragRef.current = false; return; }
                        setSelectedId(c.id === selectedId ? null : c.id);
                        cancelPending();
                        setReplyContent("");
                      }}
                    >
                      {i + 1}
                    </button>
                    {hoveredCommentPinId === c.id && selectedId !== c.id && (
                      <div
                        className="fixed z-50 bg-card rounded-xl shadow-xl border border-border p-3 w-56"
                        style={getPopupStyle(c.posX!, c.posY!, lightboxImgRef.current, 224)}
                        onMouseEnter={() => handleCommentPinMouseEnter(c.id)}
                        onMouseLeave={handleCommentPinMouseLeave}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <p className="text-xs font-medium text-muted-foreground mb-1 truncate">{c.author}</p>
                        <p className="text-sm text-foreground leading-snug line-clamp-3">
                          {c.title || c.content}
                        </p>
                        {c.replies.length > 0 && (
                          <p className="text-xs text-muted-foreground mt-1.5">
                            {c.replies.length} {c.replies.length === 1 ? "odpowiedź" : "odpowiedzi"}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

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
                  data-new-pin-popup=""
                  className="fixed z-50 bg-card rounded-xl shadow-xl border border-border p-4 w-64"
                  style={getPopupStyle(pending.x, pending.y, lightboxImgRef.current, 256, visualVP.height || undefined, visualVP.offsetTop)}
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
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
                  {pendingVoiceUrl && (
                    <div className="flex items-center gap-2 mb-3 px-2 py-1.5 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
                      <CheckCircle2 size={12} className="text-green-600 dark:text-green-400 flex-shrink-0" />
                      <audio src={pendingVoiceUrl} controls className="h-6 flex-1 min-w-0" />
                      <button onClick={() => setPendingVoiceUrl(null)} className="text-gray-400 hover:text-red-400 flex-shrink-0 transition-colors">
                        <X size={12} />
                      </button>
                    </div>
                  )}
                  {isRecording ? (
                    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/30 mb-3">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
                      <span className="text-sm text-red-600 dark:text-red-400 flex-1 font-medium tabular-nums">
                        {Math.floor(recordingSeconds / 60)}:{String(recordingSeconds % 60).padStart(2, "0")}
                      </span>
                      <button
                        type="button"
                        onClick={stopRecording}
                        className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 transition-colors"
                      >
                        <StopCircle size={16} />
                        <span>Zatrzymaj</span>
                      </button>
                    </div>
                  ) : (
                    <div className="relative mb-3">
                      <Textarea
                        value={newContent}
                        onChange={(e) => setNewContent(e.target.value)}
                        placeholder="Opisz co wymaga zmiany..."
                        className="text-sm resize-none pr-10 max-h-40 overflow-y-auto"
                        rows={3}
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && e.ctrlKey) submitComment();
                          if (e.key === "Escape") cancelPending();
                        }}
                      />
                      <button
                        type="button"
                        disabled={uploadingVoice || adding}
                        onClick={
                          newContent.trim() || pendingVoiceUrl
                            ? submitComment
                            : startRecording
                        }
                        title={
                          newContent.trim() || pendingVoiceUrl
                            ? "Dodaj pin"
                            : "Nagraj wiadomość głosową"
                        }
                        className="absolute right-2 bottom-2 z-10 flex items-center justify-center w-8 h-8 rounded-md transition-colors text-muted-foreground hover:text-foreground disabled:opacity-40"
                      >
                        {uploadingVoice || adding ? (
                          <Loader2 size={30} className="animate-spin" />
                        ) : newContent.trim() || pendingVoiceUrl ? (
                          <Send size={30} />
                        ) : (
                          <Mic size={30} />
                        )}
                      </button>
                    </div>
                  )}
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
                    {editingTitleMode ? (
                      <>
                        <Input
                          autoFocus
                          value={editingTitleText}
                          onChange={(e) => setEditingTitleText(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") handleEditTitle(selectedComment.id, editingTitleText); if (e.key === "Escape") setEditingTitleMode(false); }}
                          placeholder="Tytuł pinu..."
                          className="flex-1 h-7 text-sm min-w-0"
                        />
                        <button onClick={() => setEditingTitleMode(false)} className="text-xs text-gray-400 hover:text-gray-700 flex-shrink-0 transition-colors">Anuluj</button>
                        <button onClick={() => handleEditTitle(selectedComment.id, editingTitleText)} className="text-xs text-primary font-medium hover:opacity-80 flex-shrink-0 transition-colors">Zapisz</button>
                      </>
                    ) : (
                      <>
                        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate flex-1">
                          {selectedComment.title || `Pin #${selectedIndex + 1}`}
                        </span>
                        {isDesigner && (
                          <div className="relative flex-shrink-0">
                            <button
                              onClick={() => setOpenPinMenu((v) => !v)}
                              className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-muted transition-colors"
                            >
                              <MoreVertical size={14} />
                            </button>
                            {openPinMenu && (
                              <div className="absolute right-0 top-full mt-1 bg-popover border border-border rounded-xl shadow-lg z-[60] py-1 min-w-[130px]">
                                <button
                                  onClick={() => { setEditingTitleText(selectedComment.title ?? ""); setEditingTitleMode(true); setOpenPinMenu(false); }}
                                  className="w-full text-left px-3 py-2 text-xs hover:bg-muted flex items-center gap-2 transition-colors"
                                >
                                  <Edit2 size={12} className="text-muted-foreground" /> Edytuj tytuł
                                </button>
                                <button
                                  onClick={() => { deleteComment(selectedComment.id); setOpenPinMenu(false); }}
                                  className="w-full text-left px-3 py-2 text-xs text-destructive hover:bg-destructive/10 flex items-center gap-2 transition-colors"
                                >
                                  <Trash2 size={12} /> Usuń pin
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}
                    <button
                      onClick={() => { setSelectedId(null); setReplyContent(""); setOpenPinMenu(false); setEditingTitleMode(false); }}
                      className="text-gray-400 hover:text-gray-700 flex-shrink-0"
                    >
                      <X size={14} />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto divide-y divide-gray-100 min-h-0">
                    <div className="px-4 py-3 group">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">{selectedComment.author}</span>
                        <span className="text-[10px] text-gray-400">{formatDate(selectedComment.createdAt)}</span>
                      </div>
                      {editingCommentMode ? (
                        <div className="flex flex-col gap-1">
                          <textarea autoFocus value={editingCommentText} onChange={(e) => setEditingCommentText(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleEditComment(selectedComment.id, editingCommentText); } if (e.key === "Escape") setEditingCommentMode(false); }}
                            className="w-full px-2 py-1.5 text-sm border border-border rounded-lg bg-background focus:outline-none resize-none" rows={2} />
                          <div className="flex gap-1 justify-end">
                            <button onClick={() => setEditingCommentMode(false)} className="px-2 py-1 text-xs text-muted-foreground hover:text-foreground rounded-lg border">Anuluj</button>
                            <button onClick={() => handleEditComment(selectedComment.id, editingCommentText)} className="px-2 py-1 text-xs bg-primary text-primary-foreground rounded-lg hover:opacity-90">Zapisz</button>
                          </div>
                        </div>
                      ) : (
                        <SwipeableMessage
                          isOwn={selectedComment.author === authorName}
                          onReply={() => setReplyingToMsg({ id: selectedComment.id, content: selectedComment.content, author: selectedComment.author })}
                        >
                        <div className="flex items-center gap-1">
                          <div className="flex-1">
                            {selectedComment.content !== "[wiadomość głosowa]" && (
                              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{selectedComment.content}</p>
                            )}
                            {selectedComment.voiceUrl && (
                              <audio src={selectedComment.voiceUrl} controls className="w-full h-8 mt-1" />
                            )}
                          </div>
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 flex-shrink-0 self-start mt-0.5">
                            <button
                              onClick={() => setReplyingToMsg({ id: selectedComment.id, content: selectedComment.content, author: selectedComment.author })}
                              title="Odpowiedz"
                              className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-muted transition-colors"
                            >
                              <CornerDownLeft size={13} />
                            </button>
                            {(isDesigner || selectedComment.author === authorName) && selectedComment.content !== "[wiadomość głosowa]" && (
                              <button
                                onClick={() => { setEditingCommentText(selectedComment.content); setEditingCommentMode(true); }}
                                title="Edytuj"
                                className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-muted transition-colors"
                              >
                                <Edit2 size={13} />
                              </button>
                            )}
                            {!isDesigner && selectedComment.author === authorName && (
                              <button
                                onClick={() => deleteComment(selectedComment.id)}
                                title="Usuń"
                                className="p-1 rounded-lg text-gray-400 hover:text-destructive hover:bg-destructive/10 transition-colors"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </div>
                        </SwipeableMessage>
                      )}
                    </div>
                    {selectedComment.replies.map((r) => (
                      <div key={r.id} className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50 group">
                        <div className="flex items-center gap-2 mb-1">
                          <Avatar name={r.author} />
                          <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">{r.author}</span>
                          <span className="text-[10px] text-gray-400">{formatDate(r.createdAt)}</span>
                        </div>
                        {r.replyToContent && (
                          <div className="px-2 py-1 rounded-lg text-[11px] border-l-2 border-primary/40 bg-muted/60 mb-1">
                            <span className="font-semibold text-foreground/70">{r.replyToAuthor}: </span>
                            <span className="text-muted-foreground">{r.replyToContent.length > 80 ? r.replyToContent.slice(0, 80) + "…" : r.replyToContent}</span>
                          </div>
                        )}
                        {editingReplyId === r.id ? (
                          <div className="flex flex-col gap-1">
                            <textarea autoFocus value={editingReplyText} onChange={(e) => setEditingReplyText(e.target.value)}
                              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleEditReply(selectedComment.id, r.id, editingReplyText); } if (e.key === "Escape") setEditingReplyId(null); }}
                              className="w-full px-2 py-1.5 text-sm border border-border rounded-lg bg-background focus:outline-none resize-none" rows={2} />
                            <div className="flex gap-1 justify-end">
                              <button onClick={() => setEditingReplyId(null)} className="px-2 py-1 text-xs text-muted-foreground hover:text-foreground rounded-lg border">Anuluj</button>
                              <button onClick={() => handleEditReply(selectedComment.id, r.id, editingReplyText)} className="px-2 py-1 text-xs bg-primary text-primary-foreground rounded-lg hover:opacity-90">Zapisz</button>
                            </div>
                          </div>
                        ) : (
                          <SwipeableMessage
                            isOwn={r.author === authorName}
                            onReply={() => setReplyingToMsg({ id: r.id, content: r.content, author: r.author })}
                          >
                          <div className="flex items-center gap-1">
                            <div className="flex-1">
                              {r.content !== "[wiadomość głosowa]" && (
                                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{r.content}</p>
                              )}
                              {r.voiceUrl && (
                                <audio src={r.voiceUrl} controls className="w-full h-8 mt-1" />
                              )}
                            </div>
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 flex-shrink-0 self-start mt-0.5">
                              <button
                                onClick={() => setReplyingToMsg({ id: r.id, content: r.content, author: r.author })}
                                title="Odpowiedz"
                                className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-muted transition-colors"
                              >
                                <CornerDownLeft size={13} />
                              </button>
                              {(isDesigner || r.author === authorName) && r.content !== "[wiadomość głosowa]" && (
                                <button
                                  onClick={() => { setEditingReplyId(r.id); setEditingReplyText(r.content); }}
                                  title="Edytuj"
                                  className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-muted transition-colors"
                                >
                                  <Edit2 size={13} />
                                </button>
                              )}
                              {(isDesigner || r.author === authorName) && (
                                <button
                                  onClick={() => deleteReply(selectedComment.id, r.id)}
                                  title="Usuń"
                                  className="p-1 rounded-lg text-gray-400 hover:text-destructive hover:bg-destructive/10 transition-colors"
                                >
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </div>
                          </div>
                          </SwipeableMessage>
                        )}
                      </div>
                    ))}
                  </div>

                  {isDesigner && (
                    <div className="px-4 py-2 border-t flex items-center gap-2 flex-shrink-0">
                      <DropdownMenu>
                        <DropdownMenuTrigger className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-colors ${STATUS_BADGE[selectedComment.status]}`}>
                          {STATUS_LABEL[selectedComment.status]}
                          <ChevronDown size={11} />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                          {(["NEW", "IN_PROGRESS", "DONE"] as CommentStatus[]).map((s) => (
                            <DropdownMenuItem
                              key={s}
                              onClick={() => updateStatus(selectedComment.id, s)}
                              className={selectedComment.status === s ? "font-semibold" : ""}
                            >
                              {STATUS_LABEL[s]}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}

                  <div className="px-4 py-3 border-t flex-shrink-0">
                    {replyingToMsg && (
                      <div className="flex items-center gap-2 px-2 py-1.5 mb-2 bg-muted/60 rounded-lg border-l-2 border-primary/50">
                        <CornerDownLeft size={11} className="text-primary flex-shrink-0" />
                        <span className="flex-1 text-xs text-muted-foreground truncate">
                          <span className="font-medium text-foreground">{replyingToMsg.author}:</span>{" "}
                          {replyingToMsg.content.slice(0, 80)}{replyingToMsg.content.length > 80 ? "…" : ""}
                        </span>
                        <button onClick={() => setReplyingToMsg(null)} className="text-muted-foreground hover:text-foreground flex-shrink-0">
                          <X size={12} />
                        </button>
                      </div>
                    )}
                    {replyPendingVoiceUrl && (
                      <div className="flex items-center gap-2 mb-2 px-2 py-1.5 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
                        <CheckCircle2 size={12} className="text-green-600 dark:text-green-400 flex-shrink-0" />
                        <audio src={replyPendingVoiceUrl} controls className="h-6 flex-1 min-w-0" />
                        <button onClick={() => setReplyPendingVoiceUrl(null)} className="text-gray-400 hover:text-red-400 flex-shrink-0 transition-colors">
                          <X size={12} />
                        </button>
                      </div>
                    )}
                    {isReplyRecording ? (
                      <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/30">
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
                        <span className="text-sm text-red-600 dark:text-red-400 flex-1 font-medium tabular-nums">
                          {Math.floor(replyRecordingSeconds / 60)}:{String(replyRecordingSeconds % 60).padStart(2, "0")}
                        </span>
                        <button
                          type="button"
                          onClick={stopReplyRecording}
                          className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 transition-colors"
                        >
                          <StopCircle size={16} />
                          <span>Zatrzymaj</span>
                        </button>
                      </div>
                    ) : (
                      <div className="relative">
                        <Textarea
                          value={replyContent}
                          onChange={(e) => setReplyContent(e.target.value)}
                          placeholder="Dodaj odpowiedź..."
                          className="text-sm resize-none pr-10"
                          rows={2}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && e.ctrlKey) submitReply();
                            if (e.key === "Escape") { setSelectedId(null); setReplyContent(""); setReplyPendingVoiceUrl(null); setReplyingToMsg(null); }
                          }}
                        />
                        <button
                          type="button"
                          disabled={replyUploadingVoice || replying}
                          onClick={replyContent.trim() || replyPendingVoiceUrl ? submitReply : startReplyRecording}
                          title={replyContent.trim() || replyPendingVoiceUrl ? "Wyślij" : "Nagraj wiadomość głosową"}
                          className="absolute right-2 bottom-2 z-10 flex items-center justify-center w-6 h-6 rounded-md transition-colors text-muted-foreground hover:text-foreground disabled:opacity-40"
                        >
                          {replyUploadingVoice || replying ? <Loader2 size={15} className="animate-spin" /> : replyContent.trim() || replyPendingVoiceUrl ? <Send size={15} /> : <Mic size={15} />}
                        </button>
                      </div>
                    )}
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
        }}
        projectId={projectId}
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

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setShowDeleteConfirm(false)}>
          <div className="bg-card rounded-xl shadow-xl border border-border w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">Usuń plik</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              Czy na pewno chcesz usunąć <span className="font-medium text-gray-700 dark:text-gray-200">{renderName}</span>? Tej operacji nie można cofnąć.
            </p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowDeleteConfirm(false)} disabled={deleting} className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-muted transition-colors">
                Anuluj
              </button>
              <button onClick={deleteRender} disabled={deleting} className="px-4 py-2 text-sm rounded-lg bg-red-500 hover:bg-red-600 text-white font-medium transition-colors disabled:opacity-60 flex items-center gap-2">
                {deleting && <Loader2 size={14} className="animate-spin" />}
                Usuń
              </button>
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
                      className="flex-shrink-0 w-20 h-14 rounded-lg overflow-hidden border border-border bg-muted hover:opacity-80 transition-opacity flex items-center justify-center"
                      title="Otwórz pełny rozmiar"
                    >
                      {isPdf ? (
                        <FileText size={22} className="text-red-400" />
                      ) : (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={v.fileUrl}
                          alt={`Wersja ${v.versionNumber}`}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </a>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                        Wersja {v.versionNumber}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Zarchiwizowano: {formatted}
                      </p>
                    </div>
                    {!isPdf && (
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
                    )}
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
