"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { MessageSquare, Plus, Trash2, Edit2, Check, X, ExternalLink, ChevronDown, Paperclip, FileText, FileSpreadsheet, File as FileIcon, Loader2, FolderOpen, Mic, Square, Search, Archive, ArchiveRestore } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Pusher from "pusher-js";
import { useUploadThing } from "@/lib/uploadthing-client";
import ImageAnnotationModal from "./ImageAnnotationModal";
import { playMessageSound } from "@/lib/notification-sound";

interface ReadReceipt {
  readerId: string;
  readerName: string;
  readerType: string;
  lastMessageId: string | null;
}

interface DiscussionSummary {
  id: string;
  title: string;
  type: string;
  projectId: string | null;
  project: { id: string; title: string } | null;
  messageCount: number;
  lastMessage: { content: string; authorName: string; createdAt: string } | null;
  archived: boolean;
  updatedAt: string;
}

interface DiscussionMessage {
  id: string;
  discussionId: string;
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

interface ProjectOption {
  id: string;
  title: string;
}

interface Props {
  currentUserId: string;
  initialDiscussions: DiscussionSummary[];
  projects: ProjectOption[];
}

type AttachmentType = "image" | "document" | "audio" | "pdf";

interface PendingAttachment {
  url: string;
  name: string;
  type: AttachmentType;
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

export default function DyskusjeView({ currentUserId, initialDiscussions, projects }: Props) {
  const router = useRouter();
  const [discussions, setDiscussions] = useState<DiscussionSummary[]>(initialDiscussions);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<DiscussionMessage[]>([]);
  const [receipts, setReceipts] = useState<ReadReceipt[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [showNewForm, setShowNewForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [headerEditing, setHeaderEditing] = useState(false);
  const [headerTitle, setHeaderTitle] = useState("");
  const [headerProjectId, setHeaderProjectId] = useState<string | null>(null);
  const [savingHeader, setSavingHeader] = useState(false);
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [showResources, setShowResources] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [lastReadTimes, setLastReadTimes] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "internal" | "project">("all");
  const [archivedFilter, setArchivedFilter] = useState<"active" | "archived">("active");
  const [chatSearch, setChatSearch] = useState("");
  const [chatSearchOpen, setChatSearchOpen] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [annotatingImage, setAnnotatingImage] = useState<string | null>(null);
  const [sendingAnnotation, setSendingAnnotation] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const pusherRef = useRef<Pusher | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const dragCounterRef = useRef(0);

  const { startUpload } = useUploadThing("discussionAttachmentUploader");

  const selected = discussions.find((d) => d.id === selectedId) ?? null;

  useEffect(() => {
    const times: Record<string, string> = {};
    initialDiscussions.forEach((d) => {
      const val = localStorage.getItem(`discussion-read-${d.id}`);
      if (val) times[d.id] = val;
    });
    setLastReadTimes(times);
  }, []);

  const markAsRead = useCallback((id: string) => {
    const now = new Date().toISOString();
    localStorage.setItem(`discussion-read-${id}`, now);
    setLastReadTimes((prev) => ({ ...prev, [id]: now }));
  }, []);

  function hasUnread(d: DiscussionSummary): boolean {
    if (!d.lastMessage) return false;
    const readAt = lastReadTimes[d.id];
    if (!readAt) return true;
    return new Date(d.lastMessage.createdAt) > new Date(readAt);
  }

  const sortedDiscussions = useMemo(() => {
    const unread = discussions.filter((d) => hasUnread(d));
    const read = discussions.filter((d) => !hasUnread(d));
    return [...unread, ...read];
  }, [discussions, lastReadTimes]);

  const filteredDiscussions = useMemo(() => {
    return sortedDiscussions
      .filter((d) => (archivedFilter === "archived" ? d.archived : !d.archived))
      .filter((d) => {
        if (typeFilter === "internal") return d.type !== "project";
        if (typeFilter === "project") return d.type === "project";
        return true;
      })
      .filter((d) => {
        if (!search) return true;
        const q = search.toLowerCase();
        return d.title.toLowerCase().includes(q) || d.lastMessage?.content.toLowerCase().includes(q);
      });
  }, [sortedDiscussions, archivedFilter, typeFilter, search]);


  useEffect(() => {
    const unreadIds = discussions.filter((d) => hasUnread(d)).map((d) => d.id);
    localStorage.setItem("discussions-unread-count", String(unreadIds.length));
    localStorage.setItem("discussions-unread-ids", JSON.stringify(unreadIds));
    window.dispatchEvent(new Event("discussions-unread-updated"));
  }, [discussions, lastReadTimes]);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowProjectDropdown(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    setLoadingMessages(true);
    fetch(`/api/discussions/${selectedId}/messages`)
      .then((r) => r.json())
      .then((data) => {
        const msgs: DiscussionMessage[] = Array.isArray(data) ? data : (data.messages ?? []);
        const recs: ReadReceipt[] = data.receipts ?? [];
        setMessages(msgs);
        setReceipts(recs);
        setLoadingMessages(false);
        markAsRead(selectedId);
        if (msgs.length > 0) {
          fetch(`/api/discussions/${selectedId}/read`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lastMessageId: msgs[msgs.length - 1].id }),
          }).catch(() => {});
        }
      })
      .catch(() => setLoadingMessages(false));
  }, [selectedId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!selectedId) return;

    if (!pusherRef.current) {
      pusherRef.current = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      });
    }

    const channel = pusherRef.current.subscribe(`discussion-${selectedId}`);
    channel.bind("new-message", (msg: DiscussionMessage) => {
      if (msg.userId !== currentUserId) playMessageSound();
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        const next = [...prev, msg];
        // mark as read when new message arrives (designer is actively viewing)
        fetch(`/api/discussions/${selectedId}/read`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lastMessageId: msg.id }),
        }).catch(() => {});
        return next;
      });
      setDiscussions((prev) =>
        prev.map((d) =>
          d.id === selectedId
            ? { ...d, messageCount: d.messageCount + 1, lastMessage: { content: msg.content, authorName: msg.authorName, createdAt: msg.createdAt }, updatedAt: msg.createdAt }
            : d
        )
      );
      markAsRead(selectedId);
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
      pusherRef.current?.unsubscribe(`discussion-${selectedId}`);
    };
  }, [selectedId]);

  function startHeaderEdit() {
    if (!selected) return;
    setHeaderTitle(selected.title);
    setHeaderProjectId(selected.projectId);
    setHeaderEditing(true);
    setShowProjectDropdown(false);
  }

  function cancelHeaderEdit() {
    setHeaderEditing(false);
    setShowProjectDropdown(false);
  }

  async function saveHeaderEdit() {
    if (!selected || savingHeader) return;
    setSavingHeader(true);
    try {
      const body: Record<string, unknown> = {};
      if (headerTitle.trim() && headerTitle.trim() !== selected.title) {
        body.title = headerTitle.trim();
      }
      if (headerProjectId !== selected.projectId) {
        body.projectId = headerProjectId;
      }
      if (Object.keys(body).length === 0) {
        setHeaderEditing(false);
        return;
      }
      const res = await fetch(`/api/discussions/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Nie udało się zapisać zmian");
        return;
      }
      const updated = await res.json();
      setDiscussions((prev) =>
        prev.map((d) =>
          d.id === selected.id
            ? {
                ...d,
                title: updated.title,
                projectId: updated.projectId,
                project: updated.project ?? null,
                type: updated.type,
              }
            : d
        )
      );
      setHeaderEditing(false);
      router.refresh();
    } catch {
      toast.error("Nie udało się zapisać zmian");
    } finally {
      setSavingHeader(false);
    }
  }

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
    if (!selectedId || (!input.trim() && pendingAttachments.length === 0) || sending) return;
    setSending(true);
    const attachmentsToSend = [...pendingAttachments];
    const textToSend = input.trim();
    try {
      const firstAtt = attachmentsToSend[0] ?? null;
      const res = await fetch(`/api/discussions/${selectedId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: textToSend,
          attachmentUrl: firstAtt?.url ?? null,
          attachmentName: firstAtt?.name ?? null,
          attachmentType: firstAtt?.type ?? null,
        }),
      });
      if (!res.ok) throw new Error();

      for (let i = 1; i < attachmentsToSend.length; i++) {
        const att = attachmentsToSend[i];
        await fetch(`/api/discussions/${selectedId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: "",
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
  }, [selectedId, input, pendingAttachments, sending]);

  const handleAnnotationSend = useCallback(async (blob: Blob) => {
    if (!selectedId) return;
    setSendingAnnotation(true);
    try {
      const file = new File([blob], `annotated-${Date.now()}.png`, { type: "image/png" });
      const result = await startUpload([file]);
      if (!result?.[0]) throw new Error();
      const res = await fetch(`/api/discussions/${selectedId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: "",
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
  }, [selectedId, startUpload]);

  async function createDiscussion() {
    if (!newTitle.trim()) return;
    try {
      const res = await fetch("/api/discussions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle.trim(), type: "internal" }),
      });
      if (!res.ok) throw new Error();
      const d = await res.json();
      setDiscussions((prev) => [
        { id: d.id, title: d.title, type: d.type, projectId: null, project: null, messageCount: 0, lastMessage: null, archived: false, updatedAt: d.createdAt ?? new Date().toISOString() },
        ...prev,
      ]);
      setNewTitle("");
      setShowNewForm(false);
      setSelectedId(d.id);
      router.refresh();
    } catch {
      toast.error("Nie udało się utworzyć dyskusji");
    }
  }

  async function renameDiscussion(id: string) {
    if (!editTitle.trim()) return;
    try {
      const res = await fetch(`/api/discussions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editTitle.trim() }),
      });
      if (!res.ok) throw new Error();
      setDiscussions((prev) => prev.map((d) => (d.id === id ? { ...d, title: editTitle.trim() } : d)));
      setEditingId(null);
    } catch {
      toast.error("Nie udało się zmienić nazwy");
    }
  }

  async function toggleArchive(id: string, currentArchived: boolean) {
    try {
      const res = await fetch(`/api/discussions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archived: !currentArchived }),
      });
      if (!res.ok) throw new Error();
      setDiscussions((prev) => prev.map((d) => (d.id === id ? { ...d, archived: !currentArchived } : d)));
      if (selectedId === id) { setSelectedId(null); setMessages([]); setHeaderEditing(false); }
    } catch {
      toast.error("Nie udało się " + (currentArchived ? "przywrócić" : "zarchiwizować") + " dyskusji");
    }
  }

  async function deleteDiscussion(id: string) {
    const d = discussions.find((x) => x.id === id);
    const msg = d?.type === "project"
      ? "Usunąć tę dyskusję projektu i wszystkie wiadomości? Projekt nie straci danych."
      : "Usunąć tę dyskusję i wszystkie wiadomości?";
    if (!confirm(msg)) return;
    try {
      const res = await fetch(`/api/discussions/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setDiscussions((prev) => prev.filter((d) => d.id !== id));
      if (selectedId === id) { setSelectedId(null); setMessages([]); setHeaderEditing(false); }
      router.refresh();
    } catch {
      toast.error("Nie udało się usunąć dyskusji");
    }
  }

  const selectedProjectLabel = projects.find((p) => p.id === headerProjectId)?.title ?? "Brak przypisania";

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
      <div className="flex flex-1 -mx-3 sm:-mx-6 -my-4 sm:-my-6 overflow-hidden bg-muted/30">
        {/* Sidebar */}
        <div className="w-72 flex-shrink-0 flex flex-col border-r border-border">
          {/* Header */}
          <div className="px-4 pt-4 pb-3 space-y-3 border-b border-border">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-base">Dyskusje</h2>
              <button
                onClick={() => { setShowNewForm(true); setNewTitle(""); }}
                className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                title="Nowa dyskusja"
              >
                <Plus size={16} />
              </button>
            </div>

            {showNewForm && (
              <div className="flex gap-2">
                <input
                  autoFocus
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") createDiscussion(); if (e.key === "Escape") setShowNewForm(false); }}
                  placeholder="Nazwa dyskusji..."
                  className="flex-1 min-w-0 text-sm px-2 py-1 rounded-md border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <button onClick={createDiscussion} className="p-1 text-primary hover:opacity-80"><Check size={15} /></button>
                <button onClick={() => setShowNewForm(false)} className="p-1 text-muted-foreground hover:opacity-80"><X size={15} /></button>
              </div>
            )}

            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Szukaj w dyskusjach..."
                className="w-full pl-7 pr-7 py-1.5 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X size={13} />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <PillDropdown
                value={typeFilter}
                onChange={(v) => setTypeFilter(v as typeof typeFilter)}
                options={[
                  { value: "all", label: "Wszystkie" },
                  { value: "internal", label: "Wewnętrzne" },
                  { value: "project", label: "Projektowe" },
                ]}
              />
              <PillDropdown
                value={archivedFilter}
                onChange={(v) => setArchivedFilter(v as typeof archivedFilter)}
                options={[
                  { value: "active", label: "Aktywne" },
                  { value: "archived", label: "Zarchiwizowane" },
                ]}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {discussions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground px-4 text-center">
                <MessageSquare size={32} className="opacity-30" />
                <p className="text-sm">Brak dyskusji</p>
                <p className="text-xs">Dyskusje projektu tworzone są automatycznie</p>
              </div>
            ) : filteredDiscussions.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">Brak wyników</div>
            ) : (
              filteredDiscussions.map((d) => (
                editingId === d.id ? (
                  <div
                    key={d.id}
                    className={`w-full text-left px-4 py-3 border-b border-border/50 ${selectedId === d.id ? "bg-primary/10" : ""}`}
                  >
                    <div className="flex gap-1">
                      <input
                        autoFocus
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") renameDiscussion(d.id); if (e.key === "Escape") setEditingId(null); }}
                        className="flex-1 min-w-0 text-sm px-2 py-0.5 rounded border border-border bg-background focus:outline-none"
                      />
                      <button onClick={() => renameDiscussion(d.id)} className="text-primary"><Check size={13} /></button>
                      <button onClick={() => setEditingId(null)} className="text-muted-foreground"><X size={13} /></button>
                    </div>
                  </div>
                ) : (
                  <button
                    key={d.id}
                    onClick={() => {
                      setSelectedId(d.id);
                      markAsRead(d.id);
                      setEditingId(null);
                      setHeaderEditing(false);
                      setShowResources(false);
                    }}
                    className={`group w-full text-left px-4 py-3 border-b border-border/50 transition-colors ${
                      selectedId === d.id ? "bg-primary/10 border-l-2 border-l-primary" : "hover:bg-muted/60"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-0.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {hasUnread(d) && <span className="w-2 h-2 rounded-full flex-shrink-0 bg-primary mt-0.5" />}
                        <span className={`text-sm font-medium truncate ${selectedId === d.id ? "text-primary" : ""}`}>{d.title}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-xs text-muted-foreground mt-0.5">
                          {formatTime(d.lastMessage?.createdAt ?? d.updatedAt)}
                        </span>
                        <span
                          onClick={(e) => { e.stopPropagation(); setEditingId(d.id); setEditTitle(d.title); }}
                          className="p-0.5 rounded text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100"
                          title="Zmień nazwę"
                        >
                          <Edit2 size={11} />
                        </span>
                        <span
                          onClick={(e) => { e.stopPropagation(); toggleArchive(d.id, d.archived); }}
                          className="p-0.5 rounded text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100"
                          title={d.archived ? "Przywróć" : "Zarchiwizuj"}
                        >
                          {d.archived ? <ArchiveRestore size={11} /> : <Archive size={11} />}
                        </span>
                        <span
                          onClick={(e) => { e.stopPropagation(); deleteDiscussion(d.id); }}
                          className="p-0.5 rounded text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100"
                          title="Usuń"
                        >
                          <Trash2 size={11} />
                        </span>
                      </div>
                    </div>
                    {d.lastMessage ? (
                      <p className="text-xs text-muted-foreground truncate pl-3.5">
                        {d.lastMessage.content || "Załącznik"}
                      </p>
                    ) : d.project ? (
                      <p className="text-xs text-muted-foreground truncate pl-3.5">{d.project.title}</p>
                    ) : null}
                  </button>
                )
              ))
            )}
          </div>
        </div>

        {/* Main area */}
        {selected ? (
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
            <div className="px-5 py-3 border-b border-border">
              {headerEditing ? (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <input
                      autoFocus
                      value={headerTitle}
                      onChange={(e) => setHeaderTitle(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") saveHeaderEdit(); if (e.key === "Escape") cancelHeaderEdit(); }}
                      className="flex-1 text-sm font-semibold px-2 py-1 rounded border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <button
                      onClick={saveHeaderEdit}
                      disabled={savingHeader}
                      className="p-1.5 rounded-lg text-primary hover:bg-primary/10 transition-colors disabled:opacity-40"
                      title="Zapisz"
                    >
                      <Check size={14} />
                    </button>
                    <button
                      onClick={cancelHeaderEdit}
                      className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted transition-colors"
                      title="Anuluj"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  {/* Project selector */}
                  <div className="relative" ref={dropdownRef}>
                    <button
                      type="button"
                      onClick={() => setShowProjectDropdown((v) => !v)}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-md px-2 py-1 bg-background transition-colors"
                    >
                      <span className="truncate max-w-[200px]">{selectedProjectLabel}</span>
                      <ChevronDown size={12} className="flex-shrink-0" />
                    </button>
                    {showProjectDropdown && (
                      <div className="absolute top-full left-0 mt-1 w-64 bg-popover border border-border rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                        <button
                          type="button"
                          onClick={() => { setHeaderProjectId(null); setShowProjectDropdown(false); }}
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors ${headerProjectId === null ? "font-medium text-primary" : "text-muted-foreground"}`}
                        >
                          Brak przypisania
                        </button>
                        {projects.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => { setHeaderProjectId(p.id); setShowProjectDropdown(false); }}
                            className={`w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors truncate ${headerProjectId === p.id ? "font-medium text-primary" : "text-foreground"}`}
                          >
                            {p.title}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="min-w-0">
                    <h2 className="font-semibold text-sm">{selected.title}</h2>
                    {selected.project ? (
                      <a
                        href={`/projects/${selected.project.id}`}
                        className="text-xs text-primary hover:underline flex items-center gap-1"
                      >
                        {selected.project.title}
                        <ExternalLink size={10} />
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground">Brak przypisania do projektu</span>
                    )}
                  </div>
                  <div className="ml-auto flex gap-1 items-center">
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
                          title="Pliki dyskusji"
                        >
                          <FolderOpen size={13} />
                          Pliki{docCount > 0 && <span className="font-semibold">{docCount}</span>}
                        </button>
                      );
                    })()}
                    <button
                      onClick={startHeaderEdit}
                      className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                      title="Edytuj"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => deleteDiscussion(selected.id)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-destructive transition-colors"
                      title="Usuń dyskusję"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              )}
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
              <ChatSearchResults
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
                {loadingMessages ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground text-sm">Ładowanie...</div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
                    <MessageSquare size={32} className="opacity-30" />
                    <p className="text-sm">Brak wiadomości</p>
                    <p className="text-xs">Zacznij pisać aby rozpocząć dyskusję</p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isOwn = msg.userId === currentUserId;
                    return (
                      <MessageBubble
                        key={msg.id}
                        msg={msg}
                        isOwn={isOwn}
                        onImageClick={setAnnotatingImage}
                        receipts={isOwn
                          ? receipts.filter((r) => r.lastMessageId === msg.id && r.readerId !== currentUserId)
                          : undefined}
                      />
                    );
                  })
                )}

                <div ref={bottomRef} />
              </div>
            )}

            {/* Input */}
            <div className="px-4 py-3 border-t border-border flex flex-col gap-2">
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
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3 bg-background">
            <MessageSquare size={48} className="opacity-20" />
            <p className="text-sm">Wybierz dyskusję aby zobaczyć wiadomości</p>
          </div>
        )}
      </div>
    </>
  );
}

function PillDropdown({ value, onChange, options }: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value)!;

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  return (
    <div className="relative flex-1" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-1 text-xs pl-3 pr-2 py-1.5 rounded-full bg-muted hover:bg-muted/80 transition-colors cursor-pointer text-foreground font-medium"
      >
        <span className="truncate">{selected.label}</span>
        <ChevronDown size={11} className="text-muted-foreground shrink-0" />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 w-full bg-popover border border-border rounded-xl shadow-lg z-50 overflow-hidden py-1">
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => { onChange(o.value); setOpen(false); }}
              className={`w-full text-left px-3 py-1.5 text-xs transition-colors hover:bg-muted ${o.value === value ? "font-semibold text-primary" : "text-foreground"}`}
            >
              {o.label}
            </button>
          ))}
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

function ChatSearchResults({ messages, query, onImageClick }: {
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
                  const before = excerpt.slice(0, idx - start + (start > 0 ? 1 : 0));
                  const match = excerpt.slice(idx - start + (start > 0 ? 1 : 0), idx - start + (start > 0 ? 1 : 0) + q.length);
                  const after = excerpt.slice(idx - start + (start > 0 ? 1 : 0) + q.length);
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

function MessageBubble({ msg, isOwn, onImageClick, receipts }: {
  msg: DiscussionMessage;
  isOwn: boolean;
  onImageClick: (url: string) => void;
  receipts?: ReadReceipt[];
}) {
  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
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
            onClick={() => onImageClick(msg.attachmentUrl!)}
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
        {receipts && receipts.length > 0 && (
          <div className="flex items-center gap-1 px-1 mt-0.5">
            {receipts.map((r) => (
              <span
                key={r.readerId}
                title={`${r.readerName} przeczytał(a)`}
                className="w-4 h-4 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[9px] font-bold leading-none flex-shrink-0 cursor-default select-none"
              >
                {r.readerName.charAt(0).toUpperCase()}
              </span>
            ))}
          </div>
        )}
        <span className="text-xs text-muted-foreground px-1">{formatTime(msg.createdAt)}</span>
      </div>
    </div>
  );
}
