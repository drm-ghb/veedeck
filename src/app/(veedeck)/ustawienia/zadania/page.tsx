"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { GripVertical, Plus, X, Pencil, Check } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface TaskStatusConfig {
  id: string;
  value: string;
  label: string;
  color: string;
  order: number;
}

export default function SettingsZadaniaPage() {
  const [statuses, setStatuses] = useState<TaskStatusConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dragging, setDragging] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const [newLabel, setNewLabel] = useState("");
  const [newColor, setNewColor] = useState("#6b7280");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");

  useEffect(() => {
    fetch("/api/task-statuses")
      .then((r) => r.json())
      .then(setStatuses)
      .finally(() => setLoading(false));
  }, []);

  function handleDragStart(index: number) {
    setDragging(index);
  }

  function handleDragEnter(index: number) {
    if (dragging === null || dragging === index) return;
    setDragOver(index);
    const next = [...statuses];
    const [item] = next.splice(dragging, 1);
    next.splice(index, 0, item);
    setStatuses(next);
    setDragging(index);
  }

  function handleDragEnd() {
    setDragging(null);
    setDragOver(null);
  }

  async function handleSaveOrder() {
    setSaving(true);
    try {
      const res = await fetch("/api/task-statuses", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: statuses.map((s) => s.id) }),
      });
      if (!res.ok) throw new Error();
      toast.success("Kolejność zapisana");
    } catch {
      toast.error("Błąd zapisu");
    } finally {
      setSaving(false);
    }
  }

  async function handleAdd() {
    if (!newLabel.trim()) return;
    try {
      const res = await fetch("/api/task-statuses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: newLabel.trim(), color: newColor }),
      });
      if (!res.ok) throw new Error();
      const created = await res.json();
      setStatuses((prev) => [...prev, created]);
      setNewLabel("");
      setNewColor("#6b7280");
      toast.success("Status dodany");
    } catch {
      toast.error("Błąd dodawania statusu");
    }
  }

  async function handleDelete(status: TaskStatusConfig) {
    try {
      const res = await fetch(`/api/task-statuses/${status.id}`, { method: "DELETE" });
      if (res.status === 409) {
        const data = await res.json();
        toast.error(data.error);
        return;
      }
      if (!res.ok) throw new Error();
      setStatuses((prev) => prev.filter((s) => s.id !== status.id));
      toast.success("Status usunięty");
    } catch {
      toast.error("Błąd usuwania statusu");
    }
  }

  function startEdit(status: TaskStatusConfig) {
    setEditingId(status.id);
    setEditLabel(status.label);
  }

  async function handleSaveEdit(status: TaskStatusConfig) {
    if (!editLabel.trim() || editLabel === status.label) {
      setEditingId(null);
      return;
    }
    try {
      const res = await fetch(`/api/task-statuses/${status.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: editLabel.trim() }),
      });
      if (!res.ok) throw new Error();
      setStatuses((prev) => prev.map((s) => s.id === status.id ? { ...s, label: editLabel.trim() } : s));
      setEditingId(null);
      toast.success("Status zaktualizowany");
    } catch {
      toast.error("Błąd zapisu");
    }
  }

  async function handleColorChange(status: TaskStatusConfig, color: string) {
    setStatuses((prev) => prev.map((s) => s.id === status.id ? { ...s, color } : s));
    try {
      await fetch(`/api/task-statuses/${status.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ color }),
      });
    } catch {
      toast.error("Błąd zapisu koloru");
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Zadania</h1>
        <p className="text-sm text-gray-500 mt-1">Ustawienia modułu zadań</p>
      </div>

      <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
        <div>
          <h2 className="text-base font-semibold">Statusy zadań</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Przeciągaj aby zmienić kolejność — kolejność statusów = kolejność kolumn na Kanbanie.
            Kliknij nazwę aby edytować. Kliknij kolor aby zmienić.
          </p>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-11 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-1.5">
            {statuses.map((status, index) => (
              <div
                key={status.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragEnter={() => handleDragEnter(index)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => e.preventDefault()}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors ${
                  dragging === index
                    ? "opacity-50 bg-muted border-border"
                    : dragOver === index
                    ? "border-primary/40 bg-primary/5"
                    : "border-border bg-background hover:bg-muted/40"
                }`}
              >
                <span className="text-sm font-medium text-muted-foreground w-5 text-center tabular-nums shrink-0">
                  {index + 1}.
                </span>
                <GripVertical size={16} className="text-muted-foreground/50 shrink-0 cursor-grab" />
                <label className="shrink-0 cursor-pointer" title="Zmień kolor">
                  <span
                    className="block w-4 h-4 rounded-full border-2 border-white/50 shadow-sm"
                    style={{ backgroundColor: status.color }}
                  />
                  <input
                    type="color"
                    value={status.color}
                    onChange={(e) => handleColorChange(status, e.target.value)}
                    className="sr-only"
                  />
                </label>
                {editingId === status.id ? (
                  <input
                    autoFocus
                    value={editLabel}
                    onChange={(e) => setEditLabel(e.target.value)}
                    onBlur={() => handleSaveEdit(status)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveEdit(status);
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    className="flex-1 text-sm font-medium bg-transparent border-b border-primary outline-none"
                  />
                ) : (
                  <span
                    className="flex-1 text-sm font-medium cursor-pointer hover:underline"
                    onClick={() => startEdit(status)}
                    title="Kliknij aby edytować"
                  >
                    {status.label}
                  </span>
                )}
                {editingId === status.id ? (
                  <button
                    type="button"
                    onClick={() => handleSaveEdit(status)}
                    className="text-primary hover:opacity-70 transition-opacity p-0.5 shrink-0"
                  >
                    <Check size={14} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => startEdit(status)}
                    className="text-muted-foreground hover:text-foreground transition-colors p-0.5 shrink-0 opacity-0 group-hover:opacity-100"
                  >
                    <Pencil size={13} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleDelete(status)}
                  className="text-muted-foreground hover:text-red-500 transition-colors p-0.5 shrink-0"
                  title="Usuń status"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Dodaj nowy status */}
        <div className="flex gap-2 pt-1">
          <label className="shrink-0 cursor-pointer flex items-center" title="Kolor nowego statusu">
            <span
              className="block w-8 h-9 rounded-lg border border-input flex items-center justify-center"
              style={{ backgroundColor: newColor + "30" }}
            >
              <span className="block w-4 h-4 rounded-full" style={{ backgroundColor: newColor }} />
            </span>
            <input
              type="color"
              value={newColor}
              onChange={(e) => setNewColor(e.target.value)}
              className="sr-only"
            />
          </label>
          <Input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="Nazwa nowego statusu, np. W recenzji"
            className="flex-1"
          />
          <Button type="button" variant="outline" onClick={handleAdd} disabled={!newLabel.trim()}>
            <Plus size={15} />
          </Button>
        </div>

        <div className="flex justify-end pt-1 border-t border-border">
          <Button onClick={handleSaveOrder} disabled={saving || loading}>
            {saving ? "Zapisywanie..." : "Zapisz kolejność"}
          </Button>
        </div>
      </div>
    </div>
  );
}
