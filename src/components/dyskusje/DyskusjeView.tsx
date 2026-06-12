"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { ChatBubble, Plus, Trash2, Edit2, Check, X, ExternalLink, ChevronDown, ChevronLeft, Paperclip, FileText, FileSpreadsheet, File as FileIcon, Loader2, FolderOpen, Mic, Square, Search, Archive, ArchiveRestore, CornerDownLeft, MoreVertical, Send, Users, UserPlus, UserMinus, AddReaction } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Pusher from "pusher-js";
import { useUploadThing } from "@/lib/uploadthing-client";
import { convertHeicFiles } from "@/lib/convert-heic";
import ImageAnnotationModal from "./ImageAnnotationModal";
import { SwipeableMessage } from "@/components/ui/swipeable-message";
import { playMessageSound } from "@/lib/notification-sound";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

interface ReadReceipt {
  readerId: string;
  readerName: string;
  readerType: string;
  lastMessageId: string | null;
}

interface Participant {
  userId: string;
  name: string;
  avatarUrl: string | null;
  role: string;
}

interface DiscussionSummary {
  id: string;
  title: string;
  type: string;
  projectId: string | null;
  project: { id: string; title: string } | null;
  messageCount: number;
  lastMessage: { id?: string; content: string; authorName: string; createdAt: string } | null;
  myReadMessageId?: string | null;
  unreadCount?: number;
  contractorAssignmentId?: string | null;
  archived: boolean;
  updatedAt: string;
  participants?: Participant[];
}

interface MessageReaction {
  userId: string;
  userName: string;
  emoji: string;
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
  replyToId?: string | null;
  replyToContent?: string | null;
  replyToAuthor?: string | null;
  createdAt: string;
  editedAt?: string | null;
  reactions?: MessageReaction[];
}

interface ProjectOption {
  id: string;
  title: string;
  contractorAssignmentId?: string | null;
}

interface TeamMember {
  id: string;
  name: string;
  avatarUrl: string | null;
}

interface Props {
  currentUserId: string;
  currentUserAvatarUrl?: string | null;
  initialDiscussions: DiscussionSummary[];
  projects: ProjectOption[];
  teamMembers?: TeamMember[];
  isTeamMember?: boolean;
}

type AttachmentType = "image" | "document" | "audio" | "pdf";

interface PendingAttachment {
  url: string;
  name: string;
  type: AttachmentType;
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

export default function DyskusjeView({ currentUserId, currentUserAvatarUrl, initialDiscussions, projects, teamMembers = [], isTeamMember = false }: Props) {
  const router = useRouter();
  const [discussions, setDiscussions] = useState<DiscussionSummary[]>(initialDiscussions);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<DiscussionMessage[]>([]);
  const [receipts, setReceipts] = useState<ReadReceipt[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [replyingToMsg, setReplyingToMsg] = useState<{ id: string; content: string; author: string } | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newProjectId, setNewProjectId] = useState<string | null>(null);
  const [newIsContractorChat, setNewIsContractorChat] = useState(false);
  const [newType, setNewType] = useState<"internal" | "project" | "contractor">("internal");
  const [newParticipantIds, setNewParticipantIds] = useState<string[]>([]);
  const [showMembers, setShowMembers] = useState(false);
  const [membersData, setMembersData] = useState<{
    owner: { id: string; name: string | null; fullName: string | null; avatarUrl: string | null; role: string } | null;
    participants: { userId: string; user: { id: string; name: string | null; fullName: string | null; avatarUrl: string | null; role: string } }[];
    eligibleTeamMembers: { id: string; name: string | null; fullName: string | null; avatarUrl: string | null; role: string }[];
    eligibleClients: { id: string; name: string | null; fullName: string | null; avatarUrl: string | null; role: string }[];
  } | null>(null);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [headerEditing, setHeaderEditing] = useState(false);
  const [headerTitle, setHeaderTitle] = useState("");
  const [headerProjectId, setHeaderProjectId] = useState<string | null>(null);
  const [headerIsContractorChat, setHeaderIsContractorChat] = useState(false);
  const [savingHeader, setSavingHeader] = useState(false);
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [showResources, setShowResources] = useState(false);
  const [resourceTab, setResourceTab] = useState<"all" | "images" | "docs" | "sheets">("all");
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [lastReadTimes, setLastReadTimes] = useState<Record<string, string>>(() => {
    if (typeof window === "undefined") return {};
    const times: Record<string, string> = {};
    initialDiscussions.forEach((d) => {
      const val = localStorage.getItem(`discussion-read-${d.id}`);
      if (val) {
        times[d.id] = val;
      } else if (
        d.myReadMessageId &&
        d.lastMessage?.id &&
        d.myReadMessageId === d.lastMessage.id
      ) {
        // DB says this discussion was last read up to the latest message — treat as read
        const syntheticTime = new Date().toISOString();
        localStorage.setItem(`discussion-read-${d.id}`, syntheticTime);
        times[d.id] = syntheticTime;
      }
    });
    return times;
  });
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "internal" | "project" | "contractor">("all");
  const [archivedFilter, setArchivedFilter] = useState<"active" | "archived">("active");
  const [chatSearch, setChatSearch] = useState("");
  const [chatSearchOpen, setChatSearchOpen] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [annotatingImage, setAnnotatingImage] = useState<string | null>(null);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [sendingAnnotation, setSendingAnnotation] = useState(false);
  const [mobileActionsOpen, setMobileActionsOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mobileActionsRef = useRef<HTMLDivElement>(null);
  const inputTextareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const pusherRef = useRef<Pusher | null>(null);
  const pusherUnreadRef = useRef<Pusher | null>(null);
  const selectedIdRef = useRef<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const dragCounterRef = useRef(0);

  const { startUpload } = useUploadThing("discussionAttachmentUploader");

  const selected = discussions.find((d) => d.id === selectedId) ?? null;


  const markAsRead = useCallback((id: string) => {
    const now = new Date().toISOString();
    localStorage.setItem(`discussion-read-${id}`, now);
    setLastReadTimes((prev) => ({ ...prev, [id]: now }));
  }, []);

  // Keep selectedIdRef in sync for use inside Pusher closures
  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  // Reload members panel when switching discussions
  useEffect(() => {
    if (showMembers && selectedId) {
      setMembersData(null);
      loadMembers(selectedId);
    }
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Subscribe to all discussions on mount for real-time unread counting of non-selected threads
  useEffect(() => {
    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    });
    pusherUnreadRef.current = pusher;

    initialDiscussions.forEach((d) => {
      const ch = pusher.subscribe(`discussion-${d.id}`);
      ch.bind("new-message", (msg: { userId?: string | null; content?: string; authorName?: string; createdAt?: string; id?: string }) => {
        if (msg.userId === currentUserId) return;
        if (d.id === selectedIdRef.current) return; // selected thread already auto-reads
        playMessageSound();
        setDiscussions((prev) =>
          prev.map((x) =>
            x.id === d.id
              ? {
                  ...x,
                  unreadCount: (x.unreadCount ?? 0) + 1,
                  messageCount: x.messageCount + 1,
                  lastMessage: {
                    id: msg.id,
                    content: msg.content ?? "",
                    authorName: msg.authorName ?? "",
                    createdAt: msg.createdAt ?? new Date().toISOString(),
                  },
                  updatedAt: msg.createdAt ?? x.updatedAt,
                }
              : x
          )
        );
      });
    });

    // Listen for being added to a new discussion (team members)
    const userChannel = pusher.subscribe(`user-${currentUserId}`);
    userChannel.bind("added-to-discussion", (data: { discussionId: string; title: string; addedBy: string }) => {
      toast.info(`${data.addedBy} dodał Cię do dyskusji „${data.title}"`);
      router.refresh();
    });

    return () => {
      pusher.disconnect();
      pusherUnreadRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function hasUnread(d: DiscussionSummary): boolean {
    return (d.unreadCount ?? 0) > 0;
  }

  const sortedDiscussions = useMemo(() => {
    const unread = discussions.filter((d) => hasUnread(d));
    const read = discussions.filter((d) => !hasUnread(d));
    return [...unread, ...read];
  }, [discussions]);

  const filteredDiscussions = useMemo(() => {
    return sortedDiscussions
      .filter((d) => (archivedFilter === "archived" ? d.archived : !d.archived))
      .filter((d) => {
        if (typeFilter === "internal") return d.type !== "project" && d.type !== "contractor";
        if (typeFilter === "project") return d.type === "project";
        if (typeFilter === "contractor") return d.type === "contractor";
        return true;
      })
      .filter((d) => {
        if (!search) return true;
        const q = search.toLowerCase();
        return d.title.toLowerCase().includes(q) || d.lastMessage?.content.toLowerCase().includes(q);
      });
  }, [sortedDiscussions, archivedFilter, typeFilter, search]);


  useEffect(() => {
    const total = discussions.reduce((sum, d) => sum + (d.unreadCount ?? 0), 0);
    localStorage.setItem("discussions-unread-count", String(total));
    window.dispatchEvent(new Event("discussions-unread-updated"));
  }, [discussions]);

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
    function handle(e: MouseEvent) {
      if (mobileActionsRef.current && !mobileActionsRef.current.contains(e.target as Node)) {
        setMobileActionsOpen(false);
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
        setReceipts(dedupeReceipts(recs));
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
    if (!showResources) {
      bottomRef.current?.scrollIntoView({ behavior: "instant" });
    }
  }, [messages, showResources]);

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
      pusherRef.current?.unsubscribe(`discussion-${selectedId}`);
    };
  }, [selectedId]);

  function startHeaderEdit() {
    if (!selected) return;
    setHeaderTitle(selected.title);
    if (selected.type === "contractor" && selected.contractorAssignmentId) {
      // Find the project that owns this contractor assignment
      const project = projects.find((p) => p.contractorAssignmentId === selected.contractorAssignmentId);
      setHeaderProjectId(project?.id ?? null);
      setHeaderIsContractorChat(true);
    } else {
      setHeaderProjectId(selected.projectId);
      setHeaderIsContractorChat(false);
    }
    setHeaderEditing(true);
    setShowProjectDropdown(false);
  }

  function cancelHeaderEdit() {
    setHeaderEditing(false);
    setShowProjectDropdown(false);
    setHeaderIsContractorChat(false);
  }

  async function saveHeaderEdit() {
    if (!selected || savingHeader) return;
    setSavingHeader(true);
    try {
      const body: Record<string, unknown> = {};
      if (headerTitle.trim() && headerTitle.trim() !== selected.title) {
        body.title = headerTitle.trim();
      }

      const selectedProject = projects.find((p) => p.id === headerProjectId);
      const newContractorAssignmentId = headerIsContractorChat && selectedProject?.contractorAssignmentId
        ? selectedProject.contractorAssignmentId
        : null;

      const wasContractor = selected.type === "contractor";
      const willBeContractor = !!newContractorAssignmentId;

      if (willBeContractor && !wasContractor) {
        // Enabling contractor chat
        body.contractorAssignmentId = newContractorAssignmentId;
        body.projectId = null;
      } else if (!willBeContractor && wasContractor) {
        // Disabling contractor chat
        body.contractorAssignmentId = null;
        body.projectId = headerProjectId;
      } else if (!willBeContractor) {
        // Normal project assignment change
        const effectiveProjectId = headerProjectId;
        if (effectiveProjectId !== selected.projectId) {
          body.projectId = effectiveProjectId;
        }
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
                contractorAssignmentId: updated.contractorAssignmentId ?? null,
              }
            : d
        )
      );
      setHeaderEditing(false);
      setHeaderIsContractorChat(false);
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
    const reply = replyingToMsg;
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
          replyToId: reply?.id ?? null,
          replyToContent: reply?.content ?? null,
          replyToAuthor: reply?.author ?? null,
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
      if (inputTextareaRef.current) { inputTextareaRef.current.style.height = "40px"; }
      setPendingAttachments([]);
      setReplyingToMsg(null);
    } catch {
      toast.error("Nie udało się wysłać wiadomości");
    } finally {
      setSending(false);
    }
  }, [selectedId, input, pendingAttachments, sending, replyingToMsg]);

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
    const selectedProject = projects.find((p) => p.id === newProjectId);
    const contractorAssignmentId =
      newType === "contractor" && selectedProject?.contractorAssignmentId
        ? selectedProject.contractorAssignmentId
        : null;

    const body: Record<string, unknown> = {
      title: newTitle.trim(),
      type: newType,
      participantIds: newParticipantIds,
      ...(contractorAssignmentId
        ? { contractorAssignmentId }
        : newProjectId
        ? { projectId: newProjectId }
        : {}),
    };

    try {
      const res = await fetch("/api/discussions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      const d = await res.json();
      setDiscussions((prev) => [
        {
          id: d.id, title: d.title, type: d.type,
          projectId: d.projectId ?? null, project: null,
          messageCount: 0, lastMessage: null, unreadCount: 0,
          archived: false, updatedAt: d.createdAt ?? new Date().toISOString(),
          participants: (d.participants ?? []).map((p: { userId: string; user: { id: string; name: string | null; fullName: string | null; avatarUrl: string | null; role: string } }) => ({
            userId: p.userId, name: p.user.fullName || p.user.name || "", avatarUrl: p.user.avatarUrl ?? null, role: p.user.role,
          })),
        },
        ...prev,
      ]);
      setNewTitle("");
      setNewProjectId(null);
      setNewIsContractorChat(false);
      setNewType("internal");
      setNewParticipantIds([]);
      setShowNewModal(false);
      setSelectedId(d.id);
      router.refresh();
    } catch {
      toast.error("Nie udało się utworzyć dyskusji");
    }
  }

  async function loadMembers(discussionId: string) {
    setLoadingMembers(true);
    try {
      const res = await fetch(`/api/discussions/${discussionId}/participants`);
      if (!res.ok) throw new Error();
      setMembersData(await res.json());
    } catch {
      toast.error("Nie udało się załadować uczestników");
    } finally {
      setLoadingMembers(false);
    }
  }

  async function addMember(discussionId: string, userId: string) {
    const res = await fetch(`/api/discussions/${discussionId}/participants`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    if (!res.ok) { toast.error("Nie udało się dodać uczestnika"); return; }
    await loadMembers(discussionId);
  }

  async function removeMember(discussionId: string, userId: string) {
    const res = await fetch(`/api/discussions/${discussionId}/participants/${userId}`, { method: "DELETE" });
    if (!res.ok) { toast.error("Nie udało się usunąć uczestnika"); return; }
    await loadMembers(discussionId);
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

  async function handleEditMsg(msgId: string, content: string) {
    const res = await fetch(`/api/discussions/${selectedId}/messages/${msgId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    if (res.ok) {
      setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, content, editedAt: new Date().toISOString() } : m));
    } else {
      toast.error("Nie udało się edytować wiadomości");
    }
  }

  async function handleDeleteMsg(msgId: string) {
    if (!confirm("Usunąć tę wiadomość?")) return;
    const res = await fetch(`/api/discussions/${selectedId}/messages/${msgId}`, { method: "DELETE" });
    if (res.ok) {
      setMessages((prev) => prev.filter((m) => m.id !== msgId));
    } else {
      toast.error("Nie udało się usunąć wiadomości");
    }
  }

  async function handleToggleReaction(msgId: string, emoji: string) {
    if (!selectedId) return;
    // Optimistic update
    setMessages((prev) => prev.map((m) => {
      if (m.id !== msgId) return m;
      const reactions = m.reactions ?? [];
      const has = reactions.some((r) => r.userId === currentUserId && r.emoji === emoji);
      return {
        ...m,
        reactions: has
          ? reactions.filter((r) => !(r.userId === currentUserId && r.emoji === emoji))
          : [...reactions, { userId: currentUserId, userName: "Ja", emoji }],
      };
    }));
    await fetch(`/api/discussions/${selectedId}/messages/${msgId}/reactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emoji }),
    });
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
      {/* Nowy wątek modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-background rounded-2xl shadow-xl w-full max-w-md flex flex-col gap-0 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="font-semibold text-base">Nowy wątek</h2>
              <button
                onClick={() => setShowNewModal(false)}
                className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              {/* Title */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Nazwa wątku</label>
                <input
                  autoFocus
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Escape") setShowNewModal(false); }}
                  placeholder="Np. Wycena projektu..."
                  className="w-full text-sm px-3 py-2 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              {/* Type */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Typ</label>
                <div className="flex gap-2">
                  {(["internal", "project", "contractor"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => { setNewType(t); if (t === "internal") setNewProjectId(null); }}
                      className={`flex-1 px-3 py-2 rounded-xl text-xs font-medium border transition-colors ${newType === t ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"}`}
                    >
                      {t === "internal" ? "Wewnętrzny" : t === "project" ? "Projektowy" : "Wykonawca"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Project selector */}
              {newType !== "internal" && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Projekt</label>
                  <select
                    value={newProjectId ?? ""}
                    onChange={(e) => setNewProjectId(e.target.value || null)}
                    className="w-full text-sm px-3 py-2 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="">Bez przypisania</option>
                    {projects
                      .filter((p) => newType !== "contractor" || !!p.contractorAssignmentId)
                      .map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
                  </select>
                </div>
              )}

              {/* Team members */}
              {teamMembers.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Dodaj uczestników</label>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {teamMembers.map((m) => (
                      <label key={m.id} className="flex items-center gap-2.5 px-3 py-2 rounded-xl border border-border bg-background hover:bg-muted transition-colors cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newParticipantIds.includes(m.id)}
                          onChange={(e) => setNewParticipantIds((prev) => e.target.checked ? [...prev, m.id] : prev.filter((id) => id !== m.id))}
                          className="rounded accent-primary flex-shrink-0"
                        />
                        <Avatar name={m.name} logoUrl={m.avatarUrl} />
                        <span className="text-sm flex-1 truncate">{m.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-2 justify-end px-6 py-4 border-t border-border">
              <button
                onClick={() => setShowNewModal(false)}
                className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground rounded-xl transition-colors"
              >
                Anuluj
              </button>
              <Button
                onClick={createDiscussion}
                disabled={!newTitle.trim()}
              >
                Utwórz wątek
              </Button>
            </div>
          </div>
        </div>
      )}

      {annotatingImage && (
        <ImageAnnotationModal
          imageUrl={annotatingImage}
          onClose={() => setAnnotatingImage(null)}
          onSend={handleAnnotationSend}
          sending={sendingAnnotation}
        />
      )}
      <AlertDialog open={showArchiveConfirm} onOpenChange={setShowArchiveConfirm}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Zarchiwizować dyskusję?</AlertDialogTitle>
            <AlertDialogDescription>
              Dyskusja zostanie przeniesiona do archiwum. Możesz ją przywrócić w dowolnym momencie.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selected) toggleArchive(selected.id, false);
                setShowArchiveConfirm(false);
              }}
            >
              Zarchiwizuj
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <div className="flex flex-1 min-h-0 -mx-3 sm:-mx-6 -my-4 sm:-my-6 overflow-hidden bg-muted/30">
        {/* Sidebar */}
        <div className={`md:flex-shrink-0 flex flex-col md:border-r border-border w-full md:w-72 ${selectedId ? "hidden md:flex" : "flex"}`}>
          {/* Header */}
          <div className="px-4 pt-4 pb-3 space-y-3 border-b border-border">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-base">Dyskusje</h2>
              {!isTeamMember && (
                <Button
                  size="sm"
                  onClick={() => { setShowNewModal(true); setNewTitle(""); setNewType("internal"); setNewProjectId(null); setNewParticipantIds([]); }}
                >
                  <Plus size={14} />
                  Nowy wątek
                </Button>
              )}
            </div>

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
                  { value: "contractor", label: "Wykonawca" },
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
                <ChatBubble size={32} className="opacity-30" />
                <p className="text-sm">Brak dyskusji</p>
                <p className="text-xs">Dyskusje projektu tworzone są automatycznie</p>
              </div>
            ) : filteredDiscussions.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">Brak wyników</div>
            ) : (
              filteredDiscussions.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => {
                      setSelectedId(d.id);
                      markAsRead(d.id);
                      setDiscussions((prev) => prev.map((x) => x.id === d.id ? { ...x, unreadCount: 0 } : x));
                      setHeaderEditing(false);
                      setShowResources(false);
                    }}
                    className={`group w-full text-left px-4 py-3 border-b border-border/50 transition-colors ${
                      selectedId === d.id ? "bg-primary/10 border-l-2 border-l-primary" : "hover:bg-muted/60"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-0.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {(d.unreadCount ?? 0) > 0 && (
                          <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center leading-none flex-shrink-0">
                            {(d.unreadCount ?? 0) > 99 ? "99+" : d.unreadCount}
                          </span>
                        )}
                        <span className={`text-sm font-medium truncate ${selectedId === d.id ? "text-primary" : ""}`}>{d.title}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-xs text-muted-foreground mt-0.5">
                          {formatTime(d.lastMessage?.createdAt ?? d.updatedAt)}
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
              ))
            )}
          </div>
        </div>

        {/* Main area */}
        {selected ? (
          <div
            className="flex-1 min-h-0 flex flex-col min-w-0 bg-background relative"
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
                  <div className="flex items-center gap-2 flex-wrap">
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
                            onClick={() => { setHeaderProjectId(null); setHeaderIsContractorChat(false); setShowProjectDropdown(false); }}
                            className={`w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors ${headerProjectId === null ? "font-medium text-primary" : "text-muted-foreground"}`}
                          >
                            Brak przypisania
                          </button>
                          {projects.map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => { setHeaderProjectId(p.id); setHeaderIsContractorChat(false); setShowProjectDropdown(false); }}
                              className={`w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors truncate ${headerProjectId === p.id ? "font-medium text-primary" : "text-foreground"}`}
                            >
                              {p.title}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {headerProjectId && projects.find((p) => p.id === headerProjectId)?.contractorAssignmentId && (
                      <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none text-muted-foreground hover:text-foreground">
                        <input
                          type="checkbox"
                          checked={headerIsContractorChat}
                          onChange={(e) => setHeaderIsContractorChat(e.target.checked)}
                          className="rounded accent-primary"
                        />
                        Chat z wykonawcą
                      </label>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSelectedId(null)}
                    className="md:hidden p-1.5 -ml-1 rounded-lg text-muted-foreground hover:bg-muted transition-colors flex-shrink-0"
                    aria-label="Wróć do listy"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h2 className="font-semibold text-sm">{selected.title}</h2>
                      {selected.type === "contractor" && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700 font-semibold shrink-0">Wykonawca</span>
                      )}
                      {selected.type === "project" && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold shrink-0">Projektowy</span>
                      )}
                      {selected.type === "internal" && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-semibold shrink-0">Wewnętrzny</span>
                      )}
                    </div>
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
                    {/* Desktop tools */}
                    <div className="hidden md:flex gap-1 items-center">
                      <button
                        onClick={() => { setChatSearchOpen((v) => !v); setChatSearch(""); }}
                        title="Szukaj w wiadomościach"
                        className={`p-1.5 rounded-lg transition-colors ${chatSearchOpen ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
                      >
                        <Search size={14} />
                      </button>
                      {(() => {
                        const fileCount = messages.filter((m) => m.attachmentType === "document" || m.attachmentType === "pdf" || m.attachmentType === "image").length;
                        return (
                          <button
                            onClick={() => { setShowResources((v) => !v); setResourceTab("all"); setShowMembers(false); }}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors ${showResources ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
                            title="Pliki dyskusji"
                          >
                            <FolderOpen size={13} />
                            Pliki{fileCount > 0 && <span className="font-semibold">{fileCount}</span>}
                          </button>
                        );
                      })()}
                      {!isTeamMember && (
                        <button
                          onClick={() => {
                            const opening = !showMembers;
                            setShowMembers(opening);
                            if (opening) { loadMembers(selected.id); setShowResources(false); }
                          }}
                          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors ${showMembers ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
                          title="Uczestnicy dyskusji"
                        >
                          <Users size={13} />
                          Uczestnicy
                          {((selected.participants?.length ?? 0) + 1) > 1 && (
                            <span className="font-semibold">{(selected.participants?.length ?? 0) + 1}</span>
                          )}
                        </button>
                      )}
                      <button
                        onClick={startHeaderEdit}
                        className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                        title="Edytuj"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => selected.archived ? toggleArchive(selected.id, true) : setShowArchiveConfirm(true)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                        title={selected.archived ? "Przywróć dyskusję" : "Zarchiwizuj dyskusję"}
                      >
                        {selected.archived ? <ArchiveRestore size={14} /> : <Archive size={14} />}
                      </button>
                      <button
                        onClick={() => deleteDiscussion(selected.id)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-destructive transition-colors"
                        title="Usuń dyskusję"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    {/* Mobile: 3-dot menu */}
                    <div className="md:hidden relative" ref={mobileActionsRef}>
                      <button
                        onClick={() => setMobileActionsOpen((v) => !v)}
                        className={`p-1.5 rounded-lg transition-colors ${mobileActionsOpen ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
                        aria-label="Opcje wątku"
                      >
                        <MoreVertical size={18} />
                      </button>
                      {mobileActionsOpen && (
                        <div className="absolute right-0 top-full mt-1 w-52 bg-card border border-border rounded-xl shadow-lg z-50 py-1 overflow-hidden">
                          <button
                            onClick={() => { setChatSearchOpen((v) => !v); setChatSearch(""); setMobileActionsOpen(false); }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
                          >
                            <Search size={15} className="shrink-0 text-muted-foreground" />
                            Szukaj w dyskusji
                          </button>
                          <button
                            onClick={() => { setShowResources((v) => !v); setResourceTab("all"); setShowMembers(false); setMobileActionsOpen(false); }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
                          >
                            <FolderOpen size={15} className="shrink-0 text-muted-foreground" />
                            Pliki dyskusji
                            {(() => {
                              const fileCount = messages.filter((m) => m.attachmentType === "document" || m.attachmentType === "pdf" || m.attachmentType === "image").length;
                              return fileCount > 0 ? <span className="ml-auto text-xs text-muted-foreground">{fileCount}</span> : null;
                            })()}
                          </button>
                          {!isTeamMember && (
                            <button
                              onClick={() => {
                                const opening = !showMembers;
                                setShowMembers(opening);
                                if (opening) { loadMembers(selected.id); setShowResources(false); }
                                setMobileActionsOpen(false);
                              }}
                              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
                            >
                              <Users size={15} className="shrink-0 text-muted-foreground" />
                              Uczestnicy
                              {((selected.participants?.length ?? 0) + 1) > 1 && (
                                <span className="ml-auto text-xs text-muted-foreground">{(selected.participants?.length ?? 0) + 1}</span>
                              )}
                            </button>
                          )}
                          <div className="mx-3 my-1 border-t border-border" />
                          <button
                            onClick={() => { startHeaderEdit(); setMobileActionsOpen(false); }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
                          >
                            <Edit2 size={15} className="shrink-0 text-muted-foreground" />
                            Edytuj tytuł
                          </button>
                          <button
                            onClick={() => { selected.archived ? toggleArchive(selected.id, true) : setShowArchiveConfirm(true); setMobileActionsOpen(false); }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
                          >
                            {selected.archived ? <ArchiveRestore size={15} className="shrink-0 text-muted-foreground" /> : <Archive size={15} className="shrink-0 text-muted-foreground" />}
                            {selected.archived ? "Przywróć dyskusję" : "Zarchiwizuj"}
                          </button>
                          <button
                            onClick={() => { deleteDiscussion(selected.id); setMobileActionsOpen(false); }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                          >
                            <Trash2 size={15} className="shrink-0" />
                            Usuń dyskusję
                          </button>
                        </div>
                      )}
                    </div>
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

            {/* Content row: messages column + files sidebar */}
            <div className="flex-1 min-h-0 flex overflow-hidden">

              {/* Messages + input column — hidden on mobile when files open */}
              <div className={`flex-1 min-h-0 flex flex-col min-w-0 ${(showResources || showMembers) ? "hidden md:flex" : "flex"}`}>
                {chatSearchOpen && chatSearch.trim() ? (
                  <ChatSearchResults
                    messages={messages}
                    query={chatSearch}
                    onImageClick={setAnnotatingImage}
                  />
                ) : (
                  <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-3 relative">
                {loadingMessages ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground text-sm">Ładowanie...</div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
                    <ChatBubble size={32} className="opacity-30" />
                    <p className="text-sm">Brak wiadomości</p>
                    <p className="text-xs">Zacznij pisać aby rozpocząć dyskusję</p>
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
                        const isOwn = msg.userId === currentUserId;
                        return (
                          <MessageBubble
                            key={msg.id}
                            msg={msg}
                            isOwn={isOwn}
                            currentUserId={currentUserId}
                            ownAvatarUrl={isOwn ? currentUserAvatarUrl : undefined}
                            onImageClick={setAnnotatingImage}
                            receipts={isOwn
                              ? receipts.filter((r) => r.lastMessageId === msg.id && r.readerId !== currentUserId)
                              : undefined}
                            onEdit={isOwn ? (content) => handleEditMsg(msg.id, content) : undefined}
                            onDelete={isOwn ? () => handleDeleteMsg(msg.id) : undefined}
                            onReply={() => setReplyingToMsg({ id: msg.id, content: msg.content || "[załącznik]", author: msg.authorName })}
                            onReact={(emoji) => handleToggleReaction(msg.id, emoji)}
                          />
                        );
                      })}
                    </div>
                  ))
                )}

                <div ref={bottomRef} />
              </div>
            )}

            {/* Input */}
            <div className="px-4 py-3 border-t border-border flex flex-col gap-2">
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
                  <span className="flex-1 text-xs font-medium">Nagrywanie... {recordingSeconds}s</span>
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
                  title="Załącz pliki"
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
                  placeholder="Napisz wiadomość..."
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
              </div>{/* end messages column */}

              {/* Files sidebar: full-screen on mobile, w-80 on desktop */}
              {showResources && (
                <div className="flex-1 md:flex-none md:w-80 flex flex-col overflow-hidden md:border-l md:border-border">
                  {/* Sidebar header with close button */}
                  <div className="flex items-center justify-between px-4 py-2.5 border-b border-border flex-shrink-0">
                    <span className="text-sm font-semibold">Pliki dyskusji</span>
                    <button
                      onClick={() => setShowResources(false)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  {/* Tabs */}
                  <div className="flex gap-0 border-b border-border px-4 flex-shrink-0">
                    {([
                      { key: "all", label: "Wszystkie" },
                      { key: "images", label: "Zdjęcia" },
                      { key: "docs", label: "Dokumenty" },
                      { key: "sheets", label: "Arkusze" },
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
                  {/* Files content */}
                  <div className="flex-1 overflow-y-auto px-4 py-4">
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
                          <p className="text-sm">Brak plików</p>
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
              )}

              {/* Members sidebar */}
              {showMembers && !isTeamMember && (
                <div className="flex-1 md:flex-none md:w-80 flex flex-col overflow-hidden md:border-l md:border-border">
                  <div className="flex items-center justify-between px-4 py-2.5 border-b border-border flex-shrink-0">
                    <span className="text-sm font-semibold">Uczestnicy</span>
                    <button
                      onClick={() => setShowMembers(false)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                    {loadingMembers ? (
                      <div className="flex items-center justify-center h-20 text-muted-foreground text-sm">
                        <Loader2 size={16} className="animate-spin mr-2" /> Ładowanie...
                      </div>
                    ) : membersData ? (
                      <>
                        {/* Owner */}
                        {membersData.owner && (
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Właściciel</p>
                            <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl border border-border bg-background">
                              <Avatar name={membersData.owner.fullName || membersData.owner.name || "?"} logoUrl={membersData.owner.avatarUrl} />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{membersData.owner.fullName || membersData.owner.name}</p>
                                <p className="text-xs text-muted-foreground">Projektant</p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Current participants */}
                        {membersData.participants.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Obecni uczestnicy</p>
                            <div className="space-y-1.5">
                              {membersData.participants.map((p) => (
                                <div key={p.userId} className="flex items-center gap-2.5 px-3 py-2 rounded-xl border border-border bg-background">
                                  <Avatar name={p.user.fullName || p.user.name || "?"} logoUrl={p.user.avatarUrl} />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{p.user.fullName || p.user.name}</p>
                                    <p className="text-xs text-muted-foreground">{p.user.role === "client" ? "Klient" : "Zespół"}</p>
                                  </div>
                                  <button
                                    onClick={() => {
                                      const name = p.user.fullName || p.user.name || "tego uczestnika";
                                      if (!confirm(`Usunąć ${name} z dyskusji?`)) return;
                                      removeMember(selected.id, p.userId);
                                    }}
                                    className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10 transition-colors flex-shrink-0"
                                    title="Usuń uczestnika"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Eligible team members */}
                        {membersData.eligibleTeamMembers.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Dodaj z zespołu</p>
                            <div className="space-y-1.5">
                              {membersData.eligibleTeamMembers.map((u) => (
                                <div key={u.id} className="flex items-center gap-2.5 px-3 py-2 rounded-xl border border-border bg-background">
                                  <Avatar name={u.fullName || u.name || "?"} logoUrl={u.avatarUrl} />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{u.fullName || u.name}</p>
                                    <p className="text-xs text-muted-foreground">Zespół</p>
                                  </div>
                                  <button
                                    onClick={() => addMember(selected.id, u.id)}
                                    className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors flex-shrink-0"
                                    title="Dodaj do dyskusji"
                                  >
                                    <Plus size={13} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Eligible clients */}
                        {membersData.eligibleClients.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Dodaj klienta</p>
                            <div className="space-y-1.5">
                              {membersData.eligibleClients.map((u) => (
                                <div key={u.id} className="flex items-center gap-2.5 px-3 py-2 rounded-xl border border-border bg-background">
                                  <Avatar name={u.fullName || u.name || "?"} logoUrl={u.avatarUrl} />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{u.fullName || u.name}</p>
                                    <p className="text-xs text-muted-foreground">Klient</p>
                                  </div>
                                  <button
                                    onClick={() => addMember(selected.id, u.id)}
                                    className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors flex-shrink-0"
                                    title="Dodaj do dyskusji"
                                  >
                                    <Plus size={13} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {membersData.participants.length === 0 && membersData.eligibleTeamMembers.length === 0 && membersData.eligibleClients.length === 0 && (
                          <div className="flex flex-col items-center justify-center h-32 gap-2 text-muted-foreground">
                            <Users size={28} className="opacity-30" />
                            <p className="text-sm text-center">Brak dostępnych uczestników</p>
                            <p className="text-xs text-center">Przypisz projekt z klientem lub dodaj członków zespołu</p>
                          </div>
                        )}
                      </>
                    ) : null}
                  </div>
                </div>
              )}
            </div>{/* end content row */}
          </div>
        ) : (
          <div className="flex-1 hidden md:flex flex-col items-center justify-center text-muted-foreground gap-3 bg-background">
            <ChatBubble size={48} className="opacity-20" />
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

function Avatar({ name, logoUrl }: { name: string; logoUrl?: string | null }) {
  if (logoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={logoUrl} alt={name} title={name} className="w-7 h-7 rounded-full object-cover shrink-0 self-end mb-0.5 cursor-default" />;
  }
  const initials = name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  return (
    <div title={name} className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary shrink-0 self-end mb-0.5 cursor-default">
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

const REACTION_EMOJIS = ["❤️", "😂", "😮", "😢", "😡", "👍"];

function MessageBubble({ msg, isOwn, currentUserId, ownAvatarUrl, onImageClick, receipts, onEdit, onDelete, onReply, onReact }: {
  msg: DiscussionMessage;
  isOwn: boolean;
  currentUserId?: string;
  ownAvatarUrl?: string | null;
  onImageClick: (url: string) => void;
  receipts?: ReadReceipt[];
  onEdit?: (content: string) => void;
  onDelete?: () => void;
  onReply?: () => void;
  onReact?: (emoji: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(msg.content);
  const [showMenu, setShowMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMobileActions, setShowMobileActions] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showMenu) return;
    function handle(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [showMenu]);

  useEffect(() => {
    if (!showEmojiPicker) return;
    function handle(e: MouseEvent) {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) setShowEmojiPicker(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [showEmojiPicker]);

  function saveEdit() {
    const trimmed = editContent.trim();
    if (!trimmed || trimmed === msg.content) { setIsEditing(false); return; }
    onEdit?.(trimmed);
    setIsEditing(false);
  }

  const actionBar = !isEditing && (
    <div className={`absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 ${isOwn ? "right-full pr-1 flex-row-reverse" : "left-full pl-1"}`}>
      {/* Emoji reaction picker — desktop only */}
      <div className="hidden md:block relative" ref={emojiPickerRef}>
        <button
          onClick={() => setShowEmojiPicker(v => !v)}
          title="Dodaj reakcję"
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <AddReaction size={14} />
        </button>
        {showEmojiPicker && (
          <div className={`absolute bottom-full mb-1 ${isOwn ? "right-0" : "left-0"} bg-popover border border-border rounded-2xl shadow-lg z-50 p-1.5 flex gap-0.5`}>
            {REACTION_EMOJIS.map((emoji) => {
              const hasReacted = msg.reactions?.some((r) => r.userId === currentUserId && r.emoji === emoji);
              return (
                <button
                  key={emoji}
                  onClick={() => { onReact?.(emoji); setShowEmojiPicker(false); }}
                  className={`w-8 h-8 flex items-center justify-center rounded-xl text-base transition-all hover:scale-125 ${hasReacted ? "bg-primary/15 ring-2 ring-primary/30" : "hover:bg-muted"}`}
                >
                  {emoji}
                </button>
              );
            })}
          </div>
        )}
      </div>
      <button
        onClick={onReply}
        title="Odpowiedz"
        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      >
        <CornerDownLeft size={14} />
      </button>
      {(onEdit || onDelete) && (
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowMenu(v => !v)}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <MoreVertical size={14} />
          </button>
          {showMenu && (
            <div className={`absolute bottom-full mb-1 ${isOwn ? "right-0" : "left-0"} bg-popover border border-border rounded-xl shadow-lg z-50 py-1 min-w-[120px]`}>
              {onEdit && (
                <button
                  onClick={() => { setEditContent(msg.content); setIsEditing(true); setShowMenu(false); }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2 transition-colors"
                >
                  <Edit2 size={13} className="text-muted-foreground" /> Edytuj
                </button>
              )}
              {onDelete && (
                <button
                  onClick={() => { onDelete(); setShowMenu(false); }}
                  className="w-full text-left px-3 py-2 text-sm text-destructive hover:bg-destructive/10 flex items-center gap-2 transition-colors"
                >
                  <Trash2 size={13} /> Usuń
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className={`flex items-end gap-2 ${isOwn ? "justify-end" : "justify-start"} group ${msg.reactions && msg.reactions.length > 0 ? "mb-6" : "mb-1.5"}`}>
      {!isOwn && <Avatar name={msg.authorName} />}
      <div className="max-w-[75%]">
      <SwipeableMessage
        isOwn={isOwn}
        onReply={onReply}
        onLongPress={() => setShowMobileActions(true)}
      >
      <div className={`flex flex-col gap-0.5 ${isOwn ? "items-end" : "items-start"}`}>
        {isEditing ? (
          <div className="flex flex-col gap-1 min-w-[220px]">
            <textarea
              autoFocus
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); saveEdit(); } if (e.key === "Escape") setIsEditing(false); }}
              className="w-full px-3 py-2 text-sm rounded-2xl border border-primary bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
              rows={2}
            />
            <div className="flex gap-1 justify-end">
              <button onClick={() => setIsEditing(false)} className="px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors">Anuluj</button>
              <button onClick={saveEdit} className="px-2 py-1 text-xs bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity">Zapisz</button>
            </div>
          </div>
        ) : (
          <>
            {msg.replyToContent && (
              <div className={`max-w-full px-2.5 py-1.5 rounded-xl text-[11px] border-l-2 border-primary/40 bg-muted/60 mb-0.5 ${isOwn ? "opacity-80" : ""}`}>
                <span className="font-semibold text-foreground/70">{msg.replyToAuthor}: </span>
                <span className="text-muted-foreground">{msg.replyToContent.length > 100 ? msg.replyToContent.slice(0, 100) + "…" : msg.replyToContent}</span>
              </div>
            )}
            {(() => {
              const reactions = msg.reactions && msg.reactions.length > 0
                ? REACTION_EMOJIS.map((emoji) => {
                    const group = msg.reactions!.filter((r) => r.emoji === emoji);
                    if (group.length === 0) return null;
                    return {
                      emoji,
                      count: group.length,
                      hasReacted: group.some((r) => r.userId === currentUserId),
                      names: group.map((r) => r.userName).join(", "),
                    };
                  }).filter(Boolean) as { emoji: string; count: number; hasReacted: boolean; names: string }[]
                : [];
              return (
            <div className="relative">
              <div className={`relative w-fit flex flex-col gap-0.5 ${isOwn ? "items-end ml-auto" : "items-start"} ${reactions.length > 0 ? "pb-3" : ""}`}>
                {msg.content && (
                  <div className={`rounded-2xl px-3 py-2 text-sm ${isOwn ? "bg-primary text-primary-foreground" : "bg-background border border-border"}`}>
                    {renderWithLinks(msg.content, isOwn)}
                    {msg.editedAt && <span className="text-[10px] opacity-50 ml-1.5">(edytowano)</span>}
                    {!msg.attachmentType && (
                      <div className={`flex justify-end items-center gap-1 mt-1 -mb-0.5 ${isOwn ? "text-primary-foreground/50" : "text-muted-foreground/60"}`}>
                        {receipts?.map((r) => (
                          <span key={r.readerId} title={`${r.readerName} przeczytał(a)`} className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold leading-none flex-shrink-0 ${isOwn ? "bg-white/60 text-primary" : "bg-primary/30 text-primary"}`}>
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
                      onClick={() => onImageClick(msg.attachmentUrl!)}
                      className="block rounded-2xl overflow-hidden border border-border hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-primary/40"
                      title="Kliknij aby zaznaczyć"
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
                      <span className="truncate max-w-[220px]">{msg.attachmentName || "Zdjęcie"}</span>
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
                      <span className="text-xs font-medium truncate flex-1">{msg.attachmentName || "Dokument PDF"}</span>
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
                    {receipts?.map((r) => (
                      <span key={r.readerId} title={`${r.readerName} przeczytał(a)`} className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold leading-none flex-shrink-0 ${isOwn ? "bg-white/60 text-primary" : "bg-primary/30 text-primary"}`}>
                        {r.readerName.charAt(0).toUpperCase()}
                      </span>
                    ))}
                    <span className="text-[10px] whitespace-nowrap leading-none">{formatTimeOnly(msg.createdAt)}</span>
                  </div>
                )}
                {/* Reaction badges — overlapping bottom-right of bubble */}
                {reactions.length > 0 && (
                  <div className="absolute bottom-0 right-0 translate-y-1/2 translate-x-1/4 flex gap-0.5 z-10">
                    {reactions.map(({ emoji, count, hasReacted, names }) => (
                      <button
                        key={emoji}
                        title={names}
                        onClick={() => onReact?.(emoji)}
                        className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs border shadow-sm transition-colors ${
                          hasReacted
                            ? "bg-primary/15 border-primary/30 text-primary"
                            : "bg-card border-border text-foreground hover:bg-muted"
                        }`}
                      >
                        {emoji}{count > 1 && <span className="font-medium ml-0.5">{count}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {actionBar}
            </div>
          );
        })()}
          </>
        )}
      </div>
      </SwipeableMessage>
      </div>
      {isOwn && <Avatar name={msg.authorName} logoUrl={ownAvatarUrl} />}

      {/* Mobile long-press actions panel */}
      {showMobileActions && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30" onClick={() => setShowMobileActions(false)} />
          <div className={`fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-2xl shadow-xl pb-safe`}>
            {/* Emoji bar */}
            <div className="flex items-center justify-around px-6 py-4 border-b border-border">
              {REACTION_EMOJIS.map((emoji) => {
                const hasReacted = msg.reactions?.some((r) => r.userId === currentUserId && r.emoji === emoji);
                return (
                  <button
                    key={emoji}
                    onClick={() => { onReact?.(emoji); setShowMobileActions(false); }}
                    className={`w-10 h-10 flex items-center justify-center rounded-full text-2xl transition-transform active:scale-125 ${hasReacted ? "bg-primary/15 ring-2 ring-primary/30" : "hover:bg-muted"}`}
                  >
                    {emoji}
                  </button>
                );
              })}
            </div>
            {/* Edit / Delete — only for own messages */}
            {(onEdit || onDelete) && (
              <div className="py-1">
                {onEdit && (
                  <button
                    onClick={() => { setEditContent(msg.content); setIsEditing(true); setShowMobileActions(false); }}
                    className="w-full flex items-center gap-3 px-5 py-3 text-sm text-foreground hover:bg-muted transition-colors"
                  >
                    <Edit2 size={16} className="text-muted-foreground shrink-0" />
                    Edytuj wiadomość
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={() => { onDelete(); setShowMobileActions(false); }}
                    className="w-full flex items-center gap-3 px-5 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                  >
                    <Trash2 size={16} className="shrink-0" />
                    Usuń wiadomość
                  </button>
                )}
              </div>
            )}
            <div className="pb-2" />
          </div>
        </>
      )}
    </div>
  );
}
