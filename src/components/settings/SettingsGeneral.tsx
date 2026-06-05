"use client";

import { useState, useRef, useCallback } from "react";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { User, Mail, Lock, Info, Sun, Moon, Monitor, Palette, Image as ImageIcon, Layers, LocalMall, Package, Globe, PushPin, Pencil, X, Eye, EyeOff, Phone, UserCircle, Trash2, GripVertical, LayoutDashboard, Users, CheckSquare, CalendarDays, NotebookText, ChatBubble, VeezardIcon, Engineering, ClipboardList } from "@/components/ui/icons";
import { useTheme, type Theme, type ColorTheme } from "@/lib/theme";
import { useT, useLang } from "@/lib/i18n";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import { useUploadThing } from "@/lib/uploadthing-client";
import { signOut } from "next-auth/react";
import { patchUser, SettingRow, SectionHeader, ToggleSwitch } from "./SettingsShared";

interface Props {
  isDesigner: boolean;
  initialName: string;
  initialFullName: string;
  initialEmail: string;
  initialPhone: string;
  initialPhonePrefix: string;
  initialAvatarUrl: string | null;
  initialShowProfileName: boolean;
  initialShowClientLogo: boolean;
  initialGlobalHiddenModules: string[];
  initialClientLogoUrl: string | null;
  initialClientWelcomeMessage: string | null;
  initialColorTheme: ColorTheme;
  initialEmailNotifEnabled: boolean;
  initialEmailNotifModules: string[];
  initialSidebarOrder: string[];
}

const PHONE_PREFIXES = [
  { code: "+48", flag: "🇵🇱", country: "PL" },
  { code: "+49", flag: "🇩🇪", country: "DE" },
  { code: "+44", flag: "🇬🇧", country: "GB" },
  { code: "+1",  flag: "🇺🇸", country: "US" },
  { code: "+33", flag: "🇫🇷", country: "FR" },
  { code: "+39", flag: "🇮🇹", country: "IT" },
  { code: "+34", flag: "🇪🇸", country: "ES" },
  { code: "+31", flag: "🇳🇱", country: "NL" },
  { code: "+46", flag: "🇸🇪", country: "SE" },
  { code: "+47", flag: "🇳🇴", country: "NO" },
  { code: "+45", flag: "🇩🇰", country: "DK" },
  { code: "+358", flag: "🇫🇮", country: "FI" },
  { code: "+43", flag: "🇦🇹", country: "AT" },
  { code: "+41", flag: "🇨🇭", country: "CH" },
  { code: "+32", flag: "🇧🇪", country: "BE" },
  { code: "+420", flag: "🇨🇿", country: "CZ" },
  { code: "+421", flag: "🇸🇰", country: "SK" },
  { code: "+36", flag: "🇭🇺", country: "HU" },
  { code: "+40", flag: "🇷🇴", country: "RO" },
  { code: "+380", flag: "🇺🇦", country: "UA" },
  { code: "+385", flag: "🇭🇷", country: "HR" },
];

function validatePassword(pwd: string): boolean {
  return pwd.length >= 8 && /[a-z]/.test(pwd) && /[A-Z]/.test(pwd) && /[0-9]/.test(pwd);
}

function SortableSidebarItem({ id, label, icon: Icon }: { id: string; label: string; icon: React.ElementType }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-3 px-3 py-2.5 bg-card border border-border rounded-xl">
      <button type="button" {...attributes} {...listeners} className="text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing touch-none">
        <GripVertical size={16} />
      </button>
      <Icon size={15} className="text-muted-foreground shrink-0" />
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}

export function SettingsGeneral({
  isDesigner,
  initialName,
  initialFullName,
  initialEmail,
  initialPhone,
  initialPhonePrefix,
  initialAvatarUrl,
  initialShowProfileName,
  initialShowClientLogo,
  initialGlobalHiddenModules,
  initialClientLogoUrl,
  initialClientWelcomeMessage,
  initialColorTheme,
  initialEmailNotifEnabled,
  initialEmailNotifModules,
  initialSidebarOrder,
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
  const [fullName, setFullName] = useState(initialFullName);
  const [fullNameLoading, setFullNameLoading] = useState(false);
  const [phone, setPhone] = useState(initialPhone);
  const [phonePrefix, setPhonePrefix] = useState(initialPhonePrefix);
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [email, setEmail] = useState(initialEmail);
  const [emailLoading, setEmailLoading] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);

  // Avatar state
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialAvatarUrl);
  const [avatarCropSrc, setAvatarCropSrc] = useState<string | null>(null);
  const [avatarCrop, setAvatarCrop] = useState({ x: 0, y: 0 });
  const [avatarZoom, setAvatarZoom] = useState(1);
  const [avatarCroppedAreaPixels, setAvatarCroppedAreaPixels] = useState<Area | null>(null);
  const [avatarCropUploading, setAvatarCropUploading] = useState(false);
  const avatarFileInputRef = useRef<HTMLInputElement>(null);
  const { startUpload: startAvatarUpload } = useUploadThing("avatarUploader");

  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [emailNotifEnabled, setEmailNotifEnabled] = useState(initialEmailNotifEnabled);
  const [emailNotifModules, setEmailNotifModules] = useState<string[]>(initialEmailNotifModules);
  const [emailNotifLoading, setEmailNotifLoading] = useState(false);

  const DEFAULT_SIDEBAR_ORDER = ["klienci", "renderflow", "listy", "zadania", "ankiety", "produkty", "wykonawcy", "kalendarz", "notatnik", "dyskusje", "veezard"];
  const SIDEBAR_ITEM_META: Record<string, { label: string; icon: React.ElementType }> = {
    klienci:     { label: "Klienci",        icon: Users },
    wykonawcy:   { label: "Wykonawcy",      icon: Engineering },
    renderflow:  { label: "ProjectFlow",    icon: PushPin },
    listy:       { label: "Listy zakupowe", icon: LocalMall },
    zadania:     { label: "Zadania",        icon: CheckSquare },
    produkty:    { label: "Produkty",       icon: Package },
    kalendarz:   { label: "Kalendarz",      icon: CalendarDays },
    notatnik:    { label: "Notatnik",       icon: NotebookText },
    dyskusje:    { label: "Dyskusje",       icon: ChatBubble },
    ankiety:     { label: "Ankiety",        icon: ClipboardList },
    veezard:     { label: "Veezard",        icon: VeezardIcon },
  };
  const initialOrder = initialSidebarOrder.length > 0
    ? [...initialSidebarOrder, ...DEFAULT_SIDEBAR_ORDER.filter((k) => !initialSidebarOrder.includes(k))]
    : DEFAULT_SIDEBAR_ORDER;
  const [sidebarOrder, setSidebarOrder] = useState<string[]>(initialOrder);
  const [sidebarOrderSaving, setSidebarOrderSaving] = useState(false);
  const sidebarSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function handleSidebarDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = sidebarOrder.indexOf(String(active.id));
    const newIndex = sidebarOrder.indexOf(String(over.id));
    setSidebarOrder(arrayMove(sidebarOrder, oldIndex, newIndex));
  }

  async function saveSidebarOrder() {
    setSidebarOrderSaving(true);
    try {
      await fetch("/api/user/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sidebarOrder }),
      });
      toast.success("Kolejność sidebar zapisana");
      router.refresh();
    } catch {
      toast.error("Błąd zapisu");
    } finally {
      setSidebarOrderSaving(false);
    }
  }

  async function resetSidebarOrder() {
    setSidebarOrder(DEFAULT_SIDEBAR_ORDER);
    setSidebarOrderSaving(true);
    try {
      await fetch("/api/user/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sidebarOrder: DEFAULT_SIDEBAR_ORDER }),
      });
      toast.success("Przywrócono domyślną kolejność");
      router.refresh();
    } catch {
      toast.error("Błąd zapisu");
    } finally {
      setSidebarOrderSaving(false);
    }
  }

  const [showProfileName, setShowProfileName] = useState(initialShowProfileName);
  const [showClientLogo, setShowClientLogo] = useState(initialShowClientLogo);
  const [globalHiddenModules, setGlobalHiddenModules] = useState<string[]>(initialGlobalHiddenModules);
  const [clientLogoUrl, setClientLogoUrl] = useState<string | null>(initialClientLogoUrl);
  const [welcomeMsg, setWelcomeMsg] = useState(initialClientWelcomeMessage ?? "");
  const [welcomeLoading, setWelcomeLoading] = useState(false);
  // Logo crop state
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [cropUploading, setCropUploading] = useState(false);
  const logoFileInputRef = useRef<HTMLInputElement>(null);
  const { startUpload: startLogoUpload } = useUploadThing("logoUploader");

  function handleAvatarFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    const reader = new FileReader();
    reader.onload = () => {
      setAvatarCropSrc(reader.result as string);
      setAvatarCrop({ x: 0, y: 0 });
      setAvatarZoom(1);
    };
    reader.readAsDataURL(file);
  }

  const handleAvatarCropComplete = useCallback((_: Area, pixels: Area) => {
    setAvatarCroppedAreaPixels(pixels);
  }, []);

  async function handleAvatarCropApply() {
    if (!avatarCropSrc || !avatarCroppedAreaPixels) return;
    setAvatarCropUploading(true);
    try {
      const file = await getCroppedImg(avatarCropSrc, avatarCroppedAreaPixels);
      const res = await startAvatarUpload([file]);
      const url = res?.[0]?.url;
      if (!url) throw new Error();
      await patchUser({ avatarUrl: url });
      setAvatarUrl(url);
      setAvatarCropSrc(null);
      toast.success(t.settings.saved);
    } catch {
      toast.error(t.settings.avatarUploadError);
    } finally {
      setAvatarCropUploading(false);
    }
  }

  async function handleRemoveAvatar() {
    const res = await patchUser({ avatarUrl: null });
    if (res.ok) { setAvatarUrl(null); toast.success(t.settings.avatarDeleted); }
    else toast.error(t.settings.avatarDeleteError);
  }

  async function handleFullNameSave() {
    if (!fullName.trim()) return;
    setFullNameLoading(true);
    try {
      const res = await patchUser({ fullName: fullName.trim() });
      if (!res.ok) { const d = await res.json(); toast.error(d.error || t.settings.saveError); return; }
      toast.success(t.settings.fullNameUpdated);
      router.refresh();
    } finally { setFullNameLoading(false); }
  }

  async function handlePhoneSave() {
    setPhoneLoading(true);
    try {
      const res = await patchUser({ phone: phone.trim() || null, phonePrefix });
      if (!res.ok) { const d = await res.json(); toast.error(d.error || t.settings.saveError); return; }
      toast.success(t.settings.phoneUpdated);
    } finally { setPhoneLoading(false); }
  }

  function handleLogoFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    const reader = new FileReader();
    reader.onload = () => {
      setCropSrc(reader.result as string);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
    };
    reader.readAsDataURL(file);
  }

  const handleCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  async function handleCropApply() {
    if (!cropSrc || !croppedAreaPixels) return;
    setCropUploading(true);
    try {
      const file = await getCroppedImg(cropSrc, croppedAreaPixels);
      const res = await startLogoUpload([file]);
      const url = res?.[0]?.url;
      if (!url) throw new Error();
      await patchUser({ clientLogoUrl: url });
      setClientLogoUrl(url);
      setCropSrc(null);
      toast.success(t.settings.saved);
    } catch {
      toast.error(t.settings.logoUploadError);
    } finally {
      setCropUploading(false);
    }
  }

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
    if (!email.includes("@")) { toast.error("Podaj poprawny adres e-mail (brak znaku @)"); return; }
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
    if (!validatePassword(newPassword)) { toast.error(t.settings.passwordTooWeak); return; }
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

  async function handleDeleteAccount() {
    setDeleteLoading(true);
    const res = await fetch("/api/user", { method: "DELETE" });
    if (!res.ok) {
      toast.error("Błąd podczas usuwania konta");
      setDeleteLoading(false);
      return;
    }
    await signOut({ redirect: false });
    router.push("/login");
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

        {/* Avatar */}
        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <UserCircle size={16} className="text-gray-400" />
            <h3 className="font-semibold text-gray-800 dark:text-gray-200">{t.settings.avatar}</h3>
          </div>
          <p className="text-xs text-gray-400">{t.settings.avatarDesc}</p>
          <input ref={avatarFileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarFileChange} />
          <div className="flex items-center gap-4">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="Avatar" className="w-16 h-16 rounded-full object-cover border border-border" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-xl font-semibold text-primary border border-border">
                {(fullName || name || "?")[0]?.toUpperCase()}
              </div>
            )}
            <div className="flex flex-col gap-2">
              <Button size="sm" onClick={() => avatarFileInputRef.current?.click()} disabled={avatarCropUploading}>
                <Pencil size={14} className="mr-1.5" />{avatarUrl ? t.settings.changeAvatar : "Dodaj avatar"}
              </Button>
              {avatarUrl && (
                <Button size="sm" variant="outline" onClick={handleRemoveAvatar}>{t.settings.deleteAvatar}</Button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Imię i nazwisko */}
          <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <User size={16} className="text-gray-400" />
              <h3 className="font-semibold text-gray-800 dark:text-gray-200">{t.settings.fullName}</h3>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-gray-600 dark:text-gray-400">{t.settings.fullName}</label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder={t.settings.fullNamePlaceholder} onKeyDown={(e) => e.key === "Enter" && handleFullNameSave()} />
            </div>
            <Button onClick={handleFullNameSave} disabled={fullNameLoading || !fullName.trim() || fullName.trim() === initialFullName} size="sm">
              {fullNameLoading ? t.common.saving : t.common.save}
            </Button>
          </div>

          {/* Nazwa firmy */}
          <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <User size={16} className="text-gray-400" />
              <h3 className="font-semibold text-gray-800 dark:text-gray-200">{t.settings.profileName}</h3>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-gray-600 dark:text-gray-400">{t.settings.profileName}</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t.settings.profileNamePlaceholder} onKeyDown={(e) => e.key === "Enter" && handleNameSave()} />
            </div>
            <Button onClick={handleNameSave} disabled={nameLoading || !name.trim() || name.trim() === initialName} size="sm">
              {nameLoading ? t.common.saving : t.common.save}
            </Button>
          </div>
        </div>

        {/* Email + numer kontaktowy */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

          <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Phone size={16} className="text-gray-400" />
              <h3 className="font-semibold text-gray-800 dark:text-gray-200">{t.settings.phone}</h3>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-gray-600 dark:text-gray-400">{t.settings.phone}</label>
              <div className="flex gap-2">
                <select
                  value={phonePrefix}
                  onChange={(e) => setPhonePrefix(e.target.value)}
                  className="flex-shrink-0 bg-background border border-input rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {PHONE_PREFIXES.map(({ code, flag, country }) => (
                    <option key={code} value={code}>{flag} {code}</option>
                  ))}
                </select>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={t.settings.phonePlaceholder}
                  onKeyDown={(e) => e.key === "Enter" && handlePhoneSave()}
                  className="flex-1"
                />
              </div>
            </div>
            <Button onClick={handlePhoneSave} disabled={phoneLoading || (phone.trim() === initialPhone && phonePrefix === initialPhonePrefix)} size="sm">
              {phoneLoading ? t.common.saving : t.common.save}
            </Button>
          </div>
        </div>

        {/* Hasło */}
        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Lock size={16} className="text-gray-400" />
            <h3 className="font-semibold text-gray-800 dark:text-gray-200">{t.settings.password}</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm text-gray-600 dark:text-gray-400">{t.settings.currentPassword}</label>
              <div className="relative">
                <Input type={showCurrentPwd ? "text" : "password"} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="••••••••" className="pr-9" />
                <button type="button" onClick={() => setShowCurrentPwd(!showCurrentPwd)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showCurrentPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-gray-600 dark:text-gray-400">{t.settings.newPassword}</label>
              <div className="relative">
                <Input type={showNewPwd ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder={t.settings.newPasswordPlaceholder} className="pr-9" />
                <button type="button" onClick={() => setShowNewPwd(!showNewPwd)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showNewPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-gray-600 dark:text-gray-400">{t.settings.repeatPassword}</label>
              <div className="relative">
                <Input type={showConfirmPwd ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" className="pr-9" onKeyDown={(e) => e.key === "Enter" && handlePasswordSave()} />
                <button type="button" onClick={() => setShowConfirmPwd(!showConfirmPwd)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showConfirmPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-400">{t.settings.passwordRequirements}</p>
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
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <input ref={logoFileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoFileChange} />
            {clientLogoUrl ? (
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={clientLogoUrl} alt="Logo" className="w-12 h-12 object-cover rounded-full border border-border" />
                <Button size="sm" variant="outline" onClick={() => logoFileInputRef.current?.click()} disabled={cropUploading}>
                  <Pencil size={14} className="mr-1.5" />Edytuj
                </Button>
                <Button size="sm" variant="outline" onClick={handleRemoveLogo}>{t.settings.deleteLogo}</Button>
              </div>
            ) : (
              <Button size="sm" onClick={() => logoFileInputRef.current?.click()} disabled={cropUploading}>
                {cropUploading ? "Przesyłanie..." : "Dodaj logo"}
              </Button>
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
              label: "ProjectFlow",
              description: t.settings.renderflowModuleDesc,
              icon: (
                <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
                  <PushPin size={18} className="text-white" />
                </div>
              ),
            },
            {
              slug: "listy",
              label: t.settings.lists,
              description: t.settings.listsModuleDesc,
              icon: (
                <div className="w-9 h-9 rounded-xl bg-[#0f766e] flex items-center justify-center flex-shrink-0">
                  <LocalMall size={18} className="text-white" />
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


      {/* ── Avatar crop modal ── */}
      {avatarCropSrc && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/90">
          <div className="flex items-center justify-between px-6 py-4 bg-card border-b border-border flex-shrink-0">
            <h3 className="font-semibold text-sm">{t.settings.cropAvatar}</h3>
            <button onClick={() => setAvatarCropSrc(null)} className="text-muted-foreground hover:text-foreground transition-colors">
              <X size={18} />
            </button>
          </div>
          <div className="relative flex-1">
            <Cropper
              image={avatarCropSrc}
              crop={avatarCrop}
              zoom={avatarZoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setAvatarCrop}
              onZoomChange={setAvatarZoom}
              onCropComplete={handleAvatarCropComplete}
            />
          </div>
          <div className="px-6 py-4 bg-card border-t border-border flex-shrink-0 space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-10">Zoom</span>
              <input
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={avatarZoom}
                onChange={(e) => setAvatarZoom(Number(e.target.value))}
                className="flex-1 accent-primary"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAvatarCropSrc(null)}>Anuluj</Button>
              <Button onClick={handleAvatarCropApply} disabled={avatarCropUploading}>
                {avatarCropUploading ? "Przesyłanie..." : "Zastosuj"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Crop modal ── */}
      {cropSrc && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/90">
          <div className="flex items-center justify-between px-6 py-4 bg-card border-b border-border flex-shrink-0">
            <h3 className="font-semibold text-sm">Kadrowanie logo</h3>
            <button onClick={() => setCropSrc(null)} className="text-muted-foreground hover:text-foreground transition-colors">
              <X size={18} />
            </button>
          </div>
          <div className="relative flex-1">
            <Cropper
              image={cropSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={handleCropComplete}
            />
          </div>
          <div className="px-6 py-4 bg-card border-t border-border flex-shrink-0 space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-10">Zoom</span>
              <input
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="flex-1 accent-primary"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCropSrc(null)}>Anuluj</Button>
              <Button onClick={handleCropApply} disabled={cropUploading}>
                {cropUploading ? "Przesyłanie..." : "Zastosuj"}
              </Button>
            </div>
          </div>
        </div>
      )}

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

      {/* Email notifications */}
      <section className="space-y-4">
        <SectionHeader title="Powiadomienia email" />
        <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
          {/* Master toggle */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-foreground">Powiadomienia email</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Otrzymuj email gdy klient doda pin, komentarz lub złoży prośbę
              </p>
            </div>
            <ToggleSwitch
              checked={emailNotifEnabled}
              onToggle={async () => {
                const next = !emailNotifEnabled;
                setEmailNotifEnabled(next);
                setEmailNotifLoading(true);
                try {
                  await patchUser({ emailNotifEnabled: next });
                } finally {
                  setEmailNotifLoading(false);
                }
              }}
            />
          </div>

          {/* Module checkboxes */}
          {emailNotifEnabled && (
            <div className="space-y-3 pt-1 border-t border-border">
              <p className="text-xs text-muted-foreground pt-1">Wybierz moduły, z których chcesz otrzymywać powiadomienia:</p>
              {[
                { slug: "renderflow", label: "ProjectFlow", desc: "Piny, komentarze, prośby o status i przywrócenie wersji" },
                { slug: "listy", label: "Listy zakupowe", desc: "Komentarze do produktów na listach" },
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
                        try {
                          await patchUser({ emailNotifModules: next });
                        } finally {
                          setEmailNotifLoading(false);
                        }
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

      <section className="space-y-4">
        <SectionHeader title="Kolejność sidebar" />
        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <p className="text-xs text-muted-foreground">Dashboard jest zawsze pierwszy. Przeciągnij pozostałe moduły aby zmienić kolejność.</p>

          {/* Fixed Dashboard row */}
          <div className="flex items-center gap-3 px-3 py-2.5 bg-muted/50 border border-border rounded-xl opacity-60">
            <span className="w-4 h-4 shrink-0" />
            <LayoutDashboard size={15} className="text-muted-foreground shrink-0" />
            <span className="text-sm font-medium">Dashboard</span>
          </div>

          <DndContext sensors={sidebarSensors} collisionDetection={closestCenter} onDragEnd={handleSidebarDragEnd}>
            <SortableContext items={sidebarOrder} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {sidebarOrder.map((key) => {
                  const meta = SIDEBAR_ITEM_META[key];
                  if (!meta) return null;
                  return <SortableSidebarItem key={key} id={key} label={meta.label} icon={meta.icon} />;
                })}
              </div>
            </SortableContext>
          </DndContext>

          <div className="flex gap-2 pt-1">
            <Button size="sm" onClick={saveSidebarOrder} disabled={sidebarOrderSaving}>
              {sidebarOrderSaving ? "Zapisywanie..." : "Zapisz"}
            </Button>
            <Button size="sm" variant="outline" onClick={resetSidebarOrder} disabled={sidebarOrderSaving}>
              Przywróć domyślne
            </Button>
          </div>
        </div>
      </section>

      {isDesigner && (
        <section>
          <SectionHeader title="Strefa niebezpieczna" />
          <div className="border border-destructive/40 rounded-2xl p-6 space-y-4">
            <div className="flex items-start gap-3">
              <Trash2 size={18} className="text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">Usuń konto</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Trwale usuwa konto wraz ze wszystkimi projektami, renderami, listami zakupowymi i danymi. Tej operacji nie można cofnąć.
                </p>
              </div>
            </div>
            {!deleteConfirm ? (
              <Button variant="outline" size="sm" className="border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground" onClick={() => setDeleteConfirm(true)}>
                Usuń konto
              </Button>
            ) : (
              <div className="space-y-3">
                <p className="text-sm font-medium text-destructive">Czy na pewno chcesz usunąć konto? Tej operacji nie można cofnąć.</p>
                <div className="flex gap-2">
                  <Button variant="destructive" size="sm" onClick={handleDeleteAccount} disabled={deleteLoading}>
                    {deleteLoading ? "Usuwanie..." : "Tak, usuń moje konto"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setDeleteConfirm(false)} disabled={deleteLoading}>
                    Anuluj
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

async function getCroppedImg(imageSrc: string, pixelCrop: Area): Promise<File> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = imageSrc;
  });
  const size = Math.min(pixelCrop.width, pixelCrop.height, 512);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(image, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, size, size);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) { reject(new Error("Canvas empty")); return; }
      resolve(new File([blob], "logo.png", { type: "image/png" }));
    }, "image/png");
  });
}
