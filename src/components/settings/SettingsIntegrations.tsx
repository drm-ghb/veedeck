"use client";

import { useEffect, useState } from "react";
import { Check, Link2, Loader2 } from "@/components/ui/icons";
import { toast } from "sonner";

export default function SettingsIntegrations() {
  const [googleConnected, setGoogleConnected] = useState<boolean | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);

  useEffect(() => {
    fetch("/api/auth/google/status")
      .then(async (r) => { if (r.ok) setGoogleConnected((await r.json()).connected); })
      .catch(() => setGoogleConnected(false));
  }, []);

  async function disconnectGoogle() {
    setDisconnecting(true);
    try {
      const r = await fetch("/api/auth/google/disconnect", { method: "POST" });
      if (r.ok) { setGoogleConnected(false); toast.success("Google Calendar odłączony"); }
      else toast.error("Nie udało się odłączyć");
    } finally {
      setDisconnecting(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Integracje</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Połącz veedeck z zewnętrznymi narzędziami, których używasz na co dzień.
        </p>
      </div>

      <div className="space-y-3">
        {/* Google Calendar */}
        <div className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logos/google-calendar.svg" alt="Google Calendar" className="w-6 h-6 object-contain" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Google Calendar</span>
              {googleConnected && (
                <span className="flex items-center gap-0.5 text-[10px] font-semibold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950 px-1.5 py-0.5 rounded-full">
                  <Check size={10} />
                  Połączone
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Synchronizuj terminy i spotkania z kalendarzem Google.</p>
          </div>
          {googleConnected === null ? (
            <Loader2 size={16} className="animate-spin text-muted-foreground shrink-0" />
          ) : googleConnected ? (
            <button
              onClick={disconnectGoogle}
              disabled={disconnecting}
              className="shrink-0 px-3 py-1.5 text-xs font-medium rounded-lg border border-border text-muted-foreground hover:text-destructive hover:border-destructive transition-colors disabled:opacity-50"
            >
              {disconnecting ? "Odłączanie…" : "Odłącz"}
            </button>
          ) : (
            <a
              href="/api/auth/google"
              className="shrink-0 px-3 py-1.5 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
            >
              Połącz
            </a>
          )}
        </div>

        {/* Pinterest */}
        <div className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logos/pinterest.svg" alt="Pinterest" className="w-6 h-6 object-contain" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Pinterest</span>
              <span className="text-[10px] font-semibold text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">Wkrótce</span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Importuj tablice i piny jako inspiracje do projektów.</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
        <Link2 size={13} className="shrink-0" />
        <span>Masz pomysł na integrację?{" "}
          <button
            onClick={() => window.dispatchEvent(new CustomEvent("open-help-widget", { detail: { tab: "contact" } }))}
            className="text-primary hover:underline"
          >
            Napisz do nas
          </button>.
        </span>
      </div>
    </div>
  );
}
