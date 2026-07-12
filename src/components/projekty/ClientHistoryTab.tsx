"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Pin, MessageSquare, ShoppingCart, Check, X, RefreshCw, FileSearch,
  Eye, List, LogIn, ClipboardList, ChevronRight,
} from "lucide-react";

interface HistoryEvent {
  id: string;
  type: string;
  date: string;
  label: string;
  detail: string | null;
  actor: string | null;
  link: string | null;
  meta: Record<string, unknown>;
}

const TYPE_CONFIG: Record<string, { icon: React.ReactNode; color: string }> = {
  pin:              { icon: <Pin size={14} />,           color: "text-violet-500 bg-violet-50 dark:bg-violet-950/30" },
  chat_comment:     { icon: <MessageSquare size={14} />, color: "text-blue-500 bg-blue-50 dark:bg-blue-950/30" },
  list_comment:     { icon: <MessageSquare size={14} />, color: "text-blue-500 bg-blue-50 dark:bg-blue-950/30" },
  product_approved: { icon: <Check size={14} />,         color: "text-green-600 bg-green-50 dark:bg-green-950/30" },
  product_rejected: { icon: <X size={14} />,             color: "text-red-500 bg-red-50 dark:bg-red-950/30" },
  status_request:   { icon: <RefreshCw size={14} />,     color: "text-amber-500 bg-amber-50 dark:bg-amber-950/30" },
  version_request:  { icon: <ClipboardList size={14} />, color: "text-amber-500 bg-amber-50 dark:bg-amber-950/30" },
  survey_response:  { icon: <FileSearch size={14} />,    color: "text-indigo-500 bg-indigo-50 dark:bg-indigo-950/30" },
  render_view:      { icon: <Eye size={14} />,           color: "text-muted-foreground bg-muted" },
  list_view:        { icon: <List size={14} />,          color: "text-muted-foreground bg-muted" },
  login:            { icon: <LogIn size={14} />,         color: "text-muted-foreground bg-muted" },
  default:          { icon: <ShoppingCart size={14} />,  color: "text-muted-foreground bg-muted" },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("pl-PL", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function groupByDay(events: HistoryEvent[]) {
  const groups: { label: string; events: HistoryEvent[] }[] = [];
  let current: { label: string; events: HistoryEvent[] } | null = null;

  for (const ev of events) {
    const day = new Date(ev.date).toLocaleDateString("pl-PL", {
      day: "numeric", month: "long", year: "numeric",
    });
    if (!current || current.label !== day) {
      current = { label: day, events: [] };
      groups.push(current);
    }
    current.events.push(ev);
  }
  return groups;
}

export default function ClientHistoryTab({ apiUrl }: { apiUrl: string }) {
  const [events, setEvents] = useState<HistoryEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(apiUrl)
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((data) => setEvents(data.events ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [apiUrl]);

  if (loading) {
    return <div className="py-16 text-center text-sm text-muted-foreground">Ładowanie historii…</div>;
  }

  if (events.length === 0) {
    return (
      <div className="py-16 text-center text-muted-foreground">
        <Eye size={32} className="mx-auto mb-3 opacity-30" />
        <p className="text-sm font-medium">Brak aktywności klienta</p>
        <p className="text-xs mt-1">Aktywność pojawi się gdy klient zaloguje się i zacznie korzystać z projektu.</p>
      </div>
    );
  }

  const groups = groupByDay(events);

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <div key={group.label}>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 px-1">
            {group.label}
          </p>
          <div className="space-y-1">
            {group.events.map((ev) => {
              const cfg = TYPE_CONFIG[ev.type] ?? TYPE_CONFIG.default;
              const content = (
                <div className="flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors group">
                  <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-0.5 ${cfg.color}`}>
                    {cfg.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground leading-snug">{ev.label}</p>
                    {ev.detail && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{ev.detail}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      {ev.actor && (
                        <span className="text-xs text-muted-foreground">{ev.actor}</span>
                      )}
                      {ev.actor && <span className="text-muted-foreground/40 text-xs">·</span>}
                      <span className="text-xs text-muted-foreground">{formatDate(ev.date)}</span>
                    </div>
                  </div>
                  {ev.link && (
                    <ChevronRight size={14} className="flex-shrink-0 mt-1 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </div>
              );

              return ev.link ? (
                <Link key={ev.id} href={ev.link}>{content}</Link>
              ) : (
                <div key={ev.id}>{content}</div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
