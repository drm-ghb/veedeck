"use client";

import { useState, useMemo, useEffect } from "react";
import { Plus, Search, Archive, Trash2, X, ArchiveRestore, NotebookText, ChevronDown, FileText } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";
import { NoteEditor } from "./NoteEditor";

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
  return d.toLocaleDateString("pl-PL", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function formatDateShort(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString())
    return d.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString("pl-PL", { day: "numeric", month: "short" });
}

function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function hasText(html: string) {
  return stripHtml(html).length > 0;
}

export default function NotatnikView({ initialNotes, initialArchivedNotes }: Props) {
  const t = useT();

  const [notes, setNotes] = useState<Note[]>(initialNotes);
  const [archivedNotes, setArchivedNotes] = useState<Note[]>(initialArchivedNotes);
  const [showArchived, setShowArchived] = useState(false);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOrder>("newest");

  const [selectedId, setSelectedId] = useState<string | null>(initialNotes[0]?.id ?? null);
  const [creating, setCreating] = useState(false);

  // Right-panel state
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  // New note form
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newSaving, setNewSaving] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [mobileShowDetail, setMobileShowDetail] = useState(false);

  const activeList = showArchived ? archivedNotes : notes;

  const filtered = useMemo(() => {
    return activeList
      .filter((n) => {
        const q = search.toLowerCase();
        return !q || n.title?.toLowerCase().includes(q) || stripHtml(n.content).toLowerCase().includes(q);
      })
      .sort((a, b) => {
        const da = new Date(a.updatedAt).getTime();
        const db = new Date(b.updatedAt).getTime();
        return sort === "newest" ? db - da : da - db;
      });
  }, [activeList, search, sort]);

  const selectedNote = useMemo(
    () => [...notes, ...archivedNotes].find((n) => n.id === selectedId) ?? null,
    [notes, archivedNotes, selectedId]
  );

  useEffect(() => {
    if (selectedNote) {
      setEditTitle(selectedNote.title ?? "");
      setEditContent(selectedNote.content);
      setIsDirty(false);
      setConfirmDelete(false);
    }
  }, [selectedNote?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setNotes(initialNotes);
    setArchivedNotes(initialArchivedNotes);
  }, [initialNotes, initialArchivedNotes]);

  function handleSelect(note: Note) {
    setSelectedId(note.id);
    setCreating(false);
    setConfirmDelete(false);
    setMobileShowDetail(true);
  }

  function handleNewNote() {
    setCreating(true);
    setSelectedId(null);
    setNewTitle("");
    setNewContent("<p></p>");
    setConfirmDelete(false);
    setMobileShowDetail(true);
  }

  function handleCancelNew() {
    setCreating(false);
    setSelectedId(notes[0]?.id ?? null);
    setMobileShowDetail(false);
  }

  async function handleCreateSave() {
    if (!hasText(newContent)) return;
    setNewSaving(true);
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle.trim() || null, content: newContent }),
      });
      if (!res.ok) throw new Error();
      const note: Note = await res.json();
      setNotes((prev) => [note, ...prev]);
      setSelectedId(note.id);
      setCreating(false);
      toast.success(t.notatnik.noteAdded);
    } catch {
      toast.error(t.notatnik.noteAddError);
    } finally {
      setNewSaving(false);
    }
  }

  async function handleSave() {
    if (!selectedId || !hasText(editContent)) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/notes/${selectedId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editTitle.trim() || null, content: editContent }),
      });
      if (!res.ok) throw new Error();
      const updated: Note = await res.json();
      setNotes((prev) => prev.map((n) => (n.id === selectedId ? updated : n)));
      setArchivedNotes((prev) => prev.map((n) => (n.id === selectedId ? updated : n)));
      setIsDirty(false);
      toast.success(t.notatnik.noteUpdated);
    } catch {
      toast.error(t.notatnik.noteUpdateError);
    } finally {
      setSaving(false);
    }
  }

  async function handleArchiveToggle() {
    if (!selectedNote) return;
    const willArchive = !selectedNote.archived;
    try {
      const res = await fetch(`/api/notes/${selectedNote.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archived: willArchive }),
      });
      if (!res.ok) throw new Error();
      const updated: Note = await res.json();
      if (willArchive) {
        const remaining = notes.filter((n) => n.id !== selectedNote.id);
        setNotes(remaining);
        setArchivedNotes((prev) => [updated, ...prev]);
        setSelectedId(remaining[0]?.id ?? null);
        if (!remaining[0]) setMobileShowDetail(false);
      } else {
        setArchivedNotes((prev) => prev.filter((n) => n.id !== selectedNote.id));
        setNotes((prev) => [updated, ...prev]);
        setSelectedId(updated.id);
      }
      toast.success(willArchive ? t.notatnik.noteArchived : t.notatnik.noteRestored);
    } catch {
      toast.error(t.notatnik.operationError);
    }
  }

  async function handleDelete() {
    if (!selectedNote) return;
    try {
      const res = await fetch(`/api/notes/${selectedNote.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      const wasArchived = selectedNote.archived;
      const remaining = (wasArchived ? archivedNotes : notes).filter((n) => n.id !== selectedNote.id);
      if (wasArchived) setArchivedNotes(remaining);
      else setNotes(remaining);
      setSelectedId(remaining[0]?.id ?? null);
      setConfirmDelete(false);
      if (!remaining[0]) setMobileShowDetail(false);
      toast.success(t.notatnik.noteDeleted);
    } catch {
      toast.error(t.notatnik.noteDeleteError);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full -mx-3 sm:-mx-6 -my-4 sm:-my-6 overflow-hidden">

      {/* ── LEFT PANEL ────────────────────────────────────────────────── */}
      <div className={`
        ${mobileShowDetail ? "hidden" : "flex"} md:flex
        w-full md:w-72 lg:w-80 flex-shrink-0
        flex-col border-r border-border bg-muted/30
      `}>
        <div className="px-4 pt-4 pb-3 space-y-3 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <NotebookText size={18} className="text-primary" />
              <h1 className="font-semibold text-base">{t.notatnik.title}</h1>
            </div>
            <button
              onClick={handleNewNote}
              title={t.notatnik.newNote}
              className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
            >
              <Plus size={16} />
            </button>
          </div>

          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.notatnik.searchPlaceholder}
              className="w-full pl-7 pr-7 py-1.5 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X size={13} />
              </button>
            )}
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-0.5 text-xs">
              <button
                onClick={() => setShowArchived(false)}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${!showArchived ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                {t.notatnik.active}
              </button>
              <button
                onClick={() => setShowArchived(true)}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors flex items-center gap-1 ${showArchived ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                {t.notatnik.showArchived}
                {archivedNotes.length > 0 && (
                  <span className="bg-muted-foreground/20 rounded-full px-1.5">{archivedNotes.length}</span>
                )}
              </button>
            </div>
            <div className="relative">
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortOrder)}
                className="appearance-none text-xs pl-2 pr-5 py-1 border border-border rounded-md bg-background focus:outline-none cursor-pointer text-muted-foreground"
              >
                <option value="newest">{t.common.newest}</option>
                <option value="oldest">{t.common.oldest}</option>
              </select>
              <ChevronDown size={11} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              {search ? t.notatnik.noNotesSearch : t.notatnik.noNotes}
            </div>
          ) : (
            filtered.map((note) => {
              const isSelected = note.id === selectedId && !creating;
              const firstLine = stripHtml(note.content).split(/\s+/).slice(0, 8).join(" ");
              const preview = stripHtml(note.content).slice(0, 80);
              return (
                <button
                  key={note.id}
                  onClick={() => handleSelect(note)}
                  className={`w-full text-left px-4 py-3 border-b border-border/50 transition-colors ${
                    isSelected ? "bg-primary/10 border-l-2 border-l-primary" : "hover:bg-muted/60"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-0.5">
                    <p className={`text-sm font-medium truncate ${isSelected ? "text-primary" : "text-foreground"}`}>
                      {note.title || firstLine || "—"}
                    </p>
                    <span className="text-xs text-muted-foreground shrink-0 mt-0.5">
                      {formatDateShort(note.updatedAt)}
                    </span>
                  </div>
                  {note.title && (
                    <p className="text-xs text-muted-foreground truncate">{preview}</p>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ── RIGHT PANEL ───────────────────────────────────────────────── */}
      <div className={`
        ${!mobileShowDetail ? "hidden" : "flex"} md:flex
        flex-1 flex-col overflow-hidden bg-background
      `}>
        {creating ? (
          <div className="flex flex-col h-full">
            {/* Action bar */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-border gap-3 shrink-0">
              <button onClick={handleCancelNew} className="md:hidden flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                ← {t.common.back}
              </button>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder={t.notatnik.noteTitlePlaceholder}
                className="flex-1 text-base font-semibold bg-transparent border-none outline-none placeholder:text-muted-foreground/40 min-w-0"
              />
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={handleCancelNew} className="hidden md:inline-flex px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                  {t.common.cancel}
                </button>
                <button
                  onClick={handleCreateSave}
                  disabled={!hasText(newContent) || newSaving}
                  className="px-3 py-1.5 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {newSaving ? t.notatnik.saving : t.common.save}
                </button>
              </div>
            </div>
            <NoteEditor
              content="<p></p>"
              contentKey="new"
              onChange={setNewContent}
              placeholder={t.notatnik.noteContentPlaceholder}
              autoFocus
            />
          </div>
        ) : selectedNote ? (
          <div className="flex flex-col h-full">
            {/* Action bar */}
            <div className="flex items-center gap-2 px-6 py-3 border-b border-border shrink-0">
              <button onClick={() => setMobileShowDetail(false)} className="md:hidden flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mr-1">
                ← {t.common.back}
              </button>

              {/* Title input */}
              <input
                type="text"
                value={editTitle}
                onChange={(e) => { setEditTitle(e.target.value); setIsDirty(true); }}
                placeholder={t.notatnik.noteTitlePlaceholder}
                className="flex-1 text-base font-semibold bg-transparent border-none outline-none placeholder:text-muted-foreground/40 min-w-0"
              />

              {/* Right actions */}
              <div className="flex items-center gap-1 shrink-0">
                {isDirty && (
                  <>
                    <button
                      onClick={() => { setEditTitle(selectedNote.title ?? ""); setEditContent(selectedNote.content); setIsDirty(false); }}
                      className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {t.common.cancel}
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={!hasText(editContent) || saving}
                      className="px-3 py-1.5 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {saving ? t.notatnik.saving : t.common.save}
                    </button>
                  </>
                )}

                {!isDirty && !confirmDelete && (
                  <>
                    <button
                      onClick={handleArchiveToggle}
                      title={selectedNote.archived ? t.common.restore : t.common.archive}
                      className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                      {selectedNote.archived ? <ArchiveRestore size={16} /> : <Archive size={16} />}
                    </button>
                    <button
                      onClick={() => setConfirmDelete(true)}
                      title={t.common.delete}
                      className="p-1.5 rounded-md text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </>
                )}

                {confirmDelete && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground hidden sm:block">{t.notatnik.confirmDelete}</span>
                    <button onClick={() => setConfirmDelete(false)} className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                      {t.common.cancel}
                    </button>
                    <button onClick={handleDelete} className="px-3 py-1.5 text-sm font-medium bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors">
                      {t.common.delete}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Date */}
            <p className="text-xs text-muted-foreground/50 text-center py-2 shrink-0">
              {formatDate(selectedNote.createdAt)}
            </p>

            {/* TipTap editor */}
            <NoteEditor
              content={selectedNote.content}
              contentKey={selectedNote.id}
              onChange={(html) => { setEditContent(html); setIsDirty(true); }}
              placeholder={t.notatnik.noteContentPlaceholder}
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
            <FileText size={48} className="opacity-20" />
            <p className="font-medium">{t.notatnik.noNotes}</p>
            <p className="text-sm">{t.notatnik.noNotesHint}</p>
            <button
              onClick={handleNewNote}
              className="mt-2 flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
            >
              <Plus size={15} />
              {t.notatnik.newNote}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
