"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { ChatBubble, ExternalLink, Paperclip, FileText, FileSpreadsheet, File as FileIcon, Loader2, FolderOpen, X, Mic, Square, Search, Edit2, Trash2, CornerDownLeft, MoreVertical, Send, AddReaction } from "@/components/ui/icons";
import { toast } from "sonner";
import Pusher from "pusher-js";
import { useUploadThing } from "@/lib/uploadthing-client";
import { convertHeicFiles } from "@/lib/convert-heic";
import ImageAnnotationModal from "./ImageAnnotationModal";
import { SwipeableMessage } from "@/components/ui/swipeable-message";
import { playMessageSound } from "@/lib/notification-sound";
import { useT } from "@/lib/i18n";

interface MessageReaction {
  userId: string;
  userName: string;
  emoji: string;
}

interface DiscussionMessage {
  id: string;
  content: string;
  authorName: string;
  userId: string | null;
  sourceType: string;
  sourceId: string | null;
  sourceUrl: string | null;
  sourceName: string | null;
  sourceImageUrl: string | null;
  attachmentUrl: string | null;
  attachmentName: string | null;
  attachmentType: string | null;
  replyToId?: string | null;
  replyToContent?: string | null;
  replyToAuthor?: string | null;
  createdAt: string;
  editedAt?: string | null;
  reactions?: MessageReaction[];
}

interface ReadReceipt {
  readerId: string;
  readerName: string;
  readerType: string;
  lastMessageId: string | null;
}

type AttachmentType = "image" | "document" | "audio" | "pdf";

interface PendingAttachment {
  url: string;
  name: string;
  type: AttachmentType;
}

function ClientChatSearchResults({ messages, query, onImageClick }: {
  messages: DiscussionMessage[];
  query: string;
  onImageClick: (url: string) => void;
}) {
  const t = useT();
  const q = query.toLowerCase();
  const textMatches = messages.filter(
    (m) => m.content && m.content.toLowerCase().includes(q)
  );
  const fileMatches = messages.filter(
    (m) =>
      (m.attachmentType === "document" || m.attachmentType === "pdf" || m.attachmentType === "image") &&
      m.attachmentName?.toLowerCase().includes(q)
  );
  const total = textMatches.length + fileMatches.length;

  return (
    <div className="flex-1 overflow-y-auto px-5 py-4">
      <p className="text-xs text-muted-foreground mb-3 font-medium uppercase tracking-wide">
        {total === 0 ? t.common.noResults : `${total} ${total === 1 ? t.dyskusje.resultSingular : total < 5 ? t.dyskusje.resultFew : t.dyskusje.resultMany}`}
      </p>
      {total === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 gap-2 text-muted-foreground">
          <Search size={32} className="opacity-30" />
          <p className="text-sm">{t.dyskusje.noSearchResults}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {textMatches.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">{t.dyskusje.messagesLabel} ({textMatches.length})</p>
              <div className="space-y-2">
                {textMatches.map((m) => {
                  const idx = m.content!.toLowerCase().indexOf(q);
                  const start = Math.max(0, idx - 30);
                  const end = Math.min(m.content!.length, idx + q.length + 50);
                  const excerpt = (start > 0 ? "…" : "") + m.content!.slice(start, end) + (end < m.content!.length ? "…" : "");
                  const excerptIdx = idx - start + (start > 0 ? 1 : 0);
                  const before = excerpt.slice(0, excerptIdx);
                  const match = excerpt.slice(excerptIdx, excerptIdx + q.length);
                  const after = excerpt.slice(excerptIdx + q.length);
                  return (
                    <div key={m.id} className="px-3 py-2.5 rounded-xl border border-border bg-background">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium">{m.authorName}</span>
                        <span className="text-xs text-muted-foreground">{formatTime(m.createdAt)}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {before}<mark className="bg-yellow-200 text-yellow-900 rounded px-0.5">{match}</mark>{after}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {fileMatches.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">{t.dyskusje.filesLabel} ({fileMatches.length})</p>
              <div className="space-y-2">
                {fileMatches.map((m) => (
                  <div key={m.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-border bg-background">
                    {m.attachmentType === "image" ? (
                      <button onClick={() => onImageClick(m.attachmentUrl!)} className="flex-shrink-0 hover:opacity-80 transition-opacity">
                        <img src={m.attachmentUrl!} alt={m.attachmentName || ""} className="w-10 h-10 rounded object-cover" />
                      </button>
                    ) : (
                      <DocumentIcon name={m.attachmentName || ""} />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{m.attachmentName}</p>
                      <p className="text-xs text-muted-foreground">{m.authorName} · {formatTime(m.createdAt)}</p>
                    </div>
                    {m.attachmentType !== "image" && (
                      <a href={m.attachmentUrl!} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground flex-shrink-0">
                        <ExternalLink size={14} />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function renderWithLinks(content: string, isOwn: boolean) {
  const parts = content.split(/(https?:\/\/[^\s]+)/g);
  return parts.map((part, i) => {
    if (/^https?:\/\//.test(part)) {
      return (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className={`underline break-all ${isOwn ? "text-primary-foreground/90 hover:text-primary-foreground" : "text-primary hover:opacity-80"}`}
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </a>
      );
    }
    return part;
  });
}

function Avatar({ name, logoUrl }: { name: string; logoUrl?: string | null }) {
  if (logoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={logoUrl} alt={name} title={name} className="w-7 h-7 rounded-full object-cover shrink-0 cursor-default" />;
  }
  const initials = name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  return (
    <div title={name} className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary shrink-0 cursor-default">
      {initials}
    </div>
  );
}

function DocumentIcon({ name }: { name: string }) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf") return <FileText size={20} className="text-red-500 flex-shrink-0" />;
  if (["xls", "xlsx", "csv"].includes(ext)) return <FileSpreadsheet size={20} className="text-green-600 flex-shrink-0" />;
  if (["doc", "docx"].includes(ext)) return <FileText size={20} className="text-blue-500 flex-shrink-0" />;
  return <FileIcon size={20} className="text-muted-foreground flex-shrink-0" />;
}

interface Props {
  token: string;
  discussionId: string;
  discussionTitle: string;
  /** If set, use this API path instead of /api/share/[token]/discussions/[id] */
  apiBasePath?: string;
  /** If set, use as author name (skip localStorage lookup) */
  initialAuthorName?: string;
  /** If set, use for sound notification logic (don't play for own messages) */
  currentUserId?: string;
  /** Current user's avatar URL */
  currentUserAvatarUrl?: string | null;
}

function dedupeReceipts(recs: ReadReceipt[]): ReadReceipt[] {
  const seen = new Map<string, ReadReceipt>();
  for (const r of recs) {
    seen.set(r.readerName.toLowerCase(), r);
  }
  return Array.from(seen.values());
}

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 1) return "wczoraj";
  if (diffDays < 7) return d.toLocaleDateString("pl-PL", { weekday: "short" });
  return d.toLocaleDateString("pl-PL", { day: "numeric", month: "short" });
}

function formatTimeOnly(iso: string) {
  return new Date(iso).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" });
}

function dayLabel(iso: string) {
  return new Date(iso).toLocaleDateString("pl-PL", { day: "2-digit", month: "long", year: "numeric" });
}

const REACTION_EMOJIS = ["❤️", "😂", "😮", "😢", "😡", "👍"];

export default function ClientDiscussionView({ token, discussionId, discussionTitle, apiBasePath, initialAuthorName, currentUserId, currentUserAvatarUrl }: Props) {
  const t = useT();
  const msgApiBase = apiBasePath ?? `/api/share/${token}/discussions/${discussionId}`;
  const [messages, setMessages] = useState<DiscussionMessage[]>([]);
  const [receipts, setReceipts] = useState<ReadReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [authorName, setAuthorName] = useState<string | null>(null);
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editingMsgContent, setEditingMsgContent] = useState("");
  const [replyingToMsg, setReplyingToMsg] = useState<{ id: string; content: string; author: string } | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [openEmojiPickerId, setOpenEmojiPickerId] = useState<string | null>(null);
  const [showMobileActionsId, setShowMobileActionsId] = useState<string | null>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [showResources, setShowResources] = useState(false);
  const [resourceTab, setResourceTab] = useState<"all" | "images" | "docs" | "sheets">("all");
  const [chatSearch, setChatSearch] = useState("");
  const [chatSearchOpen, setChatSearchOpen] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [annotatingImage, setAnnotatingImage] = useState<string | null>(null);
  const [sendingAnnotation, setSendingAnnotation] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputTextareaRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const pusherRef = useRef<Pusher | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const dragCounterRef = useRef(0);

  const { startUpload: startShareUpload } = useUploadThing("discussionClientAttachmentUploader", {
    headers: { "x-share-token": token },
  });
  const { startUpload: startAuthUpload } = useUploadThing("discussionAttachmentUploader");
  const startUpload = apiBasePath ? startAuthUpload : startShareUpload;

  useEffect(() => {
    if (initialAuthorName) { setAuthorName(initialAuthorName); return; }
    const saved = localStorage.getItem(`veedeck-author-${token}`);
    if (saved) setAuthorName(saved);
  }, [token, initialAuthorName]);

  useEffect(() => {
    fetch(`${msgApiBase}/messages`)
      .then((r) => r.json())
      .then((data) => {
        const msgs: DiscussionMessage[] = Array.isArray(data) ? data : (data.messages ?? []);
        const recs: ReadReceipt[] = data.receipts ?? [];
        setMessages(msgs);
        setReceipts(dedupeReceipts(recs));
        setLoading(false);
        localStorage.setItem(`share-discussion-unread-${token}`, "0");
        window.dispatchEvent(new CustomEvent("share-discussion-read", { detail: { token } }));
        const savedName = initialAuthorName ?? localStorage.getItem(`veedeck-author-${token}`);
        if (msgs.length > 0 && savedName) {
          fetch(`${msgApiBase}/read`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lastMessageId: msgs[msgs.length - 1].id, authorName: savedName }),
          }).catch(() => {});
        }
      })
      .catch(() => setLoading(false));
  }, [token, discussionId, msgApiBase, initialAuthorName]);

  useEffect(() => {
    if (!showResources) {
      bottomRef.current?.scrollIntoView({ behavior: "instant" });
    }
  }, [messages, showResources]);

  useEffect(() => {
    if (!pusherRef.current) {
      pusherRef.current = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      });
    }
    const channel = pusherRef.current.subscribe(`discussion-${discussionId}`);
    channel.bind("new-message", (msg: DiscussionMessage) => {
      const savedName = initialAuthorName ?? localStorage.getItem(`veedeck-author-${token}`);
      // Play sound if not own message
      if (currentUserId ? msg.userId !== currentUserId : (msg.userId !== null || msg.authorName !== savedName)) {
        playMessageSound();
      }
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        const next = [...prev, msg];
        if (savedName) {
          fetch(`${msgApiBase}/read`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lastMessageId: msg.id, authorName: savedName }),
          }).catch(() => {});
        }
        return next;
      });
    });

    channel.bind("read-receipt", (receipt: ReadReceipt) => {
      setReceipts((prev) => {
        const filtered = prev.filter(
          (r) => r.readerId !== receipt.readerId && r.readerName.toLowerCase() !== receipt.readerName.toLowerCase()
        );
        return [...filtered, receipt];
      });
    });

    channel.bind("message-edited", ({ id, content, editedAt }: { id: string; content: string; editedAt: string }) => {
      setMessages((prev) => prev.map((m) => m.id === id ? { ...m, content, editedAt } : m));
    });

    channel.bind("message-deleted", ({ id }: { id: string }) => {
      setMessages((prev) => prev.filter((m) => m.id !== id));
    });

    channel.bind("reaction-updated", ({ messageId, reactions }: { messageId: string; reactions: MessageReaction[] }) => {
      setMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, reactions } : m));
    });

    return () => {
      pusherRef.current?.unsubscribe(`discussion-${discussionId}`);
    };
  }, [discussionId, token, msgApiBase, initialAuthorName, currentUserId]);

  const uploadFiles = useCallback(async (files: File[]) => {
    if (files.length === 0) return;
    setUploading(true);
    try {
      const processedFiles = await convertHeicFiles(files);
      const results = await startUpload(processedFiles);
      if (!results) throw new Error();
      const newAttachments: PendingAttachment[] = results.map((r, i) => {
        const file = processedFiles[i];
        const type: AttachmentType = file.type.startsWith("image/")
          ? "image"
          : file.type === "application/pdf"
          ? "pdf"
          : "document";
        return { url: r.url, name: file.name, type };
      });
      setPendingAttachments((prev) => [...prev, ...newAttachments]);
    } catch {
      toast.error(t.dyskusje.uploadFileError);
    } finally {
      setUploading(false);
    }
  }, [startUpload]);

  const handleFilesSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    await uploadFiles(files);
  }, [uploadFiles]);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current += 1;
    if (dragCounterRef.current === 1) setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current === 0) setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current = 0;
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) await uploadFiles(files);
  }, [uploadFiles]);

  useEffect(() => {
    if (!openEmojiPickerId) return;
    function handle(e: MouseEvent) {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) setOpenEmojiPickerId(null);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [openEmojiPickerId]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/ogg";
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
        setRecordingSeconds(0);
        const ext = mimeType.includes("ogg") ? "ogg" : "webm";
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        const audioFile = new File([audioBlob], `voice-${Date.now()}.${ext}`, { type: mimeType });
        setIsRecording(false);
        setUploading(true);
        try {
          const result = await startUpload([audioFile]);
          if (!result?.[0]) throw new Error();
          setPendingAttachments((prev) => [...prev, { url: result[0].url, name: audioFile.name, type: "audio" }]);
        } catch {
          toast.error(t.dyskusje.uploadRecordingError);
        } finally {
          setUploading(false);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => setRecordingSeconds((s) => s + 1), 1000);
    } catch {
      toast.error(t.render.micAccessDenied);
    }
  }, [startUpload]);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
  }, []);

  const handleEditMsg = useCallback(async (msgId: string, content: string) => {
    const body: Record<string, string> = { content };
    if (!apiBasePath) body.authorName = authorName ?? "";
    const res = await fetch(`${msgApiBase}/messages/${msgId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, content, editedAt: new Date().toISOString() } : m));
      setEditingMsgId(null);
    } else {
      toast.error(t.dyskusje.editMessageError);
    }
  }, [msgApiBase, apiBasePath, authorName]);

  const handleDeleteMsg = useCallback(async (msgId: string) => {
    if (!confirm(t.dyskusje.deleteConfirm)) return;
    const body: Record<string, string> = {};
    if (!apiBasePath) body.authorName = authorName ?? "";
    const res = await fetch(`${msgApiBase}/messages/${msgId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      setMessages((prev) => prev.filter((m) => m.id !== msgId));
    } else {
      toast.error(t.dyskusje.deleteError);
    }
  }, [msgApiBase, apiBasePath, authorName]);

  const handleToggleReaction = useCallback(async (msgId: string, emoji: string) => {
    if (!currentUserId) return;
    setMessages((prev) => prev.map((m) => {
      if (m.id !== msgId) return m;
      const existing = m.reactions?.find((r) => r.userId === currentUserId && r.emoji === emoji);
      const reactions = existing
        ? (m.reactions || []).filter((r) => !(r.userId === currentUserId && r.emoji === emoji))
        : [...(m.reactions || []), { userId: currentUserId, userName: initialAuthorName || authorName || t.dyskusje.guestName, emoji }];
      return { ...m, reactions };
    }));
    const res = await fetch(`${msgApiBase}/messages/${msgId}/reactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emoji }),
    });
    if (res.ok) {
      const data = await res.json();
      setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, reactions: data.reactions } : m));
    }
  }, [msgApiBase, currentUserId, initialAuthorName, authorName]);

  const sendMessage = useCallback(async () => {
    if ((!input.trim() && pendingAttachments.length === 0) || sending || !authorName) return;
    setSending(true);
    const attachmentsToSend = [...pendingAttachments];
    const textToSend = input.trim();
    const reply = replyingToMsg;
    try {
      const clientEmail = apiBasePath ? undefined : (localStorage.getItem(`veedeck-author-email-${token}`) ?? undefined);
      const firstAtt = attachmentsToSend[0] ?? null;
      const res = await fetch(`${msgApiBase}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: textToSend,
          authorName,
          clientEmail,
          attachmentUrl: firstAtt?.url ?? null,
          attachmentName: firstAtt?.name ?? null,
          attachmentType: firstAtt?.type ?? null,
          replyToId: reply?.id ?? null,
          replyToContent: reply?.content ?? null,
          replyToAuthor: reply?.author ?? null,
        }),
      });
      if (!res.ok) throw new Error();

      for (let i = 1; i < attachmentsToSend.length; i++) {
        const att = attachmentsToSend[i];
        await fetch(`${msgApiBase}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: "",
            authorName,
            clientEmail,
            attachmentUrl: att.url,
            attachmentName: att.name,
            attachmentType: att.type,
          }),
        });
      }

      setInput("");
      if (inputTextareaRef.current) { inputTextareaRef.current.style.height = "40px"; }
      setPendingAttachments([]);
      setReplyingToMsg(null);
    } catch {
      toast.error(t.dyskusje.sendError);
    } finally {
      setSending(false);
    }
  }, [token, discussionId, input, pendingAttachments, sending, authorName, msgApiBase, apiBasePath, replyingToMsg]);

  const handleAnnotationSend = useCallback(async (blob: Blob) => {
    if (!authorName) return;
    setSendingAnnotation(true);
    try {
      const file = new File([blob], `annotated-${Date.now()}.png`, { type: "image/png" });
      const result = await startUpload([file]);
      if (!result?.[0]) throw new Error();
      const clientEmail = apiBasePath ? undefined : (localStorage.getItem(`veedeck-author-email-${token}`) ?? undefined);
      const res = await fetch(`${msgApiBase}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: "",
          authorName,
          clientEmail,
          attachmentUrl: result[0].url,
          attachmentName: file.name,
          attachmentType: "image",
        }),
      });
      if (!res.ok) throw new Error();
      setAnnotatingImage(null);
    } catch {
      toast.error(t.dyskusje.sendImageError);
    } finally {
      setSendingAnnotation(false);
    }
  }, [token, discussionId, authorName, startUpload, msgApiBase, apiBasePath]);


  const messageGroups = useMemo(() => {
    const groups: { label: string; msgs: DiscussionMessage[] }[] = [];
    messages.forEach(msg => {
      const label = dayLabel(msg.createdAt);
      const last = groups[groups.length - 1];
      if (!last || last.label !== label) groups.push({ label, msgs: [msg] });
      else last.msgs.push(msg);
    });
    return groups;
  }, [messages]);

  return (
    <>
      {annotatingImage && (
        <ImageAnnotationModal
          imageUrl={annotatingImage}
          onClose={() => setAnnotatingImage(null)}
          onSend={handleAnnotationSend}
          sending={sendingAnnotation}
        />
      )}
      <div className="flex flex-1 overflow-hidden">
        {/* Thread list sidebar */}
        <div className="hidden md:flex w-72 flex-shrink-0 flex-col border-r border-border bg-muted/30">
          <div className="px-4 pt-4 pb-3 border-b border-border">
            <h2 className="font-semibold text-base">{t.nav.discussions}</h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            <div className="w-full text-left px-4 py-3 border-b border-border/50 bg-primary/10 border-l-2 border-l-primary">
              <span className="text-sm font-medium truncate block text-primary">{discussionTitle}</span>
              <span className="text-xs text-muted-foreground">{t.dyskusje.projectDiscussion}</span>
            </div>
          </div>
        </div>

        {/* Chat panel */}
        <div
          className="flex-1 flex flex-col min-w-0 bg-background relative"
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
        >
          {isDragOver && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-primary/10 backdrop-blur-[1px] pointer-events-none transition-opacity duration-150">
              <div className="flex flex-col items-center gap-3 px-10 py-8 rounded-2xl border-2 border-dashed border-primary bg-background/80 shadow-lg">
                <div className="w-14 h-14 rounded-full bg-primary/15 flex items-center justify-center">
                  <Paperclip size={28} className="text-primary" />
                </div>
                <p className="text-base font-semibold text-primary">{t.dyskusje.dropFilesDesc}</p>
                <p className="text-xs text-muted-foreground">{t.dyskusje.fileTypesDesc}</p>
              </div>
            </div>
          )}
          {/* Header */}
          <div className="px-5 py-3 border-b border-border flex-shrink-0 flex items-center gap-2">
            <div className="md:hidden flex-1 min-w-0">
              <h2 className="font-semibold text-sm">{discussionTitle}</h2>
              <p className="text-xs text-muted-foreground">{t.dyskusje.projectDiscussion}</p>
            </div>
            <div className="flex items-center gap-1 ml-auto">
              <button
                onClick={() => { setChatSearchOpen((v) => !v); setChatSearch(""); }}
                title={t.dyskusje.searchTitle}
                className={`p-1.5 rounded-lg transition-colors ${chatSearchOpen ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
              >
                <Search size={14} />
              </button>
              {(() => {
                const fileCount = messages.filter((m) => m.attachmentType === "document" || m.attachmentType === "pdf" || m.attachmentType === "image").length;
                return (
                  <button
                    onClick={() => { setShowResources((v) => !v); setResourceTab("all"); }}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors ${showResources ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
                  >
                    <FolderOpen size={13} />
                    {t.dyskusje.filesLabel}{fileCount > 0 && <span className="font-semibold">{fileCount}</span>}
                  </button>
                );
              })()}
            </div>
          </div>

          {/* Chat search bar */}
          {chatSearchOpen && !showResources && (
            <div className="px-4 py-2 border-b border-border bg-muted/30">
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <input
                  autoFocus
                  type="text"
                  value={chatSearch}
                  onChange={(e) => setChatSearch(e.target.value)}
                  placeholder={t.dyskusje.searchPlaceholder}
                  className="w-full pl-7 pr-7 py-1.5 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                {chatSearch && (
                  <button onClick={() => setChatSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Messages, Search results or Files */}
          {chatSearchOpen && chatSearch.trim() ? (
            <ClientChatSearchResults
              messages={messages}
              query={chatSearch}
              onImageClick={setAnnotatingImage}
            />
          ) : showResources ? (
            <div className="flex-1 overflow-y-auto flex flex-col">
              {/* Tabs */}
              <div className="flex gap-0 border-b border-border px-5 flex-shrink-0">
                {([
                  { key: "all", label: t.dyskusje.allTab },
                  { key: "images", label: t.dyskusje.photosTab },
                  { key: "docs", label: t.dyskusje.docsTab },
                  { key: "sheets", label: t.dyskusje.sheetsTab },
                ] as const).map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setResourceTab(tab.key)}
                    className={`px-3 py-2.5 text-xs font-medium border-b-2 -mb-px transition-colors ${
                      resourceTab === tab.key
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <div className="flex-1 overflow-y-auto px-5 py-4">
                {(() => {
                  const isSheet = (name: string) => /\.(xlsx?|csv)$/i.test(name);
                  const filtered = messages.filter((m) => {
                    if (!m.attachmentUrl) return false;
                    if (resourceTab === "images") return m.attachmentType === "image";
                    if (resourceTab === "docs") return m.attachmentType === "pdf" || (m.attachmentType === "document" && !isSheet(m.attachmentName || ""));
                    if (resourceTab === "sheets") return m.attachmentType === "document" && isSheet(m.attachmentName || "");
                    return m.attachmentType === "image" || m.attachmentType === "pdf" || m.attachmentType === "document";
                  });
                  if (filtered.length === 0) return (
                    <div className="flex flex-col items-center justify-center h-40 gap-2 text-muted-foreground">
                      <FolderOpen size={32} className="opacity-30" />
                      <p className="text-sm">{t.render.noFiles}</p>
                    </div>
                  );
                  return (
                    <div className={resourceTab === "images" ? "grid grid-cols-3 gap-2" : "space-y-2"}>
                      {filtered.map((m) =>
                        m.attachmentType === "image" ? (
                          <button
                            key={m.id}
                            onClick={() => setAnnotatingImage(m.attachmentUrl!)}
                            className="relative aspect-square rounded-xl overflow-hidden border border-border hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-primary/40"
                            title={m.attachmentName || ""}
                          >
                            <img src={m.attachmentUrl!} alt={m.attachmentName || ""} className="w-full h-full object-cover" />
                          </button>
                        ) : (
                          <a
                            key={m.id}
                            href={m.attachmentUrl!}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-border bg-background hover:bg-muted transition-colors group"
                          >
                            <DocumentIcon name={m.attachmentName || ""} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{m.attachmentName}</p>
                              <p className="text-xs text-muted-foreground">{m.authorName} · {formatTime(m.createdAt)}</p>
                            </div>
                            <ExternalLink size={14} className="text-muted-foreground opacity-0 group-hover:opacity-100 flex-shrink-0" />
                          </a>
                        )
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 relative">
              {loading ? (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">{t.common.loading}</div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
                  <ChatBubble size={32} className="opacity-30" />
                  <p className="text-sm">{t.dyskusje.noMessages}</p>
                  <p className="text-xs text-center">{t.dyskusje.startTypingDesc}</p>
                </div>
              ) : (
                messageGroups.map(group => (
                  <div key={group.label}>
                    <div className="flex items-center gap-2 my-3">
                      <div className="flex-1 h-px bg-border" />
                      <span className="text-[10px] text-muted-foreground flex-shrink-0 select-none">{group.label}</span>
                      <div className="flex-1 h-px bg-border" />
                    </div>
                    {group.msgs.map((msg) => {
                  const isOwn = currentUserId
                    ? (msg.userId === currentUserId || (!msg.userId && msg.authorName === authorName))
                    : msg.authorName === authorName;
                  const canEdit = isOwn && msg.content;
                  const canDelete = isOwn;

                  const actionBar = editingMsgId !== msg.id && (
                    <div className={`absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 ${isOwn ? "right-full pr-1 flex-row-reverse" : "left-full pl-1"}`}>
                      <button
                        onClick={() => setReplyingToMsg({ id: msg.id, content: msg.content || t.dyskusje.attachmentLabel, author: msg.authorName })}
                        title={t.share.reply}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      >
                        <CornerDownLeft size={14} />
                      </button>
                      {currentUserId && (
                        <div className="relative hidden md:block">
                          <button
                            onClick={() => setOpenEmojiPickerId(openEmojiPickerId === msg.id ? null : msg.id)}
                            title={t.dyskusje.reactBtn}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                          >
                            <AddReaction size={14} />
                          </button>
                          {openEmojiPickerId === msg.id && (
                            <div ref={emojiPickerRef} className={`absolute bottom-full mb-1 ${isOwn ? "right-0" : "left-0"} bg-popover border border-border rounded-2xl shadow-lg z-50 p-1.5 flex gap-0.5`}>
                              {REACTION_EMOJIS.map((emoji) => {
                                const hasReacted = msg.reactions?.some((r) => r.userId === currentUserId && r.emoji === emoji);
                                return (
                                  <button
                                    key={emoji}
                                    onClick={() => { handleToggleReaction(msg.id, emoji); setOpenEmojiPickerId(null); }}
                                    className={`w-8 h-8 flex items-center justify-center rounded-xl text-base transition-all hover:scale-125 ${hasReacted ? "bg-primary/15 ring-2 ring-primary/30" : "hover:bg-muted"}`}
                                  >
                                    {emoji}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                      {(canEdit || canDelete) && (
                        <div className="relative">
                          <button
                            onClick={() => setOpenMenuId(openMenuId === msg.id ? null : msg.id)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                          >
                            <MoreVertical size={14} />
                          </button>
                          {openMenuId === msg.id && (
                            <div className={`absolute bottom-full mb-1 ${isOwn ? "right-0" : "left-0"} bg-popover border border-border rounded-xl shadow-lg z-50 py-1 min-w-[120px]`}>
                              {canEdit && (
                                <button
                                  onClick={() => { setEditingMsgContent(msg.content); setEditingMsgId(msg.id); setOpenMenuId(null); }}
                                  className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2 transition-colors"
                                >
                                  <Edit2 size={13} className="text-muted-foreground" /> {t.common.edit}
                                </button>
                              )}
                              {canDelete && (
                                <button
                                  onClick={() => { handleDeleteMsg(msg.id); setOpenMenuId(null); }}
                                  className="w-full text-left px-3 py-2 text-sm text-destructive hover:bg-destructive/10 flex items-center gap-2 transition-colors"
                                >
                                  <Trash2 size={13} /> {t.common.delete}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );

                  return (
                    <div key={msg.id} className={`flex items-end gap-2 ${isOwn ? "justify-end" : "justify-start"} group ${msg.reactions && msg.reactions.length > 0 ? "mb-6" : "mb-1.5"}`} onClick={() => { if (openMenuId) setOpenMenuId(null); }}>
                      {!isOwn && <Avatar name={msg.authorName} />}
                      <div className="max-w-[75%]">
                      <SwipeableMessage
                        isOwn={isOwn}
                        onReply={() => setReplyingToMsg({ id: msg.id, content: msg.content || t.dyskusje.attachmentLabel, author: msg.authorName })}
                        onLongPress={() => setShowMobileActionsId(msg.id)}
                      >
                      <div className={`flex flex-col gap-0.5 ${isOwn ? "items-end" : "items-start"}`}>
                        {msg.replyToContent && (
                          <div className="max-w-full px-2.5 py-1.5 rounded-xl text-[11px] border-l-2 border-primary/40 bg-muted/60 mb-0.5">
                            <span className="font-semibold text-foreground/70">{msg.replyToAuthor}: </span>
                            <span className="text-muted-foreground">{msg.replyToContent.length > 100 ? msg.replyToContent.slice(0, 100) + "…" : msg.replyToContent}</span>
                          </div>
                        )}
                        {editingMsgId === msg.id ? (
                          <div className="flex flex-col gap-1 min-w-[220px]">
                            <textarea
                              autoFocus
                              value={editingMsgContent}
                              onChange={(e) => setEditingMsgContent(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleEditMsg(msg.id, editingMsgContent); }
                                if (e.key === "Escape") setEditingMsgId(null);
                              }}
                              className="w-full px-3 py-2 text-sm rounded-2xl border border-primary bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                              rows={2}
                            />
                            <div className="flex gap-1 justify-end">
                              <button onClick={() => setEditingMsgId(null)} className="px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors">{t.common.cancel}</button>
                              <button onClick={() => handleEditMsg(msg.id, editingMsgContent)} className="px-2 py-1 text-xs bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity">{t.common.save}</button>
                            </div>
                          </div>
                        ) : (
                          (() => {
                            const reactions = msg.reactions || [];
                            const grouped = reactions.reduce((acc: Record<string, MessageReaction[]>, r) => {
                              if (!acc[r.emoji]) acc[r.emoji] = [];
                              acc[r.emoji].push(r);
                              return acc;
                            }, {});
                            return (
                          <div className={`relative w-fit ${reactions.length > 0 ? "pb-3" : ""}`}>
                            <div className={`flex flex-col gap-0.5 ${isOwn ? "items-end" : "items-start"}`}>
                              {msg.content && (
                                <div className={`rounded-2xl px-3 py-2 text-sm ${isOwn ? "bg-primary text-primary-foreground" : "bg-background border border-border"}`}>
                                  {renderWithLinks(msg.content, isOwn)}
                                  {msg.editedAt && <span className="text-[10px] opacity-50 ml-1.5">{t.dyskusje.editedLabel}</span>}
                                  {!msg.attachmentType && (
                                    <div className={`flex justify-end items-center gap-1 mt-1 -mb-0.5 ${isOwn ? "text-primary-foreground/50" : "text-muted-foreground/60"}`}>
                                      {isOwn && receipts.filter((r) => r.lastMessageId === msg.id && r.readerName !== authorName).map((r) => (
                                        <span key={r.readerId} title={t.dyskusje.readBy.replace("{name}", r.readerName)} className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold leading-none flex-shrink-0 ${isOwn ? "bg-white/60 text-primary" : "bg-primary/30 text-primary"}`}>
                                          {r.readerName.charAt(0).toUpperCase()}
                                        </span>
                                      ))}
                                      <span className="text-[10px] whitespace-nowrap leading-none">{formatTimeOnly(msg.createdAt)}</span>
                                    </div>
                                  )}
                                </div>
                              )}
                              {msg.attachmentType === "image" && msg.attachmentUrl && (
                                <div>
                                  <button
                                    onClick={() => setAnnotatingImage(msg.attachmentUrl!)}
                                    className="block rounded-2xl overflow-hidden border border-border hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-primary/40"
                                    title={t.dyskusje.clickToAnnotate}
                                  >
                                    <img
                                      src={msg.attachmentUrl}
                                      alt={msg.attachmentName || ""}
                                      className="max-w-[260px] max-h-[200px] object-cover"
                                      onError={(e) => {
                                        const btn = e.currentTarget.closest("button") as HTMLElement | null;
                                        if (btn) btn.style.display = "none";
                                        const fallback = btn?.nextElementSibling as HTMLElement | null;
                                        if (fallback) fallback.removeAttribute("hidden");
                                      }}
                                    />
                                  </button>
                                  <a
                                    href={msg.attachmentUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    hidden
                                    className="flex items-center gap-2 px-3 py-2 rounded-2xl border border-border text-sm text-muted-foreground hover:text-foreground"
                                  >
                                    <FileIcon size={16} className="flex-shrink-0" />
                                    <span className="truncate max-w-[220px]">{msg.attachmentName || t.dyskusje.imageLabel}</span>
                                    <ExternalLink size={12} className="flex-shrink-0" />
                                  </a>
                                </div>
                              )}
                              {msg.attachmentType === "pdf" && msg.attachmentUrl && (
                                <div className="max-w-[280px] w-[280px] rounded-xl overflow-hidden border border-border">
                                  <a
                                    href={msg.attachmentUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 px-3 py-2 bg-muted/60 hover:bg-muted transition-colors border-b border-border"
                                  >
                                    <FileText size={15} className="text-red-500 flex-shrink-0" />
                                    <span className="text-xs font-medium truncate flex-1">{msg.attachmentName || t.dyskusje.pdfLabel}</span>
                                    <ExternalLink size={11} className="text-muted-foreground flex-shrink-0" />
                                  </a>
                                  <iframe
                                    src={msg.attachmentUrl}
                                    className="w-full block"
                                    style={{ height: "200px", border: "none" }}
                                    title={msg.attachmentName || "PDF"}
                                  />
                                </div>
                              )}
                              {msg.attachmentType === "document" && msg.attachmentUrl && (
                                <a
                                  href={msg.attachmentUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={`flex items-center gap-2 px-3 py-2 rounded-2xl border text-sm ${isOwn ? "bg-primary/10 border-primary/20 text-foreground" : "bg-background border-border"} hover:opacity-80 transition-opacity`}
                                >
                                  <DocumentIcon name={msg.attachmentName || ""} />
                                  <span className="truncate max-w-[180px]">{msg.attachmentName}</span>
                                  <ExternalLink size={12} className="flex-shrink-0 text-muted-foreground" />
                                </a>
                              )}
                              {msg.attachmentType === "audio" && msg.attachmentUrl && (
                                <audio src={msg.attachmentUrl} controls className="max-w-[260px] rounded-xl" />
                              )}
                              {msg.attachmentType && (
                                <div className={`flex justify-end items-center gap-1 mt-0.5 ${isOwn ? "text-foreground/50" : "text-muted-foreground/60"}`}>
                                  {isOwn && receipts.filter((r) => r.lastMessageId === msg.id && r.readerName !== authorName).map((r) => (
                                    <span key={r.readerId} title={t.dyskusje.readBy.replace("{name}", r.readerName)} className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold leading-none flex-shrink-0 ${isOwn ? "bg-white/60 text-primary" : "bg-primary/30 text-primary"}`}>
                                      {r.readerName.charAt(0).toUpperCase()}
                                    </span>
                                  ))}
                                  <span className="text-[10px] whitespace-nowrap leading-none">{formatTimeOnly(msg.createdAt)}</span>
                                </div>
                              )}
                            </div>
                            {reactions.length > 0 && (
                              <div className="absolute bottom-0 right-0 translate-y-1/2 flex gap-0.5 z-10">
                                {Object.entries(grouped).map(([emoji, rs]) => (
                                  <button
                                    key={emoji}
                                    onClick={() => handleToggleReaction(msg.id, emoji)}
                                    title={rs.map((r) => r.userName).join(", ")}
                                    className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs border shadow-sm transition-colors ${rs.some((r) => r.userId === currentUserId) ? "bg-primary/15 border-primary/30 text-primary" : "bg-card border-border text-foreground hover:bg-muted"}`}
                                  >
                                    {emoji}{rs.length > 1 && <span className="font-medium ml-0.5">{rs.length}</span>}
                                  </button>
                                ))}
                              </div>
                            )}
                            {actionBar}
                          </div>
                            );
                          })()
                        )}
                      </div>
                      </SwipeableMessage>
                      </div>
                      {isOwn && <Avatar name={msg.authorName} logoUrl={currentUserAvatarUrl} />}
                      {showMobileActionsId === msg.id && (
                        <div className="fixed inset-0 z-50 flex flex-col justify-end md:hidden" onClick={() => setShowMobileActionsId(null)}>
                          <div className="bg-background border-t border-border rounded-t-2xl p-4 flex flex-col gap-3" onClick={(e) => e.stopPropagation()}>
                            {currentUserId && (
                              <div className="flex gap-2 justify-center">
                                {REACTION_EMOJIS.map((emoji) => {
                                  const hasReacted = msg.reactions?.some((r) => r.userId === currentUserId && r.emoji === emoji);
                                  return (
                                    <button
                                      key={emoji}
                                      onClick={() => { handleToggleReaction(msg.id, emoji); setShowMobileActionsId(null); }}
                                      className={`w-10 h-10 flex items-center justify-center rounded-xl text-xl transition-all ${hasReacted ? "bg-primary/15 ring-2 ring-primary/30" : "hover:bg-muted"}`}
                                    >
                                      {emoji}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                            {(canEdit || canDelete) && (
                              <div className="flex flex-col gap-1">
                                {canEdit && (
                                  <button
                                    onClick={() => { setEditingMsgContent(msg.content); setEditingMsgId(msg.id); setShowMobileActionsId(null); }}
                                    className="w-full text-left px-4 py-3 text-sm hover:bg-muted flex items-center gap-3 rounded-xl transition-colors"
                                  >
                                    <Edit2 size={16} className="text-muted-foreground" /> {t.common.edit}
                                  </button>
                                )}
                                {canDelete && (
                                  <button
                                    onClick={() => { handleDeleteMsg(msg.id); setShowMobileActionsId(null); }}
                                    className="w-full text-left px-4 py-3 text-sm text-destructive hover:bg-destructive/10 flex items-center gap-3 rounded-xl transition-colors"
                                  >
                                    <Trash2 size={16} /> {t.common.delete}
                                  </button>
                                )}
                              </div>
                            )}
                            <button onClick={() => setShowMobileActionsId(null)} className="w-full py-2 text-sm text-muted-foreground text-center">{t.common.cancel}</button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                    })}
                  </div>
                ))
              )}
              <div ref={bottomRef} />
            </div>
          )}

          {/* Input */}
          <div className="px-4 py-3 border-t border-border flex flex-col gap-2 flex-shrink-0">
            {replyingToMsg && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/60 rounded-lg border-l-2 border-primary/50">
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
            {pendingAttachments.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {pendingAttachments.map((att, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted border border-border text-sm max-w-[200px]">
                    {att.type === "image" ? (
                      <img src={att.url} alt={att.name} className="h-8 w-8 rounded object-cover flex-shrink-0" />
                    ) : att.type === "audio" ? (
                      <audio src={att.url} controls className="h-7 w-32 min-w-0" />
                    ) : (
                      <DocumentIcon name={att.name} />
                    )}
                    {att.type !== "audio" && (
                      <span className="flex-1 truncate text-xs min-w-0">{att.name}</span>
                    )}
                    <button
                      onClick={() => setPendingAttachments((prev) => prev.filter((_, j) => j !== i))}
                      className="text-muted-foreground hover:text-foreground flex-shrink-0 ml-1"
                    >
                      <X size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {isRecording && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-destructive/10 border border-destructive/20 text-sm text-destructive">
                <span className="w-2 h-2 rounded-full bg-destructive animate-pulse flex-shrink-0" />
                <span className="flex-1 text-xs font-medium">{t.dyskusje.recordingTime.replace("{n}", String(recordingSeconds))}</span>
              </div>
            )}
            <div className="flex items-end gap-2">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.heic,.heif,application/pdf,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="hidden"
                onChange={handleFilesSelect}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading || isRecording}
                className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-primary text-white transition-colors disabled:opacity-40 hover:opacity-90"
                title={t.dyskusje.attachFiles}
              >
                {uploading ? <Loader2 size={16} className="animate-spin" /> : <Paperclip size={16} />}
              </button>
              <textarea
                ref={inputTextareaRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px";
                  e.target.style.overflowY = e.target.scrollHeight > 160 ? "auto" : "hidden";
                }}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder={t.dyskusje.messagePlaceholder}
                rows={1}
                style={{ height: "40px", overflowY: "hidden" }}
                className="flex-1 min-h-10 max-h-40 px-3 py-2 text-sm resize-none rounded-2xl bg-muted focus:outline-none"
              />
              <button
                onClick={isRecording ? stopRecording : (input.trim() || pendingAttachments.length > 0 ? sendMessage : startRecording)}
                disabled={sending || uploading}
                className="flex-shrink-0 flex items-center justify-center w-8 h-8 text-primary disabled:opacity-40 hover:opacity-90 transition-colors"
              >
                {sending ? (
                  <Loader2 className="w-7 h-7 animate-spin" />
                ) : isRecording ? (
                  <Square className="w-7 h-7 text-destructive" />
                ) : input.trim() || pendingAttachments.length > 0 ? (
                  <Send className="w-7 h-7" />
                ) : (
                  <Mic className="w-7 h-7" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
