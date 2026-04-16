"use client";

import { useState } from "react";
import { NotebookPen, X } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n";

export function QuickNoteButton() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const t = useT();

  function handleClose() {
    setOpen(false);
    setTitle("");
    setContent("");
  }

  async function handleSave() {
    if (!content.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim() || null, content: content.trim() }),
      });
      if (!res.ok) throw new Error();
      toast.success(t.notatnik.noteAdded);
      handleClose();
      router.refresh();
    } catch {
      toast.error(t.notatnik.noteAddError);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title={t.notatnik.quickNote}
        className="p-1.5 rounded-md text-gray-500 dark:text-gray-400 hover:bg-muted transition-colors"
      >
        <NotebookPen size={18} />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          onClick={handleClose}
        >
          <div
            className="bg-card rounded-2xl shadow-xl w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold">{t.notatnik.quickNote}</h2>
              <button
                onClick={handleClose}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  {t.notatnik.noteTitle}
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t.notatnik.noteTitlePlaceholder}
                  className="mt-1 w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  {t.notatnik.noteContent}
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && e.ctrlKey) handleSave();
                  }}
                  placeholder={t.notatnik.noteContentPlaceholder}
                  rows={5}
                  // eslint-disable-next-line jsx-a11y/no-autofocus
                  autoFocus
                  className="mt-1 w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                />
              </div>

              <div className="flex gap-2 justify-end pt-1">
                <button
                  onClick={handleClose}
                  className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t.common.cancel}
                </button>
                <button
                  onClick={handleSave}
                  disabled={!content.trim() || saving}
                  className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {saving ? t.notatnik.saving : t.common.save}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
