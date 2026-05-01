"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { MessageSquare, ExternalLink, Paperclip, FileText, FileSpreadsheet, File as FileIcon, Loader2, FolderOpen, X, Mic, Square, Search } from "lucide-react";
import { toast } from "sonner";
import Pusher from "pusher-js";
import { useUploadThing } from "@/lib/uploadthing-client";
import ImageAnnotationModal from "./ImageAnnotationModal";
import { playMessageSound } from "@/lib/notification-sound";

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
  createdAt: string;
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
        {total === 0 ? "Brak wyników" : `${total} ${total === 1 ? "wynik" : total < 5 ? "wyniki" : "wyników"}`}
      </p>
      {total === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 gap-2 text-muted-foreground">
          <Search size={32} className="opacity-30" />
          <p className="text-sm">Brak wiadomości ani plików pasujących do wyszukiwania</p>
        </div>
      ) : (
        <div className="space-y-4">
          {textMatches.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Wiadomości ({textMatches.length})</p>
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
              <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Pliki ({fileMatches.length})</p>
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

function DocumentIcon({ name }: { name: string }) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf") return <FileText size={20} className="text-red-500 flex-shrink-0" />;
  if (["xls", "xlsx"].includes(ext)) return <FileSpreadsheet size={20} className="text-green-600 flex-shrink-0" />;
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

export default function ClientDiscussionView({ token, discussionId, discussionTitle, apiBasePath, initialAuthorName, currentUserId }: Props) {
  const msgApiBase = apiBasePath ?? `/api/share/${token}/discussions/${discussionId}`;
  const [messages, setMessages] = useState<DiscussionMessage[]>([]);
  const [receipts, setReceipts] = useState<ReadReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [authorName, setAuthorName] = useState<string | null>(null);
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [showResources, setShowResources] = useState(false);
  const [chatSearch, setChatSearch] = useState("");
  const [chatSearchOpen, setChatSearchOpen] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [annotatingImage, setAnnotatingImage] = useState<string | null>(null);
  const [sendingAnnotation, setSendingAnnotation] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
        setReceipts(recs);
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
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
        const idx = prev.findIndex((r) => r.readerId === receipt.readerId);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = receipt;
          return next;
        }
        return [...prev, receipt];
      });
    });

    return () => {
      pusherRef.current?.unsubscribe(`discussion-${discussionId}`);
    };
  }, [discussionId, token, msgApiBase, initialAuthorName, currentUserId]);

  const uploadFiles = useCallback(async (files: File[]) => {
    if (files.length === 0) return;
    setUploading(true);
    try {
      const results = await startUpload(files);
      if (!results) throw new Error();
      const newAttachments: PendingAttachment[] = results.map((r, i) => {
        const file = files[i];
        const type: AttachmentType = file.type.startsWith("image/")
          ? "image"
          : file.type === "application/pdf"
          ? "pdf"
          : "document";
        return { url: r.url, name: file.name, type };
      });
      setPendingAttachments((prev) => [...prev, ...newAttachments]);
    } catch {
      toast.error("Nie udało się przesłać pliku");
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
          toast.error("Nie udało się przesłać nagrania");
        } finally {
          setUploading(false);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => setRecordingSeconds((s) => s + 1), 1000);
    } catch {
      toast.error("Brak dostępu do mikrofonu");
    }
  }, [startUpload]);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
  }, []);

  const sendMessage = useCallback(async () => {
    if ((!input.trim() && pendingAttachments.length === 0) || sending || !authorName) return;
    setSending(true);
    const attachmentsToSend = [...pendingAttachments];
    const textToSend = input.trim();
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
      setPendingAttachments([]);
    } catch {
      toast.error("Nie udało się wysłać wiadomości");
    } finally {
      setSending(false);
    }
  }, [token, discussionId, input, pendingAttachments, sending, authorName, msgApiBase, apiBasePath]);

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
      toast.error("Nie udało się wysłać zaznaczonego zdjęcia");
    } finally {
      setSendingAnnotation(false);
    }
  }, [token, discussionId, authorName, startUpload, msgApiBase, apiBasePath]);


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
            <h2 className="font-semibold text-base">Dyskusje</h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            <div className="w-full text-left px-4 py-3 border-b border-border/50 bg-primary/10 border-l-2 border-l-primary">
              <span className="text-sm font-medium truncate block text-primary">{discussionTitle}</span>
              <span className="text-xs text-muted-foreground">Dyskusja projektowa</span>
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
                <p className="text-base font-semibold text-primary">Upuść pliki, aby dodać do dyskusji</p>
                <p className="text-xs text-muted-foreground">Obrazy, PDF, dokumenty</p>
              </div>
            </div>
          )}
          {/* Header */}
          <div className="px-5 py-3 border-b border-border flex-shrink-0 flex items-center gap-2">
            <div className="md:hidden flex-1 min-w-0">
              <h2 className="font-semibold text-sm">{discussionTitle}</h2>
              <p className="text-xs text-muted-foreground">Dyskusja projektowa</p>
            </div>
            <div className="flex items-center gap-1 ml-auto">
              <button
                onClick={() => { setChatSearchOpen((v) => !v); setChatSearch(""); }}
                title="Szukaj w wiadomościach"
                className={`p-1.5 rounded-lg transition-colors ${chatSearchOpen ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
              >
                <Search size={14} />
              </button>
              {(() => {
                const docCount = messages.filter((m) => m.attachmentType === "document" || m.attachmentType === "pdf").length;
                return (
                  <button
                    onClick={() => setShowResources((v) => !v)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors ${showResources ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
                  >
                    <FolderOpen size={13} />
                    Pliki{docCount > 0 && <span className="font-semibold">{docCount}</span>}
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
                  placeholder="Szukaj wiadomości i plików..."
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
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <p className="text-xs text-muted-foreground mb-3 font-medium uppercase tracking-wide">Pliki w dyskusji</p>
              {messages.filter((m) => m.attachmentType === "document" || m.attachmentType === "pdf").length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 gap-2 text-muted-foreground">
                  <FolderOpen size={32} className="opacity-30" />
                  <p className="text-sm">Brak plików</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {messages.filter((m) => m.attachmentType === "document" || m.attachmentType === "pdf").map((m) => (
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
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 relative">
              {loading ? (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">Ładowanie...</div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
                  <MessageSquare size={32} className="opacity-30" />
                  <p className="text-sm">Brak wiadomości</p>
                  <p className="text-xs text-center">Zacznij pisać aby rozpocząć dyskusję z projektantem</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isOwn = msg.authorName === authorName && !msg.userId;
                  return (
                    <div key={msg.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[75%] flex flex-col gap-0.5 ${isOwn ? "items-end" : "items-start"}`}>
                        {!isOwn && (
                          <div className="flex items-center gap-2 px-1">
                            <span className="text-xs font-medium text-foreground">{msg.authorName}</span>
                            <span className="text-xs text-muted-foreground">{formatTime(msg.createdAt)}</span>
                          </div>
                        )}
                        {msg.content && (
                          <div className={`rounded-2xl px-3 py-2 text-sm ${isOwn ? "bg-primary text-primary-foreground" : "bg-background border border-border"}`}>
                            {msg.content}
                          </div>
                        )}
                        {msg.attachmentType === "image" && msg.attachmentUrl && (
                          <button
                            onClick={() => setAnnotatingImage(msg.attachmentUrl!)}
                            className="block rounded-2xl overflow-hidden border border-border hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-primary/40"
                            title="Kliknij aby zaznaczyć"
                          >
                            <img
                              src={msg.attachmentUrl}
                              alt={msg.attachmentName || ""}
                              className="max-w-[260px] max-h-[200px] object-cover"
                            />
                          </button>
                        )}
                        {msg.attachmentType === "pdf" && msg.attachmentUrl && (
                          <div className="flex flex-col gap-1 max-w-[280px]">
                            <iframe
                              src={msg.attachmentUrl}
                              className="w-full rounded-xl border border-border"
                              style={{ height: "200px", border: "none" }}
                              title={msg.attachmentName || "PDF"}
                            />
                            <a href={msg.attachmentUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-1 transition-colors">
                              <ExternalLink size={11} />
                              Otwórz pełny PDF
                            </a>
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
                        {(() => {
                          if (!isOwn) return null;
                          const msgReceipts = receipts.filter(
                            (r) => r.lastMessageId === msg.id && r.readerName !== authorName
                          );
                          return msgReceipts.length > 0 ? (
                            <div className="flex items-center gap-1 px-1 mt-0.5">
                              {msgReceipts.map((r) => (
                                <span
                                  key={r.readerId}
                                  title={`${r.readerName} przeczytał(a)`}
                                  className="w-4 h-4 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[9px] font-bold leading-none flex-shrink-0 cursor-default select-none"
                                >
                                  {r.readerName.charAt(0).toUpperCase()}
                                </span>
                              ))}
                            </div>
                          ) : null;
                        })()}
                        <span className="text-xs text-muted-foreground px-1">{formatTime(msg.createdAt)}</span>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>
          )}

          {/* Input */}
          <div className="px-4 py-3 border-t border-border flex flex-col gap-2 flex-shrink-0">
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
                <span className="flex-1 text-xs font-medium">Nagrywanie... {recordingSeconds}s</span>
              </div>
            )}
            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="hidden"
                onChange={handleFilesSelect}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading || isRecording}
                className="p-2 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-40 flex-shrink-0"
                title="Załącz pliki"
              >
                {uploading ? <Loader2 size={18} className="animate-spin" /> : <Paperclip size={18} />}
              </button>
              <button
                onClick={isRecording ? stopRecording : startRecording}
                disabled={uploading}
                className={`p-2 rounded-xl transition-colors disabled:opacity-40 flex-shrink-0 ${isRecording ? "text-destructive bg-destructive/10 hover:bg-destructive/20" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
                title={isRecording ? "Zatrzymaj nagrywanie" : "Nagraj wiadomość głosową"}
              >
                {isRecording ? <Square size={18} /> : <Mic size={18} />}
              </button>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder="Napisz wiadomość..."
                className="flex-1 px-4 py-2 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <button
                onClick={sendMessage}
                disabled={(!input.trim() && pendingAttachments.length === 0) || sending || uploading || isRecording}
                className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-xl hover:opacity-90 disabled:opacity-40 transition-opacity flex-shrink-0"
              >
                Wyślij
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
