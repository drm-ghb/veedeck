"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { GripVertical, RotateCcw, Plus, X, Check, Maximize2 } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useT } from "@/lib/i18n";
import type { PdfTemplate } from "@/lib/pdf-templates";

const PDF_TEMPLATES: PdfTemplate[] = ["violet", "editorial", "atelier", "architect", "linen"];

type Category = { value: string; label: string; custom?: boolean };

export default function SettingsListyPage() {
  const t = useT();
  const router = useRouter();

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
  const [pdfTemplate, setPdfTemplate] = useState<PdfTemplate>("violet");
  const [savingPdf, setSavingPdf] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<PdfTemplate | null>(null);
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
        if (data.pdfListTemplate) setPdfTemplate(data.pdfListTemplate as PdfTemplate);
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

  async function handleSavePdfTemplate(template: PdfTemplate) {
    setPdfTemplate(template);
    setSavingPdf(true);
    try {
      const res = await fetch("/api/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pdfListTemplate: template }),
      });
      if (!res.ok) throw new Error();
      toast.success(t.listSettings.saved);
      router.refresh();
    } catch {
      toast.error(t.listSettings.saveError);
    } finally {
      setSavingPdf(false);
    }
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
    <>
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

      {/* PDF template */}
      <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
        <div>
          <h2 className="text-base font-semibold">{t.listSettings.pdfTemplate}</h2>
          <p className="text-sm text-muted-foreground mt-1">{t.listSettings.pdfTemplateDesc}</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {PDF_TEMPLATES.map((value) => {
            const info = t.listSettings.pdfTemplates[value];
            const selected = pdfTemplate === value;
            return (
              <button
                key={value}
                type="button"
                disabled={savingPdf}
                onClick={() => handleSavePdfTemplate(value)}
                className={`group relative flex flex-col rounded-xl border-2 overflow-hidden transition-all text-left ${
                  selected ? "border-primary" : "border-border hover:border-primary/40"
                }`}
              >
                {/* Thumbnail */}
                <div className="relative w-full aspect-[3/4] bg-muted overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/pdf-thumbs/${value}.png`}
                    alt={info.name}
                    className="absolute inset-0 w-full h-full object-cover object-top"
                  />
                  {selected && (
                    <span className="absolute top-2 right-2 bg-primary rounded-full p-0.5 shadow">
                      <Check size={12} className="text-white" />
                    </span>
                  )}
                  {/* Preview button */}
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={(e) => { e.stopPropagation(); setPreviewTemplate(value); }}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.stopPropagation(); setPreviewTemplate(value); } }}
                    className="absolute bottom-2 right-2 bg-black/50 hover:bg-black/70 text-white rounded-md p-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  >
                    <Maximize2 size={12} />
                  </div>
                </div>
                <div className="p-2.5 bg-background">
                  <p className="text-xs font-semibold leading-tight">{info.name}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{info.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>

    {/* Lightbox */}

    {previewTemplate && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
        onClick={() => setPreviewTemplate(null)}
      >
        <div className="relative max-h-[90vh] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/pdf-thumbs/${previewTemplate}.png`}
            alt={t.listSettings.pdfTemplates[previewTemplate].name}
            className="max-h-[85vh] max-w-[85vw] rounded-xl shadow-2xl object-contain"
          />
          <button
            type="button"
            onClick={() => setPreviewTemplate(null)}
            className="absolute -top-3 -right-3 bg-white dark:bg-gray-800 rounded-full p-1.5 shadow-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    )}
    </>
  );
}
