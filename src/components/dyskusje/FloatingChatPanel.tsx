"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ChatBubble, X, ChevronLeft, ChevronDown, ExternalLink, Send, Paperclip, Mic, Loader2, Search, FolderOpen, MoreVertical, Edit2, Archive, ArchiveRestore, Trash2, Users } from "@/components/ui/icons";
import { useT } from "@/lib/i18n";
import { toast } from "sonner";
import Pusher from "pusher-js";
import { useUploadThing } from "@/lib/uploadthing-client";
import { showConfirm } from "@/lib/confirm";

interface DiscussionItem {
  id: string;
  title: string;
  type: string;
  avatarUrl?: string | null;
  project: { id: string; title: string } | null;
  lastMessage: { id?: string; content: string; authorName: string; createdAt: string } | null;
  unreadCount: number;
  updatedAt: string;
  archived: boolean;
}

interface FloatMessage {
  id: string;
  content: string;
  authorName: string;
  userId: string | null;
  createdAt: string;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  attachmentType?: string | null;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 1) return "wczoraj";
  if (diffDays < 7) return d.toLocaleDateString("pl-PL", { weekday: "short" });
  return d.toLocaleDateString("pl-PL", { day: "numeric", month: "short" });
}

function DiscAvatar({ title, avatarUrl, type, small }: { title: string; avatarUrl?: string | null; type?: string; small?: boolean }) {
  const initials = title
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("") || "?";
  const sz = small ? "w-7 h-7 text-xs" : "w-10 h-10 text-sm";
  const iconSz = small ? "w-3.5 h-3.5" : "w-5 h-5";
  if (type === "support") {
    return (
      <div className={`${sz} rounded-full bg-primary flex items-center justify-center shrink-0`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/veedeck_ikona_vsg.svg" alt="" className={iconSz} />
      </div>
    );
  }
  if (avatarUrl) {
    return <img src={avatarUrl} alt="" className={`${sz} rounded-full object-cover shrink-0`} />;
  }
  return (
    <div className={`${sz} rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold shrink-0`}>
      {initials}
    </div>
  );
}

export default function FloatingChatPanel({ userId, currentUserAvatarUrl }: { userId: string; currentUserAvatarUrl?: string | null }) {
  const t = useT();
  const pathname = usePathname();
  const router = useRouter();

  const [panelOpen, setPanelOpen] = useState(false);
  const [helpWidgetOpen, setHelpWidgetOpen] = useState(false);
  const [view, setView] = useState<"list" | "conversation" | "files" | "members">("list");
  const [typeFilter, setTypeFilter] = useState<"all" | "project" | "internal" | "contractor" | "support">("all");
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [discussions, setDiscussions] = useState<DiscussionItem[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<FloatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [totalUnread, setTotalUnread] = useState(0);
  const [pulsing, setPulsing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pendingAttachment, setPendingAttachment] = useState<{ url: string; name: string; type: string } | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [members, setMembers] = useState<{ id: string; name: string | null; fullName: string | null; avatarUrl: string | null; isOwner: boolean }[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [userAvatars, setUserAvatars] = useState<Record<string, string | null>>({});

  const prevUnreadRef = useRef(0);
  const selectedDiscUnreadRef = useRef(0);
  const isInitialScrollRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasFetchedOnce = useRef(false);
  const msgEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const typeDropdownRef = useRef<HTMLDivElement>(null);
  const headerMenuRef = useRef<HTMLDivElement>(null);
  const allPusherRef = useRef<Pusher | null>(null);
  const badgeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { startUpload } = useUploadThing("discussionAttachmentUploader");

  const onDyskusje = pathname.startsWith("/dyskusje");
  const onRenderView = /\/projekty\/[^/]+\/(renders|rooms)\//.test(pathname);

  // ── Hide button while HelpWidget is open ──────────────────────────────────
  useEffect(() => {
    function onHelpState(e: Event) {
      setHelpWidgetOpen((e as CustomEvent<{ open: boolean }>).detail.open);
    }
    window.addEventListener("help-widget-state", onHelpState);
    return () => window.removeEventListener("help-widget-state", onHelpState);
  }, []);

  // ── Shared badge count (same localStorage key as NavSidebar) ──────────────
  useEffect(() => {
    function readCount() {
      const val = localStorage.getItem("discussions-unread-count");
      setTotalUnread(val ? Math.max(0, parseInt(val, 10)) : 0);
    }
    readCount();
    window.addEventListener("discussions-unread-updated", readCount);
    window.addEventListener("storage", readCount);
    return () => {
      window.removeEventListener("discussions-unread-updated", readCount);
      window.removeEventListener("storage", readCount);
    };
  }, []);

  // ── One-time pulse when new unread arrives ─────────────────────────────────
  useEffect(() => {
    if (totalUnread > prevUnreadRef.current && !panelOpen) {
      setPulsing(true);
      const timer = setTimeout(() => setPulsing(false), 500);
      prevUnreadRef.current = totalUnread;
      return () => clearTimeout(timer);
    }
    prevUnreadRef.current = totalUnread;
  }, [totalUnread, panelOpen]);

  // ── Close panel — always resets selectedId to kill the conversation Pusher sub ──
  function closePanel() {
    setPanelOpen(false);
    setSelectedId(null);
    setView("list");
    setMessages([]);
    setInput("");
    setPendingAttachment(null);
  }

  // ── Auto-close on /dyskusje or RenderView ─────────────────────────────────
  useEffect(() => {
    if (onDyskusje || onRenderView) closePanel();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onDyskusje, onRenderView]);

  // ── Escape key ─────────────────────────────────────────────────────────────
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && panelOpen) closePanel();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panelOpen]);

  // ── Click outside ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!panelOpen) return;
    function onPointer(e: PointerEvent) {
      if (
        panelRef.current?.contains(e.target as Node) ||
        btnRef.current?.contains(e.target as Node)
      ) return;
      closePanel();
    }
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panelOpen]);

  // ── Close type dropdown on outside click ──────────────────────────────────
  useEffect(() => {
    if (!typeDropdownOpen) return;
    function onPointer(e: PointerEvent) {
      if (!typeDropdownRef.current?.contains(e.target as Node)) setTypeDropdownOpen(false);
    }
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [typeDropdownOpen]);

  useEffect(() => {
    if (!headerMenuOpen) return;
    function onPointer(e: PointerEvent) {
      if (!headerMenuRef.current?.contains(e.target as Node)) setHeaderMenuOpen(false);
    }
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [headerMenuOpen]);

  // ── Fetch discussion list ──────────────────────────────────────────────────
  const fetchList = useCallback(async () => {
    // Show skeleton only on first load; subsequent refreshes update silently
    if (!hasFetchedOnce.current) setLoadingList(true);
    try {
      const res = await fetch("/api/discussions");
      if (!res.ok) return;
      const data: DiscussionItem[] = await res.json();
      const active = data.filter((d) => !d.archived);
      active.sort((a, b) => {
        const aU = a.unreadCount > 0;
        const bU = b.unreadCount > 0;
        if (aU !== bU) return bU ? 1 : -1;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
      setDiscussions(active);
      hasFetchedOnce.current = true;
    } finally {
      setLoadingList(false);
    }
  }, []);

  // Prefetch on mount so the list is ready before user opens the panel
  useEffect(() => {
    fetchList();
  }, [fetchList]);

  // Silently refresh when panel re-opens
  useEffect(() => {
    if (panelOpen && view === "list") fetchList();
  }, [panelOpen, view, fetchList]);

  // ── Direct badge refetch — also syncs per-conversation unread counts ───────
  const refetchBadgeCount = useCallback(() => {
    if (badgeTimerRef.current) clearTimeout(badgeTimerRef.current);
    badgeTimerRef.current = setTimeout(() => {
      fetch("/api/discussions")
        .then((r) => r.json())
        .then((data: DiscussionItem[]) => {
          if (!Array.isArray(data)) return;
          const total = data.reduce((sum, d) => sum + (d.unreadCount ?? 0), 0);
          localStorage.setItem("discussions-unread-count", String(total));
          setTotalUnread(total);
          window.dispatchEvent(new Event("discussions-unread-updated"));
          // Also refresh per-conversation unread counts so the list is accurate
          const active = data.filter((d) => !d.archived);
          active.sort((a, b) => {
            const aU = a.unreadCount > 0;
            const bU = b.unreadCount > 0;
            if (aU !== bU) return bU ? 1 : -1;
            return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
          });
          setDiscussions(active);
        })
        .catch(() => {});
    }, 800);
  }, []);

  // ── Subscribe to all known discussion channels for badge updates ───────────
  useEffect(() => {
    if (discussions.length === 0) return;
    // Disconnect previous "all-discussions" Pusher before re-subscribing
    if (allPusherRef.current) {
      allPusherRef.current.disconnect();
      allPusherRef.current = null;
    }
    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    });
    allPusherRef.current = pusher;
    discussions.forEach((d) => {
      const ch = pusher.subscribe(`discussion-${d.id}`);
      ch.bind("new-message", (msg: { userId?: string | null }) => {
        if (msg.userId === userId) return; // skip own messages
        refetchBadgeCount();
      });
    });
    return () => {
      if (badgeTimerRef.current) clearTimeout(badgeTimerRef.current);
      pusher.disconnect();
      if (allPusherRef.current === pusher) allPusherRef.current = null;
    };
  }, [discussions, userId, refetchBadgeCount]);

  // ── Load messages when conversation is selected ────────────────────────────
  useEffect(() => {
    if (!selectedId) return;

    // Immediately clear badge using the captured unread count (before any API calls)
    const clearedCount = selectedDiscUnreadRef.current;
    if (clearedCount > 0) {
      const stored = parseInt(localStorage.getItem("discussions-unread-count") ?? "0", 10);
      const newTotal = Math.max(0, stored - clearedCount);
      localStorage.setItem("discussions-unread-count", String(newTotal));
      setTotalUnread(newTotal);
      window.dispatchEvent(new Event("discussions-unread-updated"));
      selectedDiscUnreadRef.current = 0;
    }

    isInitialScrollRef.current = false;
    setLoadingMessages(true);
    setMessages([]);
    setInput(localStorage.getItem(`float-draft-${selectedId}`) ?? "");

    fetch(`/api/discussions/${selectedId}/messages`)
      .then((r) => r.json())
      .then((data) => {
        const msgs: FloatMessage[] = Array.isArray(data) ? data : (data.messages ?? []);
        setUserAvatars(data.userAvatars ?? {});
        setMessages(msgs);
        const lastId = msgs.length > 0 ? msgs[msgs.length - 1].id : null;
        if (lastId) {
          fetch(`/api/discussions/${selectedId}/read`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lastMessageId: lastId }),
          })
            .then(() => refetchBadgeCount()) // background sync after read confirmed
            .catch(() => {});
        }
        // Clear this discussion's unread in the local list immediately
        setDiscussions((prev) => prev.map((d) => d.id === selectedId ? { ...d, unreadCount: 0 } : d));
      })
      .catch(() => {})
      .finally(() => setLoadingMessages(false));
  }, [selectedId, refetchBadgeCount]);

  // ── Scroll to bottom on new messages ──────────────────────────────────────
  useEffect(() => {
    if (messages.length === 0) return;
    if (!isInitialScrollRef.current) {
      // First load — jump instantly, no animation
      msgEndRef.current?.scrollIntoView({ behavior: "instant" });
      isInitialScrollRef.current = true;
    } else {
      // New Pusher message — smooth scroll
      msgEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length]);

  // ── Pusher: subscribe to active conversation ───────────────────────────────
  useEffect(() => {
    if (!selectedId) return;
    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    });
    const channel = pusher.subscribe(`discussion-${selectedId}`);
    channel.bind("new-message", (msg: FloatMessage) => {
      setMessages((prev) => prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]);
      if (msg.userId !== userId) {
        fetch(`/api/discussions/${selectedId}/read`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lastMessageId: msg.id }),
        }).catch(() => {});
      }
    });
    return () => {
      pusher.unsubscribe(`discussion-${selectedId}`);
      pusher.disconnect();
    };
  }, [selectedId, userId]);

  // ── File upload ────────────────────────────────────────────────────────────
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setUploading(true);
    try {
      const results = await startUpload([file]);
      if (results?.[0]) {
        const type = file.type.startsWith("image/") ? "image"
          : file.type === "application/pdf" ? "pdf"
          : "document";
        setPendingAttachment({ url: results[0].url, name: file.name, type });
      }
    } finally {
      setUploading(false);
    }
  }

  // ── Textarea auto-resize + draft save ─────────────────────────────────────
  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const v = e.target.value;
    setInput(v);
    if (selectedId) {
      if (v) localStorage.setItem(`float-draft-${selectedId}`, v);
      else localStorage.removeItem(`float-draft-${selectedId}`);
    }
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px";
    e.target.style.overflowY = e.target.scrollHeight > 160 ? "auto" : "hidden";
  }

  // ── Send ───────────────────────────────────────────────────────────────────
  async function sendMessage() {
    if ((!input.trim() && !pendingAttachment) || !selectedId || sending) return;
    const text = input.trim();
    const att = pendingAttachment;
    setInput("");
    setPendingAttachment(null);
    localStorage.removeItem(`float-draft-${selectedId}`);
    if (textareaRef.current) { textareaRef.current.style.height = "40px"; textareaRef.current.style.overflowY = "hidden"; }
    setSending(true);
    try {
      await fetch(`/api/discussions/${selectedId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: text,
          attachmentUrl: att?.url ?? null,
          attachmentName: att?.name ?? null,
          attachmentType: att?.type ?? null,
        }),
      });
    } catch {
      setInput(text);
      if (att) setPendingAttachment(att);
    } finally {
      setSending(false);
    }
  }

  // ── Discussion actions ────────────────────────────────────────────────────
  async function toggleArchive() {
    if (!selectedId) return;
    const disc = discussions.find((d) => d.id === selectedId);
    if (!disc) return;
    const res = await fetch(`/api/discussions/${selectedId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived: !disc.archived }),
    });
    if (res.ok) {
      setDiscussions((prev) => prev.map((d) => d.id === selectedId ? { ...d, archived: !disc.archived } : d));
    } else {
      toast.error(disc.archived ? t.dyskusje.restoreError : t.dyskusje.archiveError);
    }
  }

  async function deleteDiscussion() {
    if (!selectedId) return;
    if (!await showConfirm(t.dyskusje.deleteDiscussionConfirm)) return;
    const res = await fetch(`/api/discussions/${selectedId}`, { method: "DELETE" });
    if (res.ok) {
      setDiscussions((prev) => prev.filter((d) => d.id !== selectedId));
      goBack();
    } else {
      toast.error(t.dyskusje.deleteDiscussionError);
    }
  }

  async function saveTitle() {
    if (!selectedId) return;
    const disc = discussions.find((d) => d.id === selectedId);
    if (!disc) return;
    const trimmed = editTitle.trim();
    if (!trimmed || trimmed === disc.title) { setEditModalOpen(false); return; }
    const res = await fetch(`/api/discussions/${selectedId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: trimmed }),
    });
    if (res.ok) {
      setDiscussions((prev) => prev.map((d) => d.id === selectedId ? { ...d, title: trimmed } : d));
      setEditModalOpen(false);
    } else {
      toast.error("Błąd zapisu");
    }
  }

  async function loadMembers(id: string) {
    setLoadingMembers(true);
    try {
      const res = await fetch(`/api/discussions/${id}/participants`);
      if (!res.ok) return;
      const data = await res.json();
      const owner = data.owner ? [{ id: data.owner.id, name: data.owner.name, fullName: data.owner.fullName, avatarUrl: data.owner.avatarUrl, isOwner: true }] : [];
      const participants = (data.participants ?? []).map((p: { user: { id: string; name: string | null; fullName: string | null; avatarUrl: string | null } }) => ({
        id: p.user.id, name: p.user.name, fullName: p.user.fullName, avatarUrl: p.user.avatarUrl, isOwner: false,
      }));
      setMembers([...owner, ...participants]);
    } finally {
      setLoadingMembers(false);
    }
  }

  // ── Open in full Dyskusje module ──────────────────────────────────────────
  function handleOpenFull() {
    if (selectedId) localStorage.setItem("float-open-discussion-id", selectedId);
    closePanel();
    router.push("/dyskusje");
  }

  // ── Navigate back to list ─────────────────────────────────────────────────
  function goBack() {
    setSelectedId(null);
    setMessages([]);
    setInput("");
    setPendingAttachment(null);
    setView("list");
  }

  function openConversation(disc: DiscussionItem) {
    selectedDiscUnreadRef.current = disc.unreadCount; // capture before clearing
    setSelectedId(disc.id);
    setView("conversation");
  }

  function togglePanel() {
    if (panelOpen) {
      closePanel();
    } else {
      setView("list");
      setSelectedId(null);
      setMessages([]);
      setInput("");
      setPendingAttachment(null);
      setPanelOpen(true);
    }
  }

  const filteredDiscussions = discussions.filter((d) => {
    let pass = true;
    if (typeFilter === "project") pass = d.type === "project";
    else if (typeFilter === "internal") pass = d.type !== "project" && d.type !== "contractor" && d.type !== "support";
    else if (typeFilter === "contractor") pass = d.type === "contractor";
    else if (typeFilter === "support") pass = d.type === "support";
    if (pass && search.trim()) {
      const q = search.toLowerCase();
      pass = d.title.toLowerCase().includes(q) || (d.lastMessage?.content.toLowerCase().includes(q) ?? false);
    }
    return pass;
  });

  const selectedDisc = discussions.find((d) => d.id === selectedId) ?? null;
  const hasUnread = totalUnread > 0;
  const badgeLabel = totalUnread > 99 ? "99+" : String(totalUnread);

  const DROPDOWN_OPTIONS = [
    { value: "all", label: "Wszystkie" },
    { value: "contractor", label: t.dyskusje.typeContractor },
    { value: "support", label: t.dyskusje.typeSupport },
  ] as const;

  const dropdownLabel = DROPDOWN_OPTIONS.find((o) => o.value === typeFilter)?.label ?? "Wszystkie";
  const dropdownActive = typeFilter === "contractor" || typeFilter === "support";

  return (
    <>
      {/* Panel — same size as HelpWidget (380×600), positioned above the float button */}
      <div
        ref={panelRef}
        aria-hidden={!panelOpen}
        className={`fixed z-[51] sm:z-[45] flex flex-col bg-card overflow-hidden shadow-2xl transition-transform duration-[200ms] ease-out
          inset-0 rounded-none border-0
          sm:inset-auto sm:border sm:border-border sm:bottom-[88px] sm:right-4 sm:w-[380px] sm:h-[600px] sm:rounded-2xl sm:max-w-[calc(100vw-1rem)]
          ${panelOpen ? "translate-y-0 sm:translate-x-0" : "translate-y-full sm:translate-y-0 sm:translate-x-[calc(100%+1rem)]"}`}
      >
        {/* ── List view ─────────────────────────────────────────────────────── */}
        {view === "list" && (
          <>
            {/* Header */}
            <div className="shrink-0 px-4 pt-4 pb-0">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-base">{t.dyskusje.floatTitle}</h2>
                <button onClick={closePanel} className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground" aria-label="Zamknij">
                  <X size={22} />
                </button>
              </div>
              {/* Search */}
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/60 border border-border/50 mb-3">
                <Search size={13} className="text-muted-foreground shrink-0" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Szukaj rozmowy..."
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/70"
                />
                {search && (
                  <button onClick={() => setSearch("")} className="text-muted-foreground hover:text-foreground shrink-0">
                    <X size={12} />
                  </button>
                )}
              </div>
              {/* Filters */}
              <div className="flex gap-2 pb-3 border-b border-border items-center">
                {/* Wszystkie dropdown */}
                <div className="relative" ref={typeDropdownRef}>
                  <button
                    onClick={() => setTypeDropdownOpen((v) => !v)}
                    className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-full font-medium transition-colors whitespace-nowrap ${
                      dropdownActive
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/60 text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {dropdownLabel}
                    <ChevronDown size={11} className="shrink-0" />
                  </button>
                  {typeDropdownOpen && (
                    <div className="absolute top-full left-0 mt-1 bg-popover border border-border rounded-xl shadow-lg z-[48] overflow-hidden py-1 min-w-[140px]">
                      {DROPDOWN_OPTIONS.map((o) => (
                        <button
                          key={o.value}
                          onClick={() => { setTypeFilter(o.value); setTypeDropdownOpen(false); }}
                          className={`w-full text-left px-3 py-2 text-xs transition-colors hover:bg-muted ${
                            typeFilter === o.value ? "font-semibold text-primary" : "text-foreground"
                          }`}
                        >
                          {o.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {/* Klient pill */}
                <button
                  onClick={() => setTypeFilter(typeFilter === "project" ? "all" : "project")}
                  className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors whitespace-nowrap ${
                    typeFilter === "project"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/60 text-muted-foreground hover:bg-muted"
                  }`}
                >
                  Klient
                </button>
                {/* Wewnętrzne pill */}
                <button
                  onClick={() => setTypeFilter(typeFilter === "internal" ? "all" : "internal")}
                  className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors whitespace-nowrap ${
                    typeFilter === "internal"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/60 text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {t.dyskusje.typeInternal}
                </button>
              </div>
            </div>

            {/* Discussion list */}
            <div className="flex-1 overflow-y-auto">
              {loadingList ? (
                <div className="divide-y divide-border">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-3.5 animate-pulse">
                      <div className="w-10 h-10 rounded-full bg-muted shrink-0" />
                      <div className="flex-1 space-y-2 min-w-0">
                        <div className="h-3.5 bg-muted rounded w-3/4" />
                        <div className="h-3 bg-muted rounded w-full" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : discussions.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-12 px-6 text-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <ChatBubble size={26} className="text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground mb-1">{t.dyskusje.noDiscussions}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed max-w-[220px]">{t.dyskusje.floatNoChatsDesc}</p>
                  </div>
                </div>
              ) : filteredDiscussions.length === 0 ? (
                <div className="flex items-center justify-center py-12 text-sm text-muted-foreground px-6 text-center">
                  {t.common.noResults}
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {filteredDiscussions.map((disc) => (
                    <button
                      key={disc.id}
                      onClick={() => openConversation(disc)}
                      className={`w-full flex items-center gap-3 px-4 py-3.5 transition-colors text-left ${
                        disc.unreadCount > 0 ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-muted/40"
                      }`}
                    >
                      <DiscAvatar title={disc.title} avatarUrl={disc.avatarUrl} type={disc.type} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <p className={`text-sm truncate ${disc.unreadCount > 0 ? "font-semibold text-foreground" : "font-medium text-foreground"}`}>
                            {disc.title}
                          </p>
                          {disc.lastMessage && (
                            <span className="text-[11px] text-muted-foreground shrink-0">{formatTime(disc.lastMessage.createdAt)}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          {disc.type === "contractor" && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 font-semibold shrink-0">Wykonawca</span>
                          )}
                          <p className="text-xs text-muted-foreground truncate">
                            {disc.lastMessage ? disc.lastMessage.content || t.dyskusje.attachmentLabel : ""}
                          </p>
                        </div>
                      </div>
                      {disc.unreadCount > 0 && (
                        <span className="shrink-0 min-w-[20px] h-5 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                          {disc.unreadCount > 99 ? "99+" : disc.unreadCount}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* ── Conversation view ──────────────────────────────────────────────── */}
        {view === "conversation" && (
          <>
            {/* Header */}
            <div className="shrink-0 flex items-center gap-1.5 px-3 py-3 border-b border-border">
              <button onClick={goBack} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground shrink-0" aria-label={t.dyskusje.backToList}>
                <ChevronLeft size={18} />
              </button>
              {selectedDisc && <DiscAvatar title={selectedDisc.title} avatarUrl={selectedDisc.avatarUrl} type={selectedDisc.type} small />}
              <div className="flex-1 min-w-0 flex items-center gap-1 min-w-0">
                <p className="font-semibold text-sm truncate leading-snug">{selectedDisc?.title ?? ""}</p>
                <button onClick={handleOpenFull} className="p-1 rounded-md hover:bg-muted transition-colors text-muted-foreground shrink-0" title={t.dyskusje.floatOpenFull}>
                  <ExternalLink size={13} />
                </button>
              </div>
              <button onClick={() => setView("files")} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground shrink-0" title="Pliki">
                <FolderOpen size={16} />
              </button>
              <button
                onClick={() => { loadMembers(selectedId!); setView("members"); }}
                className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground shrink-0"
                title="Członkowie"
              >
                <Users size={16} />
              </button>
              <div className="relative shrink-0" ref={headerMenuRef}>
                <button
                  onClick={() => setHeaderMenuOpen((v) => !v)}
                  className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
                  title="Opcje"
                >
                  <MoreVertical size={16} />
                </button>
                {headerMenuOpen && (
                  <div className="absolute top-full right-0 mt-1 bg-popover border border-border rounded-xl shadow-lg z-[48] overflow-hidden py-1 min-w-[180px]">
                    <button
                      onClick={() => { handleOpenFull(); setHeaderMenuOpen(false); }}
                      className="w-full text-left px-3 py-2.5 text-xs text-foreground hover:bg-muted transition-colors flex items-center gap-2"
                    >
                      <ExternalLink size={13} className="text-muted-foreground" />
                      {t.dyskusje.floatOpenFull}
                    </button>
                    {selectedDisc?.type !== "support" && (
                      <>
                        <button
                          onClick={() => { setEditTitle(selectedDisc?.title ?? ""); setEditModalOpen(true); setHeaderMenuOpen(false); }}
                          className="w-full text-left px-3 py-2.5 text-xs text-foreground hover:bg-muted transition-colors flex items-center gap-2"
                        >
                          <Edit2 size={13} className="text-muted-foreground" />
                          {t.dyskusje.editTitle}
                        </button>
                        <button
                          onClick={() => { toggleArchive(); setHeaderMenuOpen(false); }}
                          className="w-full text-left px-3 py-2.5 text-xs text-foreground hover:bg-muted transition-colors flex items-center gap-2"
                        >
                          {selectedDisc?.archived
                            ? <ArchiveRestore size={13} className="text-muted-foreground" />
                            : <Archive size={13} className="text-muted-foreground" />}
                          {selectedDisc?.archived ? t.dyskusje.restoreDiscussion : t.dyskusje.archiveAction}
                        </button>
                      </>
                    )}
                    <div className="border-t border-border my-1" />
                    <button
                      onClick={() => { deleteDiscussion(); setHeaderMenuOpen(false); }}
                      className="w-full text-left px-3 py-2.5 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors flex items-center gap-2"
                    >
                      <Trash2 size={13} />
                      {t.dyskusje.deleteDiscussion}
                    </button>
                  </div>
                )}
              </div>
            </div>

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
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm py-12">
                  {t.dyskusje.noMessages}
                </div>
              ) : (
                messages.map((msg) => {
                  const isOwn = msg.userId === userId;
                  return (
                    <div key={msg.id} className={`flex items-end gap-2 mb-1.5 ${isOwn ? "justify-end" : "justify-start"}`}>
                      {!isOwn && <FloatAvatar name={msg.authorName} logoUrl={msg.userId ? userAvatars[msg.userId] : null} />}
                      <div
                        className={`max-w-[75%] px-3.5 py-2 text-sm leading-relaxed ${
                          isOwn
                            ? "bg-primary text-primary-foreground rounded-2xl rounded-br-sm"
                            : "bg-muted text-foreground rounded-2xl rounded-bl-sm"
                        }`}
                      >
                        {!isOwn && (
                          <p className="text-[10px] font-medium opacity-60 mb-0.5">{msg.authorName}</p>
                        )}
                        {msg.content && (
                          <p className="break-words whitespace-pre-wrap">{msg.content}</p>
                        )}
                        {msg.attachmentType === "image" && msg.attachmentUrl && (
                          <a href={msg.attachmentUrl} target="_blank" rel="noopener noreferrer" className="block mt-1">
                            <img src={msg.attachmentUrl} alt={msg.attachmentName ?? ""} className="max-w-[200px] rounded-lg object-cover" />
                          </a>
                        )}
                        {msg.attachmentType !== "image" && msg.attachmentUrl && (
                          <a
                            href={msg.attachmentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs underline opacity-80 mt-1 block"
                          >
                            {msg.attachmentName ?? t.dyskusje.attachmentLabel}
                          </a>
                        )}
                      </div>
                      {isOwn && <FloatAvatar name={msg.authorName} logoUrl={currentUserAvatarUrl} />}
                    </div>
                  );
                })
              )}
              <div ref={msgEndRef} />
            </div>

            {/* Input bar — matches DyskusjeView layout */}
            <div className="px-4 py-3 border-t border-border shrink-0 bg-background flex flex-col gap-2">
              {pendingAttachment && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted border border-border text-sm max-w-[220px]">
                  {pendingAttachment.type === "image" ? (
                    <img src={pendingAttachment.url} alt={pendingAttachment.name} className="h-8 w-8 rounded object-cover flex-shrink-0" />
                  ) : (
                    <Paperclip size={16} className="text-muted-foreground flex-shrink-0" />
                  )}
                  <span className="flex-1 truncate text-xs min-w-0">{pendingAttachment.name}</span>
                  <button
                    onClick={() => setPendingAttachment(null)}
                    className="text-muted-foreground hover:text-foreground flex-shrink-0 ml-1"
                  >
                    <X size={13} />
                  </button>
                </div>
              )}
              <div className="flex items-end gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.heic,.heif,application/pdf,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-primary text-white transition-colors disabled:opacity-40 hover:opacity-90"
                  title={t.dyskusje.attachFiles}
                >
                  {uploading ? <Loader2 size={16} className="animate-spin" /> : <Paperclip size={16} />}
                </button>
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder={t.dyskusje.messagePlaceholder}
                  rows={1}
                  style={{ height: "40px", overflowY: "hidden" }}
                  className="flex-1 min-h-10 max-h-40 px-3 py-2 text-sm resize-none rounded-2xl bg-muted focus:outline-none"
                />
                <button
                  onClick={input.trim() || pendingAttachment ? sendMessage : undefined}
                  disabled={sending || uploading}
                  className="flex-shrink-0 flex items-center justify-center w-8 h-8 text-primary disabled:opacity-40 hover:opacity-90 transition-colors"
                  aria-label={input.trim() || pendingAttachment ? "Wyślij" : "Mikrofon"}
                >
                  {sending ? (
                    <Loader2 className="w-7 h-7 animate-spin" />
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
        {/* ── Files view ─────────────────────────────────────────────────────── */}
        {view === "files" && (
          <>
            <div className="shrink-0 flex items-center gap-1.5 px-3 py-3 border-b border-border">
              <button onClick={() => setView("conversation")} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground shrink-0" aria-label="Wróć do rozmowy">
                <ChevronLeft size={18} />
              </button>
              <p className="font-semibold text-sm flex-1 min-w-0 truncate">Pliki</p>
            </div>
            <div className="flex-1 overflow-y-auto">
              {(() => {
                const attachments = messages.filter((m) => m.attachmentUrl);
                if (loadingMessages) {
                  return (
                    <div className="animate-pulse space-y-2 px-4 py-4">
                      {[1, 2, 3].map((i) => <div key={i} className="h-12 bg-muted rounded-xl" />)}
                    </div>
                  );
                }
                if (attachments.length === 0) {
                  return (
                    <div className="flex items-center justify-center h-full text-muted-foreground text-sm py-12">
                      Brak plików w tej rozmowie
                    </div>
                  );
                }
                return (
                  <div className="divide-y divide-border">
                    {attachments.map((msg) => (
                      <a
                        key={msg.id}
                        href={msg.attachmentUrl!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors"
                      >
                        {msg.attachmentType === "image" ? (
                          <img src={msg.attachmentUrl!} alt={msg.attachmentName ?? ""} className="w-10 h-10 rounded-lg object-cover shrink-0 border border-border" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0 border border-border">
                            <Paperclip size={16} className="text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{msg.attachmentName ?? "Plik"}</p>
                          <p className="text-xs text-muted-foreground">{msg.authorName} · {formatTime(msg.createdAt)}</p>
                        </div>
                      </a>
                    ))}
                  </div>
                );
              })()}
            </div>
          </>
        )}
        {/* ── Members view ───────────────────────────────────────────────────── */}
        {view === "members" && (
          <>
            <div className="shrink-0 flex items-center gap-1.5 px-3 py-3 border-b border-border">
              <button onClick={() => setView("conversation")} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground shrink-0" aria-label="Wróć do rozmowy">
                <ChevronLeft size={18} />
              </button>
              <p className="font-semibold text-sm flex-1 min-w-0 truncate">Członkowie</p>
            </div>
            <div className="flex-1 overflow-y-auto">
              {loadingMembers ? (
                <div className="animate-pulse space-y-2 px-4 py-4">
                  {[1, 2, 3].map((i) => <div key={i} className="h-12 bg-muted rounded-xl" />)}
                </div>
              ) : members.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm py-12">
                  Brak uczestników
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {members.map((m) => (
                    <div key={m.id} className="flex items-center gap-3 px-4 py-3">
                      <DiscAvatar title={m.fullName || m.name || "?"} avatarUrl={m.avatarUrl} small />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{m.fullName || m.name || "Użytkownik"}</p>
                        {m.isOwner && <p className="text-xs text-muted-foreground">Właściciel</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Edit title modal */}
      {editModalOpen && (
        <div className="fixed inset-0 z-[53] flex items-center justify-center bg-black/50 p-4" onClick={() => setEditModalOpen(false)}>
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-[360px] max-w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="font-semibold text-sm">{t.dyskusje.editTitle}</h3>
              <button onClick={() => setEditModalOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="px-5 py-4 space-y-4">
              <input
                autoFocus
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") saveTitle(); if (e.key === "Escape") setEditModalOpen(false); }}
                className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/40"
                placeholder="Nazwa rozmowy"
              />
              <div className="flex justify-end gap-2">
                <button onClick={() => setEditModalOpen(false)} className="px-4 py-2 text-sm rounded-xl border border-border hover:bg-muted transition-colors">
                  {t.common.cancel}
                </button>
                <button onClick={saveTitle} className="px-4 py-2 text-sm rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                  {t.common.save}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating button — z-[46] so it stays above the panel but below modals (z-50) */}
      <div
        className={`fixed bottom-6 right-6 z-[52] sm:z-[46] transition-opacity duration-[180ms] ${panelOpen ? "max-sm:hidden" : ""}`}
        style={{ opacity: (onDyskusje || onRenderView || helpWidgetOpen) ? 0 : 1, pointerEvents: (onDyskusje || onRenderView || helpWidgetOpen) ? "none" : "auto" }}
      >
        <button
          ref={btnRef}
          onClick={togglePanel}
          aria-label={panelOpen ? "Zamknij panel rozmów" : "Otwórz rozmowy"}
          className={`relative w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 hover:-translate-y-px ${
            hasUnread ? "bg-[#4F46E5] text-white" : "bg-background text-[#4F46E5] border border-border"
          } ${pulsing ? "scale-110" : "scale-100"}`}
          style={{
            boxShadow: hasUnread
              ? "0 6px 24px rgba(79,70,229,0.45), 0 2px 8px rgba(79,70,229,0.25)"
              : "0 4px 16px rgba(79,70,229,0.15), 0 1px 4px rgba(0,0,0,0.08)",
          }}
        >
          {panelOpen ? <X size={22} /> : <ChatBubble size={22} />}
          {!panelOpen && hasUnread && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center leading-none bg-background text-[#4F46E5] border border-[#4F46E5]/30">
              {badgeLabel}
            </span>
          )}
        </button>
      </div>
    </>
  );
}

function FloatAvatar({ name, logoUrl }: { name: string; logoUrl?: string | null }) {
  if (logoUrl) {
    return <img src={logoUrl} alt={name} title={name} className="w-7 h-7 rounded-full object-cover shrink-0 self-end mb-0.5" />;
  }
  const initials = name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "?";
  return (
    <div title={name} className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary shrink-0 self-end mb-0.5">
      {initials}
    </div>
  );
}

