"use client";

import { useState } from "react";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Sun, Moon, Monitor, Palette, Globe, Pencil,
  GripVertical, LayoutDashboard, Users, PushPin, LocalMall, Package,
  CheckSquare, CalendarDays, NotebookText, ChatBubble, VeezardIcon,
  Engineering, ClipboardList, ChevronDown,
} from "@/components/ui/icons";
import { useTheme, type Theme, type ColorTheme, type CustomThemeColors } from "@/lib/theme";
import { useT, useLang } from "@/lib/i18n";
import { patchUser, SectionHeader, ToggleSwitch } from "./SettingsShared";

interface Props {
  initialColorTheme: ColorTheme;
  initialCustomTheme: CustomThemeColors | null;
  initialGlobalHiddenModules: string[];
  initialSidebarOrder: string[];
}

function SortableSidebarItem({ id, label, icon: Icon }: { id: string; label: string; icon: React.ElementType }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-3 px-3 py-2.5 bg-card border border-border rounded-xl">
      <button type="button" {...attributes} {...listeners} className="text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing touch-none">
        <GripVertical size={16} />
      </button>
      <Icon size={15} className="text-muted-foreground shrink-0" />
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}

export function SettingsAppearance({
  initialColorTheme,
  initialCustomTheme,
  initialGlobalHiddenModules,
  initialSidebarOrder,
}: Props) {
  const router = useRouter();
  const t = useT();
  const { theme, setTheme, colorTheme, setColorTheme, setCustomTheme } = useTheme();
  const { lang, setLang } = useLang();

  const DEFAULT_CUSTOM: CustomThemeColors = { primary: "#4F46E5", background: "#FFFFFF", sidebar: "#EDEEF2", sidebarText: "#111111", contentText: "#111111" };
  const [customColors, setCustomColors] = useState<CustomThemeColors>({ ...DEFAULT_CUSTOM, ...(initialCustomTheme ?? {}) });
  const [showCustomEditor, setShowCustomEditor] = useState(false);
  const [savingCustomTheme, setSavingCustomTheme] = useState(false);

  const [globalHiddenModules, setGlobalHiddenModules] = useState<string[]>(initialGlobalHiddenModules);
  const [modulesExpanded, setModulesExpanded] = useState(false);

  const DEFAULT_SIDEBAR_ORDER = ["klienci", "renderflow", "listy", "zadania", "ankiety", "produkty", "wykonawcy", "kalendarz", "notatnik", "dyskusje", "veezard"];
  const SIDEBAR_ITEM_META: Record<string, { label: string; icon: React.ElementType }> = {
    klienci:    { label: t.nav.projects,    icon: Users },
    wykonawcy:  { label: t.nav.contractors, icon: Engineering },
    renderflow: { label: t.nav.renderflow,  icon: PushPin },
    listy:      { label: t.nav.lists,       icon: LocalMall },
    zadania:    { label: t.nav.tasks,       icon: CheckSquare },
    produkty:   { label: t.nav.products,    icon: Package },
    kalendarz:  { label: t.nav.calendar,    icon: CalendarDays },
    notatnik:   { label: t.nav.notes,       icon: NotebookText },
    dyskusje:   { label: t.nav.discussions, icon: ChatBubble },
    ankiety:    { label: t.nav.surveys,     icon: ClipboardList },
    veezard:    { label: t.nav.veezard,     icon: VeezardIcon },
  };
  const initialOrder = initialSidebarOrder.length > 0
    ? [...initialSidebarOrder, ...DEFAULT_SIDEBAR_ORDER.filter((k) => !initialSidebarOrder.includes(k))]
    : DEFAULT_SIDEBAR_ORDER;
  const [sidebarOrder, setSidebarOrder] = useState<string[]>(initialOrder);
  const [sidebarOrderSaving, setSidebarOrderSaving] = useState(false);
  const sidebarSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const THEME_OPTIONS: { value: Theme; label: string; icon: React.ElementType }[] = [
    { value: "light", label: t.theme.light, icon: Sun },
    { value: "dark", label: t.theme.dark, icon: Moon },
    { value: "system", label: t.theme.system, icon: Monitor },
  ];

  const COLOR_THEMES: { slug: ColorTheme; name: string; subtitle: string; sidebar: string; background: string; primary: string; accent: string }[] = [
    { slug: "violet",    name: "Violet",          subtitle: t.settings.colorThemeViolet,    sidebar: "#EDEEF2", background: "#FFFFFF", primary: "#4F46E5", accent: "#A5B4FC" },
    { slug: "champagne", name: "Champagne Linen",  subtitle: t.settings.colorThemeChampagne, sidebar: "#F7F3EA", background: "#EEE9DF", primary: "#8B613C", accent: "#C2A878" },
    { slug: "obsidian",  name: "Obsidian Gold",    subtitle: t.settings.colorThemeObsidian,  sidebar: "#12110F", background: "#F7F5F0", primary: "#C7A46C", accent: "#8A6A3A" },
    { slug: "navy",      name: "Royal Navy",       subtitle: t.settings.colorThemeNavy,      sidebar: "#0A1230", background: "#F2F3F6", primary: "#15224F", accent: "#B8C0DB" },
    { slug: "plum",      name: "Plum Noir",        subtitle: t.settings.colorThemePlum,      sidebar: "#1F1320", background: "#F5F1ED", primary: "#5A2545", accent: "#C98A6B" },
    { slug: "mono",      name: "Monochrome",       subtitle: t.settings.colorThemeMono,      sidebar: "#EAEAEA", background: "#F0F0F0", primary: "#111111", accent: "#333333" },
  ];

  async function handleColorThemeChange(slug: ColorTheme) {
    setColorTheme(slug);
    const res = await patchUser({ colorTheme: slug });
    if (res.ok) toast.success(t.settings.saved);
    else toast.error(t.settings.saveError);
  }

  async function handleSaveCustomTheme() {
    setSavingCustomTheme(true);
    setCustomTheme(customColors);
    setColorTheme("custom");
    const res = await patchUser({ colorTheme: "custom", customTheme: customColors });
    setSavingCustomTheme(false);
    if (res.ok) { toast.success(t.settings.saved); setShowCustomEditor(false); }
    else toast.error(t.settings.saveError);
  }

  async function toggleGlobalModule(slug: string) {
    const next = globalHiddenModules.includes(slug)
      ? globalHiddenModules.filter((m) => m !== slug)
      : [...globalHiddenModules, slug];
    const res = await patchUser({ globalHiddenModules: next });
    if (res.ok) { setGlobalHiddenModules(next); toast.success(t.settings.saved); }
    else toast.error(t.settings.saveError);
  }

  function handleSidebarDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = sidebarOrder.indexOf(String(active.id));
    const newIndex = sidebarOrder.indexOf(String(over.id));
    setSidebarOrder(arrayMove(sidebarOrder, oldIndex, newIndex));
  }

  async function saveSidebarOrder() {
    setSidebarOrderSaving(true);
    try {
      await fetch("/api/user/preferences", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sidebarOrder }) });
      toast.success(t.settings.sidebarOrderSaved); router.refresh();
    } catch { toast.error(t.settings.saveError); }
    finally { setSidebarOrderSaving(false); }
  }

  async function resetSidebarOrder() {
    setSidebarOrder(DEFAULT_SIDEBAR_ORDER);
    setSidebarOrderSaving(true);
    try {
      await fetch("/api/user/preferences", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sidebarOrder: DEFAULT_SIDEBAR_ORDER }) });
      toast.success(t.settings.sidebarOrderReset); router.refresh();
    } catch { toast.error(t.settings.saveError); }
    finally { setSidebarOrderSaving(false); }
  }

  const allModules = [
    { slug: "renderflow", label: t.nav.renderflow, description: t.settings.renderflowModuleDesc, icon: <PushPin size={18} className="text-muted-foreground shrink-0" /> },
    { slug: "klienci",    label: t.nav.projects,   description: t.settings.klienciModuleDesc,    icon: <Users size={18} className="text-muted-foreground shrink-0" /> },
    { slug: "listy",      label: t.nav.lists,      description: t.settings.listsModuleDesc,      icon: <LocalMall size={18} className="text-muted-foreground shrink-0" /> },
    { slug: "wykonawcy",  label: t.nav.contractors,description: t.settings.wykonawcyModuleDesc,  icon: <Engineering size={18} className="text-muted-foreground shrink-0" /> },
    { slug: "zadania",    label: t.nav.tasks,      description: t.settings.zadaniaModuleDesc,    icon: <CheckSquare size={18} className="text-muted-foreground shrink-0" /> },
    { slug: "produkty",   label: t.nav.products,   description: t.settings.productsModuleDesc,   icon: <Package size={18} className="text-muted-foreground shrink-0" /> },
    { slug: "kalendarz",  label: t.nav.calendar,   description: t.settings.kalendarzModuleDesc,  icon: <CalendarDays size={18} className="text-muted-foreground shrink-0" /> },
    { slug: "notatnik",   label: t.nav.notes,      description: t.settings.notatnikModuleDesc,   icon: <NotebookText size={18} className="text-muted-foreground shrink-0" /> },
    { slug: "dyskusje",   label: t.nav.discussions,description: t.settings.dyskusjeModuleDesc,   icon: <ChatBubble size={18} className="text-muted-foreground shrink-0" /> },
    { slug: "ankiety",    label: t.nav.surveys,    description: t.settings.ankietyModuleDesc,    icon: <ClipboardList size={18} className="text-muted-foreground shrink-0" /> },
    { slug: "veezard",    label: t.nav.veezard,    description: t.settings.veezardModuleDesc,    icon: <VeezardIcon size={18} className="text-muted-foreground shrink-0" /> },
  ];

  return (
    <div className="max-w-3xl space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Wygląd</h1>
        <p className="text-sm text-gray-500 mt-1">Motyw, interfejs, widoczność modułów i kolejność w sidebarze.</p>
      </div>

      {/* Motyw kolorystyczny */}
      <section className="space-y-4">
        <SectionHeader title={t.settings.colorTheme} />
        <p className="text-sm text-muted-foreground -mt-1">Wybrany motyw obowiązuje w całej aplikacji — Twoi klienci widzą panel w tym samym motywie co Ty.</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {COLOR_THEMES.map(({ slug, name, subtitle, sidebar, background, primary, accent }) => {
            const active = colorTheme === slug;
            return (
              <button key={slug} type="button" aria-pressed={active} onClick={() => handleColorThemeChange(slug)}
                className={`flex flex-col items-start p-3 rounded-2xl border text-left transition-all ${active ? "border-primary ring-2 ring-primary bg-primary/5" : "border-border hover:border-gray-300 dark:hover:border-gray-600 hover:bg-muted"}`}>
                <div className="w-full h-12 rounded-lg overflow-hidden flex mb-3">
                  <div className="w-1/3 h-full" style={{ background: sidebar }} />
                  <div className="flex-1 h-full flex flex-col p-1.5 gap-1" style={{ background }}>
                    <div className="h-2 w-3/4 rounded-sm" style={{ background: primary }} />
                    <div className="h-1.5 w-1/2 rounded-sm" style={{ background: accent }} />
                  </div>
                </div>
                <p className={`text-sm font-semibold leading-tight ${active ? "text-primary" : "text-foreground"}`}>{name}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{subtitle}</p>
              </button>
            );
          })}
          {/* Własny motyw */}
          {(() => {
            const active = colorTheme === "custom";
            const hasSaved = !!initialCustomTheme;
            return (
              <div className="relative">
                <button type="button" aria-pressed={active}
                  onClick={() => { if (active) return; if (hasSaved) handleColorThemeChange("custom"); else setShowCustomEditor(true); }}
                  className={`w-full flex flex-col items-start p-3 rounded-2xl border text-left transition-all ${active ? "border-primary ring-2 ring-primary bg-primary/5" : "border-border hover:border-gray-300 dark:hover:border-gray-600 hover:bg-muted"}`}>
                  <div className="w-full h-12 rounded-lg overflow-hidden flex mb-3">
                    <div className="w-1/3 h-full" style={{ background: customColors.sidebar }} />
                    <div className="flex-1 h-full flex flex-col p-1.5 gap-1" style={{ background: customColors.background }}>
                      <div className="h-2 w-3/4 rounded-sm" style={{ background: customColors.primary }} />
                      <div className="h-1.5 w-1/2 rounded-sm opacity-50" style={{ background: customColors.primary }} />
                    </div>
                  </div>
                  <p className={`text-sm font-semibold leading-tight ${active ? "text-primary" : "text-foreground"}`}>Własny motyw</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-tight">Dostosuj do swojego brandu</p>
                </button>
                <button type="button" onClick={(e) => { e.stopPropagation(); setShowCustomEditor(true); }}
                  className="absolute top-2 right-2 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-black/10 dark:hover:bg-white/10 transition-colors" title="Edytuj motyw">
                  <Pencil size={13} />
                </button>
              </div>
            );
          })()}
        </div>

        {showCustomEditor && (
          <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
            <p className="text-sm font-semibold text-foreground">Dostosuj kolory motywu</p>
            {([
              [
                { key: "primary", label: "Kolor główny", desc: "Przyciski, linki, aktywne elementy" },
                { key: "background", label: "Tło aplikacji", desc: "Główna powierzchnia treści" },
                { key: "sidebar", label: "Sidebar", desc: "Tło paska bocznego i navbaru" },
              ],
              [
                { key: "contentText", label: "Tekst główny", desc: "Kolor tekstu w ekranie wewnętrznym" },
                { key: "sidebarText", label: "Tekst sidebar", desc: "Kolor tekstu w sidebar i navbarze" },
              ],
            ] as { key: keyof CustomThemeColors; label: string; desc: string }[][]).map((row, rowIdx) => (
              <div key={rowIdx} className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {row.map(({ key, label, desc }) => (
                  <label key={key} className="flex flex-col gap-1.5 cursor-pointer">
                    <span className="text-sm font-medium text-foreground">{label}</span>
                    <span className="text-xs text-muted-foreground">{desc}</span>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="relative w-9 h-9 rounded-xl border-2 border-border overflow-hidden shrink-0 cursor-pointer">
                        <input type="color" value={customColors[key] ?? "#111111"} onChange={(e) => setCustomColors((prev) => ({ ...prev, [key]: e.target.value }))} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                        <div className="w-full h-full rounded-[10px]" style={{ background: customColors[key] ?? "#111111" }} />
                      </div>
                      <input type="text" value={customColors[key] ?? "#111111"}
                        onChange={(e) => { const v = e.target.value; if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) setCustomColors((prev) => ({ ...prev, [key]: v })); }}
                        maxLength={7} className="flex-1 h-9 px-2.5 rounded-xl border border-border bg-background text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                    </div>
                  </label>
                ))}
              </div>
            ))}
            <div className="flex gap-2 pt-1">
              <Button onClick={handleSaveCustomTheme} disabled={savingCustomTheme} size="sm">{savingCustomTheme ? "Zapisywanie…" : "Zapisz i aktywuj"}</Button>
              <Button variant="outline" size="sm" onClick={() => setShowCustomEditor(false)}>Anuluj</Button>
            </div>
          </div>
        )}
      </section>

      {/* Ustawienia interfejsu */}
      <section className="space-y-4">
        <SectionHeader title={t.settings.interfaceSettings} />
        <div className="bg-card border border-border rounded-2xl p-6 space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Palette size={16} className="text-gray-400" />
              <h3 className="font-semibold text-gray-800 dark:text-gray-200">{t.theme.label}</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
                <button key={value} type="button" onClick={() => setTheme(value)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm border transition-colors ${theme === value ? "bg-primary text-primary-foreground border-primary" : "border-border text-foreground hover:bg-muted"}`}>
                  <Icon size={15} />{label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Globe size={16} className="text-gray-400" />
              <h3 className="font-semibold text-gray-800 dark:text-gray-200">{t.lang.label}</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {(["pl", "en"] as const).map((value) => (
                <button key={value} type="button" onClick={() => setLang(value)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm border transition-colors ${lang === value ? "bg-primary text-primary-foreground border-primary" : "border-border text-foreground hover:bg-muted"}`}>
                  {t.lang[value]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Widoczność modułów */}
      <section className="space-y-4">
        <SectionHeader title={t.settings.modulesVisibility} />
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-6 pt-6 pb-2">
            <p className="text-xs text-gray-400 mb-4">{t.settings.modulesVisibilityDesc}</p>
          </div>
          <div className="relative overflow-hidden transition-all duration-300" style={{ maxHeight: modulesExpanded ? `${allModules.length * 61}px` : "220px" }}>
            <div className="px-6 space-y-0">
              {allModules.map(({ slug, label, description, icon }) => {
                const visible = !globalHiddenModules.includes(slug);
                return (
                  <div key={slug} className="flex items-center gap-4 py-3 border-b border-border last:border-0">
                    {icon}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{description}</p>
                    </div>
                    <ToggleSwitch checked={visible} onToggle={() => toggleGlobalModule(slug)} />
                  </div>
                );
              })}
            </div>
            {!modulesExpanded && <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-card to-transparent pointer-events-none" />}
          </div>
          <button onClick={() => setModulesExpanded((v) => !v)}
            className="w-full flex items-center justify-center gap-1.5 py-3 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors border-t border-border">
            <ChevronDown size={15} className={`transition-transform duration-300 ${modulesExpanded ? "rotate-180" : ""}`} />
            {modulesExpanded ? t.common.collapse : t.common.showAll}
          </button>
        </div>
      </section>

      {/* Kolejność sidebar */}
      <section className="space-y-4">
        <SectionHeader title={t.settings.sidebarOrder} />
        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <p className="text-xs text-muted-foreground">{t.settings.sidebarOrderDesc}</p>
          <div className="flex items-center gap-3 px-3 py-2.5 bg-muted/50 border border-border rounded-xl opacity-60">
            <span className="w-4 h-4 shrink-0" />
            <LayoutDashboard size={15} className="text-muted-foreground shrink-0" />
            <span className="text-sm font-medium">Dashboard</span>
          </div>
          <DndContext sensors={sidebarSensors} collisionDetection={closestCenter} onDragEnd={handleSidebarDragEnd}>
            <SortableContext items={sidebarOrder} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {sidebarOrder.map((key) => {
                  const meta = SIDEBAR_ITEM_META[key];
                  if (!meta) return null;
                  return <SortableSidebarItem key={key} id={key} label={meta.label} icon={meta.icon} />;
                })}
              </div>
            </SortableContext>
          </DndContext>
          <div className="flex gap-2 pt-1">
            <Button size="sm" onClick={saveSidebarOrder} disabled={sidebarOrderSaving}>{sidebarOrderSaving ? t.common.saving : t.common.save}</Button>
            <Button size="sm" variant="outline" onClick={resetSidebarOrder} disabled={sidebarOrderSaving}>{t.settings.sidebarResetDefault}</Button>
          </div>
        </div>
      </section>
    </div>
  );
}
