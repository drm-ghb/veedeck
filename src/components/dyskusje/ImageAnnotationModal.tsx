"use client";

import { useRef, useState, useEffect } from "react";
import { X, Pen, Square, Minus, RotateCcw, Send } from "@/components/ui/icons";
import { useT } from "@/lib/i18n";

type Tool = "pen" | "rect" | "arrow";
const COLORS = ["#ef4444", "#f97316", "#22c55e", "#3b82f6", "#ffffff", "#111111"];

interface Props {
  imageUrl: string;
  onClose: () => void;
  onSend: (blob: Blob) => void;
  sending?: boolean;
}

export default function ImageAnnotationModal({ imageUrl, onClose, onSend, sending }: Props) {
  const t = useT();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState(COLORS[0]);
  const [drawing, setDrawing] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const historyRef = useRef<ImageData[]>([]);
  const startPos = useRef<{ x: number; y: number } | null>(null);
  const snapshotRef = useRef<ImageData | null>(null);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      historyRef.current = [ctx.getImageData(0, 0, canvas.width, canvas.height)];
    };
    img.src = imageUrl;
  }, [imageUrl]);

  function getPos(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  }

  function onMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    const pos = getPos(e);
    startPos.current = pos;
    setDrawing(true);
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    snapshotRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);
    if (tool === "pen") {
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    }
  }

  function onMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!drawing || !startPos.current) return;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const pos = getPos(e);
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (tool === "pen") {
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    } else if (tool === "rect") {
      ctx.putImageData(snapshotRef.current!, 0, 0);
      ctx.beginPath();
      ctx.strokeRect(
        startPos.current.x,
        startPos.current.y,
        pos.x - startPos.current.x,
        pos.y - startPos.current.y
      );
    } else if (tool === "arrow") {
      ctx.putImageData(snapshotRef.current!, 0, 0);
      drawArrow(ctx, startPos.current.x, startPos.current.y, pos.x, pos.y);
    }
  }

  function onMouseUp() {
    if (!drawing) return;
    setDrawing(false);
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    historyRef.current = [...historyRef.current, ctx.getImageData(0, 0, canvas.width, canvas.height)];
    setCanUndo(historyRef.current.length > 1);
  }

  function drawArrow(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) {
    const headLen = 20;
    const angle = Math.atan2(y2 - y1, x2 - x1);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - headLen * Math.cos(angle - Math.PI / 6), y2 - headLen * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(x2 - headLen * Math.cos(angle + Math.PI / 6), y2 - headLen * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }

  function undo() {
    if (historyRef.current.length <= 1) return;
    historyRef.current = historyRef.current.slice(0, -1);
    const ctx = canvasRef.current!.getContext("2d")!;
    ctx.putImageData(historyRef.current[historyRef.current.length - 1], 0, 0);
    setCanUndo(historyRef.current.length > 1);
  }

  function handleSend() {
    canvasRef.current?.toBlob((blob) => {
      if (blob) onSend(blob);
    }, "image/png");
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="flex flex-col bg-background rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden" style={{ maxHeight: "90vh" }}>
        {/* Toolbar */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border flex-shrink-0 flex-wrap">
          <span className="text-sm font-medium mr-1">{t.dyskusje.annotateLabel}</span>
          <div className="flex items-center gap-1">
            {(["pen", "rect", "arrow"] as Tool[]).map((toolId) => (
              <button
                key={toolId}
                onClick={() => setTool(toolId)}
                title={toolId === "pen" ? t.dyskusje.annotatePen : toolId === "rect" ? t.dyskusje.annotateRect : t.dyskusje.annotateArrow}
                className={`p-1.5 rounded-lg transition-colors ${tool === toolId ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
              >
                {toolId === "pen" ? <Pen size={14} /> : toolId === "rect" ? <Square size={14} /> : <Minus size={14} />}
              </button>
            ))}
          </div>
          <div className="w-px h-5 bg-border" />
          <div className="flex items-center gap-1.5">
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                style={{
                  background: c,
                  outline: color === c ? "2px solid hsl(var(--primary))" : "2px solid transparent",
                  outlineOffset: "1px",
                }}
                className="w-5 h-5 rounded-full flex-shrink-0 transition-transform hover:scale-110"
              />
            ))}
          </div>
          <div className="w-px h-5 bg-border" />
          <button
            onClick={undo}
            disabled={!canUndo}
            title={t.dyskusje.annotateUndo}
            className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted disabled:opacity-40 transition-colors"
          >
            <RotateCcw size={14} />
          </button>
          <button onClick={onClose} className="p-1.5 ml-auto rounded-lg text-muted-foreground hover:bg-muted transition-colors">
            <X size={14} />
          </button>
        </div>

        {/* Canvas */}
        <div className="flex-1 overflow-auto bg-zinc-900 flex items-center justify-center p-3" style={{ minHeight: 0 }}>
          <canvas
            ref={canvasRef}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
            className="rounded-lg cursor-crosshair select-none"
            style={{ maxWidth: "100%", maxHeight: "calc(90vh - 130px)", objectFit: "contain" }}
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-4 py-2.5 border-t border-border flex-shrink-0">
          <button onClick={onClose} className="px-4 py-1.5 text-sm rounded-xl border border-border hover:bg-muted transition-colors">
            {t.common.cancel}
          </button>
          <button
            onClick={handleSend}
            disabled={sending}
            className="flex items-center gap-1.5 px-4 py-1.5 text-sm bg-primary text-primary-foreground rounded-xl hover:opacity-90 disabled:opacity-40 transition-opacity"
          >
            <Send size={13} />
            {sending ? t.dyskusje.annotateSending : t.dyskusje.annotateSend}
          </button>
        </div>
      </div>
    </div>
  );
}
