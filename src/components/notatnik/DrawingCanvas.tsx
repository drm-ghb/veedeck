"use client";

import { useRef, useCallback, useEffect, useState } from "react";
import { X, Check, Pencil, Eraser, Trash2, Minus, Circle } from "@/components/ui/icons";
import { useT } from "@/lib/i18n";

interface DrawingCanvasProps {
  onSave: (blob: Blob, filename: string) => void;
  onClose: () => void;
}

const COLORS = ["#000000", "#ef4444", "#3b82f6", "#22c55e", "#f59e0b", "#8b5cf6", "#ec4899", "#ffffff"];
const SIZES = [2, 5, 10, 20];

export function DrawingCanvas({ onSave, onClose }: DrawingCanvasProps) {
  const t = useT();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const [tool, setTool] = useState<"pen" | "eraser">("pen");
  const [color, setColor] = useState("#000000");
  const [size, setSize] = useState(5);
  const [isEmpty, setIsEmpty] = useState(true);

  // Blokuj scroll/pull-to-refresh iOS
  useEffect(() => {
    const scrollY = window.scrollY;
    const prev = {
      position: document.body.style.position,
      top: document.body.style.top,
      width: document.body.style.width,
      overflow: document.body.style.overflow,
      overscroll: document.body.style.overscrollBehavior,
    };
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";
    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";
    return () => {
      document.body.style.position = prev.position;
      document.body.style.top = prev.top;
      document.body.style.width = prev.width;
      document.body.style.overflow = prev.overflow;
      document.body.style.overscrollBehavior = prev.overscroll;
      window.scrollTo(0, scrollY);
    };
  }, []);

  // Inicjalizuj canvas po zamontowaniu i przy zmianie rozmiaru
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      // Zachowaj zawartość przy resize
      const tmp = document.createElement("canvas");
      tmp.width = canvas.width;
      tmp.height = canvas.height;
      tmp.getContext("2d")?.drawImage(canvas, 0, 0);

      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(tmp, 0, 0);
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas.parentElement!);
    return () => observer.disconnect();
  }, []);

  const getPoint = useCallback((e: PointerEvent): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }, []);

  const startDrawing = useCallback((e: PointerEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    isDrawing.current = true;
    lastPoint.current = getPoint(e);

    // Rysuj punkt gdy tylko kliknięto (bez ruchu)
    const ctx = canvas.getContext("2d");
    const pt = lastPoint.current;
    if (ctx && pt) {
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, (tool === "eraser" ? size * 3 : size) / 2, 0, Math.PI * 2);
      ctx.fillStyle = tool === "eraser" ? "#ffffff" : color;
      ctx.fill();
      setIsEmpty(false);
    }
  }, [color, size, tool, getPoint]);

  const draw = useCallback((e: PointerEvent) => {
    e.preventDefault();
    if (!isDrawing.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const pt = getPoint(e);
    if (!ctx || !pt || !lastPoint.current) return;

    ctx.beginPath();
    ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
    ctx.lineTo(pt.x, pt.y);
    ctx.strokeStyle = tool === "eraser" ? "#ffffff" : color;
    ctx.lineWidth = tool === "eraser" ? size * 3 : size;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();

    lastPoint.current = pt;
    setIsEmpty(false);
  }, [color, size, tool, getPoint]);

  const stopDrawing = useCallback((e: PointerEvent) => {
    e.preventDefault();
    isDrawing.current = false;
    lastPoint.current = null;
  }, []);

  // Rejestruj eventy na canvasie
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.addEventListener("pointerdown", startDrawing, { passive: false });
    canvas.addEventListener("pointermove", draw, { passive: false });
    canvas.addEventListener("pointerup", stopDrawing, { passive: false });
    canvas.addEventListener("pointercancel", stopDrawing, { passive: false });
    return () => {
      canvas.removeEventListener("pointerdown", startDrawing);
      canvas.removeEventListener("pointermove", draw);
      canvas.removeEventListener("pointerup", stopDrawing);
      canvas.removeEventListener("pointercancel", stopDrawing);
    };
  }, [startDrawing, draw, stopDrawing]);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setIsEmpty(true);
  }, []);

  const handleSave = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || isEmpty) { onClose(); return; }
    canvas.toBlob((blob) => {
      if (!blob) return;
      onSave(blob, `rysunek-${Date.now()}.png`);
    }, "image/png");
  }, [isEmpty, onSave, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background" style={{ touchAction: "none" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border shrink-0 bg-card gap-2">
        <span className="text-sm font-medium text-foreground shrink-0">{t.notatnik.drawingTitle}</span>

        {/* Narzędzia */}
        <div className="flex items-center gap-1">
          {/* Pióro / Gumka */}
          <button
            onClick={() => setTool("pen")}
            className={`p-2 rounded-md transition-colors ${tool === "pen" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
            title={t.notatnik.drawingPen}
          >
            <Pencil size={16} />
          </button>
          <button
            onClick={() => setTool("eraser")}
            className={`p-2 rounded-md transition-colors ${tool === "eraser" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
            title={t.notatnik.drawingEraser}
          >
            <Eraser size={16} />
          </button>

          {/* Grubość */}
          <div className="flex items-center gap-1 ml-1">
            {SIZES.map((s) => (
              <button
                key={s}
                onClick={() => setSize(s)}
                className={`rounded-full flex items-center justify-center transition-colors ${size === s ? "bg-primary" : "bg-muted hover:bg-muted/80"}`}
                style={{ width: 28, height: 28 }}
                title={`${s}px`}
              >
                <div
                  className={`rounded-full ${size === s ? "bg-primary-foreground" : "bg-foreground"}`}
                  style={{ width: Math.max(s * 1.5, 3), height: Math.max(s * 1.5, 3) }}
                />
              </button>
            ))}
          </div>

          {/* Kolory */}
          <div className="flex items-center gap-1 ml-1">
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => { setColor(c); setTool("pen"); }}
                className="rounded-full border-2 transition-all shrink-0"
                style={{
                  width: 22,
                  height: 22,
                  backgroundColor: c,
                  borderColor: color === c && tool === "pen" ? "#6366f1" : c === "#ffffff" ? "#d1d5db" : c,
                  transform: color === c && tool === "pen" ? "scale(1.25)" : "scale(1)",
                }}
              />
            ))}
          </div>

          {/* Wyczyść */}
          <button
            onClick={clearCanvas}
            className="p-2 ml-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-muted transition-colors"
            title={t.notatnik.drawingClear}
          >
            <Trash2 size={16} />
          </button>
        </div>

        {/* Akcje */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
          >
            <X size={14} />
            {t.common.cancel}
          </button>
          <button
            onClick={handleSave}
            disabled={isEmpty}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            <Check size={14} />
            {t.notatnik.drawingInsert}
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 min-h-0 relative overflow-hidden bg-white">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 cursor-crosshair"
          style={{ touchAction: "none" }}
        />
        {isEmpty && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-sm text-gray-300 select-none">{t.notatnik.drawingPlaceholder}</p>
          </div>
        )}
      </div>
    </div>
  );
}
