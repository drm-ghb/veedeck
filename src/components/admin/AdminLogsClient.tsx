"use client";

import { useState } from "react";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  RefreshCw,
  Bot,
  ChevronDown,
  ChevronUp,
} from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";

interface LoginLog {
  id: string;
  email: string;
  userId: string | null;
  success: boolean;
  createdAt: string;
}

interface ActivityLog {
  id: string;
  level: string;
  action: string;
  message: string;
  userId: string | null;
  meta: string | null;
  createdAt: string;
}

interface AiLog {
  id: string;
  userId: string;
  userEmail: string;
  query: string;
  response: string;
  createdAt: string;
}

type Tab = "login" | "activity" | "ai";

export default function AdminLogsClient({
  loginLogs: initialLoginLogs,
  activityLogs: initialActivityLogs,
  aiLogs: initialAiLogs,
}: {
  loginLogs: LoginLog[];
  activityLogs: ActivityLog[];
  aiLogs: AiLog[];
}) {
  const t = useT();
  const [tab, setTab] = useState<Tab>("login");
  const [loginLogs, setLoginLogs] = useState(initialLoginLogs);
  const [activityLogs, setActivityLogs] = useState(initialActivityLogs);
  const [aiLogs, setAiLogs] = useState(initialAiLogs);
  const [loading, setLoading] = useState(false);
  const [expandedAiLog, setExpandedAiLog] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/logs");
      if (res.ok) {
        const data = await res.json();
        setLoginLogs(data.loginLogs);
        setActivityLogs(data.activityLogs);
        setAiLogs(data.aiLogs ?? []);
      }
    } catch {
      toast.error(t.admin.refreshError);
    } finally {
      setLoading(false);
    }
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleString("pl-PL", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }

  const levelIcon = (level: string) => {
    if (level === "error")
      return <XCircle size={14} className="text-red-400 shrink-0" />;
    if (level === "warn")
      return <AlertTriangle size={14} className="text-yellow-400 shrink-0" />;
    return <Info size={14} className="text-blue-400 shrink-0" />;
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: "login", label: t.admin.loginHistory },
    { key: "activity", label: t.admin.activityLogs },
    { key: "ai", label: t.admin.aiAssistantTab },
  ];

  return (
    <div>
      {/* Tabs + refresh */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1 bg-white/5 border border-white/8 rounded-lg p-1">
          {tabs.map((tb) => (
            <button
              key={tb.key}
              onClick={() => setTab(tb.key)}
              className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
                tab === tb.key
                  ? "bg-white/10 text-white font-medium"
                  : "text-white/40 hover:text-white/70"
              }`}
            >
              {tb.label}
            </button>
          ))}
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={refresh}
          disabled={loading}
          className="border-white/10 text-white/50 hover:text-white/80 hover:bg-white/5 bg-transparent"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          {t.admin.refresh}
        </Button>
      </div>

      {/* Login logs */}
      {tab === "login" && (
        <div className="bg-white/3 border border-white/8 rounded-xl overflow-hidden">
          <div className="grid grid-cols-[20px_1fr_180px_120px] gap-4 px-5 py-3 bg-white/3 border-b border-white/8 text-xs font-medium text-white/30 uppercase tracking-wide">
            <span></span>
            <span>{t.admin.emailCol}</span>
            <span>{t.admin.dateCol}</span>
            <span>{t.admin.statusCol}</span>
          </div>
          {loginLogs.length === 0 && (
            <p className="text-center text-white/30 py-12 text-sm">{t.admin.noLogs}</p>
          )}
          {loginLogs.map((log, i) => (
            <div
              key={log.id}
              className={`grid grid-cols-[20px_1fr_180px_120px] gap-4 px-5 py-3 items-center text-sm ${
                i !== loginLogs.length - 1 ? "border-b border-white/5" : ""
              }`}
            >
              <span>
                {log.success ? (
                  <CheckCircle2 size={14} className="text-green-400" />
                ) : (
                  <XCircle size={14} className="text-red-400" />
                )}
              </span>
              <span className="truncate text-white/70">{log.email}</span>
              <span className="text-white/30 text-xs">{formatDate(log.createdAt)}</span>
              <span
                className={`text-xs font-medium ${
                  log.success ? "text-green-400" : "text-red-400"
                }`}
              >
                {log.success ? t.admin.successLabel : t.admin.failedLabel}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Activity logs */}
      {tab === "activity" && (
        <div className="bg-white/3 border border-white/8 rounded-xl overflow-hidden">
          <div className="grid grid-cols-[20px_1fr_180px] gap-4 px-5 py-3 bg-white/3 border-b border-white/8 text-xs font-medium text-white/30 uppercase tracking-wide">
            <span></span>
            <span>{t.admin.eventCol}</span>
            <span>{t.admin.dateCol}</span>
          </div>
          {activityLogs.length === 0 && (
            <p className="text-center text-white/30 py-12 text-sm">{t.admin.noLogs}</p>
          )}
          {activityLogs.map((log, i) => (
            <div
              key={log.id}
              className={`grid grid-cols-[20px_1fr_180px] gap-4 px-5 py-3 items-start ${
                i !== activityLogs.length - 1 ? "border-b border-white/5" : ""
              }`}
            >
              <span className="mt-0.5">{levelIcon(log.level)}</span>
              <div className="min-w-0">
                <p className="text-sm text-white/70 truncate">{log.message}</p>
                <p className="text-xs text-white/30 font-mono">{log.action}</p>
              </div>
              <span className="text-white/30 text-xs">{formatDate(log.createdAt)}</span>
            </div>
          ))}
        </div>
      )}

      {/* AI Assistant logs */}
      {tab === "ai" && (
        <div className="bg-white/3 border border-white/8 rounded-xl overflow-hidden">
          <div className="grid grid-cols-[20px_180px_1fr_160px] gap-4 px-5 py-3 bg-white/3 border-b border-white/8 text-xs font-medium text-white/30 uppercase tracking-wide">
            <span></span>
            <span>{t.admin.aiUserCol}</span>
            <span>{t.admin.aiQueryCol}</span>
            <span>{t.admin.dateCol}</span>
          </div>
          {aiLogs.length === 0 && (
            <p className="text-center text-white/30 py-12 text-sm">{t.admin.aiNoLogs}</p>
          )}
          {aiLogs.map((log, i) => {
            const isExpanded = expandedAiLog === log.id;
            return (
              <div
                key={log.id}
                className={i !== aiLogs.length - 1 ? "border-b border-white/5" : ""}
              >
                <div className="grid grid-cols-[20px_180px_1fr_160px] gap-4 px-5 py-3 items-start">
                  <span className="mt-0.5">
                    <Bot size={14} className="text-purple-400 shrink-0" />
                  </span>
                  <span className="text-sm text-white/70 truncate">{log.userEmail}</span>
                  <div className="min-w-0">
                    <p className="text-sm text-white/70 line-clamp-2">{log.query}</p>
                    <button
                      onClick={() => setExpandedAiLog(isExpanded ? null : log.id)}
                      className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 mt-1 transition-colors"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp size={12} />
                          {t.admin.aiHideResponse}
                        </>
                      ) : (
                        <>
                          <ChevronDown size={12} />
                          {t.admin.aiShowResponse}
                        </>
                      )}
                    </button>
                  </div>
                  <span className="text-white/30 text-xs">{formatDate(log.createdAt)}</span>
                </div>
                {isExpanded && (
                  <div className="px-5 pb-4 ml-9">
                    <div className="bg-white/5 border border-white/8 rounded-lg p-3 text-sm text-white/60 whitespace-pre-wrap max-h-[300px] overflow-y-auto">
                      {log.response}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
