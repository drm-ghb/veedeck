"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { X, Send, Trash2, Edit2, MoreHorizontal, CornerDownLeft, ChevronLeft, ChevronRight, Loader2, Paperclip } from "@/components/ui/icons";
import { useUploadThing } from "@/lib/uploadthing-client";
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
  imageUrl?: string | null;
  replies: Reply[];
}

interface ProductCommentPanelProps {
  productId: string;
  productName: string;
  productImageUrl?: string | null;
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
      <img src={logoUrl} alt={name} title={name} className="w-7 h-7 rounded-full object-cover shrink-0 cursor-default" />
    );
  }
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  return (
    <div title={name} className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary shrink-0 cursor-default">
      {initials}
    </div>
  );
}

export default function ProductCommentPanel({
  productId,
  productName,
  productImageUrl,
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
  const [replyingToComment, setReplyingToComment] = useState<{ id: string; content: string; author: string } | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState("");
  const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
  const [editingReplyText, setEditingReplyText] = useState("");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [showHighlights, setShowHighlights] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [pendingImageUrl, setPendingImageUrl] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const { startUpload: startImageUpload } = useUploadThing("listCommentImageUploader", {
    onClientUploadComplete: (res) => {
      const url = res[0]?.url;
      if (url) setPendingImageUrl(url);
      setUploadingImage(false);
    },
    onUploadError: () => {
      toast.error(t.products.imageUploadError);
      setUploadingImage(false);
    },
  });

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

    channel.bind("comment-edited", ({ id, content }: { id: string; content: string }) => {
      setComments((prev) =>
        prev.map((c) => c.id === id ? { ...c, content } : c)
      );
    });

    channel.bind("reply-updated", ({ commentId, replyId, content }: { commentId: string; replyId: string; content: string }) => {
      setComments((prev) =>
        prev.map((c) =>
          c.id === commentId
            ? { ...c, replies: c.replies.map((r) => r.id === replyId ? { ...r, content } : r) }
            : c
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
    if (!content && !pendingImageUrl || sending) return;
    setSending(true);
    try {
      if (replyingToComment) {
        const res = await fetch(`/api/list-comments/${replyingToComment.id}/replies`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content, author: authorName }),
        });
        if (!res.ok) throw new Error();
        setReplyingToComment(null);
      } else {
        const res = await fetch("/api/list-comments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId, content, author: authorName, listShareToken, imageUrl: pendingImageUrl }),
        });
        if (!res.ok) throw new Error();
        onCountChange?.(productId, comments.length + 1);
      }
      setText("");
      setPendingImageUrl(null);
      if (textareaRef.current) { textareaRef.current.style.height = "40px"; }
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    } catch {
      toast.error(t.share.sendError);
    } finally {
      setSending(false);
    }
  }

  async function handleEditComment(commentId: string, content: string) {
    const trimmed = content.trim();
    if (!trimmed) return;
    try {
      const res = await fetch(`/api/list-comments/${commentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: trimmed, authorName }),
      });
      if (!res.ok) throw new Error();
      setEditingCommentId(null);
    } catch {
      toast.error(t.share.sendError);
    }
  }

  async function handleEditReply(commentId: string, replyId: string, content: string) {
    const trimmed = content.trim();
    if (!trimmed) return;
    try {
      const res = await fetch(`/api/list-comments/${commentId}/replies/${replyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: trimmed }),
      });
      if (!res.ok) throw new Error();
      setEditingReplyId(null);
    } catch {
      toast.error(t.share.sendError);
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

  function canDelete(author: string) {
    return isDesigner || author === authorName;
  }

  return (
    <div className="fixed left-0 right-0 md:left-auto top-0 h-full z-50 flex flex-row items-end">
      {/* Expand handle on left edge */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="hidden md:flex items-center justify-center w-5 h-12 bg-background border border-r-0 border-border rounded-l-md shadow-md text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
        title={expanded ? t.share.collapsePanel : t.share.expandPanel}
      >
        {expanded ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
      </button>

      <div className={`h-full bg-background border-l border-border shadow-xl flex flex-col transition-[width] duration-200 w-full ${expanded ? "md:w-[640px]" : "md:w-80"}`}>

      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          {productImageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={productImageUrl} alt={productName} className="w-9 h-9 rounded-md object-cover shrink-0 border border-border" />
          )}
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">{t.share.comments}</p>
            <p className="text-sm font-semibold truncate">{productName}</p>
          </div>
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

        {(() => {
          type FlatItem =
            | { type: "comment"; id: string; content: string; author: string; createdAt: string; imageUrl?: string | null }
            | { type: "reply"; id: string; content: string; author: string; createdAt: string; commentId: string; parentContent: string; parentAuthor: string };

          const flatItems: FlatItem[] = comments.flatMap((comment) => [
            { type: "comment" as const, id: comment.id, content: comment.content, author: comment.author, createdAt: comment.createdAt, imageUrl: comment.imageUrl },
            ...comment.replies.map((reply) => ({
              type: "reply" as const,
              id: reply.id,
              content: reply.content,
              author: reply.author,
              createdAt: reply.createdAt,
              commentId: comment.id,
              parentContent: comment.content,
              parentAuthor: comment.author,
            })),
          ]).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

          return flatItems.map((item) => {
          const isMine = item.author === authorName;
          const unread = item.type === "comment" && isUnread(item as unknown as Comment);
          const isEditing = item.type === "comment" ? editingCommentId === item.id : editingReplyId === item.id;
          return (
            <div key={`${item.type}-${item.id}`} className={`flex mb-2 items-end gap-1.5 group ${isMine ? "justify-end" : "justify-start"}`}>
              {!isMine && <Avatar name={item.author} logoUrl={item.author === designerName ? designerLogoUrl : undefined} />}
              <div className={`max-w-[75%] flex flex-col ${isMine ? "items-end" : "items-start"}`}>
                {item.type === "reply" && (
                  <div className="px-2 py-1 rounded-lg text-[11px] border-l-2 border-primary/40 bg-muted/60 mb-1 max-w-full">
                    <span className="font-semibold text-foreground/70">{item.parentAuthor}: </span>
                    <span className="text-muted-foreground">{item.parentContent.length > 60 ? item.parentContent.slice(0, 60) + "…" : item.parentContent}</span>
                  </div>
                )}
                {isEditing ? (
                  <div className="flex flex-col gap-1 w-48">
                    <textarea autoFocus
                      value={item.type === "comment" ? editingCommentText : editingReplyText}
                      onChange={(e) => item.type === "comment" ? setEditingCommentText(e.target.value) : setEditingReplyText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && e.ctrlKey) {
                          if (item.type === "comment") handleEditComment(item.id, editingCommentText);
                          else handleEditReply(item.commentId, item.id, editingReplyText);
                        }
                        if (e.key === "Escape") {
                          if (item.type === "comment") setEditingCommentId(null);
                          else setEditingReplyId(null);
                        }
                      }}
                      className="px-2 py-1.5 text-sm border border-border rounded-lg bg-background focus:outline-none resize-none" rows={2}
                    />
                    <div className="flex gap-1 justify-end">
                      <button onClick={() => item.type === "comment" ? setEditingCommentId(null) : setEditingReplyId(null)} className="px-2 py-1 text-xs text-muted-foreground hover:text-foreground rounded-lg border">{t.common.cancel}</button>
                      <button onClick={() => item.type === "comment" ? handleEditComment(item.id, editingCommentText) : handleEditReply(item.commentId, item.id, editingReplyText)} className="px-2 py-1 text-xs bg-primary text-primary-foreground rounded-lg hover:opacity-90">{t.common.save}</button>
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    <div className={`px-3 py-2 text-sm break-words leading-snug ${
                      isMine
                        ? "bg-primary text-primary-foreground rounded-2xl rounded-br-sm"
                        : "bg-muted text-foreground rounded-2xl rounded-bl-sm"
                    } ${showHighlights && unread ? "ring-2 ring-offset-1 ring-primary/40" : ""}`}>
                      {item.content !== "[zdjęcie]" && item.content}
                      {item.type === "comment" && item.imageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.imageUrl} alt={t.share.photoAlt} className="mt-1 max-w-[200px] max-h-[200px] rounded-lg object-cover cursor-pointer" onClick={() => window.open(item.imageUrl!, "_blank")} />
                      )}
                      {showHighlights && unread && (
                        <span className="ml-1.5 text-[9px] font-semibold opacity-70">{t.share.newBadge}</span>
                      )}
                    </div>
                    <div className={`absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 ${isMine ? "right-full pr-1 flex-row-reverse" : "left-full pl-1"}`}>
                      <button
                        onClick={() => {
                          const replyToId = item.type === "comment" ? item.id : item.commentId;
                          setReplyingToComment({ id: replyToId, content: item.content, author: item.author });
                          textareaRef.current?.focus();
                        }}
                        title={t.share.reply}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      >
                        <CornerDownLeft size={13} />
                      </button>
                      {canDelete(item.author) && (
                        <div className="relative">
                          <button
                            onClick={() => setOpenMenuId(openMenuId === item.id ? null : item.id)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                          >
                            <MoreHorizontal size={13} />
                          </button>
                          {openMenuId === item.id && (
                            <div className={`absolute bottom-full mb-1 ${isMine ? "right-0" : "left-0"} bg-popover border border-border rounded-xl shadow-lg z-50 py-1 min-w-[110px]`}>
                              <button
                                onClick={() => {
                                  if (item.type === "comment") { setEditingCommentId(item.id); setEditingCommentText(item.content); }
                                  else { setEditingReplyId(item.id); setEditingReplyText(item.content); }
                                  setOpenMenuId(null);
                                }}
                                className="w-full text-left px-3 py-2 text-xs hover:bg-muted flex items-center gap-2 transition-colors"
                              >
                                <Edit2 size={12} className="text-muted-foreground" /> {t.common.edit}
                              </button>
                              <button
                                onClick={() => {
                                  if (item.type === "comment") handleDelete(item.id);
                                  else handleDeleteReply(item.commentId, item.id);
                                  setOpenMenuId(null);
                                }}
                                className="w-full text-left px-3 py-2 text-xs text-destructive hover:bg-destructive/10 flex items-center gap-2 transition-colors"
                              >
                                <Trash2 size={12} /> {t.common.delete}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                <span className={`text-[9px] text-muted-foreground px-1 mt-0.5 ${isMine ? "text-right" : "text-left"}`}>{formatDate(item.createdAt)}</span>
              </div>
            </div>
          );
        });
        })()}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-border shrink-0">
        {replyingToComment && (
          <div className="flex items-center gap-2 px-2 py-1.5 mb-2 bg-muted/60 rounded-lg border-l-2 border-primary/50">
            <CornerDownLeft size={11} className="text-primary flex-shrink-0" />
            <span className="flex-1 text-xs text-muted-foreground truncate">
              <span className="font-medium text-foreground">{replyingToComment.author}:</span>{" "}
              {replyingToComment.content.slice(0, 80)}{replyingToComment.content.length > 80 ? "…" : ""}
            </span>
            <button onClick={() => setReplyingToComment(null)} className="text-muted-foreground hover:text-foreground flex-shrink-0">
              <X size={12} />
            </button>
          </div>
        )}
        {/* Pending image preview */}
        {pendingImageUrl && (
          <div className="flex items-start gap-2 mb-2">
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={pendingImageUrl} alt={t.share.previewAlt} className="h-20 w-20 rounded-lg object-cover border" />
              <button
                onClick={() => setPendingImageUrl(null)}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-gray-800 text-white flex items-center justify-center hover:bg-red-500 transition-colors"
              >
                <X size={10} />
              </button>
            </div>
          </div>
        )}
        <div className="flex items-end gap-2">
          {/* Hidden file input */}
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setUploadingImage(true);
              startImageUpload([file]);
              e.target.value = "";
            }}
          />
          {/* Attachment button — designer only */}
          {isDesigner && (
            <button
              type="button"
              disabled={uploadingImage || sending}
              onClick={() => imageInputRef.current?.click()}
              title={t.render.addPhoto}
              className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-primary text-white transition-colors disabled:opacity-40 hover:opacity-90"
            >
              {uploadingImage ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Paperclip size={16} />
              )}
            </button>
          )}
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px";
              e.target.style.overflowY = e.target.scrollHeight > 160 ? "auto" : "hidden";
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
              if (e.key === "Escape") setReplyingToComment(null);
            }}
            placeholder={t.wykonawcy.messagePlaceholder}
            rows={1}
            style={{ height: "40px", overflowY: "hidden" }}
            className="flex-1 min-h-10 max-h-40 px-3 py-2 text-sm resize-none rounded-2xl bg-muted focus:outline-none"
          />
          <button
            onClick={handleSend}
            disabled={(!text.trim() && !pendingImageUrl) || sending || uploadingImage}
            className="flex-shrink-0 flex items-center justify-center w-8 h-8 text-primary disabled:opacity-40 hover:opacity-90 transition-colors"
          >
            <Send className="w-7 h-7" />
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}
