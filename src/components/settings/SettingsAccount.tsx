"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Trash2, CalendarDays } from "@/components/ui/icons";
import { useT } from "@/lib/i18n";
import { signOut } from "next-auth/react";
import { SectionHeader } from "./SettingsShared";

interface Props {
  isDesigner: boolean;
  createdAt: string; // ISO string
}

export function SettingsAccount({ isDesigner, createdAt }: Props) {
  const router = useRouter();
  const t = useT();
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const joinDate = new Date(createdAt).toLocaleDateString("pl-PL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  async function handleDeleteAccount() {
    setDeleteLoading(true);
    const res = await fetch("/api/user", { method: "DELETE" });
    if (!res.ok) {
      toast.error(t.settings.deleteAccountError);
      setDeleteLoading(false);
      return;
    }
    await signOut({ redirect: false });
    router.push("/login");
  }

  return (
    <div className="max-w-3xl space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Konto</h1>
        <p className="text-sm text-gray-500 mt-1">Informacje o koncie i opcje usunięcia.</p>
      </div>

      {/* Data dołączenia */}
      <section className="space-y-4">
        <SectionHeader title="Informacje o koncie" />
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <CalendarDays size={18} className="text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Data dołączenia</p>
              <p className="text-base font-semibold text-foreground mt-0.5">{joinDate}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Strefa zagrożenia */}
      {isDesigner && (
        <section className="space-y-4">
          <SectionHeader title={t.settings.dangerZone} />
          <div className="border border-destructive/40 rounded-2xl p-6 space-y-4">
            <div className="flex items-start gap-3">
              <Trash2 size={18} className="text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">{t.settings.deleteAccount}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t.settings.deleteAccountDesc}</p>
              </div>
            </div>
            {!deleteConfirm ? (
              <Button variant="outline" size="sm" className="border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground" onClick={() => setDeleteConfirm(true)}>
                {t.settings.deleteAccount}
              </Button>
            ) : (
              <div className="space-y-3">
                <p className="text-sm font-medium text-destructive">{t.settings.deleteAccountConfirm}</p>
                <div className="flex gap-2">
                  <Button variant="destructive" size="sm" onClick={handleDeleteAccount} disabled={deleteLoading}>
                    {deleteLoading ? t.settings.deleting : t.settings.deleteAccountBtn}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setDeleteConfirm(false)} disabled={deleteLoading}>
                    {t.common.cancel}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
