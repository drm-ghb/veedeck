"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "@/components/ui/icons";

interface TimePickerProps {
  value: string; // "HH:MM"
  onChange: (value: string) => void;
  className?: string;
}

function generateSlots(): string[] {
  const slots: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (const m of [0, 30]) {
      slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  return slots;
}

const SLOTS = generateSlots();

export default function TimePicker({ value, onChange, className = "" }: TimePickerProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  useEffect(() => { setInputValue(value); }, [value]);

  function calcPosition() {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const dropH = 220;
      const top = spaceBelow >= dropH ? rect.bottom + 4 : rect.top - dropH - 4;
      setDropdownStyle({ top, left: rect.left, minWidth: rect.width });
    }
  }

  // Scroll active slot into view when dropdown opens
  useEffect(() => {
    if (!open) return;
    setTimeout(() => {
      if (listRef.current) {
        const active = listRef.current.querySelector("[data-active='true']") as HTMLElement | null;
        active?.scrollIntoView({ block: "center" });
      }
    }, 10);
  }, [open]);

  // Click-outside
  useEffect(() => {
    if (!open) return;
    function handleMouseDown(e: MouseEvent) {
      const inContainer = containerRef.current?.contains(e.target as Node);
      const inDropdown = dropdownRef.current?.contains(e.target as Node);
      if (!inContainer && !inDropdown) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [open]);

  function handleToggle() {
    if (!open) calcPosition();
    setOpen((v) => !v);
  }

  function handleInputBlur() {
    const match = inputValue.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
    if (match) {
      const normalized = `${String(parseInt(match[1])).padStart(2, "0")}:${match[2]}`;
      onChange(normalized);
      setInputValue(normalized);
    } else {
      setInputValue(value);
    }
  }

  function handleSelect(slot: string) {
    onChange(slot);
    setInputValue(slot);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div
        ref={triggerRef}
        className="w-full flex items-center gap-1 px-3 py-2 text-sm border border-input rounded-lg bg-background hover:bg-muted/40 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 transition-colors"
      >
        <input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onBlur={handleInputBlur}
          placeholder="00:00"
          className="flex-1 min-w-0 bg-transparent outline-none text-sm"
        />
        <span
          role="button"
          tabIndex={-1}
          onMouseDown={(e) => { e.preventDefault(); handleToggle(); }}
          className="shrink-0 cursor-pointer text-muted-foreground hover:text-foreground"
        >
          <ChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} />
        </span>
      </div>

      {open && (
        <div
          ref={dropdownRef}
          className="fixed z-[9999] rounded-lg bg-popover p-1 shadow-md ring-1 ring-foreground/10"
          style={dropdownStyle}
        >
          <div ref={listRef} className="max-h-52 overflow-y-auto">
            {SLOTS.map((slot) => {
              const isActive = slot === value;
              return (
                <button
                  key={slot}
                  type="button"
                  data-active={isActive}
                  onMouseDown={(e) => { e.preventDefault(); handleSelect(slot); }}
                  className={`w-full text-left rounded-md px-1.5 py-1 text-sm transition-colors hover:bg-accent hover:text-accent-foreground ${isActive ? "bg-accent/60 text-accent-foreground font-medium" : ""}`}
                >
                  {slot}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
