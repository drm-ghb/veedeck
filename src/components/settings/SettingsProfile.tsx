"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  User, Mail, Lock, Info, Eye, EyeOff, Phone, UserCircle, Pencil, X,
} from "@/components/ui/icons";
import { useT } from "@/lib/i18n";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import { useUploadThing } from "@/lib/uploadthing-client";
import { patchUser, SectionHeader, getCroppedImg } from "./SettingsShared";

interface Props {
  initialName: string;
  initialFullName: string;
  initialEmail: string;
  initialPhone: string;
  initialPhonePrefix: string;
  initialAvatarUrl: string | null;
}

const PHONE_PREFIXES = [
  { code: "+48", flag: "🇵🇱" }, { code: "+49", flag: "🇩🇪" }, { code: "+44", flag: "🇬🇧" },
  { code: "+1",  flag: "🇺🇸" }, { code: "+33", flag: "🇫🇷" }, { code: "+39", flag: "🇮🇹" },
  { code: "+34", flag: "🇪🇸" }, { code: "+31", flag: "🇳🇱" }, { code: "+46", flag: "🇸🇪" },
  { code: "+47", flag: "🇳🇴" }, { code: "+45", flag: "🇩🇰" }, { code: "+358", flag: "🇫🇮" },
  { code: "+43", flag: "🇦🇹" }, { code: "+41", flag: "🇨🇭" }, { code: "+32", flag: "🇧🇪" },
  { code: "+420", flag: "🇨🇿" }, { code: "+421", flag: "🇸🇰" }, { code: "+36", flag: "🇭🇺" },
  { code: "+40", flag: "🇷🇴" }, { code: "+380", flag: "🇺🇦" }, { code: "+385", flag: "🇭🇷" },
];

function validatePassword(pwd: string) {
  return pwd.length >= 8 && /[a-z]/.test(pwd) && /[A-Z]/.test(pwd) && /[0-9]/.test(pwd);
}

export function SettingsProfile({
  initialName, initialFullName, initialEmail,
  initialPhone, initialPhonePrefix, initialAvatarUrl,
}: Props) {
  const router = useRouter();
  const t = useT();

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

  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialAvatarUrl);
  const [avatarCropSrc, setAvatarCropSrc] = useState<string | null>(null);
  const [avatarCrop, setAvatarCrop] = useState({ x: 0, y: 0 });
  const [avatarZoom, setAvatarZoom] = useState(1);
  const [avatarCroppedAreaPixels, setAvatarCroppedAreaPixels] = useState<Area | null>(null);
  const [avatarCropUploading, setAvatarCropUploading] = useState(false);
  const avatarFileInputRef = useRef<HTMLInputElement>(null);
  const { startUpload: startAvatarUpload } = useUploadThing("avatarUploader");

  function handleAvatarFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    const reader = new FileReader();
    reader.onload = () => { setAvatarCropSrc(reader.result as string); setAvatarCrop({ x: 0, y: 0 }); setAvatarZoom(1); };
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
      setAvatarUrl(url); setAvatarCropSrc(null);
      toast.success(t.settings.saved);
    } catch { toast.error(t.settings.avatarUploadError); }
    finally { setAvatarCropUploading(false); }
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
      toast.success(t.settings.fullNameUpdated); router.refresh();
    } finally { setFullNameLoading(false); }
  }

  async function handleNameSave() {
    if (!name.trim()) return;
    setNameLoading(true);
    try {
      const res = await patchUser({ name: name.trim() });
      if (!res.ok) { const d = await res.json(); toast.error(d.error || t.settings.saveError); return; }
      toast.success(t.settings.nameUpdated); router.refresh();
    } finally { setNameLoading(false); }
  }

  async function handleEmailSave() {
    if (!email.trim() || !email.includes("@")) { toast.error(t.projekty.emailInvalid); return; }
    setEmailLoading(true);
    try {
      const res = await patchUser({ email: email.trim() });
      if (!res.ok) { const d = await res.json(); toast.error(d.error || t.settings.saveError); return; }
      toast.success(t.settings.emailUpdated); router.refresh();
    } finally { setEmailLoading(false); }
  }

  async function handlePhoneSave() {
    setPhoneLoading(true);
    try {
      const res = await patchUser({ phone: phone.trim() || null, phonePrefix });
      if (!res.ok) { const d = await res.json(); toast.error(d.error || t.settings.saveError); return; }
      toast.success(t.settings.phoneUpdated);
    } finally { setPhoneLoading(false); }
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

  return (
    <div className="max-w-3xl space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Profil</h1>
        <p className="text-sm text-gray-500 mt-1">Zarządzaj swoimi danymi osobowymi i hasłem.</p>
      </div>

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
                <Pencil size={14} className="mr-1.5" />{avatarUrl ? t.settings.changeAvatar : t.settings.addAvatar}
              </Button>
              {avatarUrl && (
                <Button size="sm" variant="outline" onClick={handleRemoveAvatar}>{t.settings.deleteAvatar}</Button>
              )}
            </div>
          </div>
        </div>

        {/* Imię / Firma */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

        {/* Email / Telefon */}
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
                <select value={phonePrefix} onChange={(e) => setPhonePrefix(e.target.value)} className="flex-shrink-0 bg-background border border-input rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                  {PHONE_PREFIXES.map(({ code, flag }) => (
                    <option key={code} value={code}>{flag} {code}</option>
                  ))}
                </select>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t.settings.phonePlaceholder} onKeyDown={(e) => e.key === "Enter" && handlePhoneSave()} className="flex-1" />
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
            {([
              { label: t.settings.currentPassword, val: currentPassword, set: setCurrentPassword, show: showCurrentPwd, toggle: () => setShowCurrentPwd(v => !v), placeholder: "••••••••" },
              { label: t.settings.newPassword, val: newPassword, set: setNewPassword, show: showNewPwd, toggle: () => setShowNewPwd(v => !v), placeholder: t.settings.newPasswordPlaceholder },
              { label: t.settings.repeatPassword, val: confirmPassword, set: setConfirmPassword, show: showConfirmPwd, toggle: () => setShowConfirmPwd(v => !v), placeholder: "••••••••" },
            ] as { label: string; val: string; set: (v: string) => void; show: boolean; toggle: () => void; placeholder: string }[]).map(({ label, val, set, show, toggle, placeholder }) => (
              <div key={label} className="space-y-2">
                <label className="text-sm text-gray-600 dark:text-gray-400">{label}</label>
                <div className="relative">
                  <Input type={show ? "text" : "password"} value={val} onChange={(e) => set(e.target.value)} placeholder={placeholder} className="pr-9" onKeyDown={(e) => e.key === "Enter" && handlePasswordSave()} />
                  <button type="button" onClick={toggle} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {show ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400">{t.settings.passwordRequirements}</p>
          <Button onClick={handlePasswordSave} disabled={passwordLoading || !currentPassword || !newPassword || !confirmPassword} size="sm">
            {passwordLoading ? t.settings.changingPassword : t.settings.changePassword}
          </Button>
        </div>
      </section>

      {/* Avatar crop modal */}
      {avatarCropSrc && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/90">
          <div className="flex items-center justify-between px-6 py-4 bg-card border-b border-border flex-shrink-0">
            <h3 className="font-semibold text-sm">{t.settings.cropAvatar}</h3>
            <button onClick={() => setAvatarCropSrc(null)} className="text-muted-foreground hover:text-foreground transition-colors"><X size={18} /></button>
          </div>
          <div className="relative flex-1">
            <Cropper image={avatarCropSrc} crop={avatarCrop} zoom={avatarZoom} aspect={1} cropShape="round" showGrid={false} onCropChange={setAvatarCrop} onZoomChange={setAvatarZoom} onCropComplete={handleAvatarCropComplete} />
          </div>
          <div className="px-6 py-4 bg-card border-t border-border flex-shrink-0 space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-10">Zoom</span>
              <input type="range" min={1} max={3} step={0.01} value={avatarZoom} onChange={(e) => setAvatarZoom(Number(e.target.value))} className="flex-1 accent-primary" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAvatarCropSrc(null)}>{t.common.cancel}</Button>
              <Button onClick={handleAvatarCropApply} disabled={avatarCropUploading}>{avatarCropUploading ? t.settings.uploading : t.settings.apply}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
