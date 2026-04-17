"use client";

import { useRef, useCallback, useEffect } from "react";
import { Tldraw, Editor } from "@tldraw/tldraw";
import "@tldraw/tldraw/tldraw.css";
import { X, Check } from "lucide-react";

interface DrawingCanvasProps {
  onSave: (blob: Blob, filename: string) => void;
  onClose: () => void;
}

export function DrawingCanvas({ onSave, onClose }: DrawingCanvasProps) {
  const editorRef = useRef<Editor | null>(null);

  useEffect(() => {
    // Zapisz aktualny scroll żeby przywrócić po zamknięciu
    const scrollY = window.scrollY;

    // Blokuj body — position:fixed to najskuteczniejsza metoda na iOS Safari
    // zatrzymuje pull-to-refresh i chowanie/pokazywanie paska adresu
    const prevBodyOverflow = document.body.style.overflow;
    const prevBodyPosition = document.body.style.position;
    const prevBodyTop = document.body.style.top;
    const prevBodyWidth = document.body.style.width;
    const prevHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";
    document.documentElement.style.overflow = "hidden";

    // Blokuj touchmove na document (pull-to-refresh, scroll strony)
    const preventTouch = (e: TouchEvent) => e.preventDefault();
    document.addEventListener("touchmove", preventTouch, { passive: false });

    // Blokuj gesturestart (pinch-zoom Safari)
    const preventGesture = (e: Event) => e.preventDefault();
    document.addEventListener("gesturestart", preventGesture, { passive: false });
    document.addEventListener("gesturechange", preventGesture, { passive: false });

    return () => {
      document.removeEventListener("touchmove", preventTouch);
      document.removeEventListener("gesturestart", preventGesture);
      document.removeEventListener("gesturechange", preventGesture);

      document.body.style.overflow = prevBodyOverflow;
      document.body.style.position = prevBodyPosition;
      document.body.style.top = prevBodyTop;
      document.body.style.width = prevBodyWidth;
      document.documentElement.style.overflow = prevHtmlOverflow;

      // Przywróć pozycję scroll
      window.scrollTo(0, scrollY);
    };
  }, []);

  const handleSave = useCallback(async () => {
    const editor = editorRef.current;
    if (!editor) return;

    const shapeIds = editor.getCurrentPageShapeIds();
    if (shapeIds.size === 0) {
      onClose();
      return;
    }

    const { blob } = await editor.toImage([...shapeIds], {
      format: "png",
      background: true,
      padding: 16,
    });

    const filename = `rysunek-${Date.now()}.png`;
    onSave(blob, filename);
  }, [onSave, onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-background"
      style={{ touchAction: "none" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border shrink-0 bg-card">
        <span className="text-sm font-medium text-foreground">Szkicownik</span>
        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
          >
            <X size={14} />
            Anuluj
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity"
          >
            <Check size={14} />
            Wstaw do notatki
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 min-h-0" style={{ touchAction: "none" }}>
        <Tldraw
          onMount={(editor) => {
            editorRef.current = editor;
            // Wyłącz animacje które mogą powodować problemy z WebGL na iOS
            editor.updateInstanceState({ isChangingStyle: false });
          }}
        />
      </div>
    </div>
  );
}
