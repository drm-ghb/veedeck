"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { User, Mail, Lock, Info, Sun, Moon, Monitor, Palette } from "lucide-react";
import { useTheme, type Theme } from "@/lib/theme";

interface Props {
  initialName: string;
  initialEmail: string;
}

const THEME_OPTIONS: { value: Theme; label: string; icon: React.ElementType }[] = [
  { value: "light",  label: "Jasny",     icon: Sun },
  { value: "dark",   label: "Ciemny",    icon: Moon },
  { value: "system", label: "Systemowy", icon: Monitor },
];

export function SettingsPage({ initialName, initialEmail }: Props) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();

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
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Ustawienia konta</h1>
        <p className="text-sm text-gray-500 mt-1">Zarządzaj swoim profilem i danymi logowania</p>
      </div>

      {/* Imię */}
      <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <User size={18} className="text-gray-400" />
          <h2 className="font-semibold text-gray-800 dark:text-gray-200">Profil</h2>
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

      {/* Email */}
      <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Mail size={18} className="text-gray-400" />
          <h2 className="font-semibold text-gray-800 dark:text-gray-200">Adres email</h2>
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
          <span>Zmiana emaila wymaga ponownego zalogowania, aby była widoczna w nawigacji.</span>
        </div>
        <Button
          onClick={handleEmailSave}
          disabled={emailLoading || !email.trim() || email.trim() === initialEmail}
          size="sm"
        >
          {emailLoading ? "Zapisywanie..." : "Zapisz"}
        </Button>
      </div>

      {/* Hasło */}
      <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Lock size={18} className="text-gray-400" />
          <h2 className="font-semibold text-gray-800 dark:text-gray-200">Hasło</h2>
        </div>
        <div className="space-y-3">
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

      {/* Motyw */}
      <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Palette size={18} className="text-gray-400" />
          <h2 className="font-semibold text-gray-800 dark:text-gray-200">Motyw interfejsu</h2>
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
    </div>
  );
}
