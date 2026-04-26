"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { MessageSquare, ExternalLink, Paperclip, FileText, FileSpreadsheet, File as FileIcon, Loader2, FolderOpen, X, Mic, Square } from "lucide-react";
import { toast } from "sonner";
import Pusher from "pusher-js";
import { useUploadThing } from "@/lib/uploadthing-client";

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

export default function ClientDiscussionView({ token, discussionId, discussionTitle }: Props) {
  const [messages, setMessages] = useState<DiscussionMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [authorName, setAuthorName] = useState<string | null>(null);
  const [pendingAttachment, setPendingAttachment] = useState<{ url: string; name: string; type: "image" | "document" | "audio" } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [showResources, setShowResources] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const pusherRef = useRef<Pusher | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { startUpload } = useUploadThing("discussionClientAttachmentUploader", {
    headers: { "x-share-token": token },
  });

  useEffect(() => {
    const saved = localStorage.getItem(`veedeck-author-${token}`);
    if (saved) setAuthorName(saved);
  }, [token]);

  useEffect(() => {
    fetch(`/api/share/${token}/discussions/${discussionId}/messages`)
      .then((r) => r.json())
      .then((data) => {
        setMessages(Array.isArray(data) ? data : []);
        setLoading(false);
        // Notify ShareSidebar that messages have been read
        localStorage.setItem(`share-discussion-unread-${token}`, "0");
        window.dispatchEvent(new CustomEvent("share-discussion-read", { detail: { token } }));
      })
      .catch(() => setLoading(false));
  }, [token, discussionId]);

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
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    });
    return () => {
      pusherRef.current?.unsubscribe(`discussion-${discussionId}`);
    };
  }, [discussionId]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setUploading(true);
    try {
      const result = await startUpload([file]);
      if (!result?.[0]) throw new Error();
      const attachmentType = file.type.startsWith("image/") ? "image" : "document";
      setPendingAttachment({ url: result[0].url, name: file.name, type: attachmentType });
    } catch {
      toast.error("Nie udało się przesłać pliku");
    } finally {
      setUploading(false);
    }
  }, [startUpload]);

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
          setPendingAttachment({ url: result[0].url, name: audioFile.name, type: "audio" });
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
    if ((!input.trim() && !pendingAttachment) || sending || !authorName) return;
    setSending(true);
    try {
      const res = await fetch(`/api/share/${token}/discussions/${discussionId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: input.trim(),
          authorName,
          clientEmail: localStorage.getItem(`veedeck-author-email-${token}`) ?? undefined,
          attachmentUrl: pendingAttachment?.url ?? null,
          attachmentName: pendingAttachment?.name ?? null,
          attachmentType: pendingAttachment?.type ?? null,
        }),
      });
      if (!res.ok) throw new Error();
      setInput("");
      setPendingAttachment(null);
    } catch {
      toast.error("Nie udało się wysłać wiadomości");
    } finally {
      setSending(false);
    }
  }, [token, discussionId, input, pendingAttachment, sending, authorName]);

  return (
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
      <div className="flex-1 flex flex-col min-w-0 bg-background">
      {/* Header */}
      <div className="px-5 py-3 border-b border-border flex-shrink-0 flex items-center justify-between">
        <div className="md:hidden">
          <h2 className="font-semibold text-sm">{discussionTitle}</h2>
          <p className="text-xs text-muted-foreground">Dyskusja projektowa</p>
        </div>
        {(() => {
          const docCount = messages.filter((m) => m.attachmentType === "document").length;
          return (
            <button
              onClick={() => setShowResources((v) => !v)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors ml-auto ${showResources ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
            >
              <FolderOpen size={13} />
              Zasoby{docCount > 0 && <span className="font-semibold">{docCount}</span>}
            </button>
          );
        })()}
      </div>

      {/* Messages or Resources */}
      {showResources ? (
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <p className="text-xs text-muted-foreground mb-3 font-medium uppercase tracking-wide">Pliki w dyskusji</p>
          {messages.filter((m) => m.attachmentType === "document").length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-2 text-muted-foreground">
              <FolderOpen size={32} className="opacity-30" />
              <p className="text-sm">Brak plików</p>
            </div>
          ) : (
            <div className="space-y-2">
              {messages.filter((m) => m.attachmentType === "document").map((m) => (
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
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
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
                      <a href={msg.attachmentUrl} target="_blank" rel="noopener noreferrer">
                        <img
                          src={msg.attachmentUrl}
                          alt={msg.attachmentName || ""}
                          className="max-w-[260px] max-h-[200px] rounded-2xl object-cover border border-border"
                        />
                      </a>
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
        {pendingAttachment && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted border border-border text-sm">
            {pendingAttachment.type === "image" ? (
              <img src={pendingAttachment.url} alt={pendingAttachment.name} className="h-10 w-10 rounded object-cover flex-shrink-0" />
            ) : pendingAttachment.type === "audio" ? (
              <audio src={pendingAttachment.url} controls className="h-8 flex-1 min-w-0" />
            ) : (
              <DocumentIcon name={pendingAttachment.name} />
            )}
            {pendingAttachment.type !== "audio" && (
              <span className="flex-1 truncate text-xs">{pendingAttachment.name}</span>
            )}
            <button onClick={() => setPendingAttachment(null)} className="text-muted-foreground hover:text-foreground flex-shrink-0">
              <X size={14} />
            </button>
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
            accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="hidden"
            onChange={handleFileSelect}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || isRecording}
            className="p-2 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-40 flex-shrink-0"
            title="Załącz plik"
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
            disabled={(!input.trim() && !pendingAttachment) || sending || uploading || isRecording}
            className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-xl hover:opacity-90 disabled:opacity-40 transition-opacity flex-shrink-0"
          >
            Wyślij
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}
