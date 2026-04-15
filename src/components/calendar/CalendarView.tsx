"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { toast } from "sonner";
import AddEventDialog from "./AddEventDialog";
import EventDetailDialog from "./EventDetailDialog";

export type EventType = "WYDARZENIE" | "ZADANIE" | "PRZYPOMNIENIE";

export interface CalendarEvent {
  id: string;
  title: string;
  type: EventType;
  startAt: string;
  endAt: string | null;
  location: string | null;
  description: string | null;
  reminder: boolean;
  reminderOffset: string | null;
  guests: { id: string; name: string | null; email: string | null }[];
}

type View = "month" | "week" | "day";

const HOUR_HEIGHT = 64; // px per hour
const TIME_COL_W = 56;  // px, width of the time label column
const HOURS = Array.from({ length: 24 }, (_, i) => i);

const TYPE_COLORS: Record<EventType, { bg: string; text: string; dot: string; border: string }> = {
  WYDARZENIE:    { bg: "bg-blue-100 dark:bg-blue-900/50",    text: "text-blue-700 dark:text-blue-200",    dot: "bg-blue-500",    border: "border-blue-400 dark:border-blue-500" },
  ZADANIE:       { bg: "bg-violet-100 dark:bg-violet-900/50", text: "text-violet-700 dark:text-violet-200", dot: "bg-violet-500",  border: "border-violet-400 dark:border-violet-500" },
  PRZYPOMNIENIE: { bg: "bg-amber-100 dark:bg-amber-900/50",  text: "text-amber-700 dark:text-amber-200",  dot: "bg-amber-500",   border: "border-amber-400 dark:border-amber-500" },
};

const TYPE_LABELS: Record<EventType, string> = {
  WYDARZENIE: "Wydarzenie",
  ZADANIE: "Zadanie",
  PRZYPOMNIENIE: "Przypomnienie",
};

const DAY_NAMES_SHORT = ["Pon", "Wt", "Śr", "Czw", "Pt", "Sob", "Nd"];
const MONTH_NAMES = [
  "Styczeń","Luty","Marzec","Kwiecień","Maj","Czerwiec",
  "Lipiec","Sierpień","Wrzesień","Październik","Listopad","Grudzień",
];

function toDateKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}
function parseDate(iso: string) { return new Date(iso); }
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" });
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("pl-PL", { day: "2-digit", month: "short", year: "numeric" });
}
function startOfWeek(date: Date) {
  const d = new Date(date);
  const diff = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}
function addDays(date: Date, n: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

// Shared godzinowa siatka (time grid) — używana przez Week i Day view
function TimeGrid({
  columns,
  byDay,
  onCellClick,
  onEventClick,
}: {
  columns: { date: Date; isToday: boolean; label: React.ReactNode }[];
  byDay: Record<string, CalendarEvent[]>;
  onCellClick: (date: Date, hour: number) => void;
  onEventClick: (ev: CalendarEvent) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll to 8:00 on mount
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 8 * HOUR_HEIGHT;
    }
  }, []);

  const totalHeight = 24 * HOUR_HEIGHT;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Scrollable container — header inside as sticky so widths always match */}
      <div ref={scrollRef} className="flex-1 overflow-y-scroll min-h-0">
        {/* Sticky header row */}
        <div className="flex border-b border-border sticky top-0 z-20 bg-background">
          <div style={{ width: TIME_COL_W }} className="flex-shrink-0" />
          {columns.map((col, i) => (
            <div
              key={i}
              className={`flex-1 py-2 text-center border-l border-border ${col.isToday ? "bg-primary/5" : ""}`}
            >
              {col.label}
            </div>
          ))}
        </div>

        <div className="flex" style={{ height: totalHeight }}>

          {/* Time column */}
          <div
            className="flex-shrink-0 relative border-r border-border/40 bg-background"
            style={{ width: TIME_COL_W }}
          >
            {HOURS.map((h) => (
              <div
                key={h}
                className="absolute left-0 right-0 flex items-start justify-end pr-2"
                style={{ top: h * HOUR_HEIGHT, height: HOUR_HEIGHT }}
              >
                {h > 0 && (
                  <span className="text-[10px] text-muted-foreground select-none -mt-2">
                    {String(h).padStart(2, "0")}:00
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {columns.map((col, ci) => {
            const key = toDateKey(col.date);
            const dayEvents = byDay[key] ?? [];

            return (
              <div
                key={ci}
                className={`flex-1 border-l border-border relative min-w-0 ${col.isToday ? "bg-primary/[0.02]" : ""}`}
                style={{ height: totalHeight }}
              >
                {/* Hour lines */}
                {HOURS.map((h) => (
                  <div
                    key={h}
                    className="absolute left-0 right-0 border-t border-border/50"
                    style={{ top: h * HOUR_HEIGHT }}
                  >
                    {/* Half-hour line */}
                    <div
                      className="absolute left-0 right-0 border-t border-border/20"
                      style={{ top: HOUR_HEIGHT / 2 }}
                    />
                  </div>
                ))}

                {/* Clickable hour cells */}
                {HOURS.map((h) => (
                  <div
                    key={h}
                    className="absolute left-0 right-0 hover:bg-primary/5 cursor-pointer transition-colors"
                    style={{ top: h * HOUR_HEIGHT, height: HOUR_HEIGHT }}
                    onClick={() => onCellClick(col.date, h)}
                  />
                ))}

                {/* Events */}
                {dayEvents.map((ev) => {
                  const start = parseDate(ev.startAt);
                  const topPx = (start.getHours() * 60 + start.getMinutes()) / 60 * HOUR_HEIGHT;
                  const end = ev.endAt
                    ? parseDate(ev.endAt)
                    : new Date(start.getTime() + 60 * 60000); // default 1h
                  const durationMin = (end.getTime() - start.getTime()) / 60000;
                  const heightPx = Math.max((durationMin / 60) * HOUR_HEIGHT, 20);
                  const c = TYPE_COLORS[ev.type];

                  return (
                    <button
                      key={ev.id}
                      onClick={(e) => { e.stopPropagation(); onEventClick(ev); }}
                      className={`absolute left-0.5 right-0.5 rounded-md px-1.5 py-0.5 text-left overflow-hidden z-10 border-l-2 ${c.bg} ${c.text} ${c.border} hover:brightness-95 transition-[filter]`}
                      style={{ top: topPx, height: heightPx, minHeight: 20 }}
                    >
                      <p className="text-[11px] font-semibold leading-tight truncate">
                        {ev.title}
                      </p>
                      {heightPx >= 32 && (
                        <p className="text-[10px] leading-tight opacity-70">
                          {fmtTime(ev.startAt)}{ev.endAt ? ` – ${fmtTime(ev.endAt)}` : ""}
                        </p>
                      )}
                      {heightPx >= 48 && ev.type === "ZADANIE" && ev.description && (
                        <p className="text-[10px] leading-tight opacity-60 mt-0.5 whitespace-pre-wrap break-words line-clamp-3">
                          {ev.description}
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ============================================================

export default function CalendarView() {
  const [view, setView] = useState<View>("month");
  const [anchor, setAnchor] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [addDate, setAddDate] = useState<Date | null>(null);
  const [detailEvent, setDetailEvent] = useState<CalendarEvent | null>(null);
  const [editEvent, setEditEvent] = useState<CalendarEvent | null>(null);

  // --- Compute date range for fetching ---
  const { rangeFrom, rangeTo } = useCallback(() => {
    if (view === "month") {
      const start = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
      start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
      const end = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
      end.setDate(end.getDate() + (6 - ((end.getDay() + 6) % 7)));
      return { rangeFrom: start, rangeTo: end };
    }
    if (view === "week") {
      const start = startOfWeek(anchor);
      return { rangeFrom: start, rangeTo: addDays(start, 6) };
    }
    return { rangeFrom: anchor, rangeTo: anchor };
  }, [view, anchor])();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const from = rangeFrom.toISOString();
        const to = new Date(rangeTo.getTime() + 86400000).toISOString();
        const res = await fetch(`/api/calendar?from=${from}&to=${to}`);
        if (res.ok && !cancelled) setEvents(await res.json());
      } catch {
        if (!cancelled) toast.error("Błąd ładowania wydarzeń");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [rangeFrom.toISOString(), rangeTo.toISOString()]);

  // --- Navigation ---
  function prev() {
    setAnchor((d) => {
      const n = new Date(d);
      if (view === "month") n.setMonth(n.getMonth() - 1);
      else if (view === "week") n.setDate(n.getDate() - 7);
      else n.setDate(n.getDate() - 1);
      return n;
    });
  }
  function next() {
    setAnchor((d) => {
      const n = new Date(d);
      if (view === "month") n.setMonth(n.getMonth() + 1);
      else if (view === "week") n.setDate(n.getDate() + 7);
      else n.setDate(n.getDate() + 1);
      return n;
    });
  }
  function goToday() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    setAnchor(d);
  }

  function navTitle() {
    if (view === "month") return `${MONTH_NAMES[anchor.getMonth()]} ${anchor.getFullYear()}`;
    if (view === "week") {
      const ws = startOfWeek(anchor);
      const we = addDays(ws, 6);
      if (ws.getMonth() === we.getMonth())
        return `${ws.getDate()}–${we.getDate()} ${MONTH_NAMES[ws.getMonth()]} ${ws.getFullYear()}`;
      return `${ws.getDate()} ${MONTH_NAMES[ws.getMonth()]} – ${we.getDate()} ${MONTH_NAMES[we.getMonth()]} ${we.getFullYear()}`;
    }
    return anchor.toLocaleDateString("pl-PL", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });
  }

  function handleAdded(ev: CalendarEvent) {
    setEvents((prev) => [...prev, ev].sort((a, b) => a.startAt.localeCompare(b.startAt)));
    setAddOpen(false);
    setAddDate(null);
    setEditEvent(null);
  }
  function handleUpdated(ev: CalendarEvent) {
    setEvents((prev) => prev.map((e) => e.id === ev.id ? ev : e).sort((a, b) => a.startAt.localeCompare(b.startAt)));
    setAddOpen(false);
    setEditEvent(null);
    setDetailEvent(null);
  }
  function handleDeleted(id: string) {
    setEvents((prev) => prev.filter((e) => e.id !== id));
    setDetailEvent(null);
  }

  // Group events by date key
  const byDay: Record<string, CalendarEvent[]> = {};
  for (const ev of events) {
    const k = toDateKey(parseDate(ev.startAt));
    (byDay[k] ??= []).push(ev);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isToday = (d: Date) => toDateKey(d) === toDateKey(today);

  // ===== MONTH VIEW =====
  function MonthView() {
    const year = anchor.getFullYear();
    const month = anchor.getMonth();
    const firstDay = new Date(year, month, 1);
    const gridStart = new Date(firstDay);
    gridStart.setDate(gridStart.getDate() - ((firstDay.getDay() + 6) % 7));

    const cells: Date[] = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
    const lastCell = cells[41];
    const displayCells = (lastCell.getMonth() === month || lastCell.getDate() > 7)
      ? cells
      : cells.slice(0, 35);

    return (
      <div className="flex flex-col flex-1 min-h-0">
        <div className="grid grid-cols-7 border-b border-border flex-shrink-0">
          {DAY_NAMES_SHORT.map((d) => (
            <div key={d} className="py-2 text-center text-xs font-medium text-muted-foreground">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 flex-1 min-h-0 overflow-y-auto divide-x divide-y divide-border">
          {displayCells.map((day, i) => {
            const inMonth = day.getMonth() === month;
            const key = toDateKey(day);
            const dayEvs = byDay[key] ?? [];
            const extra = dayEvs.length - 3;
            return (
              <div
                key={i}
                onClick={() => { setAddDate(new Date(day)); setAddOpen(true); }}
                className={`p-1.5 flex flex-col gap-0.5 cursor-pointer hover:bg-muted/40 transition-colors min-h-[90px] ${!inMonth ? "bg-muted/20" : ""}`}
              >
                <span
                  className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full self-start mb-0.5 ${
                    isToday(day)
                      ? "bg-primary text-primary-foreground"
                      : inMonth ? "text-foreground" : "text-muted-foreground/40"
                  }`}
                >
                  {day.getDate()}
                </span>
                {dayEvs.slice(0, 3).map((ev) => (
                  <button
                    key={ev.id}
                    onClick={(e) => { e.stopPropagation(); setDetailEvent(ev); }}
                    className={`w-full text-left text-[11px] px-1.5 py-0.5 rounded truncate font-medium ${TYPE_COLORS[ev.type].bg} ${TYPE_COLORS[ev.type].text}`}
                  >
                    {fmtTime(ev.startAt)} {ev.title}
                  </button>
                ))}
                {extra > 0 && (
                  <span className="text-[10px] text-muted-foreground pl-1">+{extra} więcej</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ===== WEEK VIEW =====
  function WeekView() {
    const weekStart = startOfWeek(anchor);
    const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

    const columns = days.map((d, i) => ({
      date: d,
      isToday: isToday(d),
      label: (
        <>
          <p className="text-xs text-muted-foreground">{DAY_NAMES_SHORT[i]}</p>
          <p className={`text-sm font-semibold mx-auto w-7 h-7 flex items-center justify-center rounded-full ${isToday(d) ? "bg-primary text-primary-foreground" : ""}`}>
            {d.getDate()}
          </p>
        </>
      ),
    }));

    return (
      <TimeGrid
        columns={columns}
        byDay={byDay}
        onCellClick={(date, hour) => {
          const d = new Date(date);
          d.setHours(hour, 0, 0, 0);
          setAddDate(d);
          setAddOpen(true);
        }}
        onEventClick={setDetailEvent}
      />
    );
  }

  // ===== DAY VIEW =====
  function DayView() {
    const columns = [{
      date: anchor,
      isToday: isToday(anchor),
      label: (
        <>
          <p className="text-xs text-muted-foreground">
            {anchor.toLocaleDateString("pl-PL", { weekday: "short" })}
          </p>
          <p className={`text-lg font-semibold mx-auto w-9 h-9 flex items-center justify-center rounded-full ${isToday(anchor) ? "bg-primary text-primary-foreground" : ""}`}>
            {anchor.getDate()}
          </p>
        </>
      ),
    }];

    return (
      <TimeGrid
        columns={columns}
        byDay={byDay}
        onCellClick={(date, hour) => {
          const d = new Date(date);
          d.setHours(hour, 0, 0, 0);
          setAddDate(d);
          setAddOpen(true);
        }}
        onEventClick={setDetailEvent}
      />
    );
  }

  // ===== RENDER =====
  return (
    <div className="flex flex-col h-full -mx-3 sm:-mx-6 -my-4 sm:-my-8">
      {/* Header toolbar */}
      <div className="px-4 pt-3 pb-2 border-b border-border flex-shrink-0">
        {/* Row 1: nav arrows + view switcher */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 flex-shrink-0">
            <button onClick={prev} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
              <ChevronLeft size={16} />
            </button>
            <button onClick={goToday} className="px-2.5 py-1 text-xs font-medium rounded-lg border border-border hover:bg-muted transition-colors">
              Dziś
            </button>
            <button onClick={next} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
              <ChevronRight size={16} />
            </button>
          </div>
          <div className="flex-1" />
          <div className="flex gap-0.5 bg-muted rounded-lg p-0.5">
            {(["month", "week", "day"] as View[]).map((v) => (
              <button key={v} onClick={() => setView(v)} className={`px-3 py-1 text-xs rounded-md transition-colors font-medium ${view === v ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                {v === "month" ? "Miesiąc" : v === "week" ? "Tydzień" : "Dzień"}
              </button>
            ))}
          </div>
        </div>

        {/* Row 2: title + Dodaj */}
        <div className="flex items-center justify-between mt-2">
          <h2 className="text-sm font-semibold capitalize truncate">{navTitle()}</h2>
          <button onClick={() => { setAddDate(null); setAddOpen(true); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity flex-shrink-0">
            <Plus size={15} />
            Dodaj
          </button>
        </div>
      </div>

      {/* Loading bar */}
      {loading && (
        <div className="h-0.5 bg-primary/20 flex-shrink-0">
          <div className="h-full w-1/2 bg-primary animate-[pulse_1s_ease-in-out_infinite]" />
        </div>
      )}

      {/* Calendar body */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {view === "month" && <MonthView />}
        {view === "week" && <WeekView />}
        {view === "day" && <DayView />}
      </div>

      {/* Dialogs */}
      <AddEventDialog
        open={addOpen}
        defaultDate={addDate}
        editEvent={editEvent}
        onClose={() => { setAddOpen(false); setAddDate(null); setEditEvent(null); }}
        onAdded={handleAdded}
        onUpdated={handleUpdated}
      />
      {detailEvent && (
        <EventDetailDialog
          event={detailEvent}
          typeColors={TYPE_COLORS}
          typeLabels={TYPE_LABELS}
          onClose={() => setDetailEvent(null)}
          onDeleted={handleDeleted}
          onEdit={() => { setEditEvent(detailEvent); setDetailEvent(null); setAddOpen(true); }}
          fmtDate={fmtDate}
          fmtTime={fmtTime}
        />
      )}
    </div>
  );
}
