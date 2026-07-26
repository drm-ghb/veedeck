"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Pipette } from "@/components/ui/icons";

// ── Color math ────────────────────────────────────────────────────────────────

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const c = hex.replace("#", "");
  if (c.length !== 6) return { r: 0, g: 0, b: 0 };
  return {
    r: parseInt(c.slice(0, 2), 16) || 0,
    g: parseInt(c.slice(2, 4), 16) || 0,
    b: parseInt(c.slice(4, 6), 16) || 0,
  };
}

function rgbToHsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const v = max;
  const s = max === 0 ? 0 : (max - min) / max;
  let h = 0;
  if (max !== min) {
    const d = max - min;
    if (max === r)      h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else                h = ((r - g) / d + 4) / 6;
  }
  return { h: h * 360, s, v };
}

function hsvToRgb(h: number, s: number, v: number): { r: number; g: number; b: number } {
  const hi = Math.floor(h / 60) % 6;
  const f  = h / 60 - Math.floor(h / 60);
  const p  = v * (1 - s);
  const q  = v * (1 - f * s);
  const t  = v * (1 - (1 - f) * s);
  const lut: [number, number, number][] = [
    [v, t, p], [q, v, p], [p, v, t], [p, q, v], [t, p, v], [v, p, q],
  ];
  const [r, g, b] = lut[hi] ?? [v, v, v];
  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
}

function toHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("");
}

function safeParseHsv(hex: string) {
  try {
    const { r, g, b } = hexToRgb(hex);
    return rgbToHsv(r, g, b);
  } catch {
    return { h: 0, s: 1, v: 1 };
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

interface ColorPickerProps {
  /** Current hex color, e.g. "#3b82f6" */
  value: string;
  onChange: (hex: string) => void;
  /** If true, the picker panel opens downward instead of upward (default: upward) */
  openDown?: boolean;
}

export function ColorPicker({ value, onChange, openDown = false }: ColorPickerProps) {
  const [open, setOpen]         = useState(false);
  const [hsv, setHsv]           = useState(() => safeParseHsv(value));
  const [hexInput, setHexInput] = useState(value);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const gradRef    = useRef<HTMLDivElement>(null);
  const hueRef     = useRef<HTMLDivElement>(null);

  // Sync when value prop changes externally (e.g. swatch click or element change)
  useEffect(() => {
    setHsv(safeParseHsv(value));
    setHexInput(value);
  }, [value]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  const commit = useCallback(
    (h: number, s: number, v: number) => {
      const rgb = hsvToRgb(h, s, v);
      const hex = toHex(rgb.r, rgb.g, rgb.b);
      setHexInput(hex);
      onChange(hex);
    },
    [onChange]
  );

  const handleGrad = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!gradRef.current) return;
      const rect = gradRef.current.getBoundingClientRect();
      const s = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const v = Math.max(0, Math.min(1, 1 - (e.clientY - rect.top) / rect.height));
      setHsv((prev) => {
        commit(prev.h, s, v);
        return { ...prev, s, v };
      });
    },
    [commit]
  );

  const handleHue = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!hueRef.current) return;
      const rect = hueRef.current.getBoundingClientRect();
      const h = Math.max(0, Math.min(360, ((e.clientX - rect.left) / rect.width) * 360));
      setHsv((prev) => {
        commit(h, prev.s, prev.v);
        return { ...prev, h };
      });
    },
    [commit]
  );

  const rgb      = hsvToRgb(hsv.h, hsv.s, hsv.v);
  const curHex   = toHex(rgb.r, rgb.g, rgb.b);
  const hueColor = `hsl(${hsv.h}, 100%, 50%)`;
  const swatchBg = value && value !== "transparent" ? value : "#ffffff";

  const panelPos = openDown
    ? "top-[calc(100%+6px)]"
    : "bottom-[calc(100%+6px)]";

  return (
    <div className="relative" ref={wrapperRef}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 px-1.5 h-8 rounded-lg border border-border cursor-pointer hover:bg-muted transition-colors"
        title="Wybierz kolor"
      >
        <span
          className="w-4 h-4 rounded-sm border border-border/60 shrink-0"
          style={{ background: swatchBg }}
        />
        <Pipette size={13} className="text-muted-foreground" />
      </button>

      {/* Picker panel */}
      {open && (
        <div
          className={`absolute ${panelPos} left-0 z-[60] bg-card border border-border rounded-2xl shadow-xl p-3 w-[220px]`}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {/* Saturation / Value area */}
          <div
            ref={gradRef}
            className="w-full h-36 rounded-xl mb-2.5 cursor-crosshair relative select-none overflow-hidden"
            style={{
              background: `linear-gradient(to bottom, transparent, #000),
                           linear-gradient(to right, #fff, ${hueColor})`,
            }}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              handleGrad(e);
            }}
            onPointerMove={(e) => {
              if (e.buttons === 1) handleGrad(e);
            }}
          >
            {/* Cursor */}
            <div
              className="absolute w-3.5 h-3.5 rounded-full border-2 border-white shadow-md pointer-events-none"
              style={{
                left: `${hsv.s * 100}%`,
                top: `${(1 - hsv.v) * 100}%`,
                transform: "translate(-50%, -50%)",
                background: curHex,
              }}
            />
          </div>

          {/* Hue slider */}
          <div
            ref={hueRef}
            className="w-full h-3 rounded-full mb-3 cursor-pointer relative select-none"
            style={{
              background:
                "linear-gradient(to right,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)",
            }}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              handleHue(e);
            }}
            onPointerMove={(e) => {
              if (e.buttons === 1) handleHue(e);
            }}
          >
            <div
              className="absolute top-1/2 w-4 h-4 rounded-full border-2 border-white shadow-md pointer-events-none"
              style={{
                left: `${(hsv.h / 360) * 100}%`,
                transform: "translate(-50%, -50%)",
                background: hueColor,
              }}
            />
          </div>

          {/* RGB + HEX values */}
          <div className="space-y-1.5">
            <div className="px-2 py-1.5 rounded-lg bg-muted text-xs text-muted-foreground font-mono select-text">
              rgb({rgb.r}, {rgb.g}, {rgb.b})
            </div>
            <input
              type="text"
              value={hexInput}
              onChange={(e) => {
                const v = e.target.value;
                setHexInput(v);
                if (/^#[0-9a-fA-F]{6}$/.test(v)) {
                  const { r, g, b } = hexToRgb(v);
                  setHsv(rgbToHsv(r, g, b));
                  onChange(v);
                }
              }}
              className="w-full px-2 py-1.5 rounded-lg bg-muted text-xs font-mono text-foreground outline-none focus:ring-1 focus:ring-primary/50"
              placeholder="#000000"
              spellCheck={false}
            />
          </div>
        </div>
      )}
    </div>
  );
}
