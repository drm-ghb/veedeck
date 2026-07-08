"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Copy, RefreshCw, Trash2, Eye, EyeOff, Puzzle } from "@/components/ui/icons";
import { useT } from "@/lib/i18n";

interface Props {
  initialKey: string | null;
}

export function SettingsExtension({ initialKey }: Props) {
  const t = useT();
  const [apiKey, setApiKey] = useState<string | null>(initialKey);
  const [revealed, setRevealed] = useState(false);
  const [loading, setLoading] = useState(false);

  const maskedKey = apiKey ? apiKey.slice(0, 8) + "••••••••••••••••••••••••••••" : null;

  async function generateKey() {
    setLoading(true);
    try {
      const method = apiKey ? "POST" : "GET";
      const res = await fetch("/api/extension/key", { method });
      const data = await res.json();
      setApiKey(data.key);
      setRevealed(true);
      toast.success(apiKey ? t.extension.keyRegenerated : t.extension.keyGenerated);
    } catch {
      toast.error(t.extension.keyGenerateError);
    } finally {
      setLoading(false);
    }
  }

  async function revokeKey() {
    if (!confirm(t.extension.revokeConfirm)) return;
    setLoading(true);
    try {
      await fetch("/api/extension/key", { method: "DELETE" });
      setApiKey(null);
      setRevealed(false);
      toast.success(t.extension.keyRevoked);
    } catch {
      toast.error(t.extension.keyRevokeError);
    } finally {
      setLoading(false);
    }
  }

  function copyKey() {
    if (!apiKey) return;
    navigator.clipboard.writeText(apiKey);
    toast.success(t.extension.keyCopied);
  }

  const CHROME_STORE_URL =
    "https://chromewebstore.google.com/detail/veepick/ahnalaifooponobepoccpecdhdkgalmd?hl=pl";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Puzzle size={20} className="text-primary" />
          {t.extension.title}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {t.extension.desc}
        </p>
      </div>

      {/* Browser download buttons */}
      <div className="border border-border rounded-xl p-5 space-y-3 bg-card">
        <p className="text-sm font-medium text-foreground">Pobierz wtyczkę</p>
        <div className="flex flex-wrap gap-2">
          {/* Chrome — active */}
          <a
            href={CHROME_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 h-9 px-4 rounded-lg border border-border bg-background text-sm font-medium text-foreground hover:bg-muted transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <circle cx="12" cy="12" r="4.5" fill="#4285F4"/>
              <path d="M12 7.5h9.196A10.5 10.5 0 0 0 2.804 7.5H12Z" fill="#EA4335"/>
              <path d="M7.5 12a4.5 4.5 0 0 0 2.25 3.897L4.996 6.75A10.47 10.47 0 0 0 1.5 12c0 5.799 4.701 10.5 10.5 10.5v-4.5A5.5 5.5 0 0 1 7.5 12Z" fill="#34A853"/>
              <path d="M12 7.5a4.5 4.5 0 0 1 3.897 6.75l4.754-8.247A10.47 10.47 0 0 1 22.5 12c0 5.799-4.701 10.5-10.5 10.5v-4.5A5.5 5.5 0 0 0 17.5 12H12V7.5Z" fill="#FBBC05"/>
            </svg>
            Chrome Web Store
          </a>

          {/* Opera — disabled */}
          <button
            disabled
            className="inline-flex items-center gap-2 h-9 px-4 rounded-lg border border-border bg-background text-sm font-medium text-muted-foreground opacity-40 cursor-not-allowed"
            title="Wkrótce dostępne"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <circle cx="12" cy="12" r="10.5" fill="#FF1B2D"/>
              <ellipse cx="12" cy="12" rx="5.5" ry="10.5" fill="#FF6A6A"/>
              <ellipse cx="12" cy="12" rx="4" ry="10.5" fill="#FF1B2D"/>
              <path d="M7.5 12c0-3.59 1.567-6.72 4-8.65v17.3c-2.433-1.93-4-5.06-4-8.65Z" fill="#9B0000"/>
              <ellipse cx="12" cy="12" rx="4" ry="8" fill="none" stroke="white" stroke-width="0"/>
            </svg>
            Opera
          </button>

          {/* Edge — disabled */}
          <button
            disabled
            className="inline-flex items-center gap-2 h-9 px-4 rounded-lg border border-border bg-background text-sm font-medium text-muted-foreground opacity-40 cursor-not-allowed"
            title="Wkrótce dostępne"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M21.8 15c-.8 2.2-2.3 4-4.3 5.1-1.4.8-3 1.2-4.7 1.2-5.3 0-9.5-4.1-9.5-9.3 0-2.7 1.2-5.2 3.2-6.9A9.3 9.3 0 0 1 12 3c5.2 0 9.5 4.2 9.5 9.3 0 .9-.1 1.8-.4 2.7H9.2c.4 1.7 1.9 3 3.8 3 1.3 0 2.5-.6 3.3-1.5l5.5-.5Z" fill="#0078D4"/>
              <path d="M3.4 17.2A9.3 9.3 0 0 0 12 21.3c1.7 0 3.3-.4 4.7-1.2 2-1.1 3.5-2.9 4.3-5.1l-5.5.5c-.8.9-2 1.5-3.3 1.5-1.9 0-3.4-1.3-3.8-3H21.4c.3-.9.4-1.8.4-2.7 0-5.1-4.3-9.3-9.5-9.3a9.3 9.3 0 0 0-5.5 1.8A9.27 9.27 0 0 0 3.5 12c0 1.8.5 3.5 1.4 4.9l-1.5.3Z" fill="#0F78D4"/>
              <path d="M9.2 15h12.2c.3-.9.4-1.8.4-2.7 0-5.1-4.3-9.3-9.5-9.3a9.3 9.3 0 0 0-5.8 2C8 6.6 9.5 8.3 9.5 10.3c0 .8-.2 1.5-.3 2.2h0" fill="#1997F3"/>
            </svg>
            Edge
          </button>

          {/* Firefox — disabled */}
          <button
            disabled
            className="inline-flex items-center gap-2 h-9 px-4 rounded-lg border border-border bg-background text-sm font-medium text-muted-foreground opacity-40 cursor-not-allowed"
            title="Wkrótce dostępne"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <circle cx="12" cy="12" r="10.5" fill="#FF9500"/>
              <circle cx="12" cy="12" r="7" fill="#FF6000"/>
              <circle cx="12" cy="12" r="4" fill="#FF3750"/>
              <circle cx="12" cy="12" r="2" fill="#FF6000"/>
            </svg>
            Firefox
          </button>
        </div>
        <p className="text-xs text-muted-foreground">Opera, Edge i Firefox — wkrótce dostępne.</p>
      </div>

      {/* API Key section */}
      <div className="border border-border rounded-xl p-5 space-y-4 bg-card">
        <div>
          <p className="text-sm font-medium text-foreground">{t.extension.apiKeyTitle}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t.extension.apiKeyDesc}
          </p>
        </div>

        {apiKey ? (
          <div className="flex items-center gap-2">
            {/* Key display */}
            <div className="flex-1 bg-muted rounded-lg px-3 py-2 font-mono text-sm text-foreground select-all break-all">
              {revealed ? apiKey : maskedKey}
            </div>
            {/* Reveal */}
            <button
              onClick={() => setRevealed((v) => !v)}
              className="p-2 text-muted-foreground hover:text-foreground transition-colors"
              title={revealed ? t.extension.hideKey : t.extension.showKey}
              type="button"
            >
              {revealed ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
            {/* Copy */}
            <button
              onClick={copyKey}
              className="p-2 text-muted-foreground hover:text-foreground transition-colors"
              title={t.extension.copyKey}
              type="button"
            >
              <Copy size={16} />
            </button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">
            {t.extension.noKey}
          </p>
        )}

        <div className="flex gap-2 flex-wrap">
          <Button onClick={generateKey} disabled={loading} size="sm" variant={apiKey ? "outline" : "default"}>
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            {apiKey ? t.extension.regenerateKey : t.extension.generateKey}
          </Button>
          {apiKey && (
            <Button onClick={revokeKey} disabled={loading} size="sm" variant="ghost" className="text-destructive hover:text-destructive">
              <Trash2 size={14} />
              {t.extension.revokeKey}
            </Button>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="border border-border rounded-xl p-5 space-y-3 bg-card">
        <p className="text-sm font-medium text-foreground">{t.extension.howToInstall}</p>
        <ol className="text-sm text-muted-foreground space-y-1.5 list-decimal list-inside">
          <li>{t.extension.step1}</li>
          <li>{t.extension.step2}</li>
          <li><strong className="text-foreground">{t.extension.step3}</strong></li>
          <li>
            <strong className="text-foreground">{t.extension.step4}</strong>
            <div className="mt-2">
              <img
                src="/veepick-ss1.png"
                alt="Panel ustawień wtyczki veepick — pole Klucz API"
                className="rounded-lg border border-border max-w-xs w-full"
              />
            </div>
          </li>
          <li>{t.extension.step5}</li>
        </ol>
      </div>
    </div>
  );
}
