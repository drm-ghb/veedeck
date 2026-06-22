"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, X } from "@/components/ui/icons";
import { useT } from "@/lib/i18n";

interface DatePickerProps {
  value: string; // "YYYY-MM-DD" or ""
  onChange: (value: string) => void;
  placeholder?: string | undefined;
  className?: string;
  /** Red border / text when date is overdue */
  error?: boolean;
  /** Open calendar immediately on mount (for inline table editing) */
  initialOpen?: boolean;
  /** Called when calendar closes without selection (click-outside) */
  onClose?: () => void;
  /** Compact pill-sized trigger for inline table cells */
  compact?: boolean;
}

export default function DatePicker({
  value,
  onChange,
  placeholder,
  className = "",
  error = false,
  initialOpen = false,
  onClose,
  compact = false,
}: DatePickerProps) {
  const t = useT();
  const MONTHS = [t.calendar.month0, t.calendar.month1, t.calendar.month2, t.calendar.month3, t.calendar.month4, t.calendar.month5, t.calendar.month6, t.calendar.month7, t.calendar.month8, t.calendar.month9, t.calendar.month10, t.calendar.month11];
  const DAYS = [t.calendar.dpDayMon, t.calendar.dpDayTue, t.calendar.dpDayWed, t.calendar.dpDayThu, t.calendar.dpDayFri, t.calendar.dpDaySat, t.calendar.dpDaySun];
  const [open, setOpen] = useState(initialOpen);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  const today = new Date();
  const selectedDate = value ? new Date(value + "T00:00:00") : null;

  const [displayMonth, setDisplayMonth] = useState(() => {
    if (selectedDate) return new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });

  // Sync display month when value changes externally
  useEffect(() => {
    if (value) {
      const d = new Date(value + "T00:00:00");
      setDisplayMonth(new Date(d.getFullYear(), d.getMonth(), 1));
    }
  }, [value]);

  function calcPosition() {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const calendarHeight = 280;
      const top = spaceBelow >= calendarHeight
        ? rect.bottom + 4
        : rect.top - calendarHeight - 4;
      setDropdownStyle({ top, left: rect.left });
    }
  }

  useEffect(() => {
    if (initialOpen) calcPosition();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Click-outside closes calendar
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      const inContainer = containerRef.current?.contains(e.target as Node);
      const inDropdown = dropdownRef.current?.contains(e.target as Node);
      if (!inContainer && !inDropdown) {
        setOpen(false);
        onClose?.();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open, onClose]);

  function handleToggle() {
    if (!open) calcPosition();
    setOpen((v) => !v);
  }

  function handleSelectDay(day: number) {
    const y = displayMonth.getFullYear();
    const m = displayMonth.getMonth();
    const str = `${y}-${String(m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    onChange(str);
    setOpen(false);
  }

  const year = displayMonth.getFullYear();
  const month = displayMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayRaw = new Date(year, month, 1).getDay();
  const firstDayOffset = firstDayRaw === 0 ? 6 : firstDayRaw - 1; // Mon = 0

  const displayValue = selectedDate
    ? selectedDate.toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit", year: "numeric" })
    : "";

  const triggerCls = compact
    ? `inline-flex items-center gap-1.5 px-2 py-0.5 text-xs border rounded-full bg-background hover:bg-muted/40 focus:outline-none transition-colors whitespace-nowrap ${error ? "border-red-400 text-red-500" : "border-border"}`
    : `w-full flex items-center gap-2 px-3 py-2 text-sm border rounded-lg bg-background hover:bg-muted/40 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors ${error ? "border-red-400 text-red-500" : "border-border"}`;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button ref={triggerRef} type="button" onClick={handleToggle} className={triggerCls}>
        <span className={displayValue ? "" : "text-muted-foreground"}>
          {displayValue || placeholder || t.common.selectDate}
        </span>
        {value && !compact && (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => { e.stopPropagation(); onChange(""); }}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.stopPropagation(); onChange(""); } }}
            className="ml-auto text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={13} />
          </span>
        )}
      </button>

      {open && (
        <div
          ref={dropdownRef}
          className="fixed z-[9999] w-64 rounded-xl bg-popover border border-border shadow-lg overflow-hidden"
          style={dropdownStyle}
        >
          {/* Month navigation */}
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
            <button
              type="button"
              onClick={() => setDisplayMonth(new Date(year, month - 1, 1))}
              className="p-1 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft size={15} />
            </button>
            <span className="text-sm font-semibold">{MONTHS[month]} {year}</span>
            <button
              type="button"
              onClick={() => setDisplayMonth(new Date(year, month + 1, 1))}
              className="p-1 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            >
              <ChevronRight size={15} />
            </button>
          </div>

          <div className="px-2 pt-2 pb-3">
            {/* Day-of-week headers */}
            <div className="grid grid-cols-7 mb-1">
              {DAYS.map((d) => (
                <div key={d} className="text-center text-[10px] font-medium text-muted-foreground py-1">
                  {d}
                </div>
              ))}
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7 gap-y-0.5">
              {Array.from({ length: firstDayOffset }).map((_, i) => (
                <div key={`e${i}`} />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const isToday =
                  today.getFullYear() === year &&
                  today.getMonth() === month &&
                  today.getDate() === day;
                const isSelected =
                  selectedDate &&
                  selectedDate.getFullYear() === year &&
                  selectedDate.getMonth() === month &&
                  selectedDate.getDate() === day;
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => handleSelectDay(day)}
                    className={`text-xs rounded-lg py-1.5 transition-colors font-medium leading-none
                      ${isSelected ? "bg-primary text-primary-foreground" : "hover:bg-muted"}
                      ${isToday && !isSelected ? "text-primary font-bold" : ""}
                    `}
                  >
                    {day}
                  </button>
                );
              })}
            </div>

            {/* Clear button */}
            {value && (
              <button
                type="button"
                onClick={() => { onChange(""); setOpen(false); }}
                className="mt-2 w-full text-xs text-muted-foreground hover:text-foreground text-center py-1 rounded-lg hover:bg-muted transition-colors"
              >
                {t.common.clearDate}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
