"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { X, Plus, Send, Check, Square, CheckSquare, Trash2, MoreVertical, ChevronLeft } from "@/components/ui/icons";
import TaskSelectField, { TaskSelectOption } from "./TaskSelectField";
import { TaskDescriptionEditor } from "./TaskDescriptionEditor";
import DatePicker from "@/components/ui/DatePicker";


const PRIORITY_OPTIONS: TaskSelectOption[] = [
  { value: "LOW",    label: "Niski",  dot: "bg-gray-400" },
  { value: "MEDIUM", label: "Średni", dot: "bg-yellow-400" },
  { value: "HIGH",   label: "Wysoki", dot: "bg-red-500" },
];

interface User {
  id: string;
  name: string | null;
  email: string;
  fullName: string | null;
  avatarUrl?: string | null;
  isSelf?: boolean;
}

interface Project {
  id: string;
  title: string;
}

interface TaskComment {
  id: string;
  body: string;
  createdAt: string;
  author: User;
}

interface SubTask {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  project: Project | null;
  assignee: User | null;
  creator: User;
  subTasks: SubTask[];
  createdAt: string;
}

interface Task extends SubTask {
  description: string | null;
}

interface TaskDetailPanelProps {
  task: Task;
  onClose: () => void;
  onUpdated: () => void;
  isSubTask?: boolean;
  parentTaskTitle?: string;
  onBack?: () => void;
  onOpenTask?: (task: Task) => void;
  statusOptions?: TaskSelectOption[];
}

const PRIORITY_LABELS: Record<string, string> = { LOW: "Niski", MEDIUM: "Średni", HIGH: "Wysoki" };

function userDisplayName(u: User | null) {
  if (!u) return "—";
  return u.fullName || u.name || u.email;
}

function userInitials(u: User | null) {
  if (!u) return "?";
  const n = u.fullName || u.name || u.email;
  return n.slice(0, 2).toUpperCase();
}

const DEFAULT_STATUS_OPTIONS: TaskSelectOption[] = [
  { value: "TODO",        label: "Do zrobienia", dot: "#6b7280" },
  { value: "IN_PROGRESS", label: "W trakcie",    dot: "#3b82f6" },
  { value: "DONE",        label: "Zrobione",      dot: "#22c55e" },
];

export default function TaskDetailPanel({ task, onClose, onUpdated, isSubTask = false, parentTaskTitle, onBack, onOpenTask, statusOptions }: TaskDetailPanelProps) {
  const resolvedStatusOptions = statusOptions ?? DEFAULT_STATUS_OPTIONS;
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || "");
  const [status, setStatus] = useState(task.status);
  const [priority, setPriority] = useState(task.priority);
  const [dueDate, setDueDate] = useState(task.dueDate ? task.dueDate.slice(0, 10) : "");
  const [projectId, setProjectId] = useState(task.project?.id || "");
  const [assigneeId, setAssigneeId] = useState(task.assignee?.id || "");

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const [comments, setComments] = useState<TaskComment[]>([]);
  const [commentBody, setCommentBody] = useState("");
  const [sendingComment, setSendingComment] = useState(false);

  const [subTasks, setSubTasks] = useState<SubTask[]>(task.subTasks ?? []);
  const [subTaskInput, setSubTaskInput] = useState("");
  const [addingSubTask, setAddingSubTask] = useState(false);
  const [subTaskExpanded, setSubTaskExpanded] = useState(true);

  const [projects, setProjects] = useState<Project[]>([]);
  const [members, setMembers] = useState<User[]>([]);

  const commentAreaRef = useRef<HTMLTextAreaElement>(null);

  // Reset all fields when navigating to a different task
  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description || "");
    setStatus(task.status);
    setPriority(task.priority);
    setDueDate(task.dueDate ? task.dueDate.slice(0, 10) : "");
    setProjectId(task.project?.id || "");
    setAssigneeId(task.assignee?.id || "");
    setSubTasks(task.subTasks ?? []);
    setComments([]);
    setCommentBody("");
    setSubTaskInput("");
  }, [task.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  useEffect(() => {
    fetch(`/api/tasks/${task.id}/comments`).then((r) => r.json()).then((data) => {
      if (Array.isArray(data)) setComments(data);
    }).catch(() => {});

    Promise.all([
      fetch("/api/projects").then((r) => r.json()),
      fetch("/api/team/invite").then((r) => r.json()),
      fetch("/api/user").then((r) => r.json()),
    ]).then(([projs, team, me]) => {
      if (Array.isArray(projs)) setProjects(projs);
      const allMembers: User[] = [];
      if (me?.id) allMembers.push({ ...me, isSelf: true });
      if (team?.members) allMembers.push(...team.members);
      setMembers(allMembers);
    }).catch(() => {});
  }, [task.id]);

  const projectOptions = useMemo<TaskSelectOption[]>(() => [
    { value: "", label: "Brak" },
    ...projects.map((p) => ({ value: p.id, label: p.title })),
  ], [projects]);

  const assigneeOptions = useMemo<TaskSelectOption[]>(() => [
    { value: "", label: "Nieprzypisane" },
    ...members.map((m) => ({
      value: m.id,
      label: m.isSelf
        ? `${userDisplayName(m)} (Ty)`
        : userDisplayName(m),
      avatarUrl: m.avatarUrl ?? null,
      initials: userInitials(m),
    })),
  ], [members]);

  const patch = useCallback(async (data: Record<string, unknown>) => {
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error();
      onUpdated();
    } catch {
      toast.error("Błąd zapisu");
    }
  }, [task.id, onUpdated]);

  async function sendComment() {
    if (!commentBody.trim()) return;
    setSendingComment(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: commentBody }),
      });
      if (!res.ok) throw new Error();
      const comment = await res.json();
      setComments((prev) => [...prev, comment]);
      setCommentBody("");
    } catch {
      toast.error("Błąd wysyłania komentarza");
    } finally {
      setSendingComment(false);
    }
  }

  async function addSubTask() {
    if (!subTaskInput.trim()) return;
    setAddingSubTask(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: subTaskInput, parentId: task.id }),
      });
      if (!res.ok) throw new Error();
      const newSub = await res.json();
      setSubTasks((prev) => [...prev, newSub]);
      setSubTaskInput("");
      onUpdated();
    } catch {
      toast.error("Błąd tworzenia podzadania");
    } finally {
      setAddingSubTask(false);
    }
  }

  async function toggleSubTaskStatus(sub: SubTask) {
    const newStatus = sub.status === "DONE" ? "TODO" : "DONE";
    try {
      await fetch(`/api/tasks/${sub.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      setSubTasks((prev) => prev.map((s) => s.id === sub.id ? { ...s, status: newStatus } : s));
      onUpdated();
    } catch {
      toast.error("Błąd zmiany statusu");
    }
  }

  const isOverdue = task.dueDate && task.status !== "DONE" && new Date(task.dueDate) < new Date();

  async function deleteTask() {
    try {
      const res = await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Zadanie usunięte");
      onClose();
      onUpdated();
    } catch {
      toast.error("Błąd usuwania zadania");
    }
  }

  return (
    <>
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="absolute right-0 top-0 bottom-0 w-full max-w-xl bg-background border border-border flex flex-col overflow-hidden shadow-xl rounded-l-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            {onBack && (
              <button
                onClick={onBack}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0 mr-1"
                title="Wróć do zadania nadrzędnego"
              >
                <ChevronLeft size={14} />
                <span className="max-w-[120px] truncate">{parentTaskTitle}</span>
              </button>
            )}
            <div className="min-w-0">
              <h2 className="text-sm font-semibold">{isSubTask ? "Szczegóły podzadania" : "Szczegóły zadania"}</h2>
              <span className="text-xs text-muted-foreground">
                {userDisplayName(task.creator)} · {new Date(task.createdAt).toLocaleDateString("pl-PL")}
              </span>
            </div>
          </div>
          <div ref={menuRef} className="relative ml-3 shrink-0 flex items-center gap-1">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <MoreVertical size={18} />
            </button>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
              <X size={18} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 w-44 rounded-lg bg-popover border border-border shadow-md z-50 py-1 overflow-hidden">
                <button
                  onClick={() => { setMenuOpen(false); deleteTask(); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors text-left"
                >
                  <Trash2 size={14} />
                  Usuń zadanie
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Tytuł */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tytuł</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => title.trim() && title !== task.title && patch({ title })}
              className="w-full text-sm px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Opis */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Opis</label>
            <TaskDescriptionEditor
              content={description}
              contentKey={task.id}
              onChange={setDescription}
              onBlur={() => description !== (task.description || "") && patch({ description: description || null })}
            />
          </div>

          {/* Status + Priorytet */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</label>
              <TaskSelectField
                value={status}
                onChange={(v) => { setStatus(v); patch({ status: v }); }}
                options={resolvedStatusOptions}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Priorytet</label>
              <TaskSelectField
                value={priority}
                onChange={(v) => { setPriority(v); patch({ priority: v }); }}
                options={PRIORITY_OPTIONS}
              />
            </div>
          </div>

          {/* Termin + Klient */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Termin</label>
              <DatePicker
                value={dueDate}
                onChange={(v) => { setDueDate(v); patch({ dueDate: v || null }); }}
                error={!!isOverdue}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Klient</label>
              <TaskSelectField
                value={projectId}
                onChange={(v) => { setProjectId(v); patch({ projectId: v || null }); }}
                options={projectOptions}
                placeholder="Brak"
              />
            </div>
          </div>

          {/* Przypisz do */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Przypisz do</label>
            <TaskSelectField
              value={assigneeId}
              onChange={(v) => { setAssigneeId(v); patch({ assigneeId: v || null }); }}
              options={assigneeOptions}
              placeholder="Nieprzypisane"
            />
          </div>

          {/* Podzadania — ukryte dla podzadań (max 1 poziom) */}
          {!isSubTask && <div className="space-y-2">
            <button
              onClick={() => setSubTaskExpanded((v) => !v)}
              className="flex items-center gap-2 text-sm font-medium w-full text-left"
            >
              <CheckSquare size={15} className="text-muted-foreground" />
              Podzadania ({subTasks.length})
            </button>

            {subTaskExpanded && (
              <div className="space-y-1 pl-5">
                {subTasks.map((sub) => (
                  <div key={sub.id} className="flex items-center gap-2 py-1 group">
                    <button
                      onClick={() => toggleSubTaskStatus(sub)}
                      className="text-muted-foreground hover:text-primary transition-colors shrink-0"
                    >
                      {sub.status === "DONE" ? <CheckSquare size={15} className="text-green-500" /> : <Square size={15} />}
                    </button>
                    <button
                      onClick={() => onOpenTask?.(sub as Task)}
                      className={`text-sm flex-1 text-left hover:underline ${sub.status === "DONE" ? "line-through text-muted-foreground" : ""}`}
                    >
                      {sub.title}
                    </button>
                  </div>
                ))}

                <div className="flex items-center gap-2 pt-1">
                  <input
                    value={subTaskInput}
                    onChange={(e) => setSubTaskInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addSubTask()}
                    placeholder="Dodaj podzadanie..."
                    className="flex-1 text-sm px-2 py-1 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <button
                    onClick={addSubTask}
                    disabled={addingSubTask || !subTaskInput.trim()}
                    className="p-1.5 text-primary hover:opacity-70 disabled:opacity-40 transition-opacity"
                  >
                    <Plus size={28} />
                  </button>
                </div>
              </div>
            )}
          </div>}

          {/* Komentarze */}
          <div className="space-y-3 border-t border-border pt-4">
            <p className="text-sm font-medium">Komentarze ({comments.length})</p>

            {comments.map((c) => (
              <div key={c.id} className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold shrink-0 overflow-hidden">
                  {c.author.avatarUrl
                    ? <img src={c.author.avatarUrl} alt="" className="w-full h-full object-cover" />
                    : userInitials(c.author)
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-medium">{userDisplayName(c.author)}</span>
                    <span className="text-xs text-muted-foreground">{new Date(c.createdAt).toLocaleDateString("pl-PL")}</span>
                  </div>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{c.body}</p>
                </div>
              </div>
            ))}

            {comments.length === 0 && (
              <p className="text-sm text-muted-foreground">Brak komentarzy.</p>
            )}
          </div>
        </div>

        {/* Pole komentarza (Messenger style) */}
        <div className="px-4 py-3 border-t border-border shrink-0">
          <div className="flex items-end gap-2">
            <textarea
              ref={commentAreaRef}
              value={commentBody}
              onChange={(e) => {
                setCommentBody(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendComment(); }
              }}
              placeholder="Napisz komentarz... (Enter — wyślij, Shift+Enter — nowa linia)"
              rows={1}
              className="flex-1 px-3 py-2 text-sm border border-border rounded-2xl bg-muted/40 focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none overflow-hidden min-h-[38px]"
              style={{ height: "38px" }}
            />
            <button
              onClick={sendComment}
              disabled={sendingComment || !commentBody.trim()}
              className="p-2 text-primary hover:opacity-70 disabled:opacity-40 transition-opacity shrink-0"
            >
              <Send size={30} />
            </button>
          </div>
        </div>
      </div>
    </div>

    </>
  );
}
