"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "@/components/ui/icons";

export interface TaskSelectOption {
  value: string;
  label: string;
  /** Tailwind bg-* class for colored dot (status/priority) */
  dot?: string;
  /** Avatar URL — if provided, shows img */
  avatarUrl?: string | null;
  /** Fallback initials when no avatarUrl */
  initials?: string;
}

interface TaskSelectFieldProps {
  value: string;
  onChange: (value: string) => void;
  options: TaskSelectOption[];
  placeholder?: string;
  className?: string;
  /** Use position:fixed for the dropdown — required inside overflow:hidden containers */
  useFixed?: boolean;
  /** Open the dropdown immediately on mount */
  initialOpen?: boolean;
  /** Called when dropdown closes without a selection (click-outside or scroll) */
  onClose?: () => void;
  /** Compact pill-sized trigger (for inline table editing) */
  compact?: boolean;
  /** Inline auto-width trigger (for toolbar use) */
  inline?: boolean;
  /** Invisible trigger that fills parent — dropdown still opens, no visual size change */
  invisibleTrigger?: boolean;
}

export default function TaskSelectField({
  value,
  onChange,
  options,
  placeholder = "Wybierz...",
  className = "",
  useFixed = false,
  initialOpen = false,
  onClose,
  compact = false,
  inline = false,
  invisibleTrigger = false,
}: TaskSelectFieldProps) {
  const [open, setOpen] = useState(initialOpen);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement | HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  function calcPosition() {
    if (useFixed && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownStyle({
        top: rect.bottom + 4,
        left: rect.left,
      });
    }
  }

  // Calculate position on mount if initialOpen + useFixed
  useEffect(() => {
    if (initialOpen && useFixed) calcPosition();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Click-outside closes dropdown
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      const inTrigger = ref.current?.contains(e.target as Node);
      const inDropdown = dropdownRef.current?.contains(e.target as Node);
      if (!inTrigger && !inDropdown) {
        setOpen(false);
        onClose?.();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open, onClose]);

  // Scroll closes fixed dropdown only when scrolling outside the dropdown itself
  useEffect(() => {
    if (!open || !useFixed) return;
    function handleScroll(e: Event) {
      if (dropdownRef.current?.contains(e.target as Node)) return;
      setOpen(false);
      onClose?.();
    }
    window.addEventListener("scroll", handleScroll, true);
    return () => window.removeEventListener("scroll", handleScroll, true);
  }, [open, useFixed, onClose]);

  function handleToggle() {
    if (!open) calcPosition();
    setOpen((v) => !v);
  }

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={ref} className={`relative ${className}`}>
      {/* Trigger */}
      {invisibleTrigger ? (
        <div
          ref={triggerRef as React.RefObject<HTMLDivElement>}
          onClick={handleToggle}
          className="absolute inset-0 cursor-pointer"
        />
      ) : (
        <button
          ref={triggerRef}
          type="button"
          onClick={handleToggle}
          className={
            compact
              ? "inline-flex items-center gap-1.5 px-2 py-0.5 text-xs border border-input rounded-full bg-background hover:bg-muted/40 focus:outline-none transition-colors whitespace-nowrap"
              : inline
              ? "inline-flex items-center gap-2 px-3 h-8 text-sm border border-input rounded-lg bg-background hover:bg-muted/40 focus:outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 transition-colors whitespace-nowrap"
              : "w-full flex items-center gap-2 px-3 py-2 text-sm border border-input rounded-lg bg-background hover:bg-muted/40 focus:outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 transition-colors"
          }
        >
          <OptionDisplay option={selected} placeholder={placeholder} compact={compact} />
          <ChevronDown
            size={compact ? 11 : 14}
            className={`shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""} ${compact ? "" : "ml-auto"}`}
          />
        </button>
      )}

      {/* Dropdown */}
      {open && (
        <div
          ref={dropdownRef}
          className={`${useFixed ? "fixed" : "absolute mt-1 w-full"} z-[9999] min-w-[160px] rounded-lg bg-popover p-1 shadow-md ring-1 ring-foreground/10 overflow-hidden`}
          style={useFixed ? dropdownStyle : undefined}
        >
          <div className="max-h-56 overflow-y-auto">
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className={`w-full flex items-center gap-1.5 rounded-md px-1.5 py-1 text-sm text-left transition-colors hover:bg-accent hover:text-accent-foreground ${opt.value === value ? "bg-accent/60 text-accent-foreground" : ""}`}
              >
                <OptionDisplay option={opt} />
                {opt.value === value && (
                  <Check size={13} className="ml-auto shrink-0 opacity-70" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function OptionDisplay({ option, placeholder, compact }: { option: TaskSelectOption | undefined; placeholder?: string; compact?: boolean }) {
  if (!option) {
    return <span className="text-muted-foreground">{placeholder ?? "—"}</span>;
  }

  return (
    <>
      {(option.avatarUrl !== undefined || option.initials !== undefined) && (
        <span className={`rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold shrink-0 overflow-hidden ${compact ? "w-4 h-4 text-[9px]" : "w-5 h-5 text-[10px]"}`}>
          {option.avatarUrl
            ? <img src={option.avatarUrl} alt="" className="w-full h-full object-cover" />
            : <span>{option.initials ?? "?"}</span>
          }
        </span>
      )}
      {option.dot && !option.avatarUrl && option.initials === undefined && (
        <span className={`rounded-full shrink-0 ${option.dot} ${compact ? "w-1.5 h-1.5" : "w-2 h-2"}`} />
      )}
      <span className="truncate">{option.label}</span>
    </>
  );
}
