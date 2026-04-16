"use client";

import { useState } from "react";
import { X, Clock, MapPin, Users, FileText, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";
import type { CalendarEvent, EventType } from "./CalendarView";

interface Props {
  event: CalendarEvent;
  typeColors: Record<EventType, { bg: string; text: string; dot: string }>;
  typeLabels: Record<EventType, string>;
  onClose: () => void;
  onDeleted: (id: string) => void;
  onEdit: () => void;
  fmtDate: (iso: string) => string;
  fmtTime: (iso: string) => string;
}

export default function EventDetailDialog({
  event,
  typeColors,
  typeLabels,
  onClose,
  onDeleted,
  onEdit,
  fmtDate,
  fmtTime,
}: Props) {
  const [deleting, setDeleting] = useState(false);
  const colors = typeColors[event.type];

  async function handleDelete() {
    if (!confirm(`Usunąć "${event.title}"?`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/calendar/${event.id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Wydarzenie usunięte");
        onDeleted(event.id);
      } else {
        toast.error("Błąd usuwania");
      }
    } catch {
      toast.error("Błąd usuwania");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-2xl shadow-2xl w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Colored header */}
        <div className={`px-5 py-4 rounded-t-2xl ${colors.bg}`}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className={`text-[11px] font-semibold uppercase tracking-wide mb-1 ${colors.text} opacity-70`}>
                {typeLabels[event.type]}
              </p>
              <h2 className={`text-base font-bold ${colors.text} leading-snug`}>{event.title}</h2>
            </div>
            <button
              onClick={onClose}
              className={`mt-0.5 ${colors.text} opacity-60 hover:opacity-100 transition-opacity flex-shrink-0`}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Details */}
        <div className="px-5 py-4 space-y-3">
          {/* Date/time */}
          <div className="flex items-start gap-2.5 text-sm">
            <Clock size={15} className="text-muted-foreground mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-foreground">{fmtDate(event.startAt)} o {fmtTime(event.startAt)}</p>
              {event.endAt && (
                <p className="text-muted-foreground text-xs">do {fmtDate(event.endAt)} {fmtTime(event.endAt)}</p>
              )}
            </div>
          </div>

          {/* Location */}
          {event.location && (
            <div className="flex items-start gap-2.5 text-sm">
              <MapPin size={15} className="text-muted-foreground mt-0.5 flex-shrink-0" />
              <p className="text-foreground">{event.location}</p>
            </div>
          )}

          {/* Description */}
          {event.description && (
            <div className="flex items-start gap-2.5 text-sm">
              <FileText size={15} className="text-muted-foreground mt-0.5 flex-shrink-0" />
              <p className="text-foreground whitespace-pre-wrap">{event.description}</p>
            </div>
          )}

          {/* Guests */}
          {event.guests.length > 0 && (
            <div className="flex items-start gap-2.5 text-sm">
              <Users size={15} className="text-muted-foreground mt-0.5 flex-shrink-0" />
              <div className="flex flex-wrap gap-1.5">
                {event.guests.map((g) => (
                  <span
                    key={g.id}
                    className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium"
                  >
                    {g.name || g.email}
                  </span>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-5 pb-4 pt-1 flex justify-between">
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-600 transition-colors disabled:opacity-50"
          >
            <Trash2 size={14} />
            {deleting ? "Usuwanie..." : "Usuń"}
          </button>
          <div className="flex gap-2">
            <button
              onClick={onEdit}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-border hover:bg-muted transition-colors"
            >
              <Pencil size={13} />
              Edytuj
            </button>
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-sm rounded-lg border border-border hover:bg-muted transition-colors"
            >
              Zamknij
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
