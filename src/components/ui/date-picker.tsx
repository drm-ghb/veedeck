"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "@/components/ui/icons";

interface DatePickerProps {
  value: string; // YYYY-MM-DD or ""
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const MONTHS_PL = [
  "Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec",
  "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień",
];
const DAYS_PL = ["Pn", "Wt", "Śr", "Cz", "Pt", "So", "Nd"];

export function DatePicker({ value, onChange, placeholder = "Wybierz datę", className }: DatePickerProps) {
  const parsedDate = value ? new Date(value + "T00:00:00") : null;
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(() => parsedDate?.getFullYear() ?? new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => parsedDate?.getMonth() ?? new Date().getMonth());
  const [popoverStyle, setPopoverStyle] = useState<{ bottom: number; left: number; width: number }>({ bottom: 0, left: 0, width: 256 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close on outside click (works across portal boundary)
  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      const t = e.target as Node;
      if (!triggerRef.current?.contains(t) && !popoverRef.current?.contains(t)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  const displayValue = value
    ? (() => { const [y, m, d] = value.split("-"); return `${d}.${m}.${y}`; })()
    : "";

  const today = new Date();
  const todayStr = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");

  function openPicker() {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPopoverStyle({
        bottom: window.innerHeight - rect.top + 6,
        left: rect.left,
        width: rect.width,
      });
    }
    if (parsedDate) {
      setViewYear(parsedDate.getFullYear());
      setViewMonth(parsedDate.getMonth());
    }
    setOpen(true);
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  }

  function selectDay(day: number) {
    onChange(`${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`);
    setOpen(false);
  }

  // Build calendar grid (week starts Monday)
  const firstDow = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const popover = open && typeof document !== "undefined" ? createPortal(
    <div
      ref={popoverRef}
      style={{ position: "fixed", bottom: popoverStyle.bottom, left: popoverStyle.left, minWidth: 256, zIndex: 9999 }}
      className="rounded-xl border border-border bg-popover p-3 shadow-lg"
    >
      {/* Month navigation */}
      <div className="mb-2 flex items-center justify-between">
        <button type="button" onClick={prevMonth} className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
          <ChevronLeft size={15} />
        </button>
        <span className="text-sm font-medium">{MONTHS_PL[viewMonth]} {viewYear}</span>
        <button type="button" onClick={nextMonth} className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
          <ChevronRight size={15} />
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="mb-1 grid grid-cols-7">
        {DAYS_PL.map((d) => (
          <div key={d} className="py-1 text-center text-[11px] font-medium text-muted-foreground">{d}</div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((day, i) => {
          if (day === null) return <div key={i} />;
          const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const isSelected = dateStr === value;
          const isToday = dateStr === todayStr;
          return (
            <button
              key={i}
              type="button"
              onClick={() => selectDay(day)}
              className={`rounded-md py-1 text-center text-sm transition-colors
                ${isSelected
                  ? "bg-primary font-semibold text-primary-foreground"
                  : isToday
                  ? "bg-primary/10 font-medium text-primary hover:bg-primary/20"
                  : "text-foreground hover:bg-muted"
                }`}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <div className={`relative${className ? ` ${className}` : ""}`} ref={triggerRef}>
      <div
        className="flex h-9 w-full cursor-pointer select-none items-center rounded-lg border border-border bg-background px-3 text-sm"
        onClick={() => open ? setOpen(false) : openPicker()}
      >
        <span className={`flex-1 ${displayValue ? "text-foreground" : "text-muted-foreground"}`}>
          {displayValue || placeholder}
        </span>
        {value ? (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onChange(""); }}
            className="ml-1 text-muted-foreground hover:text-foreground"
          >
            <X size={13} />
          </button>
        ) : (
          <CalendarDays size={14} className="text-muted-foreground" />
        )}
      </div>
      {popover}
    </div>
  );
}
