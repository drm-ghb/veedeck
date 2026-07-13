"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";
import { patchUser, SectionHeader, ToggleSwitch } from "./SettingsShared";

interface Props {
  initialEmailNotifEnabled: boolean;
  initialEmailNotifModules: string[];
  initialEmailNotifDigestInterval: number;
}

const DIGEST_INTERVALS = [15, 30, 60, 120, 240, 1440] as const;
const ALL_MODULES = ["renderflow", "listy", "dyskusje", "ankiety", "wykonawcy"];

export function SettingsGeneral({ initialEmailNotifEnabled, initialEmailNotifModules, initialEmailNotifDigestInterval }: Props) {
  const t = useT();
  const [emailNotifEnabled, setEmailNotifEnabled] = useState(initialEmailNotifEnabled);
  const [emailNotifModules, setEmailNotifModules] = useState<string[]>(
    initialEmailNotifModules.length > 0 ? initialEmailNotifModules : ALL_MODULES
  );
  const [emailNotifDigestInterval, setEmailNotifDigestInterval] = useState(initialEmailNotifDigestInterval);
  const [emailNotifLoading, setEmailNotifLoading] = useState(false);

  return (
    <div className="max-w-3xl space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t.settings.general}</h1>
        <p className="text-sm text-gray-500 mt-1">{t.settings.generalDesc}</p>
      </div>

      <section className="space-y-4">
        <SectionHeader title={t.settings.emailNotif} />
        <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-foreground">{t.settings.emailNotif}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{t.settings.emailNotifDesc}</p>
            </div>
            <ToggleSwitch
              checked={emailNotifEnabled}
              onToggle={async () => {
                const next = !emailNotifEnabled;
                setEmailNotifEnabled(next);
                setEmailNotifLoading(true);
                try {
                  const patch: Record<string, unknown> = { emailNotifEnabled: next };
                  // First time enabling — save all modules to DB
                  if (next && initialEmailNotifModules.length === 0) {
                    patch.emailNotifModules = ALL_MODULES;
                  }
                  await patchUser(patch);
                }
                finally { setEmailNotifLoading(false); }
              }}
            />
          </div>

          {emailNotifEnabled && (
            <div className="space-y-3 pt-1 border-t border-border">
              <p className="text-xs text-muted-foreground pt-1">{t.settings.emailNotifDigestDesc}</p>

              <div className="flex items-center justify-between gap-4">
                <p className="text-sm font-medium text-foreground">{t.settings.emailNotifDigestInterval}</p>
                <select
                  value={emailNotifDigestInterval}
                  disabled={emailNotifLoading}
                  onChange={async (e) => {
                    const val = Number(e.target.value);
                    setEmailNotifDigestInterval(val);
                    setEmailNotifLoading(true);
                    try { await patchUser({ emailNotifDigestInterval: val }); }
                    catch { toast.error(t.settings.saveError); }
                    finally { setEmailNotifLoading(false); }
                  }}
                  className="text-sm rounded-lg border border-border bg-background px-3 py-1.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {DIGEST_INTERVALS.map((interval) => (
                    <option key={interval} value={interval}>
                      {(t.settings.emailNotifDigestIntervalOptions as Record<number, string>)[interval]}
                    </option>
                  ))}
                </select>
              </div>

              <p className="text-xs text-muted-foreground pt-1">{t.settings.emailNotifModuleSelect}</p>
              {[
                { slug: "renderflow", label: t.nav.renderflow, desc: t.settings.emailNotifRenderflowDesc },
                { slug: "listy", label: t.nav.lists, desc: t.settings.emailNotifListsDesc },
                { slug: "dyskusje", label: t.nav.discussions, desc: t.settings.emailNotifDyskusjeDesc },
                { slug: "ankiety", label: t.nav.surveys, desc: t.settings.emailNotifAnkietyDesc },
                { slug: "wykonawcy", label: t.nav.contractors, desc: t.settings.emailNotifWykonawcyDesc },
              ].map(({ slug, label, desc }) => {
                const checked = emailNotifModules.includes(slug);
                return (
                  <label key={slug} className="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={emailNotifLoading}
                      onChange={async () => {
                        const next = checked
                          ? emailNotifModules.filter((m) => m !== slug)
                          : [...emailNotifModules, slug];
                        setEmailNotifModules(next);
                        setEmailNotifLoading(true);
                        try { await patchUser({ emailNotifModules: next }); }
                        catch { toast.error(t.settings.saveError); }
                        finally { setEmailNotifLoading(false); }
                      }}
                      className="mt-0.5 w-4 h-4 rounded accent-primary"
                    />
                    <div>
                      <p className="text-sm font-medium text-foreground">{label}</p>
                      <p className="text-xs text-muted-foreground">{desc}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
