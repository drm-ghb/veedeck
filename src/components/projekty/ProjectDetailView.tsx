"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  ShoppingCart,
  Copy,
  Eye,
  EyeOff,
  X,
  Plus,
  AlertTriangle,
  Check,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";

interface ProjectClient {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  isMainContact: boolean;
  createdAt: string;
}

interface ProjectData {
  id: string;
  title: string;
  description: string | null;
  shareToken: string;
  sharePassword: string | null;
  shareExpiresAt: string | null;
  createdAt: string;
  hiddenModules: string[];
  clientCanUpload: boolean;
  addressCountry: string | null;
  addressCity: string | null;
  addressPostalCode: string | null;
  addressStreet: string | null;
  hasRenders: boolean;
  hasLists: boolean;
  clients: ProjectClient[];
}

const MODULES_CONFIG = [
  {
    slug: "renderflow",
    labelKey: "moduleRenderflow" as const,
    description: "Wizualizacje projektu",
    icon: "renderflow" as const,
  },
  {
    slug: "listy",
    labelKey: "moduleLists" as const,
    description: "Listy produktów dla klienta",
    icon: "cart" as const,
  },
];

export default function ProjectDetailView({ project }: { project: ProjectData }) {
  const router = useRouter();
  const t = useT();

  // Info form state
  const [title, setTitle] = useState(project.title);
  const [description, setDescription] = useState(project.description ?? "");
  const [sharePassword, setSharePassword] = useState(project.sharePassword ?? "");
  const [shareExpiresAt, setShareExpiresAt] = useState(
    project.shareExpiresAt ? project.shareExpiresAt.slice(0, 10) : ""
  );
  const [showPassword, setShowPassword] = useState(false);
  const [savingInfo, setSavingInfo] = useState(false);

  // Clients state
  const [clients, setClients] = useState<ProjectClient[]>(project.clients);
  const [newClientName, setNewClientName] = useState("");
  const [newClientEmail, setNewClientEmail] = useState("");
  const [newClientPhone, setNewClientPhone] = useState("");
  const [newClientIsMain, setNewClientIsMain] = useState(false);
  const [addingClient, setAddingClient] = useState(false);
  const [showAddClient, setShowAddClient] = useState(false);

  // Inline editing state
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // Address state
  const [addressCountry, setAddressCountry] = useState(project.addressCountry ?? "");
  const [addressCity, setAddressCity] = useState(project.addressCity ?? "");
  const [addressPostalCode, setAddressPostalCode] = useState(project.addressPostalCode ?? "");
  const [addressStreet, setAddressStreet] = useState(project.addressStreet ?? "");
  const [savingAddress, setSavingAddress] = useState(false);

  // Modules state
  const [hiddenModules, setHiddenModules] = useState<string[]>(project.hiddenModules);
  const [clientCanUpload, setClientCanUpload] = useState(project.clientCanUpload);

  const [copiedPanel, setCopiedPanel] = useState(false);

  function copyPanelLink() {
    navigator.clipboard.writeText(`${window.location.origin}/share/${project.shareToken}/home`);
    setCopiedPanel(true);
    setTimeout(() => setCopiedPanel(false), 2000);
  }

  // Warning dialog state
  const [warningDialog, setWarningDialog] = useState<{
    open: boolean;
    slug: string;
    label: string;
    link: string;
  }>({ open: false, slug: "", label: "", link: "" });

  async function saveInfo() {
    if (!title.trim()) return;
    setSavingInfo(true);
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          sharePassword: sharePassword.trim() || null,
          shareExpiresAt: shareExpiresAt || null,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success(t.common.saved);
      router.refresh();
    } catch {
      toast.error(t.settings.saveError);
    } finally {
      setSavingInfo(false);
    }
  }

  async function saveAddress() {
    setSavingAddress(true);
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          addressCountry: addressCountry.trim() || null,
          addressCity: addressCity.trim() || null,
          addressPostalCode: addressPostalCode.trim() || null,
          addressStreet: addressStreet.trim() || null,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success(t.common.saved);
    } catch {
      toast.error(t.settings.saveError);
    } finally {
      setSavingAddress(false);
    }
  }

  async function addClient() {
    if (!newClientName.trim()) return;
    setAddingClient(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/clients`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newClientName.trim(),
          email: newClientEmail.trim() || null,
          phone: newClientPhone.trim() || null,
          isMainContact: newClientIsMain,
        }),
      });
      if (!res.ok) throw new Error();
      const created = await res.json();
      setClients((prev) => [...prev, created]);
      setNewClientName("");
      setNewClientEmail("");
      setNewClientPhone("");
      setNewClientIsMain(false);
      setShowAddClient(false);
      toast.success(t.projekty.clientAdded);
    } catch {
      toast.error(t.projekty.clientAddError);
    } finally {
      setAddingClient(false);
    }
  }

  function startEditing(client: ProjectClient) {
    setEditingClientId(client.id);
    setEditEmail(client.email ?? "");
    setEditPhone(client.phone ?? "");
  }

  function cancelEditing() {
    setEditingClientId(null);
    setEditEmail("");
    setEditPhone("");
  }

  async function saveClientEdit(clientId: string) {
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/clients/${clientId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: editEmail.trim() || null, phone: editPhone.trim() || null }),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setClients((prev) => prev.map((c) => c.id === clientId ? { ...c, email: updated.email, phone: updated.phone } : c));
      cancelEditing();
      toast.success(t.common.saved);
    } catch {
      toast.error(t.settings.saveError);
    } finally {
      setSavingEdit(false);
    }
  }

  async function setMainContact(clientId: string) {
    try {
      const res = await fetch(`/api/projects/${project.id}/clients/${clientId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isMainContact: true }),
      });
      if (!res.ok) throw new Error();
      setClients((prev) =>
        prev.map((c) => ({ ...c, isMainContact: c.id === clientId }))
      );
      toast.success(t.projekty.mainContactSet);
    } catch {
      toast.error(t.settings.saveError);
    }
  }

  async function removeClient(clientId: string) {
    try {
      const res = await fetch(`/api/projects/${project.id}/clients/${clientId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      setClients((prev) => prev.filter((c) => c.id !== clientId));
    } catch {
      toast.error(t.projekty.clientDeleteError);
    }
  }

  async function toggleClientCanUpload() {
    const newValue = !clientCanUpload;
    setClientCanUpload(newValue);
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientCanUpload: newValue }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setClientCanUpload(clientCanUpload);
      toast.error(t.settings.saveError);
    }
  }

  async function toggleModuleVisibility(slug: string) {
    const newHidden = hiddenModules.includes(slug)
      ? hiddenModules.filter((m) => m !== slug)
      : [...hiddenModules, slug];

    setHiddenModules(newHidden);
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hiddenModules: newHidden }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setHiddenModules(hiddenModules);
      toast.error(t.settings.saveError);
    }
  }

  function getModuleLink(slug: string) {
    if (slug === "renderflow") return `${window.location.origin}/share/${project.shareToken}`;
    if (slug === "listy") return `${window.location.origin}/share/${project.shareToken}/home`;
    return "";
  }

  function handleCopyLink(slug: string, label: string) {
    if (hiddenModules.includes(slug)) {
      const link = getModuleLink(slug);
      setWarningDialog({ open: true, slug, label, link });
      return;
    }
    navigator.clipboard.writeText(getModuleLink(slug));
    toast.success(t.common.linkCopied);
  }

  function forceCopy(link: string) {
    navigator.clipboard.writeText(link);
    setWarningDialog((d) => ({ ...d, open: false }));
    toast.success(t.common.linkCopied);
  }

  const hasResources = (slug: string) => {
    if (slug === "renderflow") return project.hasRenders;
    if (slug === "listy") return project.hasLists;
    return false;
  };

  return (
    <div className="max-w-3xl">
      {/* Back nav */}
      <div className="mb-6">
        <Link
          href="/projekty"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={15} />
          {t.projekty.title}
        </Link>
        <div className="flex items-center justify-between gap-3 mt-2">
          <h1 className="text-2xl font-bold">{project.title}</h1>
          <Button variant="outline" size="sm" onClick={copyPanelLink} className="gap-2 flex-shrink-0">
            {copiedPanel ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
            {copiedPanel ? "Skopiowano!" : "Kopiuj link do panelu"}
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        {/* === Info section === */}
        <section className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">
            {t.projekty.projectInfo}
          </h2>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="proj-title">{t.projekty.projectNameLabel}</Label>
              <Input
                id="proj-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Nazwa projektu"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="proj-desc">{t.projekty.descriptionLabel}</Label>
              <Textarea
                id="proj-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Opis projektu..."
                rows={3}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="proj-password">{t.projekty.passwordLink}</Label>
                <div className="relative">
                  <Input
                    id="proj-password"
                    type={showPassword ? "text" : "password"}
                    value={sharePassword}
                    onChange={(e) => setSharePassword(e.target.value)}
                    placeholder={t.projekty.noPassword}
                    className="pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="proj-expires">{t.projekty.expiresDate}</Label>
                <Input
                  id="proj-expires"
                  type="date"
                  value={shareExpiresAt}
                  onChange={(e) => setShareExpiresAt(e.target.value)}
                />
              </div>
            </div>
            <div className="flex items-center justify-between pt-1">
              <p className="text-xs text-muted-foreground">
                {t.projekty.createdAt}{" "}
                {new Date(project.createdAt).toLocaleDateString("pl-PL", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </p>
              <Button onClick={saveInfo} disabled={savingInfo || !title.trim()} size="sm">
                {savingInfo ? t.common.saving : t.common.save}
              </Button>
            </div>
          </div>
        </section>

        {/* === Address section === */}
        <section className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">
            {t.projekty.address}
          </h2>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="addr-street">{t.projekty.street}</Label>
                <Input
                  id="addr-street"
                  value={addressStreet}
                  onChange={(e) => setAddressStreet(e.target.value)}
                  placeholder={t.projekty.streetPlaceholder}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="addr-city">{t.projekty.city}</Label>
                <Input
                  id="addr-city"
                  value={addressCity}
                  onChange={(e) => setAddressCity(e.target.value)}
                  placeholder={t.projekty.cityPlaceholder}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="addr-postal">{t.projekty.postalCode}</Label>
                <Input
                  id="addr-postal"
                  value={addressPostalCode}
                  onChange={(e) => setAddressPostalCode(e.target.value)}
                  placeholder={t.projekty.postalCodePlaceholder}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="addr-country">{t.projekty.country}</Label>
                <Input
                  id="addr-country"
                  value={addressCountry}
                  onChange={(e) => setAddressCountry(e.target.value)}
                  placeholder={t.projekty.countryPlaceholder}
                />
              </div>
            </div>
            <div className="flex justify-end pt-1">
              <Button onClick={saveAddress} disabled={savingAddress} size="sm">
                {savingAddress ? t.common.saving : t.common.save}
              </Button>
            </div>
          </div>
        </section>

        {/* === Clients section === */}
        <section id="klienci" className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {t.projekty.clients}
            </h2>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => setShowAddClient((v) => !v)}
            >
              <Plus size={13} />
              {t.projekty.addClient}
            </Button>
          </div>

          {showAddClient && (
            <div className="mb-4 p-4 rounded-lg border border-border bg-muted/30 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>{t.projekty.clientFullName}</Label>
                  <Input
                    value={newClientName}
                    onChange={(e) => setNewClientName(e.target.value)}
                    placeholder={t.projekty.clientFullNamePlaceholder}
                    onKeyDown={(e) => e.key === "Enter" && addClient()}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t.projekty.clientEmailOpt}</Label>
                  <Input
                    type="email"
                    value={newClientEmail}
                    onChange={(e) => setNewClientEmail(e.target.value)}
                    placeholder="jan@example.com"
                    onKeyDown={(e) => e.key === "Enter" && addClient()}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Telefon (opcjonalnie)</Label>
                  <Input
                    type="tel"
                    value={newClientPhone}
                    onChange={(e) => setNewClientPhone(e.target.value)}
                    placeholder="+48 123 456 789"
                    onKeyDown={(e) => e.key === "Enter" && addClient()}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={newClientIsMain}
                    onChange={(e) => setNewClientIsMain(e.target.checked)}
                    className="rounded border-border"
                  />
                  <span className="text-sm">{t.projekty.mainContact}</span>
                </label>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setShowAddClient(false);
                      setNewClientName("");
                      setNewClientEmail("");
                      setNewClientPhone("");
                      setNewClientIsMain(false);
                    }}
                  >
                    {t.common.cancel}
                  </Button>
                  <Button
                    size="sm"
                    onClick={addClient}
                    disabled={addingClient || !newClientName.trim()}
                  >
                    {addingClient ? "Dodawanie..." : t.common.add}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {clients.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              {t.projekty.noClients}
            </p>
          ) : (
            <div className="space-y-2">
              {clients.map((client) => (
                <div
                  key={client.id}
                  className={`rounded-lg border bg-background transition-colors ${
                    client.isMainContact ? "border-primary/30 bg-primary/5" : "border-border"
                  }`}
                >
                  <div className="flex items-center justify-between px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{client.name}</p>
                        {client.isMainContact && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-primary text-white flex-shrink-0">
                            {t.projekty.mainContact}
                          </span>
                        )}
                      </div>
                      {(client.email || client.phone) && editingClientId !== client.id && (
                        <p className="text-xs text-muted-foreground truncate">
                          {[client.email, client.phone].filter(Boolean).join(" · ")}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 ml-3 flex-shrink-0">
                      {!client.isMainContact && (
                        <button
                          onClick={() => setMainContact(client.id)}
                          className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-muted"
                          title={t.projekty.setAsMain}
                        >
                          {t.projekty.setAsMain}
                        </button>
                      )}
                      <button
                        onClick={() => editingClientId === client.id ? cancelEditing() : startEditing(client)}
                        className="text-muted-foreground hover:text-foreground transition-colors p-1"
                        title="Edytuj email / telefon"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => removeClient(client.id)}
                        className="text-muted-foreground hover:text-destructive transition-colors p-1"
                        title="Usuń klienta"
                      >
                        <X size={15} />
                      </button>
                    </div>
                  </div>
                  {editingClientId === client.id && (
                    <div className="px-4 pb-3 space-y-2 border-t border-border/50 pt-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <Input
                          type="email"
                          value={editEmail}
                          onChange={(e) => setEditEmail(e.target.value)}
                          placeholder="Email"
                          className="h-8 text-sm"
                        />
                        <Input
                          type="tel"
                          value={editPhone}
                          onChange={(e) => setEditPhone(e.target.value)}
                          placeholder="Telefon"
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="flex gap-2 justify-end">
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={cancelEditing}>
                          {t.common.cancel}
                        </Button>
                        <Button size="sm" className="h-7 text-xs" onClick={() => saveClientEdit(client.id)} disabled={savingEdit}>
                          {savingEdit ? t.common.saving : t.common.save}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* === Modules section === */}
        <section className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">
            {t.projekty.modules}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {MODULES_CONFIG.map((mod) => {
              const label = t.projekty[mod.labelKey];
              const active = hasResources(mod.slug);
              const hidden = hiddenModules.includes(mod.slug);
              return (
                <div
                  key={mod.slug}
                  className={`rounded-xl border p-4 transition-colors ${
                    active ? "border-border bg-background" : "border-border/50 bg-muted/30"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        active ? "bg-primary" : "bg-muted"
                      }`}
                    >
                      {mod.icon === "renderflow" ? (
                        <Image
                          src="/logo-dark.svg"
                          alt="RenderFlow"
                          width={22}
                          height={22}
                          className={active ? "" : "opacity-40"}
                        />
                      ) : (
                        <ShoppingCart
                          size={18}
                          className={active ? "text-white" : "text-muted-foreground"}
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className={`text-sm font-semibold ${active ? "" : "text-muted-foreground"}`}>
                          {label}
                        </p>
                        <span
                          className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                            active
                              ? "bg-green-100 text-green-700"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {active ? t.projekty.moduleActive : t.projekty.moduleNoResources}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">{mod.description}</p>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={!hidden}
                        onCheckedChange={() => toggleModuleVisibility(mod.slug)}
                        id={`module-${mod.slug}`}
                      />
                      <Label
                        htmlFor={`module-${mod.slug}`}
                        className="text-xs cursor-pointer"
                      >
                        {hidden ? (
                          <span className="text-muted-foreground">{t.projekty.moduleHiddenClient}</span>
                        ) : (
                          <span>{t.projekty.moduleVisibleClient}</span>
                        )}
                      </Label>
                    </div>
                    <button
                      onClick={() => handleCopyLink(mod.slug, label)}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                      title={t.common.copyLink}
                    >
                      <Copy size={13} />
                      {t.common.copyLink}
                    </button>
                  </div>
                  {mod.slug === "renderflow" && (
                    <div className="mt-2 pt-2 border-t border-border/50 flex items-center gap-2">
                      <Switch
                        checked={clientCanUpload}
                        onCheckedChange={toggleClientCanUpload}
                        id="client-can-upload"
                      />
                      <Label htmlFor="client-can-upload" className="text-xs cursor-pointer">
                        {t.projekty.clientCanUploadLabel}
                      </Label>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* Warning dialog */}
      <Dialog
        open={warningDialog.open}
        onOpenChange={(open) => setWarningDialog((d) => ({ ...d, open }))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle size={18} className="text-amber-500" />
              {t.common.moduleHiddenForClient}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t.common.moduleNotVisible.replace("{module}", warningDialog.label)}
          </p>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setWarningDialog((d) => ({ ...d, open: false }))}
            >
              {t.common.close}
            </Button>
            <Button
              variant="ghost"
              className="gap-1.5"
              onClick={() => forceCopy(warningDialog.link)}
            >
              <Check size={14} />
              {t.common.copyAnyway}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
