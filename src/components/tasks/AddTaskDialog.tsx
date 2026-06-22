"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { toast } from "sonner";
import { X } from "@/components/ui/icons";
import { useT } from "@/lib/i18n";
import TaskSelectField, { TaskSelectOption } from "./TaskSelectField";
import DatePicker from "@/components/ui/DatePicker";
import { TaskDescriptionEditor } from "./TaskDescriptionEditor";

interface Project {
  id: string;
  title: string;
}

interface Member {
  id: string;
  name: string | null;
  email: string;
  fullName?: string | null;
  avatarUrl?: string | null;
  isSelf?: boolean;
}

interface AddTaskDialogProps {
  trigger: React.ReactNode;
  parentId?: string;
  onCreated?: () => void;
  statusOptions?: TaskSelectOption[];
}

function memberInitials(m: Member) {
  const n = m.fullName || m.name || m.email;
  return n.slice(0, 2).toUpperCase();
}

export default function AddTaskDialog({ trigger, parentId, onCreated, statusOptions }: AddTaskDialogProps) {
  const t = useT();

  const DEFAULT_STATUS_OPTIONS: TaskSelectOption[] = [
    { value: "TODO",        label: t.tasks.statusTodo,       dot: "#6b7280" },
    { value: "IN_PROGRESS", label: t.tasks.statusInProgress, dot: "#3b82f6" },
    { value: "DONE",        label: t.tasks.statusDone,       dot: "#22c55e" },
  ];

  const PRIORITY_OPTIONS: TaskSelectOption[] = [
    { value: "LOW",    label: t.tasks.priorityLow,    dot: "bg-gray-400" },
    { value: "MEDIUM", label: t.tasks.priorityMedium, dot: "bg-yellow-400" },
    { value: "HIGH",   label: t.tasks.priorityHigh,   dot: "bg-red-500" },
  ];

  const resolvedStatusOptions = statusOptions ?? DEFAULT_STATUS_OPTIONS;
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("TODO");
  const [priority, setPriority] = useState("MEDIUM");
  const [dueDate, setDueDate] = useState("");
  const [projectId, setProjectId] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [saving, setSaving] = useState(false);

  const [projects, setProjects] = useState<Project[]>([]);
  const [members, setMembers] = useState<Member[]>([]);

  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setTimeout(() => titleRef.current?.focus(), 50);
    Promise.all([
      fetch("/api/projects").then((r) => r.json()),
      fetch("/api/team/invite").then((r) => r.json()),
      fetch("/api/user").then((r) => r.json()),
    ]).then(([projs, team, me]) => {
      if (Array.isArray(projs)) setProjects(projs);
      const allMembers: Member[] = [];
      if (me?.id) allMembers.push({ ...me, isSelf: true });
      if (team?.members) allMembers.push(...team.members);
      setMembers(allMembers);
    }).catch(() => {});
  }, [open]);

  const projectOptions = useMemo<TaskSelectOption[]>(() => [
    { value: "", label: t.tasks.noProject },
    ...projects.map((p) => ({ value: p.id, label: p.title })),
  ], [projects, t]);

  const assigneeOptions = useMemo<TaskSelectOption[]>(() => [
    { value: "", label: t.tasks.unassigned, initials: undefined, avatarUrl: undefined },
    ...members.map((m) => ({
      value: m.id,
      label: m.isSelf
        ? `${m.fullName || m.name || m.email} ${t.tasks.selfSuffix}`
        : m.fullName || m.name || m.email,
      avatarUrl: m.avatarUrl ?? null,
      initials: memberInitials(m),
    })),
  ], [members]);

  function close() {
    setOpen(false);
    setTitle("");
    setDescription("");
    setStatus("TODO");
    setPriority("MEDIUM");
    setDueDate("");
    setProjectId("");
    setAssigneeId("");
  }

  const handleSave = useCallback(async () => {
    if (!title.trim()) { toast.error(t.tasks.titleRequired); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: description || null,
          status,
          priority,
          dueDate: dueDate || null,
          projectId: projectId || null,
          assigneeId: assigneeId || null,
          parentId: parentId || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error || `${t.tasks.saveError} (${res.status})`);
      }
      toast.success(t.tasks.taskCreated);
      close();
      onCreated?.();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t.tasks.saveError);
    } finally {
      setSaving(false);
    }
  }, [title, description, status, priority, dueDate, projectId, assigneeId, parentId, onCreated]);

  return (
    <>
      <span onClick={() => setOpen(true)} style={{ display: "contents" }}>
        {trigger}
      </span>

      {open && (
        <div className="fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/30" onClick={close} />
          <div className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-background border border-border flex flex-col shadow-xl rounded-l-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
              <h2 className="text-base font-semibold">
                {parentId ? t.tasks.newSubtask : t.tasks.newTask}
              </h2>
              <button onClick={close} className="text-muted-foreground hover:text-foreground transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Pola */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t.tasks.titleLabel}</label>
                <input
                  ref={titleRef}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSave()}
                  placeholder={t.tasks.titlePlaceholder}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t.tasks.descLabel}</label>
                <TaskDescriptionEditor
                  content={description}
                  contentKey="new"
                  onChange={setDescription}
                  onBlur={() => {}}
                  placeholder={t.tasks.descPlaceholder}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t.tasks.statusLabel}</label>
                  <TaskSelectField value={status} onChange={setStatus} options={resolvedStatusOptions} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t.tasks.priorityLabel}</label>
                  <TaskSelectField value={priority} onChange={setPriority} options={PRIORITY_OPTIONS} />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t.tasks.dueDateLabel}</label>
                <DatePicker
                  value={dueDate}
                  onChange={setDueDate}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t.tasks.clientLabel}</label>
                <TaskSelectField value={projectId} onChange={setProjectId} options={projectOptions} placeholder={t.tasks.noProject} />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t.tasks.assigneeLabel}</label>
                <TaskSelectField value={assigneeId} onChange={setAssigneeId} options={assigneeOptions} placeholder={t.tasks.unassigned} />
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-border flex justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={close}
                className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-muted transition-colors"
              >
                {t.common.cancel}
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {saving ? t.common.saving : t.tasks.newTask}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
