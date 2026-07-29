"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  MessageSquare,
  X,
  Send,
  Paperclip,
  Mic,
  Square,
  FileText,
  ChevronLeft,
  Loader2,
  Camera,
  ChatBubble,
} from "@/components/ui/icons";
import { useUploadThing } from "@/lib/uploadthing-client";
import Pusher from "pusher-js";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";

interface Assignment {
  id: string;
  projectTitle: string;
}

interface ChatMessage {
  id: string;
  discussionId: string;
  content: string;
  authorName: string;
  userId: string | null;
  attachmentUrl: string | null;
  attachmentName: string | null;
  attachmentType: string | null;
  createdAt: string;
}

interface ChatSummary {
  assignmentId: string;
  projectTitle: string;
  discussionId: string | null;
  messages: ChatMessage[];
  readAt: string | null;
  unreadCount: number;
}

interface Props {
  contractorUserId: string;
  assignments: Assignment[];
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" });
}

export default function ContractorChatButton({ contractorUserId, assignments }: Props) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(
    assignments.length === 1 ? assignments[0].id : null
  );
  const [chats, setChats] = useState<Record<string, ChatSummary>>({});
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pendingAttachment, setPendingAttachment] = useState<{ url: string; name: string; type: string } | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const pusherRef = useRef<Pusher | null>(null);
  const subscribedChannels = useRef<Set<string>>(new Set());
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isInitialScrollRef = useRef(false);

  const { startUpload } = useUploadThing("discussionAttachmentUploader");

  const currentChat = selectedAssignmentId ? chats[selectedAssignmentId] : null;
  const currentMessages = currentChat?.messages ?? [];
  const selectedAssignment = assignments.find((a) => a.id === selectedAssignmentId) ?? null;

  // Load all chats on mount; use server-computed unreadCount for badge
  useEffect(() => {
    fetch("/api/contractor-chat")
      .then((r) => r.json())
      .then((data: ChatSummary[]) => {
        const map: Record<string, ChatSummary> = {};
        const counts: Record<string, number> = {};
        for (const c of data) {
          map[c.assignmentId] = c;
          counts[c.assignmentId] = c.unreadCount;
        }
        setChats(map);
        setUnreadCounts(counts);
      })
      .catch(() => {});
  }, []);

  // Subscribe to per-assignment Pusher channels — handles both designer and contractor messages
  useEffect(() => {
    if (!pusherRef.current) {
      pusherRef.current = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      });
    }
    const pusher = pusherRef.current;

    for (const a of assignments) {
      const channelName = `contractor-assignment-${a.id}`;
      if (subscribedChannels.current.has(channelName)) continue;
      const channel = pusher.subscribe(channelName);
      channel.bind("new-message", (msg: ChatMessage) => {
        setChats((prev) => {
          const existing = prev[a.id] ?? {
            assignmentId: a.id,
            projectTitle: a.projectTitle,
            discussionId: msg.discussionId,
            messages: [],
            readAt: null,
            unreadCount: 0,
          };
          if (existing.messages.some((m) => m.id === msg.id)) return prev;
          return {
            ...prev,
            [a.id]: {
              ...existing,
              discussionId: existing.discussionId ?? msg.discussionId,
              messages: [...existing.messages, msg],
            },
          };
        });
        // If message is from designer, increment unread badge
        if (msg.userId !== contractorUserId) {
          setUnreadCounts((prev) => ({ ...prev, [a.id]: (prev[a.id] ?? 0) + 1 }));
        }
      });
      subscribedChannels.current.add(channelName);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cleanup Pusher on unmount
  useEffect(() => {
    return () => {
      pusherRef.current?.disconnect();
    };
  }, []);

  // Reset initial scroll flag when conversation changes
  useEffect(() => {
    isInitialScrollRef.current = false;
  }, [selectedAssignmentId]);

  // Auto-scroll — instant on first load, smooth on new messages
  useEffect(() => {
    if (!open || !selectedAssignmentId || currentMessages.length === 0) return;
    if (!isInitialScrollRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "instant" });
      isInitialScrollRef.current = true;
    } else {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [currentMessages.length, open, selectedAssignmentId]);

  // Reset unread badge when chat is open for a specific assignment
  useEffect(() => {
    if (!open || !selectedAssignmentId) return;
    setUnreadCounts((prev) => ({ ...prev, [selectedAssignmentId]: 0 }));
  }, [open, selectedAssignmentId]);

  const totalUnread = Object.values(unreadCounts).reduce((sum, n) => sum + n, 0);

  async function loadFullMessages(assignmentId: string) {
    setLoadingMessages(true);
    try {
      const res = await fetch(`/api/contractor-chat/${assignmentId}`);
      if (!res.ok) return;
      const data = await res.json();
      const projectTitle = assignments.find((a) => a.id === assignmentId)?.projectTitle ?? "";
      setChats((prev) => ({
        ...prev,
        [assignmentId]: {
          assignmentId,
          projectTitle,
          discussionId: data.discussionId,
          messages: data.messages,
          readAt: prev[assignmentId]?.readAt ?? null,
          unreadCount: 0,
        },
      }));
    } finally {
      setLoadingMessages(false);
    }
  }

  function handleOpen() {
    setOpen(true);
    if (selectedAssignmentId) loadFullMessages(selectedAssignmentId);
  }

  function handleSelectAssignment(id: string) {
    setSelectedAssignmentId(id);
    loadFullMessages(id);
  }

  async function sendMessage() {
    if (!selectedAssignmentId || (!input.trim() && !pendingAttachment)) return;
    setSending(true);
    try {
      const res = await fetch(`/api/contractor-chat/${selectedAssignmentId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: input.trim(),
          attachmentUrl: pendingAttachment?.url ?? null,
          attachmentName: pendingAttachment?.name ?? null,
          attachmentType: pendingAttachment?.type ?? null,
        }),
      });
      if (!res.ok) throw new Error();
      const msg: ChatMessage = await res.json();

      setChats((prev) => {
        const existing = prev[selectedAssignmentId] ?? {
          assignmentId: selectedAssignmentId,
          projectTitle: selectedAssignment?.projectTitle ?? "",
          discussionId: msg.discussionId,
          messages: [],
        };
        if (existing.messages.some((m) => m.id === msg.id)) return prev;
        const updated = {
          ...existing,
          discussionId: existing.discussionId ?? msg.discussionId,
          messages: [...existing.messages, msg],
        };
        return { ...prev, [selectedAssignmentId]: updated };
      });

      setInput("");
      setPendingAttachment(null);
    } catch {
      toast.error(t.wykonawcy.chatSendError);
    } finally {
      setSending(false);
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const result = await startUpload([file]);
      if (result?.[0]) {
        const url = (result[0] as any).url ?? (result[0] as any).uniUrls;
        const isImage = file.type.startsWith("image/");
        const isPdf = file.type === "application/pdf";
        const isAudio = file.type.startsWith("audio/");
        setPendingAttachment({
          url,
          name: file.name,
          type: isImage ? "image" : isPdf ? "pdf" : isAudio ? "audio" : "document",
        });
      }
    } catch {
      toast.error(t.wykonawcy.chatUploadError);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      audioChunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const file = new File([blob], `voice-${Date.now()}.webm`, { type: "audio/webm" });
        setUploading(true);
        try {
          const result = await startUpload([file]);
          if (result?.[0]) {
            const url = (result[0] as any).url ?? (result[0] as any).uniUrls;
            setPendingAttachment({ url, name: t.wykonawcy.voiceMessage, type: "audio" });
          }
        } catch {
          toast.error(t.wykonawcy.recordingUploadError);
        } finally {
          setUploading(false);
        }
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setIsRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => setRecordingSeconds((s) => s + 1), 1000);
    } catch {
      toast.error(t.wykonawcy.micError);
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    setIsRecording(false);
    setRecordingSeconds(0);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  const recLabel = `${Math.floor(recordingSeconds / 60)}:${String(recordingSeconds % 60).padStart(2, "0")}`;

  return (
    <>
      {/* Navbar button — hidden on mobile, float button takes over */}
      <button
        onClick={handleOpen}
        className="relative hidden sm:flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-muted text-foreground hover:bg-muted/70 border border-border transition-colors"
      >
        <MessageSquare size={15} />
        <span className="hidden sm:inline">{t.wykonawcy.chatBtn}</span>
        {totalUnread > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1 leading-none pointer-events-none">
            {totalUnread > 99 ? "99+" : totalUnread}
          </span>
        )}
      </button>

      {/* Floating chat button */}
      <div className={`fixed bottom-6 right-6 z-[46] ${open ? "max-sm:hidden" : ""}`}>
        <button
          onClick={open ? () => setOpen(false) : handleOpen}
          aria-label={open ? "Zamknij czat" : "Otwórz czat"}
          className={`relative w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 hover:-translate-y-px ${
            totalUnread > 0 ? "bg-[#4F46E5] text-white" : "bg-background text-[#4F46E5] border border-border"
          }`}
          style={{
            boxShadow: totalUnread > 0
              ? "0 6px 24px rgba(79,70,229,0.45), 0 2px 8px rgba(79,70,229,0.25)"
              : "0 4px 16px rgba(79,70,229,0.15), 0 1px 4px rgba(0,0,0,0.08)",
          }}
        >
          {open ? <X size={22} /> : <ChatBubble size={22} />}
          {!open && totalUnread > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center leading-none bg-background text-[#4F46E5] border border-[#4F46E5]/30">
              {totalUnread > 99 ? "99+" : totalUnread}
            </span>
          )}
        </button>
      </div>

      {/* Chat panel — same size/style as FloatingChatPanel in designer's view */}
      <div
        className={`fixed z-[45] flex flex-col bg-card overflow-hidden shadow-2xl transition-transform duration-[200ms] ease-out
          inset-0 rounded-none border-0
          sm:inset-auto sm:border sm:border-border sm:bottom-[88px] sm:right-4 sm:w-[380px] sm:h-[600px] sm:rounded-2xl sm:max-w-[calc(100vw-1rem)]
          ${open ? "translate-y-0 sm:translate-x-0" : "translate-y-full sm:translate-y-0 sm:translate-x-[calc(100%+1rem)]"}`}
      >
        {/* ── Assignment picker (list view) ─────────────────────────────────── */}
        {assignments.length > 1 && !selectedAssignmentId ? (
          <>
            <div className="shrink-0 px-4 pt-4 pb-0">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-base">{t.wykonawcy.chatBtn}</h2>
                <button onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-muted transition-colors text-muted-foreground" aria-label="Zamknij">
                  <X size={16} />
                </button>
              </div>
              <div className="border-b border-border pb-3">
                <p className="text-xs text-muted-foreground">{t.wykonawcy.chatSelectProject}</p>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-border">
              {assignments.map((a) => {
                const unread = unreadCounts[a.id] ?? 0;
                return (
                  <button
                    key={a.id}
                    onClick={() => handleSelectAssignment(a.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 transition-colors text-left ${
                      unread > 0 ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-muted/40"
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm shrink-0">
                      {a.projectTitle[0]?.toUpperCase() ?? "P"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm truncate ${unread > 0 ? "font-semibold" : "font-medium"}`}>{a.projectTitle}</p>
                      <p className="text-xs text-muted-foreground">{t.wykonawcy.chatBtn}</p>
                    </div>
                    {unread > 0 && (
                      <span className="shrink-0 min-w-[20px] h-5 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                        {unread > 99 ? "99+" : unread}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          /* ── Conversation view ────────────────────────────────────────────── */
          <>
            {/* Header */}
            <div className="shrink-0 flex items-center gap-2 px-3 py-3 border-b border-border">
              {assignments.length > 1 && (
                <button
                  onClick={() => setSelectedAssignmentId(null)}
                  className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground shrink-0"
                  aria-label="Wróć"
                >
                  <ChevronLeft size={18} />
                </button>
              )}
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs shrink-0">
                {(selectedAssignment?.projectTitle ?? "P")[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate leading-snug">
                  {selectedAssignment ? selectedAssignment.projectTitle : t.wykonawcy.chatBtn}
                </p>
                <p className="text-[11px] text-muted-foreground">{t.wykonawcy.chatBtn}</p>
              </div>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground shrink-0" aria-label="Zamknij">
                <X size={16} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4">
              {loadingMessages ? (
                <div className="animate-pulse space-y-2 w-full">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className={`flex items-end gap-2 ${i % 2 === 0 ? "justify-end" : "justify-start"}`}>
                      {i % 2 !== 0 && <div className="w-7 h-7 rounded-full bg-muted shrink-0" />}
                      <div className={`h-10 bg-muted rounded-2xl ${i % 2 === 0 ? "w-2/3" : "w-3/4"}`} />
                      {i % 2 === 0 && <div className="w-7 h-7 rounded-full bg-muted shrink-0" />}
                    </div>
                  ))}
                </div>
              ) : currentMessages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm py-12">
                  {t.wykonawcy.emptyChat}
                </div>
              ) : (
                currentMessages.map((msg, i) => {
                  const isOwn = msg.userId === contractorUserId;
                  const prev = currentMessages[i - 1];
                  const showDate = !prev || new Date(msg.createdAt).toDateString() !== new Date(prev.createdAt).toDateString();
                  return (
                    <React.Fragment key={msg.id}>
                      {showDate && (
                        <div className="text-center py-2">
                          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                            {new Date(msg.createdAt).toLocaleDateString("pl-PL", { day: "numeric", month: "long" })}
                          </span>
                        </div>
                      )}
                      <div className={`flex items-end gap-2 mb-1.5 ${isOwn ? "justify-end" : "justify-start"}`}>
                        {!isOwn && (
                          <div title={msg.authorName} className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary shrink-0 self-end mb-0.5">
                            {msg.authorName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "?"}
                          </div>
                        )}
                        <div className={`max-w-[75%] px-3.5 py-2 text-sm leading-relaxed ${
                          isOwn
                            ? "bg-primary text-primary-foreground rounded-2xl rounded-br-sm"
                            : "bg-muted text-foreground rounded-2xl rounded-bl-sm"
                        }`}>
                          {!isOwn && <p className="text-[10px] font-medium opacity-60 mb-0.5">{msg.authorName}</p>}
                          {msg.attachmentType === "image" && msg.attachmentUrl && (
                            <a href={msg.attachmentUrl} target="_blank" rel="noopener noreferrer" className="block mb-1">
                              <img src={msg.attachmentUrl} alt={msg.attachmentName ?? ""} className="max-w-[200px] rounded-lg object-cover" />
                            </a>
                          )}
                          {msg.attachmentType === "audio" && msg.attachmentUrl && (
                            <audio controls src={msg.attachmentUrl} className="w-full max-w-[220px] mb-1" />
                          )}
                          {(msg.attachmentType === "document" || msg.attachmentType === "pdf") && msg.attachmentUrl && (
                            <a href={msg.attachmentUrl} target="_blank" rel="noopener noreferrer" className="text-xs underline opacity-80 mb-1 block">
                              {msg.attachmentName ?? t.wykonawcy.file}
                            </a>
                          )}
                          {msg.content && <p className="break-words whitespace-pre-wrap">{msg.content}</p>}
                          <p className={`text-[10px] mt-0.5 text-right ${isOwn ? "opacity-60" : "text-muted-foreground"}`}>
                            {formatTime(msg.createdAt)}
                          </p>
                        </div>
                        {isOwn && (
                          <div title={msg.authorName} className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary shrink-0 self-end mb-0.5">
                            {msg.authorName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "?"}
                          </div>
                        )}
                      </div>
                    </React.Fragment>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input bar */}
            <div className="px-4 py-3 border-t border-border shrink-0 bg-background flex flex-col gap-2">
              {pendingAttachment && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted border border-border text-sm max-w-[220px]">
                  {pendingAttachment.type === "image" ? (
                    <img src={pendingAttachment.url} alt={pendingAttachment.name} className="h-8 w-8 rounded object-cover flex-shrink-0" />
                  ) : pendingAttachment.type === "audio" ? (
                    <audio src={pendingAttachment.url} controls className="h-7 w-32 min-w-0" />
                  ) : (
                    <FileText size={14} className="text-muted-foreground flex-shrink-0" />
                  )}
                  {pendingAttachment.type !== "audio" && (
                    <span className="flex-1 truncate text-xs min-w-0">{pendingAttachment.name}</span>
                  )}
                  <button onClick={() => setPendingAttachment(null)} className="text-muted-foreground hover:text-foreground flex-shrink-0 ml-1">
                    <X size={13} />
                  </button>
                </div>
              )}
              {isRecording && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-destructive/10 border border-destructive/20 text-sm text-destructive">
                  <span className="w-2 h-2 rounded-full bg-destructive animate-pulse flex-shrink-0" />
                  <span className="flex-1 text-xs font-medium">{t.wykonawcy.recording} {recLabel}</span>
                </div>
              )}
              <div className="flex items-end gap-2">
                <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} accept="image/*,.pdf,.doc,.docx,.xls,.xlsx" />
                <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading || isRecording}
                  className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-primary text-white transition-colors disabled:opacity-40 hover:opacity-90"
                  title={t.wykonawcy.attachFile}
                >
                  {uploading ? <Loader2 size={16} className="animate-spin" /> : <Paperclip size={16} />}
                </button>
                <button
                  onClick={() => cameraInputRef.current?.click()}
                  disabled={uploading || isRecording}
                  className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-primary text-white transition-colors disabled:opacity-40 hover:opacity-90"
                  title={t.wykonawcy.takePhoto}
                >
                  <Camera size={16} />
                </button>
                <textarea
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    e.target.style.height = "auto";
                    e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px";
                    e.target.style.overflowY = e.target.scrollHeight > 160 ? "auto" : "hidden";
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder={t.wykonawcy.chatMessagePlaceholder}
                  rows={1}
                  style={{ height: "40px", overflowY: "hidden" }}
                  className="flex-1 min-h-10 max-h-40 px-3 py-2 text-sm resize-none rounded-2xl bg-muted focus:outline-none"
                />
                <button
                  onClick={isRecording ? stopRecording : (input.trim() || pendingAttachment ? sendMessage : startRecording)}
                  disabled={sending || uploading}
                  className="flex-shrink-0 flex items-center justify-center w-8 h-8 text-primary disabled:opacity-40 hover:opacity-90 transition-colors"
                >
                  {sending ? (
                    <Loader2 className="w-7 h-7 animate-spin" />
                  ) : isRecording ? (
                    <Square className="w-7 h-7 text-destructive" />
                  ) : input.trim() || pendingAttachment ? (
                    <Send className="w-7 h-7" />
                  ) : (
                    <Mic className="w-7 h-7" />
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
