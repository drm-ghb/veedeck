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
          <li>{t.extension.step2} <code className="bg-muted px-1 rounded text-xs">chrome://extensions</code></li>
          <li><strong className="text-foreground">{t.extension.step3}</strong></li>
          <li><strong className="text-foreground">{t.extension.step4}</strong></li>
          <li>{t.extension.step5}</li>
        </ol>
      </div>
    </div>
  );
}
