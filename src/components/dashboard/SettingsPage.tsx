"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { User, Mail, Lock, Info, Sun, Moon, Monitor, Palette, Users } from "lucide-react";
import { useTheme, type Theme } from "@/lib/theme";

interface Props {
  initialName: string;
  initialEmail: string;
  initialAllowDirectStatusChange: boolean;
}

const THEME_OPTIONS: { value: Theme; label: string; icon: React.ElementType }[] = [
  { value: "light",  label: "Jasny",     icon: Sun },
  { value: "dark",   label: "Ciemny",    icon: Moon },
  { value: "system", label: "Systemowy", icon: Monitor },
];

export function SettingsPage({ initialName, initialEmail, initialAllowDirectStatusChange }: Props) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [allowDirectStatusChange, setAllowDirectStatusChange] = useState(initialAllowDirectStatusChange);

  const [name, setName] = useState(initialName);
  const [nameLoading, setNameLoading] = useState(false);

  const [email, setEmail] = useState(initialEmail);
  const [emailLoading, setEmailLoading] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  async function handleNameSave() {
    if (!name.trim()) return;
    setNameLoading(true);
    try {
      const res = await fetch("/api/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Błąd podczas zapisywania");
        return;
      }
      toast.success("Imię zostało zaktualizowane");
      router.refresh();
    } finally {
      setNameLoading(false);
    }
  }

  async function handleEmailSave() {
    if (!email.trim()) return;
    setEmailLoading(true);
    try {
      const res = await fetch("/api/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Błąd podczas zapisywania");
        return;
      }
      toast.success("Email został zaktualizowany. Zaloguj się ponownie, aby zobaczyć zmiany.");
      router.refresh();
    } finally {
      setEmailLoading(false);
    }
  }

  async function handlePasswordSave() {
    if (newPassword !== confirmPassword) {
      toast.error("Nowe hasła nie są identyczne");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("Nowe hasło musi mieć co najmniej 8 znaków");
      return;
    }
    setPasswordLoading(true);
    try {
      const res = await fetch("/api/user/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Błąd podczas zmiany hasła");
        return;
      }
      toast.success("Hasło zostało zmienione");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } finally {
      setPasswordLoading(false);
    }
  }

  return (
    <div className="max-w-3xl space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Ustawienia</h1>
        <p className="text-sm text-gray-500 mt-1">Zarządzaj swoim kontem i preferencjami</p>
      </div>

      {/* ── Ustawienia konta ── */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Ustawienia konta</h2>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Profil + Email — 2 kolumny, 1 wiersz */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <User size={16} className="text-gray-400" />
              <h3 className="font-semibold text-gray-800 dark:text-gray-200">Profil</h3>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-gray-600 dark:text-gray-400">Imię wyświetlane</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Twoje imię"
                onKeyDown={(e) => e.key === "Enter" && handleNameSave()}
              />
            </div>
            <Button
              onClick={handleNameSave}
              disabled={nameLoading || !name.trim() || name.trim() === initialName}
              size="sm"
            >
              {nameLoading ? "Zapisywanie..." : "Zapisz"}
            </Button>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Mail size={16} className="text-gray-400" />
              <h3 className="font-semibold text-gray-800 dark:text-gray-200">Adres email</h3>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-gray-600 dark:text-gray-400">Email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="twoj@email.com"
                onKeyDown={(e) => e.key === "Enter" && handleEmailSave()}
              />
            </div>
            <div className="flex items-start gap-2 text-xs text-gray-400 bg-muted rounded-lg px-3 py-2">
              <Info size={13} className="mt-0.5 flex-shrink-0" />
              <span>Zmiana wymaga ponownego zalogowania.</span>
            </div>
            <Button
              onClick={handleEmailSave}
              disabled={emailLoading || !email.trim() || email.trim() === initialEmail}
              size="sm"
            >
              {emailLoading ? "Zapisywanie..." : "Zapisz"}
            </Button>
          </div>
        </div>

        {/* Hasło — pełna szerokość */}
        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Lock size={16} className="text-gray-400" />
            <h3 className="font-semibold text-gray-800 dark:text-gray-200">Hasło</h3>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm text-gray-600 dark:text-gray-400">Aktualne hasło</label>
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-gray-600 dark:text-gray-400">Nowe hasło</label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="min. 8 znaków"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-gray-600 dark:text-gray-400">Powtórz nowe hasło</label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                onKeyDown={(e) => e.key === "Enter" && handlePasswordSave()}
              />
            </div>
          </div>
          <Button
            onClick={handlePasswordSave}
            disabled={passwordLoading || !currentPassword || !newPassword || !confirmPassword}
            size="sm"
          >
            {passwordLoading ? "Zmienianie..." : "Zmień hasło"}
          </Button>
        </div>
      </section>

      {/* ── Uprawnienia klientów ── */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Uprawnienia klientów</h2>
          <div className="flex-1 h-px bg-border" />
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Samodzielne cofanie akceptacji</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Zezwól klientom na bezpośrednie cofnięcie statusu &quot;Zaakceptowany&quot; → &quot;Do weryfikacji&quot; bez zatwierdzenia przez projektanta.
              </p>
            </div>
            <button
              onClick={async () => {
                const next = !allowDirectStatusChange;
                const res = await fetch("/api/user", {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ allowDirectStatusChange: next }),
                });
                if (res.ok) {
                  setAllowDirectStatusChange(next);
                  toast.success(next ? "Klienci mogą teraz samodzielnie cofać akceptacje" : "Cofanie akceptacji wymaga teraz zatwierdzenia projektanta");
                } else {
                  toast.error("Błąd podczas zapisywania ustawienia");
                }
              }}
              className={`relative flex-shrink-0 w-11 h-6 rounded-full transition-colors focus:outline-none ${
                allowDirectStatusChange ? "bg-blue-500" : "bg-gray-200 dark:bg-gray-700"
              }`}
              role="switch"
              aria-checked={allowDirectStatusChange}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  allowDirectStatusChange ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
          <div className="flex items-start gap-2 text-xs text-gray-400 bg-muted rounded-lg px-3 py-2">
            <Info size={13} className="mt-0.5 flex-shrink-0" />
            <span>
              {allowDirectStatusChange
                ? "Włączone — klient widzi przycisk \"Cofnij akceptację\" i może bezpośrednio zmienić status."
                : "Wyłączone — klient widzi \"Poproś o zmianę\", a projektant musi potwierdzić każdą prośbę."}
            </span>
          </div>
        </div>
      </section>

      {/* ── Ustawienia interfejsu ── */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Ustawienia interfejsu</h2>
          <div className="flex-1 h-px bg-border" />
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Palette size={16} className="text-gray-400" />
            <h3 className="font-semibold text-gray-800 dark:text-gray-200">Motyw interfejsu</h3>
          </div>
          <div className="flex gap-2">
            {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setTheme(value)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm border transition-colors ${
                  theme === value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-foreground hover:bg-muted"
                }`}
              >
                <Icon size={15} />
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
