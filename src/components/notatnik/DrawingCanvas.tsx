"use client";

import { useRef, useCallback } from "react";
import { Tldraw, Editor } from "@tldraw/tldraw";
import "@tldraw/tldraw/tldraw.css";
import { X, Download, Check } from "lucide-react";

interface DrawingCanvasProps {
  onSave: (blob: Blob, filename: string) => void;
  onClose: () => void;
}

export function DrawingCanvas({ onSave, onClose }: DrawingCanvasProps) {
  const editorRef = useRef<Editor | null>(null);

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
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
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
      <div className="flex-1 min-h-0">
        <Tldraw
          onMount={(editor) => {
            editorRef.current = editor;
          }}
        />
      </div>
    </div>
  );
}
