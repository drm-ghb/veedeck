"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  Search,
  List,
  Columns3,
  ChevronDown,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Plus,
  Trash2,
} from "@/components/ui/icons";
import AddTaskDialog from "./AddTaskDialog";
import TaskDetailPanel from "./TaskDetailPanel";
import TaskSelectField, { TaskSelectOption } from "./TaskSelectField";
import DatePicker from "@/components/ui/DatePicker";

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
  createdAt: string;
  subTasks: SubTask[];
}

interface Task extends SubTask {
  description: string | null;
}

interface TaskStatusConfig {
  id: string;
  value: string;
  label: string;
  color: string;
  order: number;
}

type ViewMode = "list" | "kanban";
type GroupBy = "none" | "project" | "status" | "priority";
type SortField = "createdAt" | "dueDate" | "priority" | "status" | "title";
type SortDir = "asc" | "desc";

const PRIORITY_ORDER: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };

function userDisplayName(u: User | null) {
  if (!u) return "—";
  return u.fullName || u.name || u.email;
}

function userInitials(u: User | null) {
  if (!u) return "?";
  const n = u.fullName || u.name || u.email;
  return n.slice(0, 2).toUpperCase();
}


function PriorityBadge({ priority }: { priority: string }) {
  const t = useT();
  const labels: Record<string, string> = {
    LOW: t.tasks.priorityLow,
    MEDIUM: t.tasks.priorityMedium,
    HIGH: t.tasks.priorityHigh,
  };
  const cls =
    priority === "HIGH"
      ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
      : priority === "MEDIUM"
      ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
      : "bg-muted text-muted-foreground";
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${cls}`}>
      {labels[priority] ?? priority}
    </span>
  );
}

function StatusPill({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap"
      style={{ backgroundColor: color + "25", color }}
    >
      {label}
    </span>
  );
}

function UserAvatar({ user }: { user: User | null }) {
  if (!user) return <span className="text-muted-foreground text-sm">—</span>;
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-semibold shrink-0 overflow-hidden">
        {user.avatarUrl
          ? <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
          : userInitials(user)
        }
      </div>
      <span className="text-sm truncate max-w-[100px]">{userDisplayName(user)}</span>
    </div>
  );
}

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function isOverdue(task: Task | SubTask) {
  return task.dueDate && task.status !== "DONE" && new Date(task.dueDate) < new Date();
}

function DraggableKanbanCard({
  task,
  parentTitle,
  onClick,
  overlay = false,
}: {
  task: Task;
  parentTitle?: string;
  onClick?: () => void;
  overlay?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
  });
  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={onClick}
      className={`w-full text-left bg-card border border-border rounded-lg p-3 space-y-2 cursor-grab active:cursor-grabbing select-none transition-all ${
        isDragging && !overlay ? "opacity-30" : "hover:shadow-sm hover:border-primary/30"
      }${overlay ? " shadow-lg rotate-1 opacity-95" : ""}${task.status === "DONE" && !overlay ? " opacity-50" : ""}`}
    >
      {parentTitle && (
        <p className="text-[11px] text-muted-foreground/60 -mb-1 truncate">↳ {parentTitle}</p>
      )}
      <p className="text-sm font-medium line-clamp-2">{task.title}</p>
      {task.project && (
        <p className="text-xs text-muted-foreground">{task.project.title}</p>
      )}
      <div className="flex items-center justify-between">
        <PriorityBadge priority={task.priority} />
        {task.dueDate && (
          <span className={`text-xs ${isOverdue(task) ? "text-red-500 font-medium" : "text-muted-foreground"}`}>
            {formatDate(task.dueDate)}
          </span>
        )}
      </div>
      {task.assignee && (
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[9px] font-semibold shrink-0 overflow-hidden">
            {task.assignee.avatarUrl
              ? <img src={task.assignee.avatarUrl} alt="" className="w-full h-full object-cover" />
              : userInitials(task.assignee)
            }
          </div>
          <span className="text-xs text-muted-foreground truncate">{userDisplayName(task.assignee)}</span>
        </div>
      )}
    </div>
  );
}

function DroppableKanbanColumn({
  status,
  children,
}: {
  status: string;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div
      ref={setNodeRef}
      className={`p-3 space-y-2 min-h-[120px] rounded-b-xl transition-colors ${isOver ? "bg-primary/5 ring-2 ring-inset ring-primary/20" : ""}`}
    >
      {children}
    </div>
  );
}

export default function TasksView() {
  const t = useT();
  const router = useRouter();

  const PRIORITY_OPTIONS: TaskSelectOption[] = [
    { value: "LOW",    label: t.tasks.priorityLow,    dot: "bg-gray-400" },
    { value: "MEDIUM", label: t.tasks.priorityMedium, dot: "bg-yellow-400" },
    { value: "HIGH",   label: t.tasks.priorityHigh,   dot: "bg-red-500" },
  ];

  const PRIORITY_LABELS: Record<string, string> = {
    LOW: t.tasks.priorityLow,
    MEDIUM: t.tasks.priorityMedium,
    HIGH: t.tasks.priorityHigh,
  };
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [groupBy, setGroupBy] = useState<GroupBy>("none");
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [sortColumn, setSortColumn] = useState<SortField | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedTaskIsSubTask, setSelectedTaskIsSubTask] = useState(false);
  const [selectedTaskParent, setSelectedTaskParent] = useState<Task | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [subTaskPrevStatus, setSubTaskPrevStatus] = useState<Record<string, string>>({});
  const [kanbanProjectFilter, setKanbanProjectFilter] = useState<string>("");
  const [editingCell, setEditingCell] = useState<{ taskId: string; field: "assignee" | "dueDate" | "status" | "priority" | "project" } | null>(null);
  const [members, setMembers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [dragActiveId, setDragActiveId] = useState<string | null>(null);
  const dndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );
  const [statuses, setStatuses] = useState<TaskStatusConfig[]>([]);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch("/api/tasks");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setTasks(data);
      // Auto-expand all parent tasks
      setExpanded(new Set(data.filter((t: Task) => t.subTasks.length > 0).map((t: Task) => t.id)));
    } catch {
      toast.error(t.tasks.loadError);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  useEffect(() => {
    fetch("/api/task-statuses").then((r) => r.json()).then(setStatuses).catch(() => {});
  }, []);

  useEffect(() => {
    if (!search) return;
    const q = search.toLowerCase();
    setExpanded((prev) => {
      const next = new Set(prev);
      tasks.forEach((t) => {
        if (t.subTasks.some((s) => s.title.toLowerCase().includes(q))) next.add(t.id);
      });
      return next;
    });
  }, [search, tasks]);

  useEffect(() => {
    Promise.all([
      fetch("/api/team/invite").then((r) => r.json()),
      fetch("/api/user").then((r) => r.json()),
      fetch("/api/projects").then((r) => r.json()),
    ]).then(([team, me, projs]) => {
      const all: User[] = [];
      if (me?.id) all.push({ ...me, isSelf: true });
      if (team?.members) all.push(...team.members);
      setMembers(all);
      if (Array.isArray(projs)) setProjects(projs);
    }).catch(() => {});
  }, []);

  const assigneeOptions = useMemo<TaskSelectOption[]>(() => [
    { value: "", label: t.tasks.unassigned },
    ...members.map((m) => ({
      value: m.id,
      label: m.isSelf ? `${userDisplayName(m)} ${t.tasks.selfSuffix}` : userDisplayName(m),
      avatarUrl: m.avatarUrl ?? null,
      initials: userInitials(m),
    })),
  ], [members]);

  const projectOptions = useMemo<TaskSelectOption[]>(() => [
    { value: "", label: t.tasks.noProject },
    ...projects.map((p) => ({ value: p.id, label: p.title })),
  ], [projects, t]);

  function handleColumnSort(field: SortField) {
    if (sortColumn === field) {
      if (sortDir === "asc") setSortDir("desc");
      else if (sortDir === "desc") { setSortColumn(null); setSortField("createdAt"); setSortDir("desc"); return; }
    } else {
      setSortColumn(field);
      setSortField(field);
      setSortDir("asc");
    }
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortColumn !== field) return <ArrowUpDown size={13} className="text-muted-foreground/50" />;
    return sortDir === "asc" ? <ArrowUp size={13} className="text-primary" /> : <ArrowDown size={13} className="text-primary" />;
  }

  const statusLabels = useMemo(
    () => Object.fromEntries(statuses.map((s) => [s.value, s.label])),
    [statuses]
  );
  const statusOptions = useMemo<TaskSelectOption[]>(
    () => statuses.map((s) => ({ value: s.value, label: s.label, dot: s.color })),
    [statuses]
  );
  const statusOrder = useMemo(
    () => Object.fromEntries(statuses.map((s, i) => [s.value, i])),
    [statuses]
  );

  const sortTasks = useCallback((list: Task[]) => {
    return [...list].sort((a, b) => {
      let cmp = 0;
      if (sortField === "title") cmp = a.title.localeCompare(b.title);
      else if (sortField === "status") cmp = (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99);
      else if (sortField === "priority") cmp = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
      else if (sortField === "dueDate") {
        if (!a.dueDate && !b.dueDate) cmp = 0;
        else if (!a.dueDate) cmp = 1;
        else if (!b.dueDate) cmp = -1;
        else cmp = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      } else {
        cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [sortField, sortDir, statusOrder]);

  const filtered = useMemo(() => {
    if (!search) return tasks;
    const q = search.toLowerCase();
    return tasks
      .filter((t) =>
        t.title.toLowerCase().includes(q) ||
        t.subTasks.some((s) => s.title.toLowerCase().includes(q))
      )
      .map((t) =>
        t.title.toLowerCase().includes(q)
          ? t
          : { ...t, subTasks: t.subTasks.filter((s) => s.title.toLowerCase().includes(q)) }
      );
  }, [tasks, search]);

  const sorted = useMemo(() => sortTasks(filtered), [filtered, sortTasks]);

  type KanbanItem = Task & { parentTitle?: string; parentTask?: Task };
  const kanbanFlat = useMemo<KanbanItem[]>(() => {
    const items: KanbanItem[] = [];
    for (const task of sorted) {
      items.push(task);
      for (const sub of task.subTasks) {
        items.push({ ...(sub as Task), parentTitle: task.title, parentTask: task });
      }
    }
    return items;
  }, [sorted]);

  async function deleteTask(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success(t.tasks.taskDeleted);
      if (selectedTask?.id === id) setSelectedTask(null);
      fetchTasks();
    } catch {
      toast.error(t.tasks.deleteTaskError);
    } finally {
      setDeletingId(null);
    }
  }

  function patchTaskLocal(id: string, updates: Record<string, unknown>) {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === id) return { ...t, ...updates } as Task;
        return { ...t, subTasks: t.subTasks.map((s) => s.id === id ? { ...s, ...updates } as SubTask : s) };
      })
    );
  }

  async function patchTask(id: string, apiData: Record<string, unknown>, localData?: Record<string, unknown>) {
    patchTaskLocal(id, localData ?? apiData);
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(apiData),
      });
      if (!res.ok) throw new Error();
    } catch {
      toast.error(t.tasks.saveError);
      fetchTasks();
    }
  }

  function handleKanbanDragStart(event: DragStartEvent) {
    setDragActiveId(event.active.id as string);
  }

  function handleKanbanDragEnd(event: DragEndEvent) {
    setDragActiveId(null);
    const { active, over } = event;
    if (!over) return;
    const taskId = active.id as string;
    const newStatus = over.id as string;
    const found =
      tasks.find((t) => t.id === taskId) ??
      tasks.flatMap((t) => t.subTasks).find((s) => s.id === taskId);
    if (!found || found.status === newStatus) return;
    patchTask(taskId, { status: newStatus });
  }

  function getGroups(): { key: string; label: string; tasks: Task[] }[] {
    if (groupBy === "none") return [{ key: "all", label: "", tasks: sorted }];
    if (groupBy === "status") {
      return statuses.map((s) => ({
        key: s.value,
        label: s.label,
        tasks: sorted.filter((t) => t.status === s.value),
      }));
    }
    if (groupBy === "priority") {
      return ["HIGH", "MEDIUM", "LOW"].map((p) => ({
        key: p,
        label: PRIORITY_LABELS[p] ?? p,
        tasks: sorted.filter((t) => t.priority === p),
      }));
    }
    if (groupBy === "project") {
      const projectMap = new Map<string, { label: string; tasks: Task[] }>();
      sorted.forEach((task) => {
        const key = task.project?.id ?? "__none__";
        const label = task.project?.title ?? t.tasks.noClientGroup;
        if (!projectMap.has(key)) projectMap.set(key, { label, tasks: [] });
        projectMap.get(key)!.tasks.push(task);
      });
      return Array.from(projectMap.entries()).map(([key, val]) => ({ key, ...val }));
    }
    return [{ key: "all", label: "", tasks: sorted }];
  }

  const groups = getGroups();

  function renderTableRow(task: Task, isSubTask = false): React.ReactElement[] {
    const subTasks = task.subTasks ?? [];
    const hasSubTasks = subTasks.length > 0;
    const isExpanded = expanded.has(task.id);
    const overdue = isOverdue(task);
    const isEditingAssignee = editingCell?.taskId === task.id && editingCell.field === "assignee";
    const isEditingDueDate = editingCell?.taskId === task.id && editingCell.field === "dueDate";
    const isEditingStatus = editingCell?.taskId === task.id && editingCell.field === "status";
    const isEditingPriority = editingCell?.taskId === task.id && editingCell.field === "priority";
    const isEditingProject = editingCell?.taskId === task.id && editingCell.field === "project";

    return [
      <tr
        key={task.id}
        onClick={() => { setSelectedTask(task); setSelectedTaskIsSubTask(isSubTask); }}
        className={`border-b border-border/50 hover:bg-muted/30 transition-colors group cursor-pointer ${isSubTask ? "bg-muted/10" : ""} ${isSubTask && task.status === "DONE" ? "opacity-40" : ""}`}
      >
        {/* Nazwa */}
        <td className="px-4 py-2.5">
          <div className={`flex items-center gap-1.5 ${isSubTask ? "pl-10" : ""}`}>
            {isSubTask && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (task.status !== "DONE") {
                    setSubTaskPrevStatus((prev) => ({ ...prev, [task.id]: task.status }));
                    patchTask(task.id, { status: "DONE" });
                  } else {
                    const prev = subTaskPrevStatus[task.id] ?? "TODO";
                    patchTask(task.id, { status: prev });
                    setSubTaskPrevStatus((p) => { const next = { ...p }; delete next[task.id]; return next; });
                  }
                }}
                className="shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors"
                style={{
                  borderColor: task.status === "DONE" ? "var(--color-primary)" : "var(--color-border)",
                  backgroundColor: task.status === "DONE" ? "var(--color-primary)" : "transparent",
                }}
                title={task.status === "DONE" ? t.tasks.markUndone : t.tasks.markDone}
              >
                {task.status === "DONE" && (
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                    <path d="M1.5 4L3.5 6L6.5 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            )}
            {!isSubTask && hasSubTasks && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setExpanded((prev) => {
                    const next = new Set(prev);
                    if (next.has(task.id)) next.delete(task.id);
                    else next.add(task.id);
                    return next;
                  });
                }}
                className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
              >
                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
            )}
            {!isSubTask && !hasSubTasks && <span className="w-3.5 shrink-0" />}
            <span className="text-sm font-medium truncate max-w-[260px]">
              {task.title}
            </span>
          </div>
        </td>
        {/* Klient */}
        <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
          <div className="relative">
            <div
              onClick={() => setEditingCell({ taskId: task.id, field: "project" })}
              style={{ visibility: isEditingProject ? "hidden" : "visible" }}
              className="cursor-pointer"
            >
              {task.project
                ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-foreground whitespace-nowrap border border-border hover:bg-muted/70 transition-colors">{task.project.title}</span>
                : <span className="text-sm text-muted-foreground">—</span>
              }
            </div>
            {isEditingProject && (
              <div className="absolute inset-0 flex items-center">
                <TaskSelectField
                  value={task.project?.id ?? ""}
                  onChange={(v) => {
                    const project = projects.find((p) => p.id === v) ?? null;
                    patchTask(task.id, { projectId: v || null }, { projectId: v || null, project });
                    setEditingCell(null);
                  }}
                  options={projectOptions}
                  useFixed initialOpen compact
                  onClose={() => setEditingCell(null)}
                />
              </div>
            )}
          </div>
        </td>
        {/* Priorytet */}
        <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
          <div className="relative">
            <div
              onClick={() => setEditingCell({ taskId: task.id, field: "priority" })}
              style={{ visibility: isEditingPriority ? "hidden" : "visible" }}
              className="cursor-pointer"
            >
              <PriorityBadge priority={task.priority} />
            </div>
            {isEditingPriority && (
              <div className="absolute inset-0 flex items-center">
                <TaskSelectField
                  value={task.priority}
                  onChange={(v) => { patchTask(task.id, { priority: v }); setEditingCell(null); }}
                  options={PRIORITY_OPTIONS}
                  useFixed initialOpen compact
                  onClose={() => setEditingCell(null)}
                />
              </div>
            )}
          </div>
        </td>
        {/* Status */}
        <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
          <div className="relative">
            <div
              onClick={() => setEditingCell({ taskId: task.id, field: "status" })}
              style={{ visibility: isEditingStatus ? "hidden" : "visible" }}
              className="cursor-pointer"
            >
              <StatusPill
                label={statusLabels[task.status] ?? task.status}
                color={statuses.find((s) => s.value === task.status)?.color ?? "#6b7280"}
              />
            </div>
            {isEditingStatus && (
              <div className="absolute inset-0 flex items-center">
                <TaskSelectField
                  value={task.status}
                  onChange={(v) => { patchTask(task.id, { status: v }); setEditingCell(null); }}
                  options={statusOptions}
                  useFixed initialOpen compact
                  onClose={() => setEditingCell(null)}
                />
              </div>
            )}
          </div>
        </td>
        {/* Przypisane do */}
        <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
          <div className="relative">
            <div
              onClick={() => setEditingCell({ taskId: task.id, field: "assignee" })}
              className="cursor-pointer hover:opacity-75 transition-opacity"
            >
              <UserAvatar user={task.assignee} />
            </div>
            {isEditingAssignee && (
              <TaskSelectField
                value={task.assignee?.id ?? ""}
                onChange={(v) => {
                  const assignee = members.find((m) => m.id === v) ?? null;
                  patchTask(task.id, { assigneeId: v || null }, { assigneeId: v || null, assignee });
                  setEditingCell(null);
                }}
                options={assigneeOptions}
                useFixed initialOpen invisibleTrigger
                onClose={() => setEditingCell(null)}
                className="absolute inset-0"
              />
            )}
          </div>
        </td>
        {/* Termin */}
        <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
          <div className="relative">
            <div
              onClick={() => setEditingCell({ taskId: task.id, field: "dueDate" })}
              style={{ visibility: isEditingDueDate ? "hidden" : "visible" }}
              className={`text-sm whitespace-nowrap cursor-pointer hover:underline ${overdue ? "text-red-500 font-medium" : "text-muted-foreground"}`}
            >
              {formatDate(task.dueDate)}
            </div>
            {isEditingDueDate && (
              <div className="absolute inset-0 flex items-center">
                <DatePicker
                  value={task.dueDate ? task.dueDate.slice(0, 10) : ""}
                  onChange={(v) => { patchTask(task.id, { dueDate: v || null }); setEditingCell(null); }}
                  initialOpen
                  compact
                  onClose={() => setEditingCell(null)}
                  error={!!overdue}
                />
              </div>
            )}
          </div>
        </td>
        {/* Utworzone */}
        <td className="px-4 py-2.5 text-sm text-muted-foreground whitespace-nowrap">
          {formatDate(task.createdAt)}
        </td>
        {/* Akcje */}
        <td className="px-4 py-2.5 text-right">
          <button
            onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }}
            disabled={deletingId === task.id}
            className="opacity-0 group-hover:opacity-100 p-1 rounded text-muted-foreground hover:text-red-500 transition-all disabled:opacity-50"
          >
            <Trash2 size={14} />
          </button>
        </td>
      </tr>,
      ...(hasSubTasks && isExpanded
        ? subTasks.flatMap((sub) => renderTableRow(sub as Task, true))
        : []),
    ];
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        {t.tasks.loadingTasks}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{t.tasks.tasksTitle}</h1>
          <p className="text-sm text-muted-foreground">{tasks.length} {t.tasks.tasksTitle.toLowerCase()}</p>
        </div>
        <AddTaskDialog
          trigger={
            <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity">
              <Plus size={16} />
              {t.tasks.addTask}
            </button>
          }
          statusOptions={statusOptions}
          onCreated={() => { fetchTasks(); router.refresh(); }}
        />
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Wyszukiwarka */}
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.tasks.searchPlaceholder}
            className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {/* Grupuj po (tylko lista) / Filtr klienta (tylko kanban) */}
        {viewMode === "list" ? (
          <div className="flex items-center gap-1.5">
            <label className="text-sm text-muted-foreground whitespace-nowrap">{t.tasks.groupByLabel}</label>
            <TaskSelectField
              inline
              value={groupBy}
              onChange={(v) => setGroupBy(v as GroupBy)}
              options={[
                { value: "none",     label: t.tasks.groupNone     },
                { value: "project",  label: t.tasks.groupClient   },
                { value: "status",   label: t.tasks.groupStatus   },
                { value: "priority", label: t.tasks.groupPriority },
              ]}
            />
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <label className="text-sm text-muted-foreground whitespace-nowrap">{t.tasks.clientFilterLabel}</label>
            <TaskSelectField
              inline
              value={kanbanProjectFilter}
              onChange={setKanbanProjectFilter}
              options={[
                { value: "", label: t.tasks.allClients },
                ...projects.map((p) => ({ value: p.id, label: p.title })),
              ]}
            />
          </div>
        )}

        {/* Sortuj po */}
        <div className="flex items-center gap-1.5">
          <label className="text-sm text-muted-foreground whitespace-nowrap">{t.tasks.sortByLabel}</label>
          <TaskSelectField
            inline
            value={sortField}
            onChange={(v) => { setSortField(v as SortField); setSortColumn(null); }}
            options={[
              { value: "createdAt", label: t.tasks.sortCreatedAt  },
              { value: "dueDate",   label: t.tasks.sortDueDate   },
              { value: "priority",  label: t.tasks.groupPriority },
              { value: "status",    label: t.tasks.groupStatus   },
              { value: "title",     label: t.tasks.sortTitle     },
            ]}
          />
          <button
            onClick={() => setSortDir((d) => d === "asc" ? "desc" : "asc")}
            className="h-8 px-2 border border-input rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            title={sortDir === "asc" ? t.tasks.ascending : t.tasks.descending}
          >
            {sortDir === "asc" ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
          </button>
        </div>

        {/* Widok — skrajnie po prawej */}
        <div className="ml-auto flex items-center gap-1 border border-border rounded-lg p-1">
          <button
            onClick={() => setViewMode("list")}
            className={`p-1.5 rounded transition-colors ${viewMode === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            title={t.tasks.listView}
          >
            <List size={16} />
          </button>
          <button
            onClick={() => setViewMode("kanban")}
            className={`p-1.5 rounded transition-colors ${viewMode === "kanban" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            title={t.tasks.kanbanView}
          >
            <Columns3 size={16} />
          </button>
        </div>
      </div>

      {/* Lista */}
      {viewMode === "list" && (
        <div className="border border-border rounded-xl overflow-x-auto">
          <table className="w-full min-w-[800px] text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                {(
                  [
                    { label: t.tasks.colName,      field: "title" as SortField },
                    { label: t.tasks.clientLabel,  field: null },
                    { label: t.tasks.priorityLabel,field: "priority" as SortField },
                    { label: t.tasks.statusLabel,  field: "status" as SortField },
                    { label: t.tasks.colAssignee,  field: null },
                    { label: t.tasks.dueDateLabel, field: "dueDate" as SortField },
                    { label: t.tasks.colCreated,   field: "createdAt" as SortField },
                    { label: "",                   field: null },
                  ]
                ).map(({ label, field }, i) => (
                  <th
                    key={i}
                    className={`px-4 py-2.5 text-left font-medium text-xs text-muted-foreground uppercase tracking-wide whitespace-nowrap ${field ? "cursor-pointer hover:text-foreground select-none" : ""}`}
                    onClick={() => field && handleColumnSort(field)}
                  >
                    <div className="flex items-center gap-1">
                      {label}
                      {field && <SortIcon field={field} />}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => (
                <React.Fragment key={group.key}>
                  {groupBy !== "none" && (
                    <tr className="bg-muted/20">
                      <td colSpan={8} className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {group.label} ({group.tasks.length})
                      </td>
                    </tr>
                  )}
                  {group.tasks.map((task) => renderTableRow(task))}
                </React.Fragment>
              ))}
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground text-sm">
                    {search ? t.tasks.noTasksSearch : t.tasks.noTasks}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Kanban */}
      {viewMode === "kanban" && (
        <DndContext
          sensors={dndSensors}
          onDragStart={handleKanbanDragStart}
          onDragEnd={handleKanbanDragEnd}
        >
        <div className="overflow-x-auto pb-2">
          <div className="flex gap-4" style={{ minWidth: `${Math.max(statuses.length, 1) * 284}px` }}>
            {statuses.map((statusCfg) => {
              const col = statusCfg.value;
              const colTasks = kanbanFlat
                .filter((t) => t.status === col)
                .filter((t) => !kanbanProjectFilter || t.project?.id === kanbanProjectFilter);
              return (
                <div key={col} className="bg-muted/30 rounded-xl border border-border overflow-hidden flex-1 min-w-[260px]">
                  <div className="px-4 py-3 border-b border-border flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: statusCfg.color }} />
                    <span className="text-sm font-semibold">{statusCfg.label}</span>
                    <span className="ml-auto text-xs text-muted-foreground font-medium">{colTasks.length}</span>
                  </div>
                  <DroppableKanbanColumn status={col}>
                    {colTasks.map((item) => (
                      <DraggableKanbanCard
                        key={item.id}
                        task={item}
                        parentTitle={item.parentTitle}
                        onClick={() => {
                          setSelectedTask(item);
                          setSelectedTaskIsSubTask(!!item.parentTask);
                          setSelectedTaskParent(item.parentTask ?? null);
                        }}
                      />
                    ))}
                    {colTasks.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-6">{t.tasks.kanbanNoTasks}</p>
                    )}
                  </DroppableKanbanColumn>
                </div>
              );
            })}
          </div>
          <DragOverlay dropAnimation={null}>
            {dragActiveId ? (() => {
              const item = kanbanFlat.find((i) => i.id === dragActiveId);
              return item ? (
                <DraggableKanbanCard task={item} parentTitle={item.parentTitle} overlay />
              ) : null;
            })() : null}
          </DragOverlay>
        </div>
        </DndContext>
      )}

      {/* Panel szczegółów */}
      {selectedTask && (
        <TaskDetailPanel
          key={selectedTask.id}
          task={selectedTask}
          isSubTask={selectedTaskIsSubTask}
          parentTaskTitle={selectedTaskParent?.title}
          onBack={selectedTaskParent ? () => {
            setSelectedTask(selectedTaskParent);
            setSelectedTaskIsSubTask(false);
            setSelectedTaskParent(null);
          } : undefined}
          onOpenTask={(sub) => {
            setSelectedTaskParent(selectedTask);
            setSelectedTask(sub);
            setSelectedTaskIsSubTask(true);
          }}
          statusOptions={statusOptions}
          onClose={() => { setSelectedTask(null); setSelectedTaskParent(null); setSelectedTaskIsSubTask(false); }}
          onUpdated={() => { fetchTasks(); router.refresh(); }}
        />
      )}
    </div>
  );
}
