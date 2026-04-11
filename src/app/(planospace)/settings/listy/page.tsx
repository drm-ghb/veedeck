"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { GripVertical, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";

export default function SettingsListyPage() {
  const t = useT();

  const ALL_CATEGORIES = [
    { value: "LAMPY", label: t.listSettings.lampy },
    { value: "AKCESORIA", label: t.listSettings.akcesoria },
    { value: "MEBLE", label: t.listSettings.meble },
    { value: "ARMATURA", label: t.listSettings.armatura },
    { value: "OKLADZINY_SCIENNE", label: t.listSettings.okladziny },
    { value: "PODLOGA", label: t.listSettings.podloga },
  ];

  function buildOrderedList(saved: string[]) {
    const ordered = saved
      .map((v) => ALL_CATEGORIES.find((c) => c.value === v))
      .filter(Boolean) as typeof ALL_CATEGORIES;
    const rest = ALL_CATEGORIES.filter((c) => !saved.includes(c.value));
    return [...ordered, ...rest];
  }

  const [categories, setCategories] = useState(ALL_CATEGORIES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dragging, setDragging] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/settings/lists")
      .then((r) => r.json())
      .then((data) => {
        if (data.listsCategoryOrder?.length > 0) {
          setCategories(buildOrderedList(data.listsCategoryOrder));
        }
      })
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/settings/lists", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listsCategoryOrder: categories.map((c) => c.value) }),
      });
      if (!res.ok) throw new Error();
      toast.success(t.listSettings.saved);
    } catch {
      toast.error(t.listSettings.saveError);
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    setCategories(ALL_CATEGORIES);
  }

  function handleDragStart(index: number) {
    setDragging(index);
  }

  function handleDragEnter(index: number) {
    if (dragging === null || dragging === index) return;
    setDragOver(index);
    const next = [...categories];
    const [item] = next.splice(dragging, 1);
    next.splice(index, 0, item);
    setCategories(next);
    setDragging(index);
  }

  function handleDragEnd() {
    setDragging(null);
    setDragOver(null);
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t.settings.lists}</h1>
        <p className="text-sm text-gray-500 mt-1">{t.settings.listsDesc}</p>
      </div>

      <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
        <div>
          <h2 className="text-base font-semibold">{t.listSettings.categoryOrder}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {t.listSettings.categoryOrderDesc}
          </p>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-11 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-1.5">
            {categories.map((cat, index) => (
              <div
                key={cat.value}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragEnter={() => handleDragEnter(index)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => e.preventDefault()}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors cursor-grab active:cursor-grabbing select-none ${
                  dragging === index
                    ? "opacity-50 bg-muted border-border"
                    : dragOver === index
                    ? "border-[#C45824]/40 bg-[#C45824]/5"
                    : "border-border bg-background hover:bg-muted/40"
                }`}
              >
                <span className="text-sm font-medium text-muted-foreground w-5 text-center tabular-nums">
                  {index + 1}.
                </span>
                <GripVertical size={16} className="text-muted-foreground/50 shrink-0" />
                <span className="text-sm font-medium">{cat.label}</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <RotateCcw size={13} />
            {t.listSettings.restoreDefault}
          </button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving ? t.listSettings.savingOrder : t.listSettings.saveOrder}
          </Button>
        </div>
      </div>
    </div>
  );
}
