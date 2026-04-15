"use client";

import { useEffect, useRef, useState } from "react";
import { X, Search, UserPlus, XCircle } from "lucide-react";
import { toast } from "sonner";
import type { CalendarEvent, EventType } from "./CalendarView";

interface Guest {
  name: string;
  email: string;
}

interface ClientSuggestion {
  id: string;
  name: string;
  email: string | null;
}

interface Props {
  open: boolean;
  defaultDate: Date | null;
  editEvent?: CalendarEvent | null;
  onClose: () => void;
  onAdded: (ev: CalendarEvent) => void;
  onUpdated?: (ev: CalendarEvent) => void;
}

function toLocalDatetimeValue(iso: string | null | Date): string {
  const d = iso ? new Date(iso) : new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function AddEventDialog({
  open,
  defaultDate,
  editEvent,
  onClose,
  onAdded,
  onUpdated,
}: Props) {
  const isEdit = !!editEvent;

  const [title, setTitle] = useState("");
  const [type, setType] = useState<EventType>("WYDARZENIE");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [reminder, setReminder] = useState(false);
  const [reminderOffset, setReminderOffset] = useState<"24h" | "1h" | "30min">("1h");
  const [guests, setGuests] = useState<Guest[]>([]);
  const [guestQuery, setGuestQuery] = useState("");
  const [suggestions, setSuggestions] = useState<ClientSuggestion[]>([]);
  const [sugOpen, setSugOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset / populate form when dialog opens
  useEffect(() => {
    if (!open) return;
    if (isEdit && editEvent) {
      setTitle(editEvent.title);
      setType(editEvent.type);
      setStartAt(toLocalDatetimeValue(editEvent.startAt));
      setEndAt(editEvent.endAt ? toLocalDatetimeValue(editEvent.endAt) : "");
      setLocation(editEvent.location ?? "");
      setDescription(editEvent.description ?? "");
      setReminder(editEvent.reminder);
      setReminderOffset((editEvent.reminderOffset as any) ?? "1h");
      setGuests(editEvent.guests.map((g) => ({ name: g.name ?? "", email: g.email ?? "" })));
    } else {
      setTitle("");
      setType("WYDARZENIE");
      setStartAt(toLocalDatetimeValue(defaultDate));
      setEndAt("");
      setLocation("");
      setDescription("");
      setReminder(false);
      setReminderOffset("1h");
      setGuests([]);
    }
    setGuestQuery("");
    setSuggestions([]);
    setSugOpen(false);
    setTimeout(() => titleRef.current?.focus(), 50);
  }, [open]);

  // Client search
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!guestQuery.trim()) { setSuggestions([]); setSugOpen(false); return; }
    searchTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/calendar/clients?q=${encodeURIComponent(guestQuery)}`);
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data);
          setSugOpen(data.length > 0);
        }
      } catch { /* noop */ }
    }, 250);
  }, [guestQuery]);

  function addGuest(client: ClientSuggestion) {
    setGuests((prev) => {
      if (prev.some((g) => g.email === client.email && client.email)) return prev;
      return [...prev, { name: client.name, email: client.email ?? "" }];
    });
    setGuestQuery("");
    setSuggestions([]);
    setSugOpen(false);
  }

  function addManualGuest() {
    const trimmed = guestQuery.trim();
    if (!trimmed) return;
    setGuests((prev) => [...prev, { name: trimmed, email: "" }]);
    setGuestQuery("");
    setSugOpen(false);
  }

  function removeGuest(i: number) {
    setGuests((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleSave() {
    if (!title.trim()) { toast.error("Tytuł jest wymagany"); titleRef.current?.focus(); return; }
    if (!startAt) { toast.error("Data jest wymagana"); return; }

    setSaving(true);
    try {
      const payload = {
        title,
        type,
        startAt: new Date(startAt).toISOString(),
        endAt: endAt ? new Date(endAt).toISOString() : null,
        location: type === "WYDARZENIE" ? location : null,
        description: type !== "WYDARZENIE" ? description : null,
        reminder: type !== "PRZYPOMNIENIE" ? reminder : false,
        reminderOffset: type !== "PRZYPOMNIENIE" && reminder ? reminderOffset : null,
        guests: type === "WYDARZENIE" ? guests : [],
      };

      const res = await fetch(
        isEdit ? `/api/calendar/${editEvent!.id}` : "/api/calendar",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Błąd zapisu");
        return;
      }

      const ev = await res.json();
      if (isEdit) {
        toast.success("Zmiany zapisane");
        onUpdated?.(ev);
      } else {
        toast.success("Wydarzenie dodane");
        onAdded(ev);
      }
    } catch {
      toast.error("Błąd zapisu");
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  const fieldClass =
    "w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors";
  const labelClass = "block text-xs font-medium text-muted-foreground mb-1";

  const typeColors: Record<EventType, string> = {
    WYDARZENIE: "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    ZADANIE: "border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
    PRZYPOMNIENIE: "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  };
  const typeLabels: Record<EventType, string> = {
    WYDARZENIE: "Wydarzenie", ZADANIE: "Zadanie", PRZYPOMNIENIE: "Przypomnienie",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <h2 className="text-base font-semibold">
            {isEdit ? "Edytuj wydarzenie" : "Nowe wydarzenie"}
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          {/* Title */}
          <div>
            <label className={labelClass}>Tytuł *</label>
            <input
              ref={titleRef}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              placeholder="Nazwa spotkania lub zadania"
              className={fieldClass}
            />
          </div>

          {/* Type */}
          <div>
            <label className={labelClass}>Typ</label>
            <div className="grid grid-cols-3 gap-1.5">
              {(["WYDARZENIE", "ZADANIE", "PRZYPOMNIENIE"] as EventType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={`py-1.5 text-xs font-medium rounded-lg border transition-all ${
                    type === t
                      ? typeColors[t]
                      : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  }`}
                >
                  {typeLabels[t]}
                </button>
              ))}
            </div>
          </div>

          {/* Date & time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Data i godzina *</label>
              <input
                type="datetime-local"
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
                className={fieldClass}
              />
            </div>
            {type !== "PRZYPOMNIENIE" && (
              <div>
                <label className={labelClass}>Do (opcjonalnie)</label>
                <input
                  type="datetime-local"
                  value={endAt}
                  onChange={(e) => setEndAt(e.target.value)}
                  className={fieldClass}
                />
              </div>
            )}
          </div>

          {/* Wydarzenie: location + guests */}
          {type === "WYDARZENIE" && (
            <>
              <div>
                <label className={labelClass}>Lokalizacja</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Adres lub nazwa miejsca"
                  className={fieldClass}
                />
              </div>

              <div>
                <label className={labelClass}>Dodaj gości</label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <Search size={14} />
                  </div>
                  <input
                    type="text"
                    value={guestQuery}
                    onChange={(e) => setGuestQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { e.preventDefault(); addManualGuest(); }
                      if (e.key === "Escape") setSugOpen(false);
                    }}
                    placeholder="Wyszukaj klienta lub wpisz imię..."
                    className={`${fieldClass} pl-8`}
                  />
                  {sugOpen && (
                    <div className="absolute top-full mt-1 left-0 right-0 bg-card border border-border rounded-lg shadow-lg z-10 overflow-hidden">
                      {suggestions.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => addGuest(s)}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted text-left transition-colors"
                        >
                          <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
                            {s.name[0]}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium truncate">{s.name}</p>
                            {s.email && <p className="text-xs text-muted-foreground truncate">{s.email}</p>}
                          </div>
                        </button>
                      ))}
                      {guestQuery.trim() && (
                        <button
                          onClick={addManualGuest}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:bg-muted transition-colors border-t border-border"
                        >
                          <UserPlus size={13} />
                          Dodaj „{guestQuery.trim()}"
                        </button>
                      )}
                    </div>
                  )}
                </div>
                {guests.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {guests.map((g, i) => (
                      <span
                        key={i}
                        className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium"
                      >
                        {g.name || g.email}
                        <button onClick={() => removeGuest(i)} className="hover:opacity-70 transition-opacity">
                          <XCircle size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Zadanie / Przypomnienie: description */}
          {(type === "ZADANIE" || type === "PRZYPOMNIENIE") && (
            <div>
              <label className={labelClass}>Opis</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Opis..."
                rows={3}
                className={`${fieldClass} resize-none`}
              />
            </div>
          )}

          {/* Reminder */}
          {type !== "PRZYPOMNIENIE" && (
            <div className="border border-border rounded-lg p-3">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={reminder}
                  onChange={(e) => setReminder(e.target.checked)}
                  className="w-4 h-4 rounded accent-primary"
                />
                <span className="text-sm font-medium">Ustaw przypomnienie</span>
              </label>
              {reminder && (
                <div className="mt-3 flex gap-1.5">
                  {(["30min", "1h", "24h"] as const).map((opt) => {
                    const labels = { "30min": "30 min przed", "1h": "1 h przed", "24h": "24 h przed" };
                    return (
                      <button
                        key={opt}
                        onClick={() => setReminderOffset(opt)}
                        className={`flex-1 py-1 text-xs rounded-lg border transition-all ${
                          reminderOffset === opt
                            ? "bg-primary/10 text-primary border-primary/30 font-medium"
                            : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"
                        }`}
                      >
                        {labels[opt]}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-border flex gap-2 justify-end flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-muted transition-colors"
          >
            Anuluj
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saving ? "Zapisywanie..." : isEdit ? "Zapisz zmiany" : "Dodaj"}
          </button>
        </div>
      </div>
    </div>
  );
}
