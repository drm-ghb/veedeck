"use client";

import { useState } from "react";
import { CheckCircle2, XCircle, AlertTriangle, Info, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

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

type Tab = "login" | "activity";

export default function AdminLogsClient({
  loginLogs: initialLoginLogs,
  activityLogs: initialActivityLogs,
}: {
  loginLogs: LoginLog[];
  activityLogs: ActivityLog[];
}) {
  const [tab, setTab] = useState<Tab>("login");
  const [loginLogs, setLoginLogs] = useState(initialLoginLogs);
  const [activityLogs, setActivityLogs] = useState(initialActivityLogs);
  const [loading, setLoading] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/logs");
      if (res.ok) {
        const data = await res.json();
        setLoginLogs(data.loginLogs);
        setActivityLogs(data.activityLogs);
      }
    } catch {
      toast.error("Błąd odświeżania logów");
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
    if (level === "error") return <XCircle size={14} className="text-red-500 shrink-0" />;
    if (level === "warn") return <AlertTriangle size={14} className="text-yellow-500 shrink-0" />;
    return <Info size={14} className="text-blue-500 shrink-0" />;
  };

  return (
    <div>
      {/* Tabs + refresh */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          <button
            onClick={() => setTab("login")}
            className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
              tab === "login"
                ? "bg-background text-foreground shadow-sm font-medium"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Historia logowań
          </button>
          <button
            onClick={() => setTab("activity")}
            className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
              tab === "activity"
                ? "bg-background text-foreground shadow-sm font-medium"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Aktywność / błędy
          </button>
        </div>
        <Button size="sm" variant="outline" onClick={refresh} disabled={loading}>
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Odśwież
        </Button>
      </div>

      {/* Login logs */}
      {tab === "login" && (
        <div className="bg-white dark:bg-card border border-border rounded-xl overflow-hidden">
          <div className="grid grid-cols-[20px_1fr_180px_120px] gap-4 px-5 py-3 bg-muted/50 border-b border-border text-xs font-medium text-muted-foreground uppercase tracking-wide">
            <span></span>
            <span>Email</span>
            <span>Data</span>
            <span>Status</span>
          </div>
          {loginLogs.length === 0 && (
            <p className="text-center text-muted-foreground py-12 text-sm">Brak logów</p>
          )}
          {loginLogs.map((log, i) => (
            <div
              key={log.id}
              className={`grid grid-cols-[20px_1fr_180px_120px] gap-4 px-5 py-3 items-center text-sm ${
                i !== loginLogs.length - 1 ? "border-b border-border" : ""
              }`}
            >
              <span>
                {log.success ? (
                  <CheckCircle2 size={14} className="text-green-500" />
                ) : (
                  <XCircle size={14} className="text-red-500" />
                )}
              </span>
              <span className="truncate text-foreground">{log.email}</span>
              <span className="text-muted-foreground text-xs">{formatDate(log.createdAt)}</span>
              <span
                className={`text-xs font-medium ${
                  log.success ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                }`}
              >
                {log.success ? "Sukces" : "Nieudane"}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Activity logs */}
      {tab === "activity" && (
        <div className="bg-white dark:bg-card border border-border rounded-xl overflow-hidden">
          <div className="grid grid-cols-[20px_1fr_180px] gap-4 px-5 py-3 bg-muted/50 border-b border-border text-xs font-medium text-muted-foreground uppercase tracking-wide">
            <span></span>
            <span>Zdarzenie</span>
            <span>Data</span>
          </div>
          {activityLogs.length === 0 && (
            <p className="text-center text-muted-foreground py-12 text-sm">Brak logów</p>
          )}
          {activityLogs.map((log, i) => (
            <div
              key={log.id}
              className={`grid grid-cols-[20px_1fr_180px] gap-4 px-5 py-3 items-start ${
                i !== activityLogs.length - 1 ? "border-b border-border" : ""
              }`}
            >
              <span className="mt-0.5">{levelIcon(log.level)}</span>
              <div className="min-w-0">
                <p className="text-sm text-foreground truncate">{log.message}</p>
                <p className="text-xs text-muted-foreground font-mono">{log.action}</p>
              </div>
              <span className="text-muted-foreground text-xs">{formatDate(log.createdAt)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
