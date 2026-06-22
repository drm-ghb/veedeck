"use client";

import { useState, useEffect } from "react";
import { Check, ChevronDown, ChevronRight, Loader2 } from "@/components/ui/icons";
import { useT } from "@/lib/i18n";

interface RfProject {
  id: string;
  title: string;
}

interface ScheduleItem {
  id: string;
  name: string;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  done: boolean;
  isSection: boolean;
}

interface SchedulePhase {
  id: string;
  name: string;
  startDate: string | null;
  endDate: string | null;
  done: boolean;
  rfProject: RfProject | null;
  items: ScheduleItem[];
}

// ── Date helpers ──────────────────────────────────────────────────────────

function formatDate(d: string | null): string {
  if (!d) return "";
  return new Date(d).toLocaleDateString("pl-PL", { day: "numeric", month: "short", year: "numeric" });
}

type DateStatus = "none" | "normal" | "warning" | "danger" | "overdue";

function getDateStatus(endDate: string | null, done: boolean): DateStatus {
  if (done || !endDate) return "none";
  const diff = Math.ceil((new Date(endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return "overdue";
  if (diff < 7) return "danger";
  if (diff < 14) return "warning";
  return "normal";
}

function DateBadge({ startDate, endDate, done, variant = "pill" }: { startDate: string | null; endDate: string | null; done: boolean; variant?: "pill" | "plain" }) {
  const t = useT();
  if (!startDate && !endDate) return null;
  const status = getDateStatus(endDate, done);

  const label = startDate && endDate
    ? `${formatDate(startDate)} — ${formatDate(endDate)}`
    : startDate
    ? `${t.share.dateFrom} ${formatDate(startDate)}`
    : `${t.share.dateTo} ${formatDate(endDate)}`;

  if (variant === "plain") {
    return (
      <span className="text-[11px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap border border-border text-muted-foreground">
        {label}
      </span>
    );
  }

  const colorClass =
    status === "overdue" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
    status === "danger"  ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" :
    status === "warning" ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" :
    "bg-muted text-muted-foreground";

  return (
    <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${colorClass}`}>
      {label}
    </span>
  );
}

// ── Section date range helper ─────────────────────────────────────────────

function computeSectionRanges(items: ScheduleItem[]): Map<string, { startDate: string | null; endDate: string | null }> {
  const map = new Map<string, { startDate: string | null; endDate: string | null }>();
  let currentId: string | null = null;
  let starts: string[] = [];
  let ends: string[] = [];

  function finalize() {
    if (currentId) {
      map.set(currentId, {
        startDate: starts.length > 0 ? [...starts].sort()[0] : null,
        endDate: ends.length > 0 ? [...ends].sort().at(-1)! : null,
      });
    }
  }

  for (const item of items) {
    if (item.isSection) {
      finalize();
      currentId = item.id;
      starts = [];
      ends = [];
    } else if (currentId) {
      if (item.startDate) starts.push(item.startDate.slice(0, 10));
      if (item.endDate) ends.push(item.endDate.slice(0, 10));
    }
  }
  finalize();
  return map;
}

// ── Phase card ────────────────────────────────────────────────────────────

function PhaseCard({ phase }: { phase: SchedulePhase }) {
  const t = useT();
  const [collapsed, setCollapsed] = useState(false);

  const doneCount = phase.items.filter((i) => !i.isSection && i.done).length;
  const totalCount = phase.items.filter((i) => !i.isSection).length;
  const sectionRanges = computeSectionRanges(phase.items);

  const indentedIds = new Set<string>();
  let underSection = false;
  for (const item of phase.items) {
    if (item.isSection) { underSection = true; }
    else if (underSection) { indentedIds.add(item.id); }
  }
  const progress = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  return (
    <div className={`bg-card border border-border rounded-xl overflow-hidden ${phase.done ? "opacity-60" : ""}`}>
      {/* Phase header */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => setCollapsed((v) => !v)}
      >
        <div className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
          phase.done ? "bg-green-500 border-green-500 text-white" : "border-muted-foreground"
        }`}>
          {phase.done && <Check size={10} />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`font-semibold text-sm ${phase.done ? "line-through text-muted-foreground" : ""}`}>
              {phase.name}
            </span>
            {phase.rfProject && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                {phase.rfProject.title}
              </span>
            )}
            <DateBadge startDate={phase.startDate} endDate={phase.endDate} done={phase.done} />
            {totalCount > 0 && (
              <span className="text-[11px] text-muted-foreground">{doneCount}/{totalCount}</span>
            )}
          </div>

          {/* Progress bar */}
          {totalCount > 0 && (
            <div className="mt-1.5 h-1 bg-muted rounded-full overflow-hidden w-full max-w-xs">
              <div
                className="h-full bg-green-500 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>

        <button className="flex-shrink-0 text-muted-foreground">
          {collapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {/* Items */}
      {!collapsed && phase.items.length > 0 && (
        <div className="border-t border-border pb-1">
          {phase.items.map((item) => item.isSection ? (
            <div key={item.id} className="flex items-center gap-2 px-4 py-1.5 mt-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex-1 min-w-0">
                {item.name}
              </span>
              {(() => { const r = sectionRanges.get(item.id); return r && (r.startDate || r.endDate) ? <DateBadge startDate={r.startDate} endDate={r.endDate} done={false} variant="plain" /> : null; })()}
            </div>
          ) : (
            <div key={item.id}>
              <div className={`flex items-center gap-3 ${indentedIds.has(item.id) ? "pl-8" : "px-4"} pr-4 py-2.5 ${item.done ? "opacity-50" : ""}`}>
                <div className={`flex-shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                  item.done ? "bg-green-500 border-green-500 text-white" : "border-muted-foreground"
                }`}>
                  {item.done && <Check size={8} />}
                </div>
                <span className={`flex-1 min-w-0 text-sm ${item.done ? "line-through text-muted-foreground" : ""}`}>
                  {item.name}
                </span>
                {(item.startDate || item.endDate) && (
                  <span className="flex-shrink-0">
                    <DateBadge startDate={item.startDate} endDate={item.endDate} done={item.done} />
                  </span>
                )}
              </div>
              {item.description && (
                <p className={`text-xs text-muted-foreground pb-1.5 ${indentedIds.has(item.id) ? "pl-[4.25rem]" : "pl-11"} pr-4`}>{item.description}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {!collapsed && phase.items.length === 0 && (
        <div className="border-t border-border px-4 py-3">
          <p className="text-xs text-muted-foreground">{t.share.scheduleNoItems}</p>
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────

export default function ClientScheduleView({ projectId }: { projectId: string }) {
  const t = useT();
  const [phases, setPhases] = useState<SchedulePhase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/client/${projectId}/schedule`)
      .then(async (res) => {
        if (!res.ok) { setError(t.share.scheduleAccessError); return; }
        setPhases(await res.json());
      })
      .catch(() => setError(t.share.scheduleLoadError))
      .finally(() => setLoading(false));
  }, [projectId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
        <Loader2 size={18} className="animate-spin" />
        <span className="text-sm">{t.share.scheduleLoading}</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  const totalItems = phases.reduce((s, p) => s + p.items.filter((i) => !i.isSection).length, 0);
  const doneItems = phases.reduce((s, p) => s + p.items.filter((i) => !i.isSection && i.done).length, 0);
  const overallProgress = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0;

  return (
    <div className="px-4 sm:px-6 py-6 max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{t.share.scheduleTitle}</h1>
        {totalItems > 0 && (
          <span className="text-sm text-muted-foreground">{overallProgress}% {t.share.scheduleComplete}</span>
        )}
      </div>

      {/* Overall progress */}
      {totalItems > 0 && (
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 rounded-full transition-all duration-500"
            style={{ width: `${overallProgress}%` }}
          />
        </div>
      )}

      {phases.length === 0 ? (
        <div className="bg-card border border-border rounded-xl py-12 text-center">
          <p className="text-sm text-muted-foreground">{t.share.scheduleEmpty}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {phases.map((phase) => (
            <PhaseCard key={phase.id} phase={phase} />
          ))}
        </div>
      )}
    </div>
  );
}
