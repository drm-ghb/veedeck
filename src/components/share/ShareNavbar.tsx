"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Grid2x2, Settings, Sun, Moon, Monitor, UserRound } from "lucide-react";
import { useTheme, type Theme } from "@/lib/theme";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";

interface ShareNavbarProps {
  backHref?: string;
  backLabel?: string;
  clientLogoUrl?: string | null;
  designerName?: string | null;
  listToken?: string;
  projectShareToken?: string;
}

export default function ShareNavbar({ backHref, backLabel, clientLogoUrl, designerName, listToken, projectShareToken }: ShareNavbarProps) {
  const t = useT();
  const { theme, setTheme } = useTheme();

  const THEME_OPTIONS: { value: Theme; label: string; Icon: React.ElementType }[] = [
    { value: "light", label: t.theme.light, Icon: Sun },
    { value: "dark", label: t.theme.dark, Icon: Moon },
    { value: "system", label: t.theme.system, Icon: Monitor },
  ];
  const [authorName, setAuthorName] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [nameInput, setNameInput] = useState("");

  useEffect(() => {
    if (!projectShareToken) return;
    const saved = localStorage.getItem(`veedeck-author-${projectShareToken}`) || "";
    setAuthorName(saved);
    setNameInput(saved);

    function onStorage(e: StorageEvent) {
      if (e.key === `veedeck-author-${projectShareToken}`) {
        setAuthorName(e.newValue || "");
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [projectShareToken]);

  function saveSettings() {
    const name = nameInput.trim();
    if (projectShareToken) localStorage.setItem(`veedeck-author-${projectShareToken}`, name);
    setAuthorName(name);
    setSettingsOpen(false);
  }

  return (
    <>
      <nav>
        <div className="px-3 sm:px-6 flex items-center justify-between py-3 gap-4">
          {/* Left: back icon + logo */}
          <div className="flex items-center gap-3 shrink-0">
            {backHref && (
              <Link
                href={backHref}
                title={backLabel ?? t.share.home}
                className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-md hover:bg-muted"
              >
                <Grid2x2 size={18} />
              </Link>
            )}
            <div className="flex items-center gap-2.5">
              {clientLogoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={clientLogoUrl} alt="Logo" className="h-8 object-contain" />
              )}
              <span className="text-2xl font-bold">
                {designerName ?? "veedeck"}
              </span>
            </div>
          </div>

          {/* Right: client label */}
          <div className="flex items-center gap-3">
            {authorName && (
              <span className="hidden sm:flex items-center gap-1.5 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Panel klienta:</span>
                {authorName}
              </span>
            )}
          </div>
        </div>
      </nav>

      {/* Settings dialog */}
      {settingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setSettingsOpen(false)}>
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm space-y-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold">{t.nav.settings}</h2>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <UserRound size={16} className="text-gray-400" />
                <span className="font-medium text-sm">{t.share.identity}</span>
              </div>
              <p className="text-xs text-muted-foreground">{t.share.identityDesc}</p>
              <Input
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder={t.share.yourName}
                onKeyDown={(e) => e.key === "Enter" && saveSettings()}
                autoFocus
              />
            </div>

            <div className="space-y-3">
              <span className="font-medium text-sm">{t.theme.label}</span>
              <div className="flex gap-2">
                {THEME_OPTIONS.map(({ value, label, Icon }) => (
                  <button
                    key={value}
                    onClick={() => setTheme(value)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm border transition-colors ${
                      theme === value ? "bg-primary text-primary-foreground border-primary" : "border-border text-foreground hover:bg-muted"
                    }`}
                  >
                    <Icon size={14} />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setSettingsOpen(false)}>{t.common.cancel}</Button>
              <Button size="sm" onClick={saveSettings}>{t.common.save}</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
