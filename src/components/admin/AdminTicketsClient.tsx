"use client";

import { useState } from "react";
import { toast } from "sonner";
import { X, Paperclip } from "lucide-react";

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

export default function AdminTicketsClient({ tickets: initialTickets }: { tickets: Ticket[] }) {
  const [tickets, setTickets] = useState(initialTickets);
  const [statusFilter, setStatusFilter] = useState("open");
  const [detail, setDetail] = useState<Ticket | null>(null);

  async function handleStatusChange(id: string, status: string) {
    const res = await fetch(`/api/admin/tickets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      const updated = await res.json();
      setTickets((prev) => prev.map((t) => t.id === id ? { ...t, status: updated.status } : t));
      if (detail?.id === id) setDetail((prev) => prev ? { ...prev, status: updated.status } : prev);
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
                statusFilter === key
                  ? "bg-white/12 text-white"
                  : "text-white/40 hover:text-white/70 hover:bg-white/5"
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
              onClick={() => setDetail(ticket)}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={() => setDetail(null)}>
          <div
            className="bg-[#1a1d24] border border-white/10 rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-5 gap-3">
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-white leading-tight">{detail.subject || "(brak tematu)"}</h2>
                <p className="text-xs text-white/30 mt-1">{detail.userName ?? detail.userEmail} · {detail.userEmail}</p>
              </div>
              <button onClick={() => setDetail(null)} className="text-white/30 hover:text-white/70 shrink-0">
                <X size={18} />
              </button>
            </div>

            <div className="flex gap-2 mb-4 flex-wrap">
              {detail.category && (
                <span className="text-xs px-2.5 py-1 rounded-full bg-white/8 text-white/50 border border-white/10">
                  {detail.category}
                </span>
              )}
              <span className="text-xs text-white/25">
                {new Date(detail.createdAt).toLocaleString("pl-PL", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>

            <div className="bg-white/4 rounded-xl px-4 py-3 mb-4 text-sm text-white/70 whitespace-pre-wrap leading-relaxed">
              {detail.message || <span className="text-white/20 italic">Brak treści</span>}
            </div>

            {detail.attachmentUrl && (
              <a
                href={detail.attachmentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 mb-5 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-blue-400 hover:text-blue-300 hover:bg-white/8 transition-colors"
              >
                <Paperclip size={13} />
                <span className="truncate">{detail.attachmentName ?? "Załącznik"}</span>
              </a>
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
                      active
                        ? cfg.color + " border"
                        : "bg-white/5 text-white/30 border-white/10 hover:bg-white/10 hover:text-white/60"
                    }`}
                  >
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
