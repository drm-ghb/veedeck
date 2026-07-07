"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Image as ImageIcon, Pencil, X } from "@/components/ui/icons";
import { useT } from "@/lib/i18n";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import { useUploadThing } from "@/lib/uploadthing-client";
import { patchUser, SectionHeader, SettingRow, getCroppedImg } from "./SettingsShared";

interface Props {
  initialShowProfileName: boolean;
  initialShowClientLogo: boolean;
  initialClientLogoUrl: string | null;
  initialClientWelcomeMessage: string | null;
}

export function SettingsBranding({
  initialShowProfileName,
  initialShowClientLogo,
  initialClientLogoUrl,
  initialClientWelcomeMessage,
}: Props) {
  const t = useT();

  const [showProfileName, setShowProfileName] = useState(initialShowProfileName);
  const [showClientLogo, setShowClientLogo] = useState(initialShowClientLogo);
  const [clientLogoUrl, setClientLogoUrl] = useState<string | null>(initialClientLogoUrl);
  const [welcomeMsg, setWelcomeMsg] = useState(initialClientWelcomeMessage ?? "");
  const [welcomeLoading, setWelcomeLoading] = useState(false);

  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [cropUploading, setCropUploading] = useState(false);
  const logoFileInputRef = useRef<HTMLInputElement>(null);
  const { startUpload: startLogoUpload } = useUploadThing("logoUploader");

  function handleLogoFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    const reader = new FileReader();
    reader.onload = () => { setCropSrc(reader.result as string); setCrop({ x: 0, y: 0 }); setZoom(1); };
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
      setClientLogoUrl(url); setCropSrc(null);
      toast.success(t.settings.saved);
    } catch { toast.error(t.settings.logoUploadError); }
    finally { setCropUploading(false); }
  }

  async function handleRemoveLogo() {
    const res = await patchUser({ clientLogoUrl: null });
    if (res.ok) { setClientLogoUrl(null); toast.success(t.settings.logoDeleted); }
    else toast.error(t.settings.logoDeleteError);
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

  async function handleWelcomeSave() {
    setWelcomeLoading(true);
    try {
      const res = await patchUser({ clientWelcomeMessage: welcomeMsg.trim() || null });
      if (res.ok) toast.success(t.settings.saved);
      else toast.error(t.settings.saveError);
    } finally { setWelcomeLoading(false); }
  }

  return (
    <div className="max-w-3xl space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Branding</h1>
        <p className="text-sm text-gray-500 mt-1">Dostosuj wygląd panelu klienta i wykonawcy.</p>
      </div>

      <section className="space-y-4">
        <SectionHeader title={t.settings.clientAppearance} />

        <div className="bg-card border border-border rounded-2xl p-6 space-y-6">
          <SettingRow label={t.settings.showProfileName} description={t.settings.showProfileNameDesc} checked={showProfileName} onToggle={toggleShowProfileName} />
          <SettingRow label={t.settings.showClientLogo} description={t.settings.showClientLogoDesc} checked={showClientLogo} onToggle={toggleShowClientLogo} />

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <ImageIcon size={15} className="text-gray-400" />
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{t.settings.logo}</p>
            </div>
            <p className="text-xs text-gray-400">{t.settings.logoDesc}</p>
            <input ref={logoFileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoFileChange} />
            {clientLogoUrl ? (
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={clientLogoUrl} alt="Logo" className="w-12 h-12 object-cover rounded-full border border-border" />
                <Button size="sm" variant="outline" onClick={() => logoFileInputRef.current?.click()} disabled={cropUploading}>
                  <Pencil size={14} className="mr-1.5" />{t.common.edit}
                </Button>
                <Button size="sm" variant="outline" onClick={handleRemoveLogo}>{t.settings.deleteLogo}</Button>
              </div>
            ) : (
              <Button size="sm" onClick={() => logoFileInputRef.current?.click()} disabled={cropUploading}>
                {cropUploading ? t.settings.uploading : t.settings.addLogo}
              </Button>
            )}
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{t.settings.welcomeMessage}</p>
            <p className="text-xs text-gray-400">{t.settings.welcomeMessageDesc}</p>
            <Textarea value={welcomeMsg} onChange={(e) => setWelcomeMsg(e.target.value)} placeholder={t.settings.welcomeMessagePlaceholder} rows={3} />
            <Button size="sm" onClick={handleWelcomeSave} disabled={welcomeLoading}>
              {welcomeLoading ? t.common.saving : t.common.save}
            </Button>
          </div>
        </div>
      </section>

      {/* Logo crop modal */}
      {cropSrc && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/90">
          <div className="flex items-center justify-between px-6 py-4 bg-card border-b border-border flex-shrink-0">
            <h3 className="font-semibold text-sm">{t.settings.cropLogo}</h3>
            <button onClick={() => setCropSrc(null)} className="text-muted-foreground hover:text-foreground transition-colors"><X size={18} /></button>
          </div>
          <div className="relative flex-1">
            <Cropper image={cropSrc} crop={crop} zoom={zoom} aspect={1} cropShape="round" showGrid={false} onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={handleCropComplete} />
          </div>
          <div className="px-6 py-4 bg-card border-t border-border flex-shrink-0 space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-10">Zoom</span>
              <input type="range" min={1} max={3} step={0.01} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="flex-1 accent-primary" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCropSrc(null)}>{t.common.cancel}</Button>
              <Button onClick={handleCropApply} disabled={cropUploading}>{cropUploading ? t.settings.uploading : t.settings.apply}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
