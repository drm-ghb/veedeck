"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { X, Send, Trash2, CornerDownRight, ChevronLeft, ChevronRight } from "lucide-react";
import { useT } from "@/lib/i18n";
import { pusherClient } from "@/lib/pusher";
import { toast } from "sonner";

interface Reply {
  id: string;
  content: string;
  author: string;
  createdAt: string;
}

interface Comment {
  id: string;
  content: string;
  author: string;
  createdAt: string;
  replies: Reply[];
}

interface ProductCommentPanelProps {
  productId: string;
  productName: string;
  isDesigner: boolean;
  authorName: string;
  designerName?: string;
  designerLogoUrl?: string;
  lastReadAt: string | null;
  onClose: () => void;
  onCountChange?: (productId: string, count: number) => void;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Avatar({ name, logoUrl }: { name: string; logoUrl?: string }) {
  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={logoUrl} alt={name} className="w-7 h-7 rounded-full object-cover shrink-0" />
    );
  }
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  return (
    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary shrink-0">
      {initials}
    </div>
  );
}

export default function ProductCommentPanel({
  productId,
  productName,
  isDesigner,
  authorName,
  designerName,
  designerLogoUrl,
  lastReadAt,
  onClose,
  onCountChange,
}: ProductCommentPanelProps) {
  const t = useT();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [showHighlights, setShowHighlights] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!lastReadAt) return;
    const timer = setTimeout(() => setShowHighlights(false), 2000);
    return () => clearTimeout(timer);
  }, [lastReadAt]);

  const isUnread = useCallback((comment: Comment) => {
    if (!lastReadAt) return false;
    return new Date(comment.createdAt) > new Date(lastReadAt);
  }, [lastReadAt]);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/list-comments?productId=${productId}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) {
          setComments(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [productId]);

  useEffect(() => {
    const channel = pusherClient.subscribe(`list-product-${productId}`);

    channel.bind("new-comment", (comment: Comment) => {
      setComments((prev) => {
        if (prev.find((c) => c.id === comment.id)) return prev;
        const next = [...prev, comment];
        onCountChange?.(productId, next.length);
        return next;
      });
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    });

    channel.bind("comment-deleted", ({ id }: { id: string }) => {
      setComments((prev) => {
        const next = prev.filter((c) => c.id !== id);
        onCountChange?.(productId, next.length);
        return next;
      });
    });

    channel.bind("comment-reply", ({ commentId, reply }: { commentId: string; reply: Reply }) => {
      setComments((prev) =>
        prev.map((c) =>
          c.id === commentId
            ? { ...c, replies: c.replies.find((r) => r.id === reply.id) ? c.replies : [...c.replies, reply] }
            : c
        )
      );
    });

    channel.bind("reply-deleted", ({ commentId, replyId }: { commentId: string; replyId: string }) => {
      setComments((prev) =>
        prev.map((c) =>
          c.id === commentId ? { ...c, replies: c.replies.filter((r) => r.id !== replyId) } : c
        )
      );
    });

    return () => {
      channel.unbind_all();
      pusherClient.unsubscribe(`list-product-${productId}`);
    };
  }, [productId, onCountChange]);

  // notify parent of initial count
  useEffect(() => {
    if (!loading) {
      onCountChange?.(productId, comments.length);
    }
  }, [loading, comments.length, productId, onCountChange]);

  async function handleSend() {
    const content = text.trim();
    if (!content || sending) return;
    setSending(true);
    try {
      const res = await fetch("/api/list-comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, content, author: authorName }),
      });
      if (!res.ok) throw new Error();
      setText("");
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    } catch {
      toast.error(t.share.sendError);
    } finally {
      setSending(false);
    }
  }

  async function handleDelete(commentId: string) {
    try {
      const res = await fetch(`/api/list-comments/${commentId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
    } catch {
      toast.error(t.share.deleteCommentError);
    }
  }

  async function handleDeleteReply(commentId: string, replyId: string) {
    try {
      const res = await fetch(`/api/list-comments/${commentId}/replies/${replyId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
    } catch {
      toast.error(t.share.deleteReplyError);
    }
  }

  async function handleSendReply(commentId: string) {
    const content = replyText.trim();
    if (!content || sendingReply) return;
    setSendingReply(true);
    try {
      const res = await fetch(`/api/list-comments/${commentId}/replies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, author: authorName }),
      });
      if (!res.ok) throw new Error();
      setReplyText("");
      setReplyingTo(null);
    } catch {
      toast.error(t.share.sendReplyError);
    } finally {
      setSendingReply(false);
    }
  }

  function canDelete(author: string) {
    return isDesigner || author === authorName;
  }

  return (
    <div className="fixed right-0 top-0 h-full z-50 flex flex-row items-end">
      {/* Expand handle on left edge */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="hidden md:flex items-center justify-center w-5 h-12 bg-background border border-r-0 border-border rounded-l-md shadow-md text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
        title={expanded ? t.share.collapsePanel : t.share.expandPanel}
      >
        {expanded ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
      </button>

      <div className={`h-full bg-background border-l border-border shadow-xl flex flex-col transition-[width] duration-200 ${expanded ? "w-[640px]" : "w-80"}`}>

      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border shrink-0">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{t.share.comments}</p>
          <p className="text-sm font-semibold truncate">{productName}</p>
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
        >
          <X size={16} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {loading && (
          <p className="text-xs text-muted-foreground text-center py-8">{t.common.loading}</p>
        )}
        {!loading && comments.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-8">
            {t.share.noComments}
          </p>
        )}

        {comments.map((comment) => {
          const unread = isUnread(comment);
          return (
          <div
            key={comment.id}
            className={`space-y-1.5 rounded-lg px-2 -mx-2 transition-colors duration-1000 ${
              showHighlights && unread ? "bg-primary/5 dark:bg-primary/10" : "bg-transparent"
            }`}
          >
            {/* Comment */}
            <div className="group flex gap-2 pt-1.5">
              <Avatar name={comment.author} logoUrl={comment.author === designerName ? designerLogoUrl : undefined} />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-xs font-semibold truncate">{comment.author}</span>
                  <span className="text-[10px] text-muted-foreground shrink-0">{formatDate(comment.createdAt)}</span>
                  {showHighlights && unread && (
                    <span className="text-[9px] font-semibold text-primary bg-primary/10 dark:bg-primary/20 px-1 py-0.5 rounded leading-none transition-opacity duration-1000">
                      {t.share.newBadge}
                    </span>
                  )}
                </div>
                <p className="text-sm text-foreground mt-0.5 break-words">{comment.content}</p>
                <div className="flex items-center gap-2 mt-1">
                  <button
                    onClick={() => { setReplyingTo(replyingTo === comment.id ? null : comment.id); setReplyText(""); }}
                    className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {t.share.reply}
                  </button>
                  {canDelete(comment.author) && (
                    <button
                      onClick={() => handleDelete(comment.id)}
                      className="text-[10px] text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={10} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Replies */}
            {comment.replies.map((reply) => (
              <div key={reply.id} className="group flex gap-2 pl-4 border-l-2 border-border ml-3">
                <Avatar name={reply.author} logoUrl={reply.author === designerName ? designerLogoUrl : undefined} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs font-semibold truncate">{reply.author}</span>
                    <span className="text-[10px] text-muted-foreground shrink-0">{formatDate(reply.createdAt)}</span>
                  </div>
                  <p className="text-sm text-foreground mt-0.5 break-words">{reply.content}</p>
                  {canDelete(reply.author) && (
                    <button
                      onClick={() => handleDeleteReply(comment.id, reply.id)}
                      className="text-[10px] text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100 mt-1"
                    >
                      <Trash2 size={10} />
                    </button>
                  )}
                </div>
              </div>
            ))}

            {/* Reply input */}
            {replyingTo === comment.id && (
              <div className="pl-4 ml-3 flex gap-1.5">
                <CornerDownRight size={12} className="text-muted-foreground mt-2 shrink-0" />
                <div className="flex-1 flex gap-1">
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && e.ctrlKey) handleSendReply(comment.id);
                      if (e.key === "Escape") { setReplyingTo(null); setReplyText(""); }
                    }}
                    placeholder={t.share.replyPlaceholder}
                    rows={1}
                    className="flex-1 px-2 py-1.5 text-xs border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary/30 resize-none"
                    autoFocus
                  />
                  <button
                    onClick={() => handleSendReply(comment.id)}
                    disabled={!replyText.trim() || sendingReply}
                    className="w-7 h-7 rounded-lg bg-primary text-white flex items-center justify-center disabled:opacity-40 hover:bg-primary/80 transition-colors shrink-0 mt-0.5"
                  >
                    <Send size={11} />
                  </button>
                </div>
              </div>
            )}
          </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-border shrink-0">
        <div className="flex gap-2">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && e.ctrlKey) handleSend();
            }}
            placeholder={t.share.messagePlaceholder}
            rows={2}
            className="flex-1 px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 resize-none"
          />
          <button
            onClick={handleSend}
            disabled={!text.trim() || sending}
            className="w-9 h-9 rounded-lg bg-primary text-white flex items-center justify-center disabled:opacity-40 hover:bg-primary/80 transition-colors self-end shrink-0"
          >
            <Send size={15} />
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}
