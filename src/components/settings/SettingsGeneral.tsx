"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { User, Mail, Lock, Info, Sun, Moon, Monitor, Palette, Image as ImageIcon, Layers, ScrollText, Package, LayoutDashboard, PanelLeft, Globe, PictureInPicture } from "lucide-react";
import { useTheme, type Theme, type ColorTheme } from "@/lib/theme";
import { useT, useLang } from "@/lib/i18n";
import { UploadButton } from "@uploadthing/react";
import type { OurFileRouter } from "@/lib/uploadthing";
import { patchUser, SettingRow, SectionHeader, ToggleSwitch } from "./SettingsShared";

interface Props {
  initialName: string;
  initialEmail: string;
  initialShowProfileName: boolean;
  initialShowClientLogo: boolean;
  initialGlobalHiddenModules: string[];
  initialClientLogoUrl: string | null;
  initialClientWelcomeMessage: string | null;
  initialNavMode: string;
  initialColorTheme: ColorTheme;
}

export function SettingsGeneral({
  initialName,
  initialEmail,
  initialShowProfileName,
  initialShowClientLogo,
  initialGlobalHiddenModules,
  initialClientLogoUrl,
  initialClientWelcomeMessage,
  initialNavMode,
  initialColorTheme,
}: Props) {
  const router = useRouter();
  const { theme, setTheme, colorTheme, setColorTheme } = useTheme();
  const t = useT();
  const { lang, setLang } = useLang();

  const THEME_OPTIONS: { value: Theme; label: string; icon: React.ElementType }[] = [
    { value: "light", label: t.theme.light, icon: Sun },
    { value: "dark", label: t.theme.dark, icon: Moon },
    { value: "system", label: t.theme.system, icon: Monitor },
  ];

  const [name, setName] = useState(initialName);
  const [nameLoading, setNameLoading] = useState(false);
  const [email, setEmail] = useState(initialEmail);
  const [emailLoading, setEmailLoading] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  const [showProfileName, setShowProfileName] = useState(initialShowProfileName);
  const [showClientLogo, setShowClientLogo] = useState(initialShowClientLogo);
  const [globalHiddenModules, setGlobalHiddenModules] = useState<string[]>(initialGlobalHiddenModules);
  const [clientLogoUrl, setClientLogoUrl] = useState<string | null>(initialClientLogoUrl);
  const [welcomeMsg, setWelcomeMsg] = useState(initialClientWelcomeMessage ?? "");
  const [welcomeLoading, setWelcomeLoading] = useState(false);
const [navMode, setNavMode] = useState(initialNavMode);

  async function handleNameSave() {
    if (!name.trim()) return;
    setNameLoading(true);
    try {
      const res = await patchUser({ name: name.trim() });
      if (!res.ok) { const d = await res.json(); toast.error(d.error || t.settings.saveError); return; }
      toast.success(t.settings.nameUpdated);
      router.refresh();
    } finally { setNameLoading(false); }
  }

  async function handleEmailSave() {
    if (!email.trim()) return;
    setEmailLoading(true);
    try {
      const res = await patchUser({ email: email.trim() });
      if (!res.ok) { const d = await res.json(); toast.error(d.error || t.settings.saveError); return; }
      toast.success(t.settings.emailUpdated);
      router.refresh();
    } finally { setEmailLoading(false); }
  }

  async function handlePasswordSave() {
    if (newPassword !== confirmPassword) { toast.error(t.settings.passwordMismatch); return; }
    if (newPassword.length < 8) { toast.error(t.settings.passwordTooShort); return; }
    setPasswordLoading(true);
    try {
      const res = await fetch("/api/user/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || t.settings.passwordError); return; }
      toast.success(t.settings.passwordChanged);
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
    } finally { setPasswordLoading(false); }
  }

  async function toggleShowProfileName() {
    const next = !showProfileName;
    const res = await patchUser({ showProfileName: next });
    if (res.ok) { setShowProfileName(next); toast.success(t.settings.saved); }
    else toast.error(t.settings.saveError);
  }

  async function toggleShowClientLogo() {
    const next = !showClientLogo;
    const res = await patchUser({ showClientLogo: next });
    if (res.ok) { setShowClientLogo(next); toast.success(t.settings.saved); }
    else toast.error(t.settings.saveError);
  }

  async function toggleGlobalModule(slug: string) {
    const next = globalHiddenModules.includes(slug)
      ? globalHiddenModules.filter((m) => m !== slug)
      : [...globalHiddenModules, slug];
    const res = await patchUser({ globalHiddenModules: next });
    if (res.ok) { setGlobalHiddenModules(next); toast.success(t.settings.saved); }
    else toast.error(t.settings.saveError);
  }

  async function handleWelcomeSave() {
    setWelcomeLoading(true);
    try {
      const res = await patchUser({ clientWelcomeMessage: welcomeMsg.trim() || null });
      if (res.ok) toast.success(t.settings.saved);
      else toast.error(t.settings.saveError);
    } finally { setWelcomeLoading(false); }
  }

  async function handleNavModeChange(mode: string) {
    setNavMode(mode);
    const res = await patchUser({ navMode: mode });
    if (res.ok) { toast.success(t.settings.saved); router.refresh(); }
    else { setNavMode(navMode); toast.error(t.settings.saveError); }
  }

const COLOR_THEMES: {
    slug: ColorTheme;
    name: string;
    subtitle: string;
    // hardcoded hex for thumbnail previews (always light variant)
    sidebar: string;
    background: string;
    primary: string;
    accent: string;
  }[] = [
    { slug: "violet", name: "Violet", subtitle: "Indygo — domyślny", sidebar: "#EDEEF2", background: "#FFFFFF", primary: "#4F46E5", accent: "#A5B4FC" },
    { slug: "champagne", name: "Champagne Linen", subtitle: "Len i brąz", sidebar: "#F7F3EA", background: "#EEE9DF", primary: "#8B613C", accent: "#C2A878" },
    { slug: "obsidian", name: "Obsidian Gold", subtitle: "Złoto na czerni", sidebar: "#12110F", background: "#F7F5F0", primary: "#C7A46C", accent: "#8A6A3A" },
    { slug: "navy", name: "Royal Navy", subtitle: "Granat i srebro", sidebar: "#0A1230", background: "#F2F3F6", primary: "#15224F", accent: "#B8C0DB" },
    { slug: "plum", name: "Plum Noir", subtitle: "Śliwka i róż", sidebar: "#1F1320", background: "#F5F1ED", primary: "#5A2545", accent: "#C98A6B" },
    { slug: "mono", name: "Monochrome", subtitle: "Czerń, szarość i biel", sidebar: "#EAEAEA", background: "#F0F0F0", primary: "#111111", accent: "#333333" },
  ];

  async function handleColorThemeChange(slug: ColorTheme) {
    setColorTheme(slug);
    const res = await patchUser({ colorTheme: slug });
    if (res.ok) toast.success(t.settings.saved);
    else toast.error(t.settings.saveError);
  }

  async function handleRemoveLogo() {
    const res = await patchUser({ clientLogoUrl: null });
    if (res.ok) { setClientLogoUrl(null); toast.success(t.settings.logoDeleted); }
    else toast.error(t.settings.logoDeleteError);
  }

  return (
    <div className="max-w-3xl space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t.settings.general}</h1>
        <p className="text-sm text-gray-500 mt-1">{t.settings.generalDesc}</p>
      </div>

      {/* ── Konto ── */}
      <section className="space-y-4">
        <SectionHeader title={t.settings.account} />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <User size={16} className="text-gray-400" />
              <h3 className="font-semibold text-gray-800 dark:text-gray-200">{t.settings.profile}</h3>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-gray-600 dark:text-gray-400">{t.settings.profileName}</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t.settings.profileNamePlaceholder} onKeyDown={(e) => e.key === "Enter" && handleNameSave()} />
            </div>
            <Button onClick={handleNameSave} disabled={nameLoading || !name.trim() || name.trim() === initialName} size="sm">
              {nameLoading ? t.common.saving : t.common.save}
            </Button>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Mail size={16} className="text-gray-400" />
              <h3 className="font-semibold text-gray-800 dark:text-gray-200">{t.settings.emailLabel}</h3>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-gray-600 dark:text-gray-400">Email</label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t.settings.emailPlaceholder} onKeyDown={(e) => e.key === "Enter" && handleEmailSave()} />
            </div>
            <div className="flex items-start gap-2 text-xs text-gray-400 bg-muted rounded-lg px-3 py-2">
              <Info size={13} className="mt-0.5 flex-shrink-0" />
              <span>{t.settings.emailChangeNote}</span>
            </div>
            <Button onClick={handleEmailSave} disabled={emailLoading || !email.trim() || email.trim() === initialEmail} size="sm">
              {emailLoading ? t.common.saving : t.common.save}
            </Button>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Lock size={16} className="text-gray-400" />
            <h3 className="font-semibold text-gray-800 dark:text-gray-200">{t.settings.password}</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm text-gray-600 dark:text-gray-400">{t.settings.currentPassword}</label>
              <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="••••••••" />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-gray-600 dark:text-gray-400">{t.settings.newPassword}</label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder={t.settings.newPasswordPlaceholder} />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-gray-600 dark:text-gray-400">{t.settings.repeatPassword}</label>
              <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" onKeyDown={(e) => e.key === "Enter" && handlePasswordSave()} />
            </div>
          </div>
          <Button onClick={handlePasswordSave} disabled={passwordLoading || !currentPassword || !newPassword || !confirmPassword} size="sm">
            {passwordLoading ? t.settings.changingPassword : t.settings.changePassword}
          </Button>
        </div>
      </section>

      {/* ── Wygląd dla klienta ── */}
      <section className="space-y-4">
        <SectionHeader title={t.settings.clientAppearance} />

        <div className="bg-card border border-border rounded-2xl p-6 space-y-6">
          <SettingRow
            label={t.settings.showProfileName}
            description={t.settings.showProfileNameDesc}
            checked={showProfileName}
            onToggle={toggleShowProfileName}
          />
          <SettingRow
            label={t.settings.showClientLogo}
            description={t.settings.showClientLogoDesc}
            checked={showClientLogo}
            onToggle={toggleShowClientLogo}
          />

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <ImageIcon size={15} className="text-gray-400" />
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{t.settings.logo}</p>
            </div>
            <p className="text-xs text-gray-400">{t.settings.logoDesc}</p>
            {clientLogoUrl ? (
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={clientLogoUrl} alt="Logo" className="h-10 object-contain rounded border border-border" />
                <Button size="sm" variant="outline" onClick={handleRemoveLogo}>{t.settings.deleteLogo}</Button>
              </div>
            ) : (
              <UploadButton<OurFileRouter, "logoUploader">
                endpoint="logoUploader"
                onClientUploadComplete={async (res) => {
                  const url = res?.[0]?.url;
                  if (url) {
                    await patchUser({ clientLogoUrl: url });
                    setClientLogoUrl(url);
                    toast.success(t.settings.saved);
                  }
                }}
                onUploadError={() => { toast.error(t.settings.logoUploadError); }}
                appearance={{
                  button: "bg-primary text-primary-foreground hover:opacity-90 text-sm px-4 py-2 rounded-lg font-medium",
                  allowedContent: "text-xs text-gray-400",
                }}
              />
            )}
          </div>

<div className="space-y-3">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{t.settings.welcomeMessage}</p>
            <p className="text-xs text-gray-400">{t.settings.welcomeMessageDesc}</p>
            <Textarea
              value={welcomeMsg}
              onChange={(e) => setWelcomeMsg(e.target.value)}
              placeholder={t.settings.welcomeMessagePlaceholder}
              rows={3}
            />
            <Button size="sm" onClick={handleWelcomeSave} disabled={welcomeLoading}>
              {welcomeLoading ? t.common.saving : t.common.save}
            </Button>
          </div>
        </div>
      </section>

      {/* ── Widoczność modułów ── */}
      <section className="space-y-4">
        <SectionHeader title={t.settings.modulesVisibility} />

        <div className="bg-card border border-border rounded-2xl p-6 space-y-1">
          <p className="text-xs text-gray-400 mb-4">{t.settings.modulesVisibilityDesc}</p>
          {[
            {
              slug: "renderflow",
              label: "RenderFlow",
              description: t.settings.renderflowModuleDesc,
              icon: (
                <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
                  <PictureInPicture size={18} className="text-white" />
                </div>
              ),
            },
            {
              slug: "listy",
              label: t.settings.lists,
              description: t.settings.listsModuleDesc,
              icon: (
                <div className="w-9 h-9 rounded-xl bg-[#0f766e] flex items-center justify-center flex-shrink-0">
                  <ScrollText size={18} className="text-white" />
                </div>
              ),
            },
            {
              slug: "produkty",
              label: "Produkty",
              description: t.settings.productsModuleDesc,
              icon: (
                <div className="w-9 h-9 rounded-xl bg-[#7c3aed] flex items-center justify-center flex-shrink-0">
                  <Package size={18} className="text-white" />
                </div>
              ),
            },
          ].map(({ slug, label, description, icon }) => {
            const visible = !globalHiddenModules.includes(slug);
            return (
              <div key={slug} className="flex items-center gap-4 py-3 border-b border-border last:border-0">
                {icon}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{description}</p>
                </div>
                <ToggleSwitch checked={visible} onToggle={() => toggleGlobalModule(slug)} />
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Nawigacja ── */}
      <section className="space-y-4">
        <SectionHeader title={t.settings.navigation} />

        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <PanelLeft size={16} className="text-gray-400" />
            <h3 className="font-semibold text-gray-800 dark:text-gray-200">{t.settings.navigationDesc}</h3>
          </div>
          <p className="text-xs text-gray-400">{t.settings.navigationSubDesc}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              {
                value: "dashboard",
                label: t.settings.navDashboard,
                description: t.settings.navDashboardDesc,
                Icon: LayoutDashboard,
              },
              {
                value: "sidebar",
                label: t.settings.navSidebar,
                description: t.settings.navSidebarDesc,
                Icon: PanelLeft,
              },
            ].map(({ value, label, description, Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => handleNavModeChange(value)}
                className={`flex items-start gap-3 p-4 rounded-xl border text-left transition-colors ${
                  navMode === value
                    ? "border-primary bg-primary/5 dark:bg-primary/10"
                    : "border-border hover:bg-muted"
                }`}
              >
                <div className={`mt-0.5 flex-shrink-0 ${navMode === value ? "text-primary" : "text-gray-400"}`}>
                  <Icon size={20} />
                </div>
                <div>
                  <p className={`text-sm font-medium ${navMode === value ? "text-primary" : "text-gray-700 dark:text-gray-300"}`}>{label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Motyw kolorystyczny ── */}
      <section className="space-y-4">
        <SectionHeader title="Motyw kolorystyczny" />

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {COLOR_THEMES.map(({ slug, name, subtitle, sidebar, background, primary, accent }) => {
            const active = colorTheme === slug;
            return (
              <button
                key={slug}
                type="button"
                aria-pressed={active}
                onClick={() => handleColorThemeChange(slug)}
                className={`flex flex-col items-start p-3 rounded-2xl border text-left transition-all ${
                  active
                    ? "border-primary ring-2 ring-primary bg-primary/5"
                    : "border-border hover:border-gray-300 dark:hover:border-gray-600 hover:bg-muted"
                }`}
              >
                {/* Miniatura */}
                <div className="w-full h-12 rounded-lg overflow-hidden flex mb-3">
                  <div className="w-1/3 h-full" style={{ background: sidebar }} />
                  <div className="flex-1 h-full flex flex-col p-1.5 gap-1" style={{ background: background }}>
                    <div className="h-2 w-3/4 rounded-sm" style={{ background: primary }} />
                    <div className="h-1.5 w-1/2 rounded-sm" style={{ background: accent }} />
                  </div>
                </div>
                <p className={`text-sm font-semibold leading-tight ${active ? "text-primary" : "text-foreground"}`}>{name}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{subtitle}</p>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Ustawienia interfejsu ── */}
      <section className="space-y-4">
        <SectionHeader title={t.settings.interfaceSettings} />

        <div className="bg-card border border-border rounded-2xl p-6 space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Palette size={16} className="text-gray-400" />
              <h3 className="font-semibold text-gray-800 dark:text-gray-200">{t.theme.label}</h3>
            </div>
            <div className="flex flex-wrap gap-2">
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

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Globe size={16} className="text-gray-400" />
              <h3 className="font-semibold text-gray-800 dark:text-gray-200">{t.lang.label}</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {(["pl", "en"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setLang(value)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm border transition-colors ${
                    lang === value
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-foreground hover:bg-muted"
                  }`}
                >
                  {t.lang[value]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
