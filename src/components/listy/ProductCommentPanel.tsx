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
  listShareToken?: string;
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
  listShareToken,
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
        return [...prev, comment];
      });
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    });

    channel.bind("comment-deleted", ({ id }: { id: string }) => {
      setComments((prev) => prev.filter((c) => c.id !== id));
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
        body: JSON.stringify({ productId, content, author: authorName, listShareToken }),
      });
      if (!res.ok) throw new Error();
      setText("");
      // Optimistically update count so parent's lc_seen_ stays in sync
      // even if the user closes the panel before Pusher delivers the new-comment event
      onCountChange?.(productId, comments.length + 1);
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
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
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
          const isMine = comment.author === authorName;
          return (
            <div key={comment.id} className={`flex flex-col gap-0.5 ${isMine ? "items-end" : "items-start"}`}>
              {/* Bubble */}
              <div className={`flex gap-2 items-end max-w-[80%] ${isMine ? "flex-row-reverse" : "flex-row"}`}>
                {!isMine && <Avatar name={comment.author} logoUrl={comment.author === designerName ? designerLogoUrl : undefined} />}
                <div className="flex flex-col gap-0.5">
                  {!isMine && <span className="text-[10px] font-semibold text-muted-foreground px-1">{comment.author}</span>}
                  <div className={`group relative px-3 py-2 text-sm break-words leading-snug ${
                    isMine
                      ? "bg-primary text-primary-foreground rounded-2xl rounded-br-sm"
                      : "bg-muted text-foreground rounded-2xl rounded-bl-sm"
                  } ${showHighlights && unread ? "ring-2 ring-offset-1 ring-primary/40" : ""}`}>
                    {comment.content}
                    {showHighlights && unread && (
                      <span className="ml-1.5 text-[9px] font-semibold opacity-70">{t.share.newBadge}</span>
                    )}
                    {/* Hover actions */}
                    <div className={`absolute ${isMine ? "right-0" : "left-0"} -top-6 hidden group-hover:flex items-center gap-1.5 bg-popover border border-border rounded-md shadow-sm px-2 py-1 whitespace-nowrap`}>
                      <button
                        onClick={() => { setReplyingTo(replyingTo === comment.id ? null : comment.id); setReplyText(""); }}
                        className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                      >{t.share.reply}</button>
                      {canDelete(comment.author) && (
                        <button onClick={() => handleDelete(comment.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                          <Trash2 size={10} />
                        </button>
                      )}
                    </div>
                  </div>
                  <span className={`text-[9px] text-muted-foreground px-1 ${isMine ? "text-right" : "text-left"}`}>{formatDate(comment.createdAt)}</span>
                </div>
              </div>

              {/* Replies */}
              {comment.replies.length > 0 && (
                <div className={`flex flex-col gap-1 mt-0.5 w-full ${isMine ? "items-end pr-9" : "items-start pl-9"}`}>
                  {comment.replies.map((reply) => {
                    const isReplyMine = reply.author === authorName;
                    return (
                      <div key={reply.id} className={`flex gap-1.5 items-end max-w-[75%] ${isReplyMine ? "flex-row-reverse" : "flex-row"}`}>
                        {!isReplyMine && <Avatar name={reply.author} logoUrl={reply.author === designerName ? designerLogoUrl : undefined} />}
                        <div className="flex flex-col gap-0.5">
                          {!isReplyMine && <span className="text-[10px] font-semibold text-muted-foreground px-1">{reply.author}</span>}
                          <div className={`group relative px-2.5 py-1.5 text-xs break-words leading-snug ${
                            isReplyMine
                              ? "bg-primary/80 text-primary-foreground rounded-xl rounded-br-sm"
                              : "bg-muted/80 text-foreground rounded-xl rounded-bl-sm"
                          }`}>
                            {reply.content}
                            {canDelete(reply.author) && (
                              <button
                                onClick={() => handleDeleteReply(comment.id, reply.id)}
                                className={`absolute ${isReplyMine ? "left-0 -translate-x-5" : "right-0 translate-x-5"} top-1 hidden group-hover:block text-muted-foreground hover:text-destructive transition-colors`}
                              >
                                <Trash2 size={10} />
                              </button>
                            )}
                          </div>
                          <span className={`text-[9px] text-muted-foreground px-1 ${isReplyMine ? "text-right" : "text-left"}`}>{formatDate(reply.createdAt)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Reply input */}
              {replyingTo === comment.id && (
                <div className={`flex gap-1 mt-1 w-[85%] ${isMine ? "self-end flex-row-reverse" : "self-start pl-9"}`}>
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
                    className="w-7 h-7 rounded-lg bg-primary text-white flex items-center justify-center disabled:opacity-40 hover:bg-primary/80 transition-colors shrink-0 self-end"
                  >
                    <Send size={11} />
                  </button>
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
