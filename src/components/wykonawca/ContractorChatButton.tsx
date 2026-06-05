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
} from "@/components/ui/icons";
import { useUploadThing } from "@/lib/uploadthing-client";
import Pusher from "pusher-js";
import { toast } from "sonner";

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
}

interface Props {
  contractorUserId: string;
  assignments: Assignment[];
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" });
}

export default function ContractorChatButton({ contractorUserId, assignments }: Props) {
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
  const [lastReadTimes, setLastReadTimes] = useState<Record<string, string>>({});

  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const pusherRef = useRef<Pusher | null>(null);
  const subscribedChannels = useRef<Set<string>>(new Set());
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { startUpload } = useUploadThing("discussionAttachmentUploader");

  const currentChat = selectedAssignmentId ? chats[selectedAssignmentId] : null;
  const currentMessages = currentChat?.messages ?? [];
  const selectedAssignment = assignments.find((a) => a.id === selectedAssignmentId) ?? null;

  // Init localStorage read times
  useEffect(() => {
    const times: Record<string, string> = {};
    for (const a of assignments) {
      const val = localStorage.getItem(`contractor-chat-read-${a.id}`);
      if (val) times[a.id] = val;
    }
    setLastReadTimes(times);
  }, []);

  // Load all chats on mount for unread counting
  useEffect(() => {
    fetch("/api/contractor-chat")
      .then((r) => r.json())
      .then((data: ChatSummary[]) => {
        const map: Record<string, ChatSummary> = {};
        for (const c of data) map[c.assignmentId] = c;
        setChats(map);
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

  // Auto-scroll when messages change
  useEffect(() => {
    if (open && selectedAssignmentId) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  }, [currentMessages.length, open, selectedAssignmentId]);

  // Mark as read when chat is open
  useEffect(() => {
    if (!open || !selectedAssignmentId) return;
    const now = new Date().toISOString();
    localStorage.setItem(`contractor-chat-read-${selectedAssignmentId}`, now);
    setLastReadTimes((prev) => ({ ...prev, [selectedAssignmentId]: now }));
  }, [open, selectedAssignmentId, currentMessages.length]);

  function countUnread(assignmentId: string): number {
    const chat = chats[assignmentId];
    if (!chat) return 0;
    const lastRead = lastReadTimes[assignmentId];
    return chat.messages.filter(
      (m) => m.userId !== contractorUserId && (!lastRead || new Date(m.createdAt) > new Date(lastRead))
    ).length;
  }

  const totalUnread = assignments.reduce((sum, a) => sum + countUnread(a.id), 0);

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
      const now = new Date().toISOString();
      localStorage.setItem(`contractor-chat-read-${selectedAssignmentId}`, now);
      setLastReadTimes((prev) => ({ ...prev, [selectedAssignmentId]: now }));
    } catch {
      toast.error("Błąd wysyłania wiadomości");
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
      toast.error("Błąd przesyłania pliku");
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
            setPendingAttachment({ url, name: "Wiadomość głosowa", type: "audio" });
          }
        } catch {
          toast.error("Błąd uploadu nagrania");
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
      toast.error("Brak dostępu do mikrofonu");
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
      {/* Navbar button */}
      <button
        onClick={handleOpen}
        className="relative flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        <MessageSquare size={15} />
        <span className="hidden sm:inline">Zapytaj projektanta</span>
        {totalUnread > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1 leading-none pointer-events-none">
            {totalUnread > 99 ? "99+" : totalUnread}
          </span>
        )}
      </button>

      {/* Chat window */}
      {open && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40 sm:hidden" onClick={() => setOpen(false)} />
          <div
            className="fixed inset-x-0 bottom-0 sm:inset-auto sm:bottom-4 sm:right-4 sm:w-96 z-50 flex flex-col bg-background border border-border rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden"
            style={{ height: "min(600px, 90dvh)" }}
          >
            {/* Header */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-card shrink-0">
              {assignments.length > 1 && selectedAssignmentId && (
                <button
                  onClick={() => setSelectedAssignmentId(null)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <ChevronLeft size={18} />
                </button>
              )}
              <MessageSquare size={15} className="text-primary shrink-0" />
              <span className="font-semibold text-sm flex-1 truncate">
                {selectedAssignment ? selectedAssignment.projectTitle : "Zapytaj projektanta"}
              </span>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X size={16} />
              </button>
            </div>

            {/* Assignment picker */}
            {assignments.length > 1 && !selectedAssignmentId ? (
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                <p className="text-xs text-muted-foreground px-1 pb-1">Wybierz projekt</p>
                {assignments.map((a) => {
                  const unread = countUnread(a.id);
                  return (
                    <button
                      key={a.id}
                      onClick={() => handleSelectAssignment(a.id)}
                      className="w-full flex items-center justify-between text-left px-3 py-2.5 rounded-xl border border-border bg-card hover:border-primary/40 transition-colors"
                    >
                      <span className="text-sm font-medium">{a.projectTitle}</span>
                      {unread > 0 && (
                        <span className="min-w-[20px] h-5 flex items-center justify-center rounded-full bg-red-500 text-white text-[11px] font-bold px-1">
                          {unread}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <>
                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1.5">
                  {loadingMessages ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 size={24} className="animate-spin text-muted-foreground" />
                    </div>
                  ) : currentMessages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground gap-2 py-8">
                      <MessageSquare size={32} className="opacity-20" />
                      <p className="text-sm">Napisz wiadomość do projektanta</p>
                    </div>
                  ) : (
                    currentMessages.map((msg, i) => {
                      const isOwn = msg.userId === contractorUserId;
                      const prev = currentMessages[i - 1];
                      const showDate = !prev || new Date(msg.createdAt).toDateString() !== new Date(prev.createdAt).toDateString();
                      return (
                        <React.Fragment key={msg.id}>
                          {showDate && (
                            <div className="text-center py-1">
                              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                                {new Date(msg.createdAt).toLocaleDateString("pl-PL", { day: "numeric", month: "long" })}
                              </span>
                            </div>
                          )}
                          <div className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                            <div className={`max-w-[80%] rounded-2xl px-3 py-2 ${isOwn ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-muted rounded-bl-sm"}`}>
                              {!isOwn && (
                                <p className="text-[11px] font-semibold opacity-60 mb-0.5">{msg.authorName}</p>
                              )}
                              {msg.attachmentType === "image" && msg.attachmentUrl && (
                                <a href={msg.attachmentUrl} target="_blank" rel="noopener noreferrer">
                                  <img src={msg.attachmentUrl} alt={msg.attachmentName ?? "Zdjęcie"} className="rounded-xl max-h-40 object-cover mb-1" />
                                </a>
                              )}
                              {msg.attachmentType === "audio" && msg.attachmentUrl && (
                                <audio controls src={msg.attachmentUrl} className="w-full max-w-[220px] mb-1" />
                              )}
                              {(msg.attachmentType === "document" || msg.attachmentType === "pdf") && msg.attachmentUrl && (
                                <a href={msg.attachmentUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs underline mb-1 opacity-80">
                                  <FileText size={12} />
                                  {msg.attachmentName ?? "Plik"}
                                </a>
                              )}
                              {msg.content && (
                                <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                              )}
                              <p className={`text-[10px] mt-0.5 text-right ${isOwn ? "opacity-60" : "text-muted-foreground"}`}>
                                {formatTime(msg.createdAt)}
                              </p>
                            </div>
                          </div>
                        </React.Fragment>
                      );
                    })
                  )}
                  <div ref={bottomRef} />
                </div>

                {/* Input */}
                <div className="px-4 py-3 border-t border-border flex flex-col gap-2 shrink-0">
                  {pendingAttachment && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted border border-border text-sm max-w-[200px]">
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
                      <span className="flex-1 text-xs font-medium">Nagrywanie... {recLabel}</span>
                    </div>
                  )}
                  <div className="flex items-end gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      onChange={handleFileChange}
                      accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                    />
                    <input
                      ref={cameraInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading || isRecording}
                      className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-primary text-white transition-colors disabled:opacity-40 hover:opacity-90"
                      title="Załącz plik"
                    >
                      {uploading ? <Loader2 size={16} className="animate-spin" /> : <Paperclip size={16} />}
                    </button>
                    <button
                      onClick={() => cameraInputRef.current?.click()}
                      disabled={uploading || isRecording}
                      className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-primary text-white transition-colors disabled:opacity-40 hover:opacity-90"
                      title="Zrób zdjęcie"
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
                      placeholder="Napisz wiadomość..."
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
      )}
    </>
  );
}
