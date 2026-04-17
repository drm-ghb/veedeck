"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { MessageSquare, Plus, Trash2, Edit2, Check, X, ExternalLink, Info } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Pusher from "pusher-js";

interface DiscussionSummary {
  id: string;
  title: string;
  type: string;
  projectId: string | null;
  project: { id: string; title: string } | null;
  messageCount: number;
  lastMessage: { content: string; authorName: string; createdAt: string } | null;
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
  createdAt: string;
}

interface Props {
  initialDiscussions: DiscussionSummary[];
}

const SOURCE_LABELS: Record<string, string> = {
  render_comment: "Komentarz do renderu",
  render_pin: "Pinezka w renderze",
  product_comment: "Komentarz do produktu",
  chat: "",
};

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 1) return "wczoraj";
  if (diffDays < 7) return d.toLocaleDateString("pl-PL", { weekday: "short" });
  return d.toLocaleDateString("pl-PL", { day: "numeric", month: "short" });
}

export default function DyskusjeView({ initialDiscussions }: Props) {
  const router = useRouter();
  const [discussions, setDiscussions] = useState<DiscussionSummary[]>(initialDiscussions);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<DiscussionMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [showNewForm, setShowNewForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const pusherRef = useRef<Pusher | null>(null);

  const selected = discussions.find((d) => d.id === selectedId) ?? null;

  // Load messages when discussion selected
  useEffect(() => {
    if (!selectedId) return;
    setLoadingMessages(true);
    fetch(`/api/discussions/${selectedId}/messages`)
      .then((r) => r.json())
      .then((data) => {
        setMessages(Array.isArray(data) ? data : []);
        setLoadingMessages(false);
      })
      .catch(() => setLoadingMessages(false));
  }, [selectedId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Pusher subscription
  useEffect(() => {
    if (!selectedId) return;

    if (!pusherRef.current) {
      pusherRef.current = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      });
    }

    const channel = pusherRef.current.subscribe(`discussion-${selectedId}`);
    channel.bind("new-message", (msg: DiscussionMessage) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      setDiscussions((prev) =>
        prev.map((d) =>
          d.id === selectedId
            ? { ...d, messageCount: d.messageCount + 1, lastMessage: { content: msg.content, authorName: msg.authorName, createdAt: msg.createdAt }, updatedAt: msg.createdAt }
            : d
        )
      );
    });

    return () => {
      pusherRef.current?.unsubscribe(`discussion-${selectedId}`);
    };
  }, [selectedId]);

  const sendMessage = useCallback(async () => {
    if (!selectedId || !input.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/discussions/${selectedId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: input.trim() }),
      });
      if (!res.ok) throw new Error();
      setInput("");
    } catch {
      toast.error("Nie udało się wysłać wiadomości");
    } finally {
      setSending(false);
    }
  }, [selectedId, input, sending]);

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
        { id: d.id, title: d.title, type: d.type, projectId: null, project: null, messageCount: 0, lastMessage: null, updatedAt: d.createdAt ?? new Date().toISOString() },
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

  async function deleteDiscussion(id: string) {
    if (!confirm("Usunąć tę dyskusję i wszystkie wiadomości?")) return;
    try {
      const res = await fetch(`/api/discussions/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setDiscussions((prev) => prev.filter((d) => d.id !== id));
      if (selectedId === id) { setSelectedId(null); setMessages([]); }
      router.refresh();
    } catch {
      toast.error("Nie udało się usunąć dyskusji");
    }
  }

  return (
    <div className="flex h-[calc(100vh-120px)] gap-0 rounded-xl overflow-hidden border border-border bg-background">
      {/* Sidebar */}
      <div className="w-72 flex-shrink-0 flex flex-col border-r border-border">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="font-semibold text-sm">Dyskusje</span>
          <button
            onClick={() => { setShowNewForm(true); setNewTitle(""); }}
            className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            title="Nowa dyskusja"
          >
            <Plus size={16} />
          </button>
        </div>

        {showNewForm && (
          <div className="px-3 py-2 border-b border-border flex gap-2">
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

        <div className="flex-1 overflow-y-auto">
          {discussions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground px-4 text-center">
              <MessageSquare size={32} className="opacity-30" />
              <p className="text-sm">Brak dyskusji</p>
              <p className="text-xs">Dyskusje projektu tworzone są automatycznie</p>
            </div>
          ) : (
            discussions.map((d) => (
              editingId === d.id ? (
                <div
                  key={d.id}
                  className={`w-full text-left px-4 py-3 border-b border-border/50 ${selectedId === d.id ? "bg-muted" : ""}`}
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
                onClick={() => { setSelectedId(d.id); setEditingId(null); }}
                className={`w-full text-left px-4 py-3 border-b border-border/50 hover:bg-muted/50 transition-colors ${selectedId === d.id ? "bg-muted" : ""}`}
              >
                  <>
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${d.type === "project" ? "bg-primary" : "bg-muted-foreground"}`} />
                        <span className="text-sm font-medium truncate">{d.title}</span>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100">
                        {d.type !== "project" && (
                          <>
                            <span
                              onClick={(e) => { e.stopPropagation(); setEditingId(d.id); setEditTitle(d.title); }}
                              className="p-0.5 rounded text-muted-foreground hover:text-foreground"
                            >
                              <Edit2 size={12} />
                            </span>
                            <span
                              onClick={(e) => { e.stopPropagation(); deleteDiscussion(d.id); }}
                              className="p-0.5 rounded text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 size={12} />
                            </span>
                          </>
                        )}
                      </div>
                      {d.lastMessage && (
                        <span className="text-xs text-muted-foreground flex-shrink-0">{formatTime(d.lastMessage.createdAt)}</span>
                      )}
                    </div>
                    {d.project && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate pl-3.5">{d.project.title}</p>
                    )}
                    {d.lastMessage && (
                      <p className="text-xs text-muted-foreground mt-1 truncate pl-3.5">
                        <span className="font-medium">{d.lastMessage.authorName}:</span> {d.lastMessage.content}
                      </p>
                    )}
                  </>
              </button>
              )
            ))
          )}
        </div>
      </div>

      {/* Main area */}
      {selected ? (
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div className="px-5 py-3 border-b border-border flex items-center gap-3">
            <div>
              <h2 className="font-semibold text-sm">{selected.title}</h2>
              {selected.project && (
                <a
                  href={`/projects/${selected.project.id}`}
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  {selected.project.title}
                  <ExternalLink size={10} />
                </a>
              )}
            </div>
            {selected.type !== "project" && (
              <div className="ml-auto flex gap-2">
                <button
                  onClick={() => { setEditingId(selected.id); setEditTitle(selected.title); setSelectedId(null); setTimeout(() => setSelectedId(selected.id), 0); }}
                  className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  title="Zmień nazwę"
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
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
            {loadingMessages ? (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">Ładowanie...</div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
                <MessageSquare size={32} className="opacity-30" />
                <p className="text-sm">Brak wiadomości</p>
                <p className="text-xs">
                  {selected.type === "project"
                    ? "Komentarze i pinezki z renderów pojawią się tutaj automatycznie"
                    : "Zacznij pisać aby rozpocząć dyskusję"}
                </p>
              </div>
            ) : (
              messages.map((msg) => (
                <MessageBubble key={msg.id} msg={msg} />
              ))
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-5 py-3 border-t border-border flex gap-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder="Napisz wiadomość..."
              className="flex-1 px-4 py-2 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || sending}
              className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-xl hover:opacity-90 disabled:opacity-40 transition-opacity"
            >
              Wyślij
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
          <MessageSquare size={48} className="opacity-20" />
          <p className="text-sm">Wybierz dyskusję aby zobaczyć wiadomości</p>
        </div>
      )}
    </div>
  );
}

function MessageBubble({ msg }: { msg: DiscussionMessage }) {
  const isAggregated = msg.sourceType !== "chat";
  const sourceLabel = SOURCE_LABELS[msg.sourceType] || "";

  return (
    <div className={`flex flex-col gap-1 ${isAggregated ? "items-start" : "items-start"}`}>
      {isAggregated ? (
        <div className="max-w-[85%] bg-muted/60 border border-border rounded-xl px-3 py-2 text-sm">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-xs font-medium text-foreground">{msg.authorName}</span>
            {sourceLabel && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Info size={10} />
                {sourceLabel}
                {msg.sourceName && ` — ${msg.sourceName}`}
              </span>
            )}
            {msg.sourceUrl && (
              <a
                href={msg.sourceUrl}
                className="text-xs text-primary hover:underline flex items-center gap-0.5"
                title="Przejdź do źródła"
              >
                <ExternalLink size={10} />
                Zobacz
              </a>
            )}
          </div>
          <p className="text-sm text-foreground">{msg.content}</p>
          <p className="text-xs text-muted-foreground mt-1">{formatTime(msg.createdAt)}</p>
        </div>
      ) : (
        <div className="max-w-[85%]">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs font-medium text-foreground">{msg.authorName}</span>
            <span className="text-xs text-muted-foreground">{formatTime(msg.createdAt)}</span>
          </div>
          <div className="bg-background border border-border rounded-xl px-3 py-2 text-sm">
            {msg.content}
          </div>
        </div>
      )}
    </div>
  );
}
