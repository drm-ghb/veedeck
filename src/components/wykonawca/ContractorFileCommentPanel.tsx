"use client";

import { useEffect, useRef, useState } from "react";
import { X, Send, Trash2, Edit2, MoreHorizontal, CornerDownLeft, ChevronLeft, ChevronRight } from "@/components/ui/icons";
import { pusherClient } from "@/lib/pusher";
import { toast } from "sonner";

interface Reply {
  id: string;
  content: string;
  author: string;
  authorRole: string;
  createdAt: string;
}

interface Comment {
  id: string;
  content: string;
  author: string;
  authorRole: string;
  createdAt: string;
  posX?: number | null;
  posY?: number | null;
  replies: Reply[];
}

interface Props {
  fileId: string;
  fileName: string;
  thumbnailUrl?: string | null;
  authorName: string;
  authorRole: "contractor" | "designer";
  onClose: () => void;
  onCountChange?: (fileId: string, count: number) => void;
  /** "overlay" = fixed overlay (default, ContractorFilesGrid); "sidebar" = flex sibling (ContractorFileViewer) */
  mode?: "overlay" | "sidebar";
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

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  return (
    <div
      title={name}
      className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary shrink-0 cursor-default"
    >
      {initials}
    </div>
  );
}

export default function ContractorFileCommentPanel({
  fileId,
  fileName,
  thumbnailUrl,
  authorName,
  authorRole,
  onClose,
  onCountChange,
  mode = "overlay",
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{ id: string; content: string; author: string } | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState("");
  const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
  const [editingReplyText, setEditingReplyText] = useState("");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/contractor-file-comments?fileId=${fileId}`)
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
  }, [fileId]);

  useEffect(() => {
    const channel = pusherClient.subscribe(`contractor-file-${fileId}`);

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
      setComments((prev) => prev.map((c) => (c.id === id ? { ...c, content } : c)));
    });

    channel.bind("reply-updated", ({ commentId, reply }: { commentId: string; reply: Reply }) => {
      setComments((prev) =>
        prev.map((c) =>
          c.id === commentId
            ? { ...c, replies: c.replies.map((r) => (r.id === reply.id ? reply : r)) }
            : c
        )
      );
    });

    return () => {
      channel.unbind_all();
      pusherClient.unsubscribe(`contractor-file-${fileId}`);
    };
  }, [fileId]);

  useEffect(() => {
    if (!loading) {
      onCountChange?.(fileId, comments.length);
    }
  }, [loading, comments.length, fileId, onCountChange]);

  async function handleSend() {
    const content = text.trim();
    if (!content || sending) return;
    setSending(true);
    try {
      if (replyingTo) {
        const res = await fetch(`/api/contractor-file-comments/${replyingTo.id}/replies`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content, author: authorName, authorRole }),
        });
        if (!res.ok) throw new Error();
        setReplyingTo(null);
      } else {
        const res = await fetch("/api/contractor-file-comments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileId, content, author: authorName, authorRole }),
        });
        if (!res.ok) throw new Error();
      }
      setText("");
      if (textareaRef.current) { textareaRef.current.style.height = "40px"; }
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    } catch {
      toast.error("Błąd podczas wysyłania");
    } finally {
      setSending(false);
    }
  }

  async function handleEditComment(commentId: string, content: string) {
    const trimmed = content.trim();
    if (!trimmed) return;
    try {
      const res = await fetch(`/api/contractor-file-comments/${commentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: trimmed }),
      });
      if (!res.ok) throw new Error();
      setEditingCommentId(null);
    } catch {
      toast.error("Błąd podczas edycji");
    }
  }

  async function handleEditReply(commentId: string, replyId: string, content: string) {
    const trimmed = content.trim();
    if (!trimmed) return;
    try {
      const res = await fetch(`/api/contractor-file-comments/${commentId}/replies/${replyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: trimmed }),
      });
      if (!res.ok) throw new Error();
      setEditingReplyId(null);
    } catch {
      toast.error("Błąd podczas edycji");
    }
  }

  async function handleDelete(commentId: string) {
    try {
      const res = await fetch(`/api/contractor-file-comments/${commentId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
    } catch {
      toast.error("Błąd podczas usuwania");
    }
  }

  async function handleDeleteReply(commentId: string, replyId: string) {
    try {
      const res = await fetch(`/api/contractor-file-comments/${commentId}/replies/${replyId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
    } catch {
      toast.error("Błąd podczas usuwania");
    }
  }

  function canEdit(author: string) {
    return author === authorName;
  }

  function canDelete(author: string) {
    return authorRole === "designer" || author === authorName;
  }

  type FlatItem =
    | { type: "comment"; id: string; content: string; author: string; authorRole: string; createdAt: string }
    | { type: "reply"; id: string; content: string; author: string; authorRole: string; createdAt: string; commentId: string; parentContent: string; parentAuthor: string };

  const flatItems: FlatItem[] = comments
    .filter((c) => c.posX == null)
    .flatMap((c) => [
      { type: "comment" as const, id: c.id, content: c.content, author: c.author, authorRole: c.authorRole, createdAt: c.createdAt },
      ...c.replies.map((r) => ({
        type: "reply" as const,
        id: r.id,
        content: r.content,
        author: r.author,
        authorRole: r.authorRole,
        createdAt: r.createdAt,
        commentId: c.id,
        parentContent: c.content,
        parentAuthor: c.author,
      })),
    ])
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  return (
    <div className={
      mode === "sidebar"
        ? `relative h-full flex-shrink-0 transition-[width] duration-200 ${expanded ? "w-[640px]" : "w-80"}`
        : `fixed inset-y-0 right-0 left-0 md:left-auto z-30 flex-shrink-0 transition-[width] duration-200 ${expanded ? "md:w-[640px]" : "md:w-80"}`
    }>

      {/* Expand handle — absolutely positioned outside the panel, bottom-left */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="hidden md:flex items-center justify-center w-5 h-12 bg-card border border-r-0 border-border rounded-l-md shadow-md text-muted-foreground hover:text-foreground transition-colors absolute left-0 bottom-0 -translate-x-full z-10"
        title={expanded ? "Zwiń panel" : "Rozwiń panel"}
      >
        {expanded ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
      </button>

      <div className="h-full w-full flex flex-col bg-card border-l border-border shadow-xl md:shadow-none overflow-x-hidden">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            {thumbnailUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={thumbnailUrl} alt={fileName} className="w-9 h-9 rounded-md object-cover shrink-0 border border-border" />
            )}
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Komentarze</p>
              <p className="text-sm font-semibold truncate">{fileName}</p>
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
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-3 space-y-2">
          {loading && (
            <p className="text-xs text-muted-foreground text-center py-8">Ładowanie…</p>
          )}
          {!loading && flatItems.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-8">
              Brak komentarzy. Napisz pierwszą wiadomość.
            </p>
          )}

          {flatItems.map((item) => {
            const isMine = item.authorRole === authorRole;
            const isEditing = item.type === "comment" ? editingCommentId === item.id : editingReplyId === item.id;

            return (
              <div key={`${item.type}-${item.id}`} className={`flex mb-2 items-end gap-1.5 group ${isMine ? "justify-end" : "justify-start"}`}>
                {!isMine && <Avatar name={item.author} />}
                <div className={`max-w-[75%] flex flex-col ${isMine ? "items-end" : "items-start"}`}>
                  {item.type === "reply" && (
                    <div className="px-2 py-1 rounded-lg text-[11px] border-l-2 border-primary/40 bg-muted/60 mb-1 max-w-full">
                      <span className="font-semibold text-foreground/70">{item.parentAuthor}: </span>
                      <span className="text-muted-foreground">
                        {item.parentContent.length > 60 ? item.parentContent.slice(0, 60) + "…" : item.parentContent}
                      </span>
                    </div>
                  )}
                  {isEditing ? (
                    <div className="flex flex-col gap-1 w-48">
                      <textarea
                        autoFocus
                        value={item.type === "comment" ? editingCommentText : editingReplyText}
                        onChange={(e) =>
                          item.type === "comment"
                            ? setEditingCommentText(e.target.value)
                            : setEditingReplyText(e.target.value)
                        }
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
                        className="px-2 py-1.5 text-sm border border-border rounded-lg bg-background focus:outline-none resize-none"
                        rows={2}
                      />
                      <div className="flex gap-1 justify-end">
                        <button
                          onClick={() => item.type === "comment" ? setEditingCommentId(null) : setEditingReplyId(null)}
                          className="px-2 py-1 text-xs text-muted-foreground hover:text-foreground rounded-lg border"
                        >
                          Anuluj
                        </button>
                        <button
                          onClick={() =>
                            item.type === "comment"
                              ? handleEditComment(item.id, editingCommentText)
                              : handleEditReply(item.commentId, item.id, editingReplyText)
                          }
                          className="px-2 py-1 text-xs bg-primary text-primary-foreground rounded-lg hover:opacity-90"
                        >
                          Zapisz
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="relative">
                      <div
                        className={`px-3 py-2 text-sm break-words leading-snug ${
                          isMine
                            ? "bg-primary text-primary-foreground rounded-2xl rounded-br-sm"
                            : "bg-muted text-foreground rounded-2xl rounded-bl-sm"
                        }`}
                      >
                        {item.content}
                      </div>
                      <div
                        className={`absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 ${
                          isMine ? "right-full pr-1 flex-row-reverse" : "left-full pl-1"
                        }`}
                      >
                        <button
                          onClick={() => {
                            const replyToId = item.type === "comment" ? item.id : item.commentId;
                            setReplyingTo({ id: replyToId, content: item.content, author: item.author });
                            textareaRef.current?.focus();
                          }}
                          title="Odpowiedz"
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        >
                          <CornerDownLeft size={13} />
                        </button>
                        {(canEdit(item.author) || canDelete(item.author)) && (
                          <div className="relative">
                            <button
                              onClick={() => setOpenMenuId(openMenuId === item.id ? null : item.id)}
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                            >
                              <MoreHorizontal size={13} />
                            </button>
                            {openMenuId === item.id && (
                              <div
                                className={`absolute bottom-full mb-1 ${isMine ? "right-0" : "left-0"} bg-popover border border-border rounded-xl shadow-lg z-50 py-1 min-w-[110px]`}
                              >
                                {canEdit(item.author) && (
                                  <button
                                    onClick={() => {
                                      if (item.type === "comment") {
                                        setEditingCommentId(item.id);
                                        setEditingCommentText(item.content);
                                      } else {
                                        setEditingReplyId(item.id);
                                        setEditingReplyText(item.content);
                                      }
                                      setOpenMenuId(null);
                                    }}
                                    className="w-full text-left px-3 py-2 text-xs hover:bg-muted flex items-center gap-2 transition-colors"
                                  >
                                    <Edit2 size={12} className="text-muted-foreground" /> Edytuj
                                  </button>
                                )}
                                {canDelete(item.author) && (
                                  <button
                                    onClick={() => {
                                      if (item.type === "comment") handleDelete(item.id);
                                      else handleDeleteReply(item.commentId, item.id);
                                      setOpenMenuId(null);
                                    }}
                                    className="w-full text-left px-3 py-2 text-xs text-destructive hover:bg-destructive/10 flex items-center gap-2 transition-colors"
                                  >
                                    <Trash2 size={12} /> Usuń
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  <span
                    className={`text-[9px] text-muted-foreground px-1 mt-0.5 ${isMine ? "text-right" : "text-left"}`}
                  >
                    {formatDate(item.createdAt)}
                  </span>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-4 py-3 border-t border-border shrink-0">
          {replyingTo && (
            <div className="flex items-center gap-2 px-2 py-1.5 mb-2 bg-muted/60 rounded-lg border-l-2 border-primary/50">
              <CornerDownLeft size={11} className="text-primary flex-shrink-0" />
              <span className="flex-1 text-xs text-muted-foreground truncate">
                <span className="font-medium text-foreground">{replyingTo.author}:</span>{" "}
                {replyingTo.content.slice(0, 80)}{replyingTo.content.length > 80 ? "…" : ""}
              </span>
              <button onClick={() => setReplyingTo(null)} className="text-muted-foreground hover:text-foreground flex-shrink-0">
                <X size={12} />
              </button>
            </div>
          )}
          <div className="flex items-end gap-2">
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
                if (e.key === "Escape") setReplyingTo(null);
              }}
              placeholder="Napisz wiadomość…"
              rows={1}
              style={{ height: "40px", overflowY: "hidden" }}
              className="flex-1 min-h-10 max-h-40 px-3 py-2 text-sm resize-none rounded-2xl bg-muted focus:outline-none"
            />
            <button
              onClick={handleSend}
              disabled={!text.trim() || sending}
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
