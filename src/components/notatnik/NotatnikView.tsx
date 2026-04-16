"use client";

import { useState, useEffect } from "react";
import { Plus, Search, Pencil, Archive, Trash2, X, Check, ArchiveRestore, NotebookText, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n";

interface Note {
  id: string;
  title: string | null;
  content: string;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Props {
  initialNotes: Note[];
  initialArchivedNotes: Note[];
}

type SortOrder = "newest" | "oldest";

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("pl-PL", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function NotatnikView({ initialNotes, initialArchivedNotes }: Props) {
  const t = useT();
  const router = useRouter();

  const [notes, setNotes] = useState<Note[]>(initialNotes);
  const [archivedNotes, setArchivedNotes] = useState<Note[]>(initialArchivedNotes);
  const [showArchived, setShowArchived] = useState(false);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOrder>("newest");

  // New note form
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newSaving, setNewSaving] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  // Delete confirm
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Re-sync when router.refresh() fires (e.g. after QuickNoteButton save)
  useEffect(() => {
    setNotes(initialNotes);
    setArchivedNotes(initialArchivedNotes);
  }, [initialNotes, initialArchivedNotes]);

  const activeList = showArchived ? archivedNotes : notes;

  const filtered = activeList
    .filter((n) => {
      const q = search.toLowerCase();
      return (
        n.title?.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      const da = new Date(a.updatedAt).getTime();
      const db = new Date(b.updatedAt).getTime();
      return sort === "newest" ? db - da : da - db;
    });

  async function handleAdd() {
    if (!newContent.trim()) return;
    setNewSaving(true);
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle.trim() || null, content: newContent.trim() }),
      });
      if (!res.ok) throw new Error();
      const note: Note = await res.json();
      setNotes((prev) => [note, ...prev]);
      setNewTitle("");
      setNewContent("");
      setAdding(false);
      toast.success(t.notatnik.noteAdded);
    } catch {
      toast.error(t.notatnik.noteAddError);
    } finally {
      setNewSaving(false);
    }
  }

  function startEdit(note: Note) {
    setEditingId(note.id);
    setEditTitle(note.title ?? "");
    setEditContent(note.content);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditTitle("");
    setEditContent("");
  }

  async function handleEdit(id: string) {
    if (!editContent.trim()) return;
    setEditSaving(true);
    try {
      const res = await fetch(`/api/notes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editTitle.trim() || null, content: editContent.trim() }),
      });
      if (!res.ok) throw new Error();
      const updated: Note = await res.json();
      setNotes((prev) => prev.map((n) => (n.id === id ? updated : n)));
      setArchivedNotes((prev) => prev.map((n) => (n.id === id ? updated : n)));
      cancelEdit();
      toast.success(t.notatnik.noteUpdated);
    } catch {
      toast.error(t.notatnik.noteUpdateError);
    } finally {
      setEditSaving(false);
    }
  }

  async function handleArchive(note: Note) {
    const willArchive = !note.archived;
    try {
      const res = await fetch(`/api/notes/${note.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archived: willArchive }),
      });
      if (!res.ok) throw new Error();
      const updated: Note = await res.json();
      if (willArchive) {
        setNotes((prev) => prev.filter((n) => n.id !== note.id));
        setArchivedNotes((prev) => [updated, ...prev]);
      } else {
        setArchivedNotes((prev) => prev.filter((n) => n.id !== note.id));
        setNotes((prev) => [updated, ...prev]);
      }
      toast.success(willArchive ? t.notatnik.noteArchived : t.notatnik.noteRestored);
    } catch {
      toast.error(t.notatnik.operationError);
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/notes/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setNotes((prev) => prev.filter((n) => n.id !== id));
      setArchivedNotes((prev) => prev.filter((n) => n.id !== id));
      setDeletingId(null);
      toast.success(t.notatnik.noteDeleted);
    } catch {
      toast.error(t.notatnik.noteDeleteError);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <NotebookText size={22} className="text-primary shrink-0" />
          <h1 className="text-2xl font-bold">{t.notatnik.title}</h1>
        </div>
        <button
          onClick={() => { setAdding(true); setShowArchived(false); }}
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity shrink-0"
        >
          <Plus size={16} />
          {t.notatnik.newNote}
        </button>
      </div>

      {/* New note form */}
      {adding && (
        <div className="bg-card border border-border rounded-2xl p-4 shadow-sm space-y-3">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder={t.notatnik.noteTitlePlaceholder}
            className="w-full px-3 py-2 text-sm font-medium border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && e.ctrlKey) handleAdd(); }}
            placeholder={t.notatnik.noteContentPlaceholder}
            rows={5}
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
            className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
          />
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => { setAdding(false); setNewTitle(""); setNewContent(""); }}
              className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {t.common.cancel}
            </button>
            <button
              onClick={handleAdd}
              disabled={!newContent.trim() || newSaving}
              className="px-3 py-1.5 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {newSaving ? t.notatnik.saving : t.common.save}
            </button>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Tab: active / archived */}
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1 text-sm">
          <button
            onClick={() => setShowArchived(false)}
            className={`px-3 py-1 rounded-md font-medium transition-colors ${!showArchived ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            {t.notatnik.active}
          </button>
          <button
            onClick={() => setShowArchived(true)}
            className={`px-3 py-1 rounded-md font-medium transition-colors ${showArchived ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            {t.notatnik.showArchived}
            {archivedNotes.length > 0 && (
              <span className="ml-1.5 text-xs bg-muted-foreground/20 rounded-full px-1.5 py-0.5">
                {archivedNotes.length}
              </span>
            )}
          </button>
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-36">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.notatnik.searchPlaceholder}
            className="w-full pl-8 pr-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Sort */}
        <div className="relative">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortOrder)}
            className="appearance-none pl-3 pr-7 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
          >
            <option value="newest">{t.notatnik.sortNewest}</option>
            <option value="oldest">{t.notatnik.sortOldest}</option>
          </select>
          <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        </div>
      </div>

      {/* Notes list */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          {search ? (
            <p className="text-sm">{t.notatnik.noNotesSearch}</p>
          ) : (
            <div className="space-y-2">
              <NotebookText size={40} className="mx-auto opacity-20" />
              <p className="font-medium">{t.notatnik.noNotes}</p>
              <p className="text-sm">{t.notatnik.noNotesHint}</p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((note) => (
            <div
              key={note.id}
              className="bg-card border border-border rounded-2xl p-4 shadow-sm group"
            >
              {editingId === note.id ? (
                /* Edit mode */
                <div className="space-y-2">
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder={t.notatnik.noteTitlePlaceholder}
                    className="w-full px-3 py-2 text-sm font-medium border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && e.ctrlKey) handleEdit(note.id); }}
                    rows={5}
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={cancelEdit}
                      className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {t.common.cancel}
                    </button>
                    <button
                      onClick={() => handleEdit(note.id)}
                      disabled={!editContent.trim() || editSaving}
                      className="px-3 py-1.5 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {editSaving ? t.notatnik.saving : t.common.save}
                    </button>
                  </div>
                </div>
              ) : deletingId === note.id ? (
                /* Delete confirm */
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">{t.notatnik.confirmDelete}</p>
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => setDeletingId(null)}
                      className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {t.common.cancel}
                    </button>
                    <button
                      onClick={() => handleDelete(note.id)}
                      className="px-3 py-1.5 text-sm font-medium bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                    >
                      {t.common.delete}
                    </button>
                  </div>
                </div>
              ) : (
                /* View mode */
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      {note.title && (
                        <p className="font-semibold text-sm mb-1 truncate">{note.title}</p>
                      )}
                      <p className="text-sm text-foreground whitespace-pre-wrap break-words leading-relaxed">
                        {note.content}
                      </p>
                    </div>
                    {/* Action buttons — visible on hover */}
                    <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => startEdit(note)}
                        title={t.notatnik.editNote}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleArchive(note)}
                        title={note.archived ? t.common.restore : t.common.archive}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      >
                        {note.archived ? <ArchiveRestore size={14} /> : <Archive size={14} />}
                      </button>
                      <button
                        onClick={() => setDeletingId(note.id)}
                        title={t.common.delete}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground/60">
                    {formatDate(note.updatedAt)}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
