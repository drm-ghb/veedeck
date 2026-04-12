"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { User, Mail, Lock, Info, Sun, Moon, Monitor, Palette, Image as ImageIcon } from "lucide-react";
import { useTheme, type Theme } from "@/lib/theme";
import { UploadButton } from "@uploadthing/react";
import type { OurFileRouter } from "@/lib/uploadthing";

type BoolField =
  | "allowDirectStatusChange"
  | "allowClientComments"
  | "allowClientAcceptance"
  | "requireClientEmail"
  | "hideCommentCount"
  | "requirePinTitle"
  | "autoClosePinsOnAccept"
  | "autoArchiveOnAccept"
  | "notifyClientOnStatusChange"
  | "notifyClientOnReply"
  | "allowClientVersionRestore"
  | "showProjectTitle";

interface Props {
  initialName: string;
  initialEmail: string;
  initialAllowDirectStatusChange: boolean;
  initialAllowClientComments: boolean;
  initialAllowClientAcceptance: boolean;
  initialRequireClientEmail: boolean;
  initialHideCommentCount: boolean;
  initialRequirePinTitle: boolean;
  initialMaxPinsPerRender: number | null;
  initialAutoClosePinsOnAccept: boolean;
  initialAutoArchiveOnAccept: boolean;
  initialDefaultRenderStatus: string;
  initialDefaultRenderOrder: string;
  initialNotifyClientOnStatusChange: boolean;
  initialNotifyClientOnReply: boolean;
  initialAllowClientVersionRestore: boolean;
  initialShowProjectTitle: boolean;
  initialClientLogoUrl: string | null;
  initialClientWelcomeMessage: string | null;
  initialAccentColor: string | null;
}

const THEME_OPTIONS: { value: Theme; label: string; icon: React.ElementType }[] = [
  { value: "light",  label: "Jasny",     icon: Sun },
  { value: "dark",   label: "Ciemny",    icon: Moon },
  { value: "system", label: "Systemowy", icon: Monitor },
];

function ToggleSwitch({ checked, onToggle }: { checked: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`relative flex-shrink-0 w-11 h-6 rounded-full transition-colors focus:outline-none ${
        checked ? "bg-primary" : "bg-muted"
      }`}
      role="switch"
      aria-checked={checked}
      type="button"
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

function SettingRow({ label, description, checked, onToggle }: {
  label: string;
  description?: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <div>
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</p>
        {description && <p className="text-xs text-gray-400 mt-0.5">{description}</p>}
      </div>
      <ToggleSwitch checked={checked} onToggle={onToggle} />
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3">
      <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">{title}</h2>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

export function SettingsPage({
  initialName,
  initialEmail,
  initialAllowDirectStatusChange,
  initialAllowClientComments,
  initialAllowClientAcceptance,
  initialRequireClientEmail,
  initialHideCommentCount,
  initialRequirePinTitle,
  initialMaxPinsPerRender,
  initialAutoClosePinsOnAccept,
  initialAutoArchiveOnAccept,
  initialDefaultRenderStatus,
  initialDefaultRenderOrder,
  initialNotifyClientOnStatusChange,
  initialNotifyClientOnReply,
  initialAllowClientVersionRestore,
  initialShowProjectTitle,
  initialClientLogoUrl,
  initialClientWelcomeMessage,
  initialAccentColor,
}: Props) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  // Account
  const [name, setName] = useState(initialName);
  const [nameLoading, setNameLoading] = useState(false);
  const [email, setEmail] = useState(initialEmail);
  const [emailLoading, setEmailLoading] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Boolean settings
  const [bools, setBools] = useState<Record<BoolField, boolean>>({
    allowDirectStatusChange: initialAllowDirectStatusChange,
    allowClientComments: initialAllowClientComments,
    allowClientAcceptance: initialAllowClientAcceptance,
    requireClientEmail: initialRequireClientEmail,
    hideCommentCount: initialHideCommentCount,
    requirePinTitle: initialRequirePinTitle,
    autoClosePinsOnAccept: initialAutoClosePinsOnAccept,
    autoArchiveOnAccept: initialAutoArchiveOnAccept,
    notifyClientOnStatusChange: initialNotifyClientOnStatusChange,
    notifyClientOnReply: initialNotifyClientOnReply,
    allowClientVersionRestore: initialAllowClientVersionRestore,
    showProjectTitle: initialShowProjectTitle,
  });

  // Non-boolean settings
  const [maxPins, setMaxPins] = useState<string>(initialMaxPinsPerRender?.toString() ?? "");
  const [defaultStatus, setDefaultStatus] = useState(initialDefaultRenderStatus);
  const [defaultOrder, setDefaultOrder] = useState(initialDefaultRenderOrder);
  const [clientLogoUrl, setClientLogoUrl] = useState<string | null>(initialClientLogoUrl);
  const [welcomeMsg, setWelcomeMsg] = useState(initialClientWelcomeMessage ?? "");
  const [welcomeLoading, setWelcomeLoading] = useState(false);
  const [accentColor, setAccentColor] = useState(initialAccentColor ?? "#2563eb");

  async function patchUser(data: Record<string, unknown>) {
    const res = await fetch("/api/user", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res;
  }

  async function toggleBool(field: BoolField) {
    const next = !bools[field];
    const res = await patchUser({ [field]: next });
    if (res.ok) {
      setBools((s) => ({ ...s, [field]: next }));
      toast.success("Zapisano");
    } else {
      toast.error("Błąd podczas zapisywania");
    }
  }

  async function handleNameSave() {
    if (!name.trim()) return;
    setNameLoading(true);
    try {
      const res = await patchUser({ name: name.trim() });
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
      const res = await patchUser({ email: email.trim() });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Błąd podczas zapisywania");
        return;
      }
      toast.success("Email zaktualizowany. Zaloguj się ponownie, aby zobaczyć zmiany.");
      router.refresh();
    } finally {
      setEmailLoading(false);
    }
  }

  async function handlePasswordSave() {
    if (newPassword !== confirmPassword) { toast.error("Nowe hasła nie są identyczne"); return; }
    if (newPassword.length < 8) { toast.error("Nowe hasło musi mieć co najmniej 8 znaków"); return; }
    setPasswordLoading(true);
    try {
      const res = await fetch("/api/user/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Błąd podczas zmiany hasła"); return; }
      toast.success("Hasło zostało zmienione");
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
    } finally {
      setPasswordLoading(false);
    }
  }

  async function handleMaxPinsSave() {
    const val = maxPins === "" ? null : parseInt(maxPins, 10);
    if (maxPins !== "" && (isNaN(val as number) || (val as number) < 1)) {
      toast.error("Podaj liczbę większą od 0 lub pozostaw puste");
      return;
    }
    const res = await patchUser({ maxPinsPerRender: val });
    if (res.ok) toast.success("Zapisano");
    else toast.error("Błąd podczas zapisywania");
  }

  async function handleDefaultStatusChange(val: string) {
    setDefaultStatus(val);
    const res = await patchUser({ defaultRenderStatus: val });
    if (res.ok) toast.success("Zapisano");
    else toast.error("Błąd podczas zapisywania");
  }

  async function handleDefaultOrderChange(val: string) {
    setDefaultOrder(val);
    const res = await patchUser({ defaultRenderOrder: val });
    if (res.ok) toast.success("Zapisano");
    else toast.error("Błąd podczas zapisywania");
  }

  async function handleWelcomeSave() {
    setWelcomeLoading(true);
    try {
      const res = await patchUser({ clientWelcomeMessage: welcomeMsg.trim() || null });
      if (res.ok) toast.success("Zapisano");
      else toast.error("Błąd podczas zapisywania");
    } finally {
      setWelcomeLoading(false);
    }
  }

  async function handleAccentColorSave(color: string) {
    setAccentColor(color);
    await patchUser({ accentColor: color });
  }

  async function handleRemoveLogo() {
    const res = await patchUser({ clientLogoUrl: null });
    if (res.ok) { setClientLogoUrl(null); toast.success("Logo usunięte"); }
    else toast.error("Błąd podczas usuwania logo");
  }

  return (
    <div className="max-w-3xl space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Ustawienia</h1>
        <p className="text-sm text-gray-500 mt-1">Zarządzaj swoim kontem i preferencjami</p>
      </div>

      {/* ── Ustawienia konta ── */}
      <section className="space-y-4">
        <SectionHeader title="Ustawienia konta" />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <User size={16} className="text-gray-400" />
              <h3 className="font-semibold text-gray-800 dark:text-gray-200">Profil</h3>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-gray-600 dark:text-gray-400">Nazwa</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Twoje imię" onKeyDown={(e) => e.key === "Enter" && handleNameSave()} />
            </div>
            <Button onClick={handleNameSave} disabled={nameLoading || !name.trim() || name.trim() === initialName} size="sm">
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
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="twoj@email.com" onKeyDown={(e) => e.key === "Enter" && handleEmailSave()} />
            </div>
            <div className="flex items-start gap-2 text-xs text-gray-400 bg-muted rounded-lg px-3 py-2">
              <Info size={13} className="mt-0.5 flex-shrink-0" />
              <span>Zmiana wymaga ponownego zalogowania.</span>
            </div>
            <Button onClick={handleEmailSave} disabled={emailLoading || !email.trim() || email.trim() === initialEmail} size="sm">
              {emailLoading ? "Zapisywanie..." : "Zapisz"}
            </Button>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Lock size={16} className="text-gray-400" />
            <h3 className="font-semibold text-gray-800 dark:text-gray-200">Hasło</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm text-gray-600 dark:text-gray-400">Aktualne hasło</label>
              <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="••••••••" />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-gray-600 dark:text-gray-400">Nowe hasło</label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="min. 8 znaków" />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-gray-600 dark:text-gray-400">Powtórz nowe hasło</label>
              <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" onKeyDown={(e) => e.key === "Enter" && handlePasswordSave()} />
            </div>
          </div>
          <Button onClick={handlePasswordSave} disabled={passwordLoading || !currentPassword || !newPassword || !confirmPassword} size="sm">
            {passwordLoading ? "Zmienianie..." : "Zmień hasło"}
          </Button>
        </div>
      </section>

      {/* ── Uprawnienia klientów ── */}
      <section className="space-y-4">
        <SectionHeader title="Uprawnienia klientów" />

        <div className="bg-card border border-border rounded-2xl p-6 divide-y divide-border">
          <SettingRow
            label="Samodzielne cofanie akceptacji"
            description="Klient może bezpośrednio cofnąć status &quot;Zaakceptowany&quot; bez zatwierdzenia projektanta."
            checked={bools.allowDirectStatusChange}
            onToggle={() => toggleBool("allowDirectStatusChange")}
          />
          <SettingRow
            label="Komentowanie przez klienta"
            description="Klient może dodawać piny i komentarze do renderów."
            checked={bools.allowClientComments}
            onToggle={() => toggleBool("allowClientComments")}
          />
          <SettingRow
            label="Akceptacja przez klienta"
            description="Klient widzi przycisk &quot;Zaakceptuj&quot; i może samodzielnie zaakceptować render."
            checked={bools.allowClientAcceptance}
            onToggle={() => toggleBool("allowClientAcceptance")}
          />
          <SettingRow
            label="Wymagaj podania emaila przez klienta"
            description="Przed pierwszą wizytą klient podaje email (widoczny przy komentarzach)."
            checked={bools.requireClientEmail}
            onToggle={() => toggleBool("requireClientEmail")}
          />
          <SettingRow
            label="Ukryj licznik komentarzy"
            description="Klient nie widzi liczby pinów na liście renderów."
            checked={bools.hideCommentCount}
            onToggle={() => toggleBool("hideCommentCount")}
          />
          <SettingRow
            label="Samodzielne przywracanie wersji przez klienta"
            description="Klient może bezpośrednio przywrócić poprzednią wersję renderu. Gdy wyłączone — klient wysyła prośbę do projektanta."
            checked={bools.allowClientVersionRestore}
            onToggle={() => toggleBool("allowClientVersionRestore")}
          />
        </div>
      </section>

      {/* ── Komentarze i piny ── */}
      <section className="space-y-4">
        <SectionHeader title="Komentarze i piny" />

        <div className="bg-card border border-border rounded-2xl p-6 divide-y divide-border">
          <SettingRow
            label="Wymagaj tytułu pinu"
            description="Każdy pin musi mieć tytuł — pole &quot;Tytuł&quot; staje się obowiązkowe."
            checked={bools.requirePinTitle}
            onToggle={() => toggleBool("requirePinTitle")}
          />
          <SettingRow
            label="Automatyczne zamknięcie pinów przy akceptacji"
            description="Wszystkie otwarte piny zmieniają status na &quot;Gotowe&quot; gdy render zostanie zaakceptowany."
            checked={bools.autoClosePinsOnAccept}
            onToggle={() => toggleBool("autoClosePinsOnAccept")}
          />
          <SettingRow
            label="Automatyczne archiwizowanie przy akceptacji"
            description="Render jest archiwizowany po zaakceptowaniu przez klienta."
            checked={bools.autoArchiveOnAccept}
            onToggle={() => toggleBool("autoArchiveOnAccept")}
          />
          <div className="py-2">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Limit pinów na render</p>
                <p className="text-xs text-gray-400 mt-0.5">Maksymalna liczba pinów jaką klient może dodać do jednego renderu. Zostaw puste aby nie ograniczać.</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Input
                  type="number"
                  min={1}
                  value={maxPins}
                  onChange={(e) => setMaxPins(e.target.value)}
                  placeholder="∞"
                  className="w-20 text-sm"
                  onKeyDown={(e) => e.key === "Enter" && handleMaxPinsSave()}
                />
                <Button size="sm" onClick={handleMaxPinsSave} variant="outline">Zapisz</Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Nowe rendery ── */}
      <section className="space-y-4">
        <SectionHeader title="Nowe rendery" />

        <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Domyślny status nowych renderów</p>
              <p className="text-xs text-gray-400 mt-0.5">Status przypisywany automatycznie przy dodawaniu nowego renderu.</p>
            </div>
            <div className="flex gap-1.5 bg-muted rounded-lg p-1 flex-shrink-0">
              {(["REVIEW", "ACCEPTED"] as const).map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleDefaultStatusChange(val)}
                  className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${
                    defaultStatus === val
                      ? val === "ACCEPTED" ? "bg-green-500 text-white shadow-sm" : "bg-primary text-white shadow-sm"
                      : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  }`}
                >
                  {val === "REVIEW" ? "Do weryfikacji" : "Zaakceptowany"}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Domyślna kolejność renderów</p>
              <p className="text-xs text-gray-400 mt-0.5">Sposób sortowania renderów na widoku klienta.</p>
            </div>
            <div className="flex gap-1.5 bg-muted rounded-lg p-1 flex-shrink-0">
              {([["order", "Ręczna"], ["name", "Nazwa"], ["newest", "Najnowsze"]] as const).map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleDefaultOrderChange(val)}
                  className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${
                    defaultOrder === val
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Powiadomienia klientów ── */}
      <section className="space-y-4">
        <SectionHeader title="Powiadomienia klientów" />

        <div className="bg-card border border-border rounded-2xl p-6 divide-y divide-border">
          <SettingRow
            label="Powiadamiaj klienta o zmianie statusu"
            description="Klient otrzymuje powiadomienie w czasie rzeczywistym gdy projektant zmienia status renderu."
            checked={bools.notifyClientOnStatusChange}
            onToggle={() => toggleBool("notifyClientOnStatusChange")}
          />
          <SettingRow
            label="Powiadamiaj klienta o nowych odpowiedziach"
            description="Klient widzi toast gdy projektant odpowiada na jego komentarz."
            checked={bools.notifyClientOnReply}
            onToggle={() => toggleBool("notifyClientOnReply")}
          />
        </div>
      </section>

      {/* ── Wygląd dla klienta ── */}
      <section className="space-y-4">
        <SectionHeader title="Wygląd dla klienta" />

        <div className="bg-card border border-border rounded-2xl p-6 space-y-6">
          {/* Show project title */}
          <SettingRow
            label="Wyświetlaj nazwę projektu"
            description="Nazwa projektu jest widoczna obok logo i nazwy studia na stronie klienta."
            checked={bools.showProjectTitle}
            onToggle={() => toggleBool("showProjectTitle")}
          />

          {/* Logo */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <ImageIcon size={15} className="text-gray-400" />
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Logo firmy</p>
            </div>
            <p className="text-xs text-gray-400">Wyświetlane zamiast logo RenderFlow na stronie klienta.</p>
            {clientLogoUrl ? (
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={clientLogoUrl} alt="Logo" className="h-10 object-contain rounded border border-border" />
                <Button size="sm" variant="outline" onClick={handleRemoveLogo}>Usuń logo</Button>
              </div>
            ) : (
              <UploadButton<OurFileRouter, "logoUploader">
                endpoint="logoUploader"
                onClientUploadComplete={async (res) => {
                  const url = res?.[0]?.url;
                  if (url) {
                    await patchUser({ clientLogoUrl: url });
                    setClientLogoUrl(url);
                    toast.success("Logo zapisane");
                  }
                }}
                onUploadError={() => { toast.error("Błąd przesyłania logo"); }}
                appearance={{
                  button: "bg-primary text-primary-foreground hover:opacity-90 text-sm px-4 py-2 rounded-lg font-medium",
                  allowedContent: "text-xs text-gray-400",
                }}
              />
            )}
          </div>

          {/* Accent color */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Palette size={15} className="text-gray-400" />
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Kolor akcentu</p>
            </div>
            <p className="text-xs text-gray-400">Główny kolor brandu widoczny na stronie klienta.</p>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                onBlur={(e) => handleAccentColorSave(e.target.value)}
                className="w-10 h-10 rounded-lg border border-border cursor-pointer p-0.5"
              />
              <span className="text-sm text-gray-500 font-mono">{accentColor}</span>
              <Button size="sm" variant="outline" onClick={() => handleAccentColorSave(accentColor)}>Zapisz</Button>
            </div>
          </div>

          {/* Welcome message */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Wiadomość powitalna</p>
            <p className="text-xs text-gray-400">Tekst widoczny na stronie klienta przed listą pomieszczeń.</p>
            <Textarea
              value={welcomeMsg}
              onChange={(e) => setWelcomeMsg(e.target.value)}
              placeholder="np. Witaj! Poniżej znajdziesz rendery do akceptacji..."
              rows={3}
            />
            <Button size="sm" onClick={handleWelcomeSave} disabled={welcomeLoading}>
              {welcomeLoading ? "Zapisywanie..." : "Zapisz"}
            </Button>
          </div>
        </div>
      </section>

      {/* ── Ustawienia interfejsu ── */}
      <section className="space-y-4">
        <SectionHeader title="Ustawienia interfejsu" />

        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Palette size={16} className="text-gray-400" />
            <h3 className="font-semibold text-gray-800 dark:text-gray-200">Motyw interfejsu</h3>
          </div>
          <div className="flex gap-2">
            {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
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
