"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { MessageSquare, ExternalLink, Info } from "lucide-react";
import { toast } from "sonner";
import Pusher from "pusher-js";

interface DiscussionMessage {
  id: string;
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
  token: string;
  discussionId: string;
  discussionTitle: string;
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

export default function ClientDiscussionView({ token, discussionId, discussionTitle }: Props) {
  const [messages, setMessages] = useState<DiscussionMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [authorName, setAuthorName] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const pusherRef = useRef<Pusher | null>(null);

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

  const sendMessage = useCallback(async () => {
    if (!input.trim() || sending || !authorName) return;
    setSending(true);
    try {
      const res = await fetch(`/api/share/${token}/discussions/${discussionId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: input.trim(),
          authorName,
          clientEmail: localStorage.getItem(`veedeck-author-email-${token}`) ?? undefined,
        }),
      });
      if (!res.ok) throw new Error();
      setInput("");
    } catch {
      toast.error("Nie udało się wysłać wiadomości");
    } finally {
      setSending(false);
    }
  }, [token, discussionId, input, sending, authorName]);

  if (!authorName) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm px-6">
        <p>Wróć do projektu i podaj swoje imię, aby korzystać z dyskusji.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 py-3 border-b border-border flex-shrink-0">
        <h2 className="font-semibold text-sm">{discussionTitle}</h2>
        <p className="text-xs text-muted-foreground">Dyskusja projektowa</p>
      </div>

      {/* Messages */}
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
            const isAggregated = msg.sourceType !== "chat";
            const sourceLabel = SOURCE_LABELS[msg.sourceType] || "";

            return (
              <div key={msg.id} className={`flex ${isOwn && !isAggregated ? "justify-end" : "justify-start"}`}>
                {isAggregated ? (
                  <div className="max-w-[85%] bg-muted/60 border border-border rounded-xl px-3 py-2 text-sm">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-xs font-medium">{msg.authorName}</span>
                      {sourceLabel && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Info size={10} />
                          {sourceLabel}
                          {msg.sourceName && ` — ${msg.sourceName}`}
                        </span>
                      )}
                    </div>
                    <p>{msg.content}</p>
                    <p className="text-xs text-muted-foreground mt-1">{formatTime(msg.createdAt)}</p>
                  </div>
                ) : (
                  <div className={`max-w-[75%] ${isOwn ? "items-end" : "items-start"} flex flex-col gap-0.5`}>
                    {!isOwn && <span className="text-xs font-medium text-foreground px-1">{msg.authorName}</span>}
                    <div className={`rounded-2xl px-3 py-2 text-sm ${isOwn ? "bg-primary text-primary-foreground" : "bg-background border border-border"}`}>
                      {msg.content}
                    </div>
                    <span className="text-xs text-muted-foreground px-1">{formatTime(msg.createdAt)}</span>
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-5 py-3 border-t border-border flex gap-3 flex-shrink-0">
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
  );
}
