"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { X, Paperclip, Send } from "lucide-react";
import { useUploadThing } from "@/lib/uploadthing-client";

interface Ticket {
  id: string;
  userEmail: string;
  userName: string | null;
  category: string | null;
  subject: string;
  message: string;
  attachmentUrl: string | null;
  attachmentName: string | null;
  status: string;
  createdAt: string | Date;
  user: { id: string; email: string; fullName: string | null; name: string | null } | null;
  discussion: { id: string } | null;
  attachments: { url: string; name: string }[] | null;
}

interface ChatMessage {
  id: string;
  content: string;
  authorName: string;
  sourceType: string;
  attachmentUrl: string | null;
  attachmentName: string | null;
  attachmentType: string | null;
  createdAt: string;
}

interface PendingFile {
  url: string;
  name: string;
  type: "image" | "pdf" | "document";
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  open:        { label: "Otwarte",      color: "bg-blue-500/15 text-blue-400 border-blue-500/20" },
  in_progress: { label: "W toku",       color: "bg-amber-500/15 text-amber-400 border-amber-500/20" },
  closed:      { label: "Zamknięte",    color: "bg-white/8 text-white/30 border-white/10" },
};

const STATUSES = ["open", "in_progress", "closed"] as const;
const FILTER_LABELS: { key: string; label: string }[] = [
  { key: "all", label: "Wszystkie" },
  { key: "open", label: "Otwarte" },
  { key: "in_progress", label: "W toku" },
  { key: "closed", label: "Zamknięte" },
];

function formatTime(iso: string) {
  return new Date(iso).toLocaleString("pl-PL", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function AttachmentPreview({ url, name, type }: { url: string; name: string; type: string | null }) {
  if (type === "image") {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="block mt-1.5">
        <img src={url} alt={name} className="max-w-[200px] max-h-[150px] rounded-xl object-cover border border-white/10 hover:opacity-80 transition-opacity" />
      </a>
    );
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 mt-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-blue-400 hover:text-blue-300 hover:bg-white/8 transition-colors w-fit"
    >
      <Paperclip size={11} className="shrink-0" />
      <span className="truncate max-w-[160px]">{name}</span>
    </a>
  );
}

export default function AdminTicketsClient({ tickets: initialTickets }: { tickets: Ticket[] }) {
  const [tickets, setTickets] = useState(initialTickets);
  const [statusFilter, setStatusFilter] = useState("open");
  const [detail, setDetail] = useState<Ticket | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replying, setReplying] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { startUpload } = useUploadThing("discussionAttachmentUploader");

  useEffect(() => {
    if (!detail) return;
    setLoadingMessages(true);
    fetch(`/api/admin/tickets/${detail.id}/messages`)
      .then((r) => r.json())
      .then((data) => setChatMessages(data.messages ?? []))
      .catch(() => setChatMessages([]))
      .finally(() => setLoadingMessages(false));
  }, [detail?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    e.target.value = "";
    setUploading(true);
    try {
      const results = await startUpload(files);
      if (!results) throw new Error();
      const added: PendingFile[] = results.map((r, i) => {
        const f = files[i];
        const type: PendingFile["type"] = f.type.startsWith("image/") ? "image" : f.type === "application/pdf" ? "pdf" : "document";
        return { url: r.url, name: f.name, type };
      });
      setPendingFiles((prev) => [...prev, ...added]);
    } catch {
      toast.error("Błąd przesyłania pliku");
    } finally {
      setUploading(false);
    }
  }

  async function handleReply(id: string) {
    if (!replyText.trim() && pendingFiles.length === 0) return;
    setReplying(true);
    try {
      const res = await fetch(`/api/admin/tickets/${id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          replyText,
          attachments: pendingFiles,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Odpowiedź wysłana");
        setReplyText("");
        setPendingFiles([]);
        setTickets((prev) =>
          prev.map((t) => t.id === id && t.status === "open" ? { ...t, status: "in_progress" } : t)
        );
        if (data.discussionId) {
          setTickets((prev) =>
            prev.map((t) => t.id === id ? { ...t, discussion: { id: data.discussionId } } : t)
          );
          setDetail((prev) =>
            prev && prev.id === id
              ? { ...prev, status: prev.status === "open" ? "in_progress" : prev.status, discussion: { id: data.discussionId } }
              : prev
          );
        }
        const msgs = await fetch(`/api/admin/tickets/${id}/messages`).then((r) => r.json());
        setChatMessages(msgs.messages ?? []);
      } else {
        toast.error(data.error ?? "Błąd wysyłania odpowiedzi");
      }
    } finally {
      setReplying(false);
    }
  }

  async function handleStatusChange(id: string, status: string) {
    const res = await fetch(`/api/admin/tickets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      const updated = await res.json();
      setTickets((prev) => prev.map((t) => t.id === id ? { ...t, status: updated.status } : t));
      if (detail?.id === id) {
        setDetail((prev) => prev ? { ...prev, status: updated.status } : prev);
        if (status === "closed") {
          const msgs = await fetch(`/api/admin/tickets/${id}/messages`).then((r) => r.json());
          setChatMessages(msgs.messages ?? []);
        }
      }
      toast.success("Status zaktualizowany");
    } else {
      toast.error("Błąd aktualizacji");
    }
  }

  const filtered = statusFilter === "all" ? tickets : tickets.filter((t) => t.status === statusFilter);

  return (
    <>
      {/* Filter tabs */}
      <div className="flex gap-1 mb-4">
        {FILTER_LABELS.map(({ key, label }) => {
          const count = key === "all" ? tickets.length : tickets.filter((t) => t.status === key).length;
          return (
            <button
              key={key}
              onClick={() => setStatusFilter(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === key ? "bg-white/12 text-white" : "text-white/40 hover:text-white/70 hover:bg-white/5"
              }`}
            >
              {label}
              <span className={`ml-1.5 text-[10px] ${statusFilter === key ? "text-white/50" : "text-white/20"}`}>{count}</span>
            </button>
          );
        })}
      </div>

      <div className="bg-white/3 border border-white/8 rounded-xl overflow-hidden">
        <div className="grid grid-cols-[1fr_160px_120px_100px_80px] gap-4 px-5 py-3 bg-white/3 border-b border-white/8 text-xs font-medium text-white/30 uppercase tracking-wide">
          <span>Zgłoszenie</span>
          <span>Użytkownik</span>
          <span>Kategoria</span>
          <span>Data</span>
          <span>Status</span>
        </div>

        {filtered.length === 0 && (
          <p className="text-center text-white/30 py-12 text-sm">Brak zgłoszeń</p>
        )}

        {filtered.map((ticket, i) => {
          const s = STATUS_LABELS[ticket.status] ?? STATUS_LABELS.open;
          return (
            <div
              key={ticket.id}
              onClick={() => { setDetail(ticket); setReplyText(""); setPendingFiles([]); setChatMessages([]); }}
              className={`grid grid-cols-[1fr_160px_120px_100px_80px] gap-4 px-5 py-3.5 items-center cursor-pointer hover:bg-white/3 transition-colors ${
                i !== filtered.length - 1 ? "border-b border-white/5" : ""
              }`}
            >
              <p className="text-sm text-white truncate">{ticket.subject || "(brak tematu)"}</p>
              <div className="min-w-0">
                <p className="text-xs text-white/70 truncate">{ticket.userName ?? ticket.userEmail}</p>
                <p className="text-[10px] text-white/30 truncate">{ticket.userEmail}</p>
              </div>
              <p className="text-xs text-white/40 truncate">{ticket.category ?? "—"}</p>
              <p className="text-xs text-white/30">
                {new Date(ticket.createdAt).toLocaleDateString("pl-PL", { day: "2-digit", month: "short" })}
              </p>
              <span className={`inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-full border w-fit ${s.color}`}>
                {s.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Detail panel */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4" onClick={() => setDetail(null)}>
          <div
            className="bg-[#1a1d24] border border-white/10 rounded-2xl shadow-2xl w-full max-w-xl flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between px-6 pt-6 pb-4 gap-3 border-b border-white/8 shrink-0">
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-white leading-tight">{detail.subject || "(brak tematu)"}</h2>
                <p className="text-xs text-white/30 mt-1">{detail.userName ?? detail.userEmail} · {detail.userEmail}</p>
                <div className="flex gap-2 mt-2 flex-wrap items-center">
                  {detail.category && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-white/8 text-white/50 border border-white/10">
                      {detail.category}
                    </span>
                  )}
                  <span className="text-[10px] text-white/25">
                    {new Date(detail.createdAt).toLocaleString("pl-PL", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <span className={`inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-full border ${(STATUS_LABELS[detail.status] ?? STATUS_LABELS.open).color}`}>
                    {(STATUS_LABELS[detail.status] ?? STATUS_LABELS.open).label}
                  </span>
                </div>
              </div>
              <button onClick={() => setDetail(null)} className="text-white/30 hover:text-white/70 shrink-0 mt-0.5">
                <X size={18} />
              </button>
            </div>

            {/* Chat area */}
            <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-3">
              {loadingMessages ? (
                <p className="text-center text-white/20 text-xs py-6">Ładowanie...</p>
              ) : chatMessages.length === 0 ? (
                <div className="flex items-end gap-2">
                  <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-xs font-semibold text-white/40 shrink-0">
                    {(detail.userName ?? detail.userEmail).charAt(0).toUpperCase()}
                  </div>
                  <div className="max-w-[80%] bg-white/6 border border-white/10 rounded-2xl px-3 py-2 text-sm text-white/70 whitespace-pre-wrap">
                    {detail.message || <span className="text-white/20 italic">Brak treści</span>}
                    {(detail.attachments ?? (detail.attachmentUrl ? [{ url: detail.attachmentUrl, name: detail.attachmentName ?? "plik" }] : [])).map((att, i) => (
                      <AttachmentPreview key={i} url={att.url} name={att.name} type={att.url.match(/\.(jpe?g|png|gif|webp|avif)$/i) ? "image" : null} />
                    ))}
                    <div className="text-[10px] text-white/25 mt-1 text-right">
                      {new Date(detail.createdAt).toLocaleString("pl-PL", { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                </div>
              ) : (
                chatMessages.map((msg) => {
                  if (msg.sourceType === "system_close") {
                    return (
                      <div key={msg.id} className="flex items-center gap-2 my-1">
                        <div className="flex-1 h-px bg-white/8" />
                        <span className="text-[10px] text-white/25 shrink-0 px-1">{msg.content}</span>
                        <div className="flex-1 h-px bg-white/8" />
                      </div>
                    );
                  }
                  const isSupport = msg.authorName === "Dział Wsparcia";
                  if (msg.sourceType === "help_request") {
                    return (
                      <div key={msg.id} className="flex items-end gap-2">
                        <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-xs font-semibold text-white/40 shrink-0">
                          {(detail.userName ?? detail.userEmail).charAt(0).toUpperCase()}
                        </div>
                        <div className="max-w-[80%]">
                          <div className="rounded-2xl px-3 py-2 text-sm bg-amber-500/10 border border-amber-500/20">
                            <div className="text-[10px] font-semibold text-amber-400 mb-1 uppercase tracking-wide">Treść zgłoszenia</div>
                            <p className="text-white/70 whitespace-pre-wrap">{msg.content}</p>
                            <div className="text-[10px] text-white/25 mt-1 text-right">{formatTime(msg.createdAt)}</div>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div key={msg.id} className={`flex items-end gap-2 ${isSupport ? "flex-row-reverse" : ""}`}>
                      {!isSupport && (
                        <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-xs font-semibold text-white/40 shrink-0">
                          {msg.authorName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      {isSupport && (
                        <div className="w-7 h-7 rounded-full bg-indigo-500/80 flex items-center justify-center shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src="/veedeck_ikona_vsg.svg" alt="" className="w-4 h-4" />
                        </div>
                      )}
                      <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${isSupport ? "bg-indigo-500/15 border border-indigo-500/20 text-white/80" : "bg-white/6 border border-white/10 text-white/70"}`}>
                        {msg.content && <p className="whitespace-pre-wrap">{msg.content}</p>}
                        {msg.attachmentUrl && (
                          <AttachmentPreview url={msg.attachmentUrl} name={msg.attachmentName ?? "plik"} type={msg.attachmentType} />
                        )}
                        <div className={`text-[10px] mt-1 ${isSupport ? "text-indigo-300/40 text-right" : "text-white/25"}`}>{formatTime(msg.createdAt)}</div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            {/* Reply + status footer */}
            <div className="px-6 pb-5 pt-3 border-t border-white/8 shrink-0 space-y-3">
              {detail.user ? (
                <div className="flex flex-col gap-2">
                  {pendingFiles.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {pendingFiles.map((f, i) => (
                        <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white/60">
                          {f.type === "image" ? (
                            <img src={f.url} alt={f.name} className="h-7 w-7 rounded object-cover shrink-0" />
                          ) : (
                            <Paperclip size={12} className="shrink-0 text-white/30" />
                          )}
                          <span className="truncate max-w-[120px]">{f.name}</span>
                          <button onClick={() => setPendingFiles((prev) => prev.filter((_, j) => j !== i))} className="text-white/30 hover:text-white/60 shrink-0">
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex items-end gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      multiple
                      accept="image/*,video/*,application/pdf,.doc,.docx,.xls,.xlsx,.csv"
                      onChange={handleFileSelect}
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading || replying}
                      className="p-2.5 rounded-xl text-white/30 hover:text-white/70 hover:bg-white/8 transition-colors disabled:opacity-30 shrink-0"
                      title="Dodaj plik"
                    >
                      {uploading ? (
                        <span className="text-[10px] text-white/30">...</span>
                      ) : (
                        <Paperclip size={16} />
                      )}
                    </button>
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleReply(detail.id); } }}
                      placeholder="Napisz odpowiedź..."
                      rows={2}
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white/80 placeholder-white/20 resize-none focus:outline-none focus:ring-2 focus:ring-white/15"
                    />
                    <button
                      onClick={() => handleReply(detail.id)}
                      disabled={replying || uploading || (!replyText.trim() && pendingFiles.length === 0)}
                      className="p-2.5 rounded-xl bg-indigo-500/80 text-white hover:bg-indigo-500 transition-colors disabled:opacity-30 shrink-0"
                    >
                      <Send size={15} />
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-white/20 italic">Zgłoszenie anonimowe — brak konta użytkownika</p>
              )}

              <div className="flex items-center gap-2">
                <span className="text-xs text-white/30 mr-1">Status:</span>
                {STATUSES.map((s) => {
                  const cfg = STATUS_LABELS[s];
                  const active = detail.status === s;
                  return (
                    <button
                      key={s}
                      onClick={() => handleStatusChange(detail.id, s)}
                      className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
                        active ? cfg.color + " border" : "bg-white/5 text-white/30 border-white/10 hover:bg-white/10 hover:text-white/60"
                      }`}
                    >
                      {cfg.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
