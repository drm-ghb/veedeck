"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";

type State = {
  message: string;
  title?: string;
  resolve: (value: boolean) => void;
} | null;

let _setState: ((s: State) => void) | null = null;

export function showConfirm(message: string, title?: string): Promise<boolean> {
  if (!_setState) return Promise.resolve(window.confirm(message));
  return new Promise((resolve) => {
    _setState!({ message, title, resolve });
  });
}

export function ConfirmDialogProvider() {
  const [state, setState] = useState<State>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    _setState = setState;
    return () => {
      _setState = null;
    };
  }, []);

  if (!state || !mounted) return null;

  function answer(value: boolean) {
    state!.resolve(value);
    setState(null);
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[500] flex items-center justify-center bg-black/50 px-4"
      onClick={() => answer(false)}
    >
      <div
        className="bg-popover border border-border rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {state.title && (
          <h2 className="text-base font-semibold text-foreground">{state.title}</h2>
        )}
        <p className="text-sm text-muted-foreground leading-relaxed">{state.message}</p>
        <div className="flex gap-2 justify-end pt-1">
          <Button variant="outline" onClick={() => answer(false)}>
            Anuluj
          </Button>
          <Button variant="destructive" onClick={() => answer(true)}>
            Potwierdź
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
