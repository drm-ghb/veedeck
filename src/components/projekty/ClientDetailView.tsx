"use client";

import { useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  Pencil,
  Trash2,
  AlertTriangle,
  X,
  KeyRound,
  GripVertical,
  Check,
  Mail,
  Phone,
  Send,
  CheckCircle,
  PushPin,
  LocalMall,
  Info,
} from "@/components/ui/icons";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { PaymentsTab } from "@/components/projekty/PaymentsTab";
import { ScheduleTab } from "@/components/projekty/ScheduleTab";
import DocumentsTab from "@/components/projekty/DocumentsTab";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useT } from "@/lib/i18n";
import ClientHistoryTab from "@/components/projekty/ClientHistoryTab";
import { ACCENT_HUES, accentColors } from "@/lib/accent-color";
import { ColorPicker } from "@/components/moodboard/ColorPicker";

// ── Types ────────────────────────────────────────────────────────────────────

interface Contact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  isMainContact: boolean;
  isDecisionMaker: boolean;
  createdAt: string;
  userId: string | null;
  projectId: string | null;
  scheduleSharedWithClient: boolean;
  user: { id: string; login: string; email?: string | null; firstLoginAt?: string | null } | null;
}

interface ClientData {
  id: string;
  name: string;
  description: string | null;
  accentColor: string | null;
  startDate: string | null;
  endDate: string | null;
  addressStreet: string | null;
  addressCity: string | null;
  addressPostalCode: string | null;
  addressCountry: string | null;
  hiddenModules: string[];
  clientCanUpload: boolean;
  createdAt: string;
  contacts: Contact[];
}

interface Props {
  client: ClientData;
}

// ── Sortable contact row ─────────────────────────────────────────────────────

function SortableContactItem({ contact, children }: { contact: Contact; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: contact.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      className="relative"
    >
      <div className="absolute left-2 top-1/2 -translate-y-1/2 cursor-grab text-muted-foreground/40 hover:text-muted-foreground transition-colors touch-none z-10" {...attributes} {...listeners}>
        <GripVertical size={14} />
      </div>
      {children}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ClientDetailView({ client: initialClient }: Props) {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [clientName, setClientName] = useState(initialClient.name);
  const [clientDescription, setClientDescription] = useState(initialClient.description ?? "");
  const [clientStartDate, setClientStartDate] = useState(
    initialClient.startDate ? initialClient.startDate.slice(0, 10) : ""
  );
  const [clientEndDate, setClientEndDate] = useState(
    initialClient.endDate ? initialClient.endDate.slice(0, 10) : ""
  );
  const [savingInfo, setSavingInfo] = useState(false);

  const [addrStreet, setAddrStreet] = useState(initialClient.addressStreet ?? "");
  const [addrCity, setAddrCity] = useState(initialClient.addressCity ?? "");
  const [addrPostal, setAddrPostal] = useState(initialClient.addressPostalCode ?? "");
  const [addrCountry, setAddrCountry] = useState(initialClient.addressCountry ?? "");
  const [savingAddr, setSavingAddr] = useState(false);

  const [hiddenModules, setHiddenModules] = useState<string[]>(initialClient.hiddenModules);
  const [clientCanUpload, setClientCanUpload] = useState(initialClient.clientCanUpload);

  const [contacts, setContacts] = useState<Contact[]>(initialClient.contacts);
  const [accentColor, setAccentColor] = useState<string | null>(initialClient.accentColor);
  const [savingColor, setSavingColor] = useState(false);
  const [customHex, setCustomHex] = useState(() =>
    initialClient.accentColor?.startsWith("#") ? initialClient.accentColor : "#4f46e5"
  );
  const saveColorDebounceRef = useRef<ReturnType<typeof setTimeout>>();
  const [activeTab, setActiveTab] = useState<"info" | "contacts" | "payments" | "schedule" | "documents" | "history" | "settings">(
    searchParams.get("tab") === "contacts" ? "contacts" : "info"
  );

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // ── Add contact form ─────────────────────────────────────────────────────
  const [showAddContact, setShowAddContact] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newIsMain, setNewIsMain] = useState(false);
  const [addingContact, setAddingContact] = useState(false);

  // ── Inline edit ──────────────────────────────────────────────────────────
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // ── Create account inline ────────────────────────────────────────────────
  const [createAccountOpen, setCreateAccountOpen] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(initialClient.contacts.filter((c) => !c.userId).map((c) => [c.id, true]))
  );
  const [createAccountEmail, setCreateAccountEmail] = useState<Record<string, string>>(() =>
    Object.fromEntries(initialClient.contacts.filter((c) => !c.userId && c.email).map((c) => [c.id, c.email!]))
  );
  const [creatingAccount, setCreatingAccount] = useState<Record<string, boolean>>({});

  // ── Send access link ─────────────────────────────────────────────────────
  const [sendingLink, setSendingLink] = useState<Record<string, boolean>>({});


  // ── No-account banner ────────────────────────────────────────────────────
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const mainContact = contacts.find((c) => c.isMainContact) ?? contacts[0] ?? null;

  // ── Handlers ─────────────────────────────────────────────────────────────

  async function saveInfo() {
    if (!clientName.trim()) return;
    setSavingInfo(true);
    try {
      const res = await fetch(`/api/clients/${initialClient.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: clientName.trim(),
          description: clientDescription.trim() || null,
          startDate: clientStartDate || null,
          endDate: clientEndDate || null,
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
    setSavingAddr(true);
    try {
      const res = await fetch(`/api/clients/${initialClient.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          addressStreet: addrStreet.trim() || null,
          addressCity: addrCity.trim() || null,
          addressPostalCode: addrPostal.trim() || null,
          addressCountry: addrCountry.trim() || null,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success(t.common.saved);
    } catch {
      toast.error(t.settings.saveError);
    } finally {
      setSavingAddr(false);
    }
  }

  async function toggleModule(moduleKey: string) {
    const newHidden = hiddenModules.includes(moduleKey)
      ? hiddenModules.filter((m) => m !== moduleKey)
      : [...hiddenModules, moduleKey];
    setHiddenModules(newHidden);
    try {
      await fetch(`/api/clients/${initialClient.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hiddenModules: newHidden }),
      });
    } catch {
      toast.error(t.settings.saveError);
      setHiddenModules(hiddenModules);
    }
  }

  async function toggleClientUpload() {
    const newValue = !clientCanUpload;
    setClientCanUpload(newValue);
    try {
      await fetch(`/api/clients/${initialClient.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientCanUpload: newValue }),
      });
    } catch {
      toast.error(t.settings.saveError);
      setClientCanUpload(clientCanUpload);
    }
  }

  function handleContactDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = contacts.findIndex((c) => c.id === active.id);
    const newIndex = contacts.findIndex((c) => c.id === over.id);
    const reordered = arrayMove(contacts, oldIndex, newIndex);
    setContacts(reordered);
    fetch(`/api/clients/${initialClient.id}/contacts/reorder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: reordered.map((c) => c.id) }),
    }).catch(() => {});
  }

  async function addContact() {
    if (!newName.trim()) return;
    if (newEmail.trim() && !newEmail.includes("@")) {
      toast.error(t.projekty.emailInvalid);
      return;
    }
    setAddingContact(true);
    try {
      const res = await fetch(`/api/clients/${initialClient.id}/contacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          email: newEmail.trim() || null,
          phone: newPhone.trim() || null,
          isMainContact: newIsMain,
        }),
      });
      if (!res.ok) throw new Error();
      const created = await res.json();
      setContacts((prev) => [...prev, created]);
      setNewName("");
      setNewEmail("");
      setNewPhone("");
      setNewIsMain(false);
      setShowAddContact(false);
      toast.success(t.projekty.contactAdded);
    } catch {
      toast.error(t.projekty.contactAddError);
    } finally {
      setAddingContact(false);
    }
  }

  function startEditing(contact: Contact) {
    setEditingId(contact.id);
    setEditEmail(contact.email ?? "");
    setEditPhone(contact.phone ?? "");
  }

  function cancelEditing() {
    setEditingId(null);
    setEditEmail("");
    setEditPhone("");
  }

  async function saveContactEdit(contactId: string) {
    if (editEmail.trim() && !editEmail.includes("@")) {
      toast.error(t.projekty.emailInvalid);
      return;
    }
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/clients/${initialClient.id}/contacts/${contactId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: editEmail.trim() || null, phone: editPhone.trim() || null }),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setContacts((prev) => prev.map((c) => c.id === contactId ? { ...c, email: updated.email, phone: updated.phone } : c));
      cancelEditing();
      toast.success(t.common.saved);
    } catch {
      toast.error(t.settings.saveError);
    } finally {
      setSavingEdit(false);
    }
  }

  async function sendAccessLink(userId: string, contactId?: string) {
    const key = contactId ?? userId;
    setSendingLink((prev) => ({ ...prev, [key]: true }));
    try {
      const res = await fetch("/api/access/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error || "Błąd wysyłania linku");
      toast.success("Link dostępowy wysłany");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Nie udało się wysłać linku");
    } finally {
      setSendingLink((prev) => ({ ...prev, [key]: false }));
    }
  }

  async function setMainContact(contactId: string) {
    try {
      const res = await fetch(`/api/clients/${initialClient.id}/contacts/${contactId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isMainContact: true }),
      });
      if (!res.ok) throw new Error();
      setContacts((prev) => prev.map((c) => ({ ...c, isMainContact: c.id === contactId })));
      toast.success(t.projekty.mainContactSet);
    } catch {
      toast.error(t.settings.saveError);
    }
  }

  async function createContactAccount(contactId: string) {
    const accEmail = createAccountEmail[contactId]?.trim();
    if (accEmail && !accEmail.includes("@")) {
      toast.error(t.projekty.emailInvalid);
      return;
    }
    setCreatingAccount((prev) => ({ ...prev, [contactId]: true }));
    try {
      // Generate a random password — user will log in via magic link
      const autoPassword = Math.random().toString(36).slice(2, 10) + "Aa1!";
      const res = await fetch(`/api/clients/${initialClient.id}/contacts/${contactId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: autoPassword,
          ...(accEmail ? { email: accEmail.toLowerCase() } : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error || t.projekty.accountCreateError);
      setContacts((prev) =>
        prev.map((c) => c.id === contactId ? { ...c, userId: data.userId, user: data.user } : c)
      );
      setCreateAccountOpen((prev) => ({ ...prev, [contactId]: false }));
      toast.success(t.projekty.accountCreated);
      // Auto-send magic link if user has a real email
      if (data.user?.id && accEmail) {
        await sendAccessLink(data.user.id, contactId);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.projekty.accountCreateError);
    } finally {
      setCreatingAccount((prev) => ({ ...prev, [contactId]: false }));
    }
  }

  async function removeContact(contactId: string) {
    try {
      const res = await fetch(`/api/clients/${initialClient.id}/contacts/${contactId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      setContacts((prev) => prev.filter((c) => c.id !== contactId));
      toast.success(t.projekty.contactDeleted);
    } catch {
      toast.error(t.projekty.contactDeleteError);
    }
  }

  async function saveAccentColor(hue: string) {
    setSavingColor(true);
    setAccentColor(hue);
    try {
      await fetch(`/api/clients/${initialClient.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accentColor: hue }),
      });
      toast.success(t.common.saved);
      router.refresh();
    } catch {
      toast.error(t.settings.saveError);
    } finally {
      setSavingColor(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-5xl mx-auto">
      {/* Back nav */}
      <div className="mb-6">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Link href="/klienci" className="hover:text-foreground transition-colors">{t.projekty.title}</Link>
          <span>/</span>
          <span className="text-foreground font-medium truncate max-w-[200px]">{initialClient.name}</span>
        </div>
        <h1 className="text-2xl font-bold mt-2">{initialClient.name}</h1>
      </div>

      {/* No-account banner */}
      {!bannerDismissed && contacts.some((c) => !c.userId) && (
        <div className="mb-5 flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-3 py-2.5 text-sm text-amber-800 dark:text-amber-300">
          <AlertTriangle size={15} className="flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            {contacts.filter((c) => !c.userId).length === 1 ? (
              <>
                {t.projekty.bannerNoAccountSingle.replace("{name}", contacts.find((c) => !c.userId)?.name ?? "")}{" "}
                <button onClick={() => setActiveTab("contacts")} className="underline hover:no-underline">
                  {t.projekty.bannerContactsTabLink}
                </button>
              </>
            ) : (
              <>
                {t.projekty.bannerNoAccountMultiple.replace("{count}", String(contacts.filter((c) => !c.userId).length))}{" "}
                <button onClick={() => setActiveTab("contacts")} className="underline hover:no-underline">
                  {t.projekty.bannerContactsTabLinkMultiple}
                </button>
              </>
            )}
          </div>
          <button onClick={() => setBannerDismissed(true)} className="text-amber-500 hover:text-amber-700 flex-shrink-0 p-0.5">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border mb-6 overflow-x-auto scrollbar-none">
        {(["info", "contacts", "payments", "schedule", "documents", "history", "settings"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap flex-shrink-0 ${
              activeTab === tab
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab === "info" && t.projekty.tabInfo}
            {tab === "contacts" && t.projekty.clients}
            {tab === "payments" && t.projekty.tabPayments}
            {tab === "schedule" && t.projekty.tabSchedule}
            {tab === "history" && "Historia klienta"}
            {tab === "documents" && t.projekty.tabDocuments}
            {tab === "settings" && "Ustawienia klienta"}
          </button>
        ))}
      </div>

      {/* ── Tab: Informacje ogólne ─────────────────────────────────────────── */}
      {activeTab === "info" && (
        <div className="space-y-4">
          {/* Section 1: Informacje o kliencie */}
          <section className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{t.projekty.projectInfo}</h2>
            <div className="space-y-1.5">
              <Label htmlFor="client-name">{t.projekty.clientNameInputLabel}</Label>
              <Input
                id="client-name"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder={t.projekty.clientNameInputLabel}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="client-desc">{t.projekty.descriptionLabel}</Label>
              <Textarea
                id="client-desc"
                value={clientDescription}
                onChange={(e) => setClientDescription(e.target.value)}
                placeholder={t.projekty.descriptionPlaceholder}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5 min-w-0">
                <Label htmlFor="start-date">{t.projekty.startDateLabel}</Label>
                <div className="relative overflow-hidden">
                  <Input
                    id="start-date"
                    type="date"
                    value={clientStartDate}
                    onChange={(e) => setClientStartDate(e.target.value)}
                    className="pr-7 w-full max-w-full"
                  />
                  {clientStartDate && (
                    <button
                      type="button"
                      onClick={() => setClientStartDate("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>
              <div className="space-y-1.5 min-w-0">
                <Label htmlFor="end-date">{t.projekty.endDateLabel}</Label>
                <div className="relative overflow-hidden">
                  <Input
                    id="end-date"
                    type="date"
                    value={clientEndDate}
                    onChange={(e) => setClientEndDate(e.target.value)}
                    className="pr-7 w-full max-w-full"
                  />
                  {clientEndDate && (
                    <button
                      type="button"
                      onClick={() => setClientEndDate("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-sm text-muted-foreground">
                {t.projekty.createdAt} {new Date(initialClient.createdAt).toLocaleDateString("pl-PL", { day: "numeric", month: "long", year: "numeric" })}
              </span>
              <Button onClick={saveInfo} disabled={savingInfo || !clientName.trim()} size="sm">
                {savingInfo ? t.common.saving : t.common.save}
              </Button>
            </div>
          </section>

          {/* Section 2: Adres inwestycji */}
          <section className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{t.projekty.address}</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="addr-street">{t.projekty.street}</Label>
                <Input
                  id="addr-street"
                  value={addrStreet}
                  onChange={(e) => setAddrStreet(e.target.value)}
                  placeholder={t.projekty.streetPlaceholder}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="addr-city">{t.projekty.city}</Label>
                <Input
                  id="addr-city"
                  value={addrCity}
                  onChange={(e) => setAddrCity(e.target.value)}
                  placeholder={t.projekty.cityPlaceholder}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="addr-postal">{t.projekty.postalCode}</Label>
                <Input
                  id="addr-postal"
                  value={addrPostal}
                  onChange={(e) => setAddrPostal(e.target.value)}
                  placeholder={t.projekty.postalCodePlaceholder}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="addr-country">{t.projekty.country}</Label>
                <Input
                  id="addr-country"
                  value={addrCountry}
                  onChange={(e) => setAddrCountry(e.target.value)}
                  placeholder={t.projekty.countryPlaceholder}
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={saveAddress} disabled={savingAddr} size="sm">
                {savingAddr ? t.common.saving : t.common.save}
              </Button>
            </div>
          </section>

          {/* Section 3: Moduły */}
          <section className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{t.projekty.modules}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* RenderFlow tile */}
              <div className="border border-border rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
                    <PushPin size={20} className="text-primary-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{t.projekty.moduleRenderflow}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                        !hiddenModules.includes("renderflow")
                          ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                          : "bg-muted text-muted-foreground"
                      }`}>
                        {!hiddenModules.includes("renderflow") ? t.projekty.moduleActive : t.projekty.moduleHidden}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{t.projekty.moduleDescRenderflow}</p>
                  </div>
                </div>
                <div className="space-y-2 border-t border-border pt-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Switch
                      checked={!hiddenModules.includes("renderflow")}
                      onCheckedChange={() => toggleModule("renderflow")}
                    />
                    <span className="text-sm">{t.projekty.moduleVisibleClient}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Switch
                      checked={clientCanUpload}
                      onCheckedChange={toggleClientUpload}
                    />
                    <span className="text-sm">{t.projekty.clientCanUploadLabel}</span>
                  </label>
                </div>
              </div>

              {/* Listy tile */}
              <div className="border border-border rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
                    <LocalMall size={20} className="text-primary-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{t.projekty.moduleLists}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                        !hiddenModules.includes("listy")
                          ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                          : "bg-muted text-muted-foreground"
                      }`}>
                        {!hiddenModules.includes("listy") ? t.projekty.moduleActive : t.projekty.moduleHidden}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{t.projekty.moduleDescLists}</p>
                  </div>
                </div>
                <div className="space-y-2 border-t border-border pt-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Switch
                      checked={!hiddenModules.includes("listy")}
                      onCheckedChange={() => toggleModule("listy")}
                    />
                    <span className="text-sm">{t.projekty.moduleVisibleClient}</span>
                  </label>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* ── Tab: Kontakty ──────────────────────────────────────────────────── */}
      {activeTab === "contacts" && (
        <section className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{t.projekty.clients}</h2>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                className="gap-1.5"
                onClick={() => setShowAddContact(true)}
              >
                <Plus size={13} />
                {t.projekty.addClient}
              </Button>
            </div>
          </div>

          {contacts.length === 0 && !showAddContact ? (
            <div className="text-center py-10 text-muted-foreground">
              <p className="text-sm">{t.projekty.noContactsHint}</p>
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleContactDragEnd}>
              <SortableContext items={contacts.map((c) => c.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {contacts.map((contact) => (
                    <SortableContactItem key={contact.id} contact={contact}>
                      <div className="pl-7 pr-3 py-3 bg-card border border-border rounded-xl">
                        <div className="flex items-start gap-3">
                          {/* Avatar */}
                          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-sm font-semibold text-primary">
                              {contact.name.charAt(0).toUpperCase()}
                            </span>
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            {/* Name + badges */}
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-semibold text-sm text-foreground">{contact.name}</span>
                              {contact.isMainContact && (
                                <span className="inline-flex items-center text-[11px] px-1.5 py-0.5 rounded-md bg-primary/10 text-primary font-medium">
                                  {t.projekty.mainContactBadge}
                                </span>
                              )}
                              {contact.isDecisionMaker && (
                                <span className="text-[11px] px-1.5 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium">Decydent</span>
                              )}
                              {!contact.userId && (
                                <span className="text-[11px] px-1.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 font-medium">{t.projekty.noAccount}</span>
                              )}
                              {contact.userId && contact.user?.firstLoginAt && (
                                <span className="text-[11px] px-1.5 py-0.5 rounded-md bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium flex items-center gap-1">
                                  <CheckCircle size={10} />
                                  Aktywne
                                </span>
                              )}
                            </div>

                            {/* Edit form or contact details */}
                            {editingId === contact.id ? (
                              <div className="mt-2 space-y-2">
                                <div className="flex gap-2">
                                  <div className="relative flex-1">
                                    <Mail size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                                    <Input
                                      value={editEmail}
                                      onChange={(e) => setEditEmail(e.target.value)}
                                      placeholder={t.projekty.emailLabel}
                                      className="text-xs h-8 pl-7"
                                      type="email"
                                    />
                                  </div>
                                  <div className="relative flex-1">
                                    <Phone size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                                    <Input
                                      value={editPhone}
                                      onChange={(e) => setEditPhone(e.target.value)}
                                      placeholder={t.projekty.phonePlaceholder}
                                      className="text-xs h-8 pl-7"
                                    />
                                  </div>
                                </div>
                                <div className="flex gap-1.5">
                                  <Button size="sm" className="h-7 text-xs" disabled={savingEdit} onClick={() => saveContactEdit(contact.id)}>
                                    {savingEdit ? t.common.saving : t.common.save}
                                  </Button>
                                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={cancelEditing}>{t.common.cancel}</Button>
                                </div>
                              </div>
                            ) : (
                              <div className="mt-1 space-y-0.5">
                                {contact.email && (
                                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                                    <Mail size={11} className="flex-shrink-0" />
                                    {contact.email}
                                  </p>
                                )}
                                {contact.phone && (
                                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                                    <Phone size={11} className="flex-shrink-0" />
                                    {contact.phone}
                                  </p>
                                )}
                              </div>
                            )}

                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-0.5 flex-shrink-0">
                            {!contact.isMainContact && (
                              <button
                                title={t.projekty.setAsMain}
                                onClick={() => setMainContact(contact.id)}
                                className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                              >
                                <Check size={14} />
                              </button>
                            )}
                            <button
                              title={t.projekty.editContactShort}
                              onClick={() => editingId === contact.id ? cancelEditing() : startEditing(contact)}
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              title={t.projekty.deleteContact}
                              onClick={() => removeContact(contact.id)}
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        {/* Account section — pełna szerokość pod głównym wierszem */}
                        {contact.userId && contact.user && (
                          <div className="mt-2 pt-2 border-t border-border flex flex-wrap items-center gap-x-3 gap-y-1">
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <KeyRound size={11} />
                              <span className="font-mono">{contact.user.login}</span>
                            </span>
                            {!contact.user.firstLoginAt && (
                              <span className="text-xs text-muted-foreground">Nie aktywowano</span>
                            )}
                            {contact.user.email && !contact.user.email.endsWith(".internal") && (
                              <button
                                className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border border-border text-foreground hover:bg-muted transition-colors disabled:opacity-50 ml-auto"
                                disabled={!!sendingLink[contact.id]}
                                onClick={() => sendAccessLink(contact.user!.id, contact.id)}
                              >
                                <Send size={11} />
                                {sendingLink[contact.id] ? "Wysyłanie..." : "Wyślij link"}
                              </button>
                            )}
                          </div>
                        )}

                        {/* Create account section — pełna szerokość pod głównym wierszem */}
                        {!contact.userId && (
                          <div className="mt-2 pt-2 border-t border-border">
                            <div className="flex items-center gap-2 flex-wrap">
                              {!contact.email && (
                                <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1 flex-1 min-w-0">
                                  <Info size={11} className="flex-shrink-0" />
                                  <span>Brak adresu e-mail - dodaj, aby utworzyć konto.</span>
                                </p>
                              )}
                              <button
                                onClick={() => setCreateAccountOpen((prev) => ({ ...prev, [contact.id]: !prev[contact.id] }))}
                                className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors ml-auto shrink-0"
                              >
                                <KeyRound size={11} />
                                {createAccountOpen[contact.id] ? t.projekty.hide : t.projekty.createAccount}
                              </button>
                            </div>
                            {createAccountOpen[contact.id] && (
                              <div className="mt-2 p-2.5 rounded-lg bg-muted/50 border border-border space-y-2">
                                <div className="space-y-1">
                                  {contact.email ? (
                                    <div className="flex items-center gap-1.5">
                                      <Button
                                        size="sm"
                                        className="h-7 text-xs"
                                        disabled={!!creatingAccount[contact.id]}
                                        onClick={() => createContactAccount(contact.id)}
                                      >
                                        {creatingAccount[contact.id] ? t.projekty.creatingAccount : t.projekty.createAccount}
                                      </Button>
                                      <span className="text-xs text-muted-foreground">dla {contact.email}</span>
                                    </div>
                                  ) : (
                                    <>
                                      <p className="text-xs text-muted-foreground font-medium">{t.projekty.emailLoginLabel}</p>
                                      <div className="flex gap-1.5">
                                        <Input
                                          type="email"
                                          value={createAccountEmail[contact.id] ?? ""}
                                          onChange={(e) => setCreateAccountEmail((prev) => ({ ...prev, [contact.id]: e.target.value }))}
                                          placeholder={t.projekty.emailLoginHintShort}
                                          className="text-xs h-7 flex-1"
                                        />
                                        <Button
                                          size="sm"
                                          className="h-7 text-xs"
                                          disabled={!!creatingAccount[contact.id]}
                                          onClick={() => createContactAccount(contact.id)}
                                        >
                                          {creatingAccount[contact.id] ? t.projekty.creatingAccount : t.projekty.createAccount}
                                        </Button>
                                      </div>
                                    </>
                                  )}
                                  <p className="text-xs text-muted-foreground">Klient zaloguje się przez link wysłany e-mailem.</p>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </SortableContactItem>
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}

          {/* Add contact form */}
          {showAddContact && (
            <div className="mt-4 p-4 border border-border rounded-xl bg-muted/30 space-y-3">
              <p className="text-sm font-medium">{t.projekty.newContact}</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 space-y-1">
                  <Label className="text-xs">{t.projekty.clientFullName}</Label>
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Jan Kowalski"
                    autoFocus
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{t.projekty.emailLabel}</Label>
                  <Input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="jan@domena.pl"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{t.projekty.phoneLabel}</Label>
                  <Input
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="+48 123 456 789"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="new-main"
                  checked={newIsMain}
                  onChange={(e) => setNewIsMain(e.target.checked)}
                  className="rounded border-border"
                />
                <Label htmlFor="new-main" className="text-xs cursor-pointer">{t.projekty.mainContact}</Label>
              </div>
              <div className="flex gap-2 justify-end">
                <Button size="sm" variant="outline" onClick={() => { setShowAddContact(false); setNewName(""); setNewEmail(""); setNewPhone(""); }}>
                  {t.common.cancel}
                </Button>
                <Button size="sm" disabled={addingContact || !newName.trim()} onClick={addContact}>
                  {addingContact ? t.projekty.adding : t.common.add}
                </Button>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ── Tab: Płatności ─────────────────────────────────────────────────── */}
      {activeTab === "payments" && (
        mainContact ? (
          <PaymentsTab
            clientId={mainContact.id}
            paymentsSharedWithClient={false}
          />
        ) : (
          <div className="bg-card border border-border rounded-xl p-10 text-center text-muted-foreground">
            <p className="text-sm">{t.projekty.addContactHint} <button onClick={() => setActiveTab("contacts")} className="underline hover:no-underline">{t.projekty.clients}</button>, {t.projekty.paymentsConfigSuffix}</p>
          </div>
        )
      )}

      {/* ── Tab: Harmonogram ───────────────────────────────────────────────── */}
      {activeTab === "schedule" && (
        mainContact ? (
          <ScheduleTab
            clientId={mainContact.id}
            projectId={mainContact.projectId ?? undefined}
            scheduleSharedWithClient={mainContact.scheduleSharedWithClient}
          />
        ) : (
          <div className="bg-card border border-border rounded-xl p-10 text-center text-muted-foreground">
            <p className="text-sm">{t.projekty.addContactHint} <button onClick={() => setActiveTab("contacts")} className="underline hover:no-underline">{t.projekty.clients}</button>, {t.projekty.scheduleConfigSuffix}</p>
          </div>
        )
      )}

      {/* ── Tab: Dokumenty ─────────────────────────────────────────────────── */}
      {activeTab === "documents" && (
        mainContact ? (
          <section className="bg-card border border-border rounded-xl p-5">
            <DocumentsTab clientId={mainContact.id} />
          </section>
        ) : (
          <div className="bg-card border border-border rounded-xl p-10 text-center text-muted-foreground">
            <p className="text-sm">{t.projekty.addContactHint} <button onClick={() => setActiveTab("contacts")} className="underline hover:no-underline">{t.projekty.clients}</button>, {t.projekty.documentsConfigSuffix}</p>
          </div>
        )
      )}

      {/* ── Tab: Historia klienta ────────────────────────────────────────── */}
      {activeTab === "history" && (
        <ClientHistoryTab apiUrl={`/api/klienci/${initialClient.id}/client-history`} />
      )}

      {/* ── Tab: Ustawienia klienta ───────────────────────────────────────── */}
      {activeTab === "settings" && (
        <section className="bg-card border border-border rounded-xl p-5 space-y-4">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-1">Kolor klienta</h2>
            <p className="text-sm text-muted-foreground">Kolor pojawia się na liście klientów i kafelkach projektów przypisanych do tego klienta.</p>
          </div>
          <div className="flex flex-wrap gap-3 items-center">
            {ACCENT_HUES.map((hue) => {
              const c = accentColors(hue);
              const selected = accentColor === hue;
              return (
                <button
                  key={hue}
                  disabled={savingColor}
                  onClick={() => saveAccentColor(hue)}
                  title={`Hue ${hue}`}
                  className="w-9 h-9 rounded-full flex items-center justify-center transition-transform hover:scale-110 disabled:opacity-60"
                  style={{
                    background: c.bar,
                    outline: selected ? `3px solid ${c.bar}` : "none",
                    outlineOffset: selected ? "2px" : "0",
                  }}
                >
                  {selected && (
                    <span className="material-symbols-rounded text-white" style={{ fontSize: 18, fontVariationSettings: "'wght' 600" }}>
                      check
                    </span>
                  )}
                </button>
              );
            })}

            {/* Divider */}
            <div className="w-px h-8 bg-border" />

            {/* Custom color picker */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Własny:</span>
              <div style={accentColor?.startsWith("#") ? { outline: `3px solid ${customHex}`, outlineOffset: "2px", borderRadius: "10px" } : {}}>
                <ColorPicker
                  value={customHex}
                  onChange={(hex) => {
                    setCustomHex(hex);
                    clearTimeout(saveColorDebounceRef.current);
                    saveColorDebounceRef.current = setTimeout(() => {
                      saveAccentColor(hex);
                    }, 600);
                  }}
                  openDown
                />
              </div>
            </div>
          </div>
        </section>
      )}

    </div>
  );
}
