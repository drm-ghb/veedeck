"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { GripVertical, RotateCcw, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useT } from "@/lib/i18n";

type Category = { value: string; label: string; custom?: boolean };

export default function SettingsListyPage() {
  const t = useT();

  const BUILT_IN: Category[] = [
    { value: "OSWIETLENIE", label: t.listSettings.lampy },
    { value: "AKCESORIA", label: t.listSettings.akcesoria },
    { value: "MEBLE", label: t.listSettings.meble },
    { value: "ARMATURA", label: t.listSettings.armatura },
    { value: "OKLADZINY_SCIENNE", label: t.listSettings.okladziny },
    { value: "PODLOGA", label: t.listSettings.podloga },
  ];

  function buildList(savedOrder: string[], customCats: string[]): Category[] {
    const customItems: Category[] = customCats.map((c) => ({ value: c, label: c, custom: true }));
    const all = [...BUILT_IN, ...customItems];
    if (!savedOrder.length) return all;
    const ordered = savedOrder
      .map((v) => all.find((c) => c.value === v))
      .filter(Boolean) as Category[];
    const rest = all.filter((c) => !savedOrder.includes(c.value));
    return [...ordered, ...rest];
  }

  const [categories, setCategories] = useState<Category[]>(BUILT_IN);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dragging, setDragging] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const [newCatName, setNewCatName] = useState("");

  useEffect(() => {
    fetch("/api/settings/lists")
      .then((r) => r.json())
      .then((data) => {
        const custom: string[] = Array.isArray(data.customCategories) ? data.customCategories : [];
        const order: string[] = Array.isArray(data.listsCategoryOrder) ? data.listsCategoryOrder : [];
        setCategories(buildList(order, custom));
      })
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const customCategories = categories.filter((c) => c.custom).map((c) => c.value);
      const listsCategoryOrder = categories.map((c) => c.value);
      const res = await fetch("/api/settings/lists", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listsCategoryOrder, customCategories }),
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
    const custom = categories.filter((c) => c.custom);
    setCategories([...BUILT_IN, ...custom]);
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

  function handleAddCustomCategory() {
    const trimmed = newCatName.trim();
    if (!trimmed || categories.some((c) => c.value === trimmed)) return;
    setCategories((prev) => [...prev, { value: trimmed, label: trimmed, custom: true }]);
    setNewCatName("");
  }

  function handleRemoveCustomCategory(value: string) {
    setCategories((prev) => prev.filter((c) => c.value !== value));
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
            Przeciągaj aby zmienić kolejność. Dodaj własne kategorie — pojawią się automatycznie na liście.
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
                    ? "border-primary/40 bg-primary/5"
                    : "border-border bg-background hover:bg-muted/40"
                }`}
              >
                <span className="text-sm font-medium text-muted-foreground w-5 text-center tabular-nums">
                  {index + 1}.
                </span>
                <GripVertical size={16} className="text-muted-foreground/50 shrink-0" />
                <span className="text-sm font-medium flex-1">{cat.label}</span>
                {cat.custom && (
                  <button
                    type="button"
                    onClick={() => handleRemoveCustomCategory(cat.value)}
                    className="text-muted-foreground hover:text-red-500 transition-colors p-0.5"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Add custom category */}
        <div className="flex gap-2 pt-1">
          <Input
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddCustomCategory()}
            placeholder="Dodaj własną kategorię, np. Łóżka"
            className="flex-1"
          />
          <Button type="button" variant="outline" onClick={handleAddCustomCategory} disabled={!newCatName.trim()}>
            <Plus size={15} />
          </Button>
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-border">
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
