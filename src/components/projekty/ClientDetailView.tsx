"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  Trash2,
  AlertTriangle,
  X,
  KeyRound,
  Check,
  Mail,
  Phone,
  Send,
  CheckCircle,
  PushPin,
  LocalMall,
  Info,
  Copy,
  Clock,
  ChevronDown,
  MoreVertical,
  Pencil,
} from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { DatePicker } from "@/components/ui/date-picker";
import { PaymentsTab } from "@/components/projekty/PaymentsTab";
import { ScheduleTab } from "@/components/projekty/ScheduleTab";
import DocumentsTab from "@/components/projekty/DocumentsTab";
import { toast } from "sonner";
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
import { GripVertical } from "@/components/ui/icons";
import { useT } from "@/lib/i18n";
import ClientHistoryTab from "@/components/projekty/ClientHistoryTab";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { ACCENT_HUES, accentColors } from "@/lib/accent-color";
import { ColorPicker } from "@/components/moodboard/ColorPicker";
import { showConfirm } from "@/lib/confirm";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Contact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  description: string | null;
  isMainContact: boolean;
  isDecisionMaker: boolean;
  emailNotifications: boolean;
  createdAt: string;
  userId: string | null;
  projectId: string | null;
  scheduleSharedWithClient: boolean;
  lastLoginAt: string | null;
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
  defaultCurrency?: string;
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("pl-PL", { day: "numeric", month: "short", year: "numeric" });
}

// ── Sortable contact row (accounts tab) ───────────────────────────────────────

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

// ── Main component ─────────────────────────────────────────────────────────────

export default function ClientDetailView({ client: initialClient, defaultCurrency = "PLN" }: Props) {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();

  // ── Client info state ────────────────────────────────────────────────────
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
  const saveColorDebounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // ── Tab ──────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<"info" | "accounts" | "payments" | "schedule" | "documents" | "history" | "settings">(
    searchParams.get("tab") === "accounts" ? "accounts" : "info"
  );

  // ── Accordion (info tab) ─────────────────────────────────────────────────
  const [accordionOpen, setAccordionOpen] = useState<Record<string, boolean>>({});
  function toggleAccordion(key: string) {
    setAccordionOpen((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  // ── Contact context menu ─────────────────────────────────────────────────
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  useEffect(() => {
    if (!openMenuId) return;
    function handle(e: MouseEvent) {
      if (!(e.target as HTMLElement).closest("[data-contact-menu]")) {
        setOpenMenuId(null);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [openMenuId]);

  // ── Edit drawer ──────────────────────────────────────────────────────────
  const [drawerContact, setDrawerContact] = useState<Contact | null>(null);
  const [drawerName, setDrawerName] = useState("");
  const [drawerRole, setDrawerRole] = useState("");
  const [drawerEmail, setDrawerEmail] = useState("");
  const [drawerPhone, setDrawerPhone] = useState("");
  const [drawerIsMain, setDrawerIsMain] = useState(false);
  const [savingDrawer, setSavingDrawer] = useState(false);

  function openDrawer(contact: Contact) {
    setOpenMenuId(null);
    setDrawerContact(contact);
    setDrawerName(contact.name);
    setDrawerRole(contact.description ?? "");
    setDrawerEmail(contact.email ?? "");
    setDrawerPhone(contact.phone ?? "");
    setDrawerIsMain(contact.isMainContact);
  }

  function closeDrawer() {
    setDrawerContact(null);
  }

  // ── Add contact form ─────────────────────────────────────────────────────
  const [showAddContact, setShowAddContact] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [addingContact, setAddingContact] = useState(false);

  // ── Accounts tab state ────────────────────────────────────────────────────
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const [createAccountOpen, setCreateAccountOpen] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(initialClient.contacts.filter((c) => !c.userId).map((c) => [c.id, true]))
  );
  const [createAccountEmail, setCreateAccountEmail] = useState<Record<string, string>>(() =>
    Object.fromEntries(initialClient.contacts.filter((c) => !c.userId && c.email).map((c) => [c.id, c.email!]))
  );
  const [creatingAccount, setCreatingAccount] = useState<Record<string, boolean>>({});
  const [deactivatingAccount, setDeactivatingAccount] = useState<Record<string, boolean>>({});
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [addAccountContactId, setAddAccountContactId] = useState("");
  const [addAccountEmail, setAddAccountEmail] = useState("");
  const [addingAccount, setAddingAccount] = useState(false);
  const [contactDropdownOpen, setContactDropdownOpen] = useState(false);
  const contactDropdownRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!contactDropdownOpen) return;
    function handle(e: MouseEvent) {
      if (!contactDropdownRef.current?.contains(e.target as Node)) {
        setContactDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [contactDropdownOpen]);
  const [sendingLink, setSendingLink] = useState<Record<string, boolean>>({});
  const [copyingLink, setCopyingLink] = useState<Record<string, boolean>>({});

  // ── No-account banner ────────────────────────────────────────────────────
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const mainContact = contacts.find((c) => c.isMainContact) ?? contacts[0] ?? null;
  const nonMainContacts = contacts.filter((c) => !c.isMainContact);

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

  async function saveDrawer() {
    if (!drawerContact) return;
    if (!drawerName.trim()) { toast.error("Imię jest wymagane"); return; }
    setSavingDrawer(true);
    try {
      const res = await fetch(`/api/clients/${initialClient.id}/contacts/${drawerContact.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: drawerName.trim(),
          email: drawerEmail.trim() || null,
          phone: drawerPhone.trim() || null,
          description: drawerRole.trim() || null,
          ...(drawerIsMain && !drawerContact.isMainContact ? { isMainContact: true } : {}),
        }),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setContacts((prev) =>
        prev.map((c) => {
          if (c.id === drawerContact.id) {
            return {
              ...c,
              name: updated.name ?? drawerName.trim(),
              email: updated.email,
              phone: updated.phone,
              description: updated.description ?? null,
              isMainContact: drawerIsMain,
            };
          }
          if (drawerIsMain) return { ...c, isMainContact: false };
          return c;
        })
      );
      closeDrawer();
      toast.success(t.common.saved);
    } catch {
      toast.error(t.settings.saveError);
    } finally {
      setSavingDrawer(false);
    }
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
          description: newDescription.trim() || null,
          isMainContact: false,
        }),
      });
      if (!res.ok) throw new Error();
      const created = await res.json();
      setContacts((prev) => [...prev, {
        ...created,
        description: created.description ?? null,
        isDecisionMaker: created.isDecisionMaker ?? false,
        projectId: created.projectId ?? null,
        scheduleSharedWithClient: false,
        lastLoginAt: null,
        user: created.user ?? null,
      }]);
      setNewName(""); setNewEmail(""); setNewPhone(""); setNewDescription("");
      setShowAddContact(false);
      toast.success(t.projekty.contactAdded);
    } catch {
      toast.error(t.projekty.contactAddError);
    } finally {
      setAddingContact(false);
    }
  }

  async function removeContact(contactId: string) {
    if (!await showConfirm("Czy na pewno chcesz usunąć ten kontakt?")) return;
    try {
      const res = await fetch(`/api/clients/${initialClient.id}/contacts/${contactId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setContacts((prev) => {
        const removed = prev.find((c) => c.id === contactId);
        const remaining = prev.filter((c) => c.id !== contactId);
        // If we removed the main contact, promote the first remaining one
        if (removed?.isMainContact && remaining.length > 0) {
          remaining[0] = { ...remaining[0], isMainContact: true };
        }
        return remaining;
      });
      toast.success(t.projekty.contactDeleted);
    } catch {
      toast.error(t.projekty.contactDeleteError);
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

  async function copyAccessLink(userId: string) {
    setCopyingLink((prev) => ({ ...prev, [userId]: true }));
    try {
      const res = await fetch("/api/access/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error || "Błąd");
      await navigator.clipboard.writeText((data as { link: string }).link);
      toast.success("Link skopiowany do schowka");
    } catch {
      toast.error("Nie udało się skopiować linku");
    } finally {
      setCopyingLink((prev) => ({ ...prev, [userId]: false }));
    }
  }

  async function deactivateAccount(contact: Contact) {
    if (!await showConfirm(`Czy na pewno chcesz dezaktywować konto klienta „${contact.name}"? Klient straci dostęp do panelu.`)) return;
    setDeactivatingAccount((prev) => ({ ...prev, [contact.id]: true }));
    try {
      const res = await fetch(`/api/clients/${initialClient.id}/contacts/${contact.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "deactivate" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error || "Błąd dezaktywacji");
      setContacts((prev) => prev.map((c) => c.id === contact.id ? { ...c, userId: null, user: null } : c));
      toast.success("Konto zostało dezaktywowane");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Błąd dezaktywacji");
    } finally {
      setDeactivatingAccount((prev) => ({ ...prev, [contact.id]: false }));
    }
  }

  async function toggleEmailNotifications(contactId: string, value: boolean) {
    setContacts((prev) => prev.map((c) => c.id === contactId ? { ...c, emailNotifications: value } : c));
    try {
      const res = await fetch(`/api/clients/${initialClient.id}/contacts/${contactId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailNotifications: value }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setContacts((prev) => prev.map((c) => c.id === contactId ? { ...c, emailNotifications: !value } : c));
      toast.error("Nie udało się zmienić ustawień powiadomień");
    }
  }

  async function createContactAccount(contactId: string) {
    const contact = contacts.find((c) => c.id === contactId);
    const accEmail = (createAccountEmail[contactId]?.trim() || contact?.email || "").toLowerCase();
    if (accEmail && !accEmail.includes("@")) { toast.error(t.projekty.emailInvalid); return; }
    setCreatingAccount((prev) => ({ ...prev, [contactId]: true }));
    try {
      const autoPassword = Math.random().toString(36).slice(2, 10) + "Aa1!";
      const res = await fetch(`/api/clients/${initialClient.id}/contacts/${contactId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: autoPassword, ...(accEmail ? { email: accEmail } : {}) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error || t.projekty.accountCreateError);
      setContacts((prev) => prev.map((c) => c.id === contactId ? { ...c, userId: data.userId, user: data.user, emailNotifications: true } : c));
      setCreateAccountOpen((prev) => ({ ...prev, [contactId]: false }));
      toast.success(t.projekty.accountCreated);
      if (data.user?.id && accEmail) await sendAccessLink(data.user.id, contactId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.projekty.accountCreateError);
    } finally {
      setCreatingAccount((prev) => ({ ...prev, [contactId]: false }));
    }
  }

  async function addContactAccount() {
    if (!addAccountContactId) { toast.error("Wybierz kontakt"); return; }
    const contact = contacts.find((c) => c.id === addAccountContactId);
    const email = addAccountEmail.trim() || contact?.email || "";
    setAddingAccount(true);
    try {
      const autoPassword = Math.random().toString(36).slice(2, 10) + "Aa1!";
      const res = await fetch(`/api/clients/${initialClient.id}/contacts/${addAccountContactId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: autoPassword, ...(email ? { email } : {}) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error || t.projekty.accountCreateError);
      setContacts((prev) => prev.map((c) => c.id === addAccountContactId ? { ...c, userId: data.userId, user: data.user, emailNotifications: true } : c));
      setShowAddAccount(false); setAddAccountContactId(""); setAddAccountEmail("");
      toast.success(t.projekty.accountCreated);
      if (data.user?.id && email) await sendAccessLink(data.user.id, addAccountContactId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.projekty.accountCreateError);
    } finally {
      setAddingAccount(false);
    }
  }

  function handleContactDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = nonMainContacts.findIndex((c) => c.id === active.id);
    const newIndex = nonMainContacts.findIndex((c) => c.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(nonMainContacts, oldIndex, newIndex);
    const newContacts = mainContact ? [mainContact, ...reordered] : reordered;
    setContacts(newContacts);
    fetch(`/api/clients/${initialClient.id}/contacts/reorder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: newContacts.map((c) => c.id) }),
    }).catch(() => {});
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
    <div>
      {/* Back nav */}
      <div className="mb-6">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Link href="/klienci" className="hover:text-foreground transition-colors">{t.projekty.title}</Link>
          <span>/</span>
          <span className="text-foreground font-medium truncate max-w-[200px]">{initialClient.name}</span>
        </div>
        <h1 className="text-[19px] font-bold mt-1.5 font-[Inter]">{initialClient.name}</h1>
      </div>

      {/* No-account banner — only when main contact has no account */}
      {!bannerDismissed && mainContact && !mainContact.userId && (
        <div className="mb-5 flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-3 py-2.5 text-sm text-amber-800 dark:text-amber-300">
          <AlertTriangle size={15} className="flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            {t.projekty.bannerNoAccountSingle.replace("{name}", mainContact.name)}{" "}
            <button onClick={() => setActiveTab("accounts")} className="underline hover:no-underline">{t.projekty.bannerContactsTabLink}</button>
          </div>
          <button onClick={() => setBannerDismissed(true)} className="text-amber-500 hover:text-amber-700 flex-shrink-0 p-0.5">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border mb-0 overflow-x-auto scrollbar-none">
        {(["info", "accounts", "payments", "schedule", "documents", "history", "settings"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-[13px] font-semibold transition-colors border-b-2 -mb-px whitespace-nowrap flex-shrink-0 ${
              activeTab === tab
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab === "info" && "Informacje o kliencie"}
            {tab === "accounts" && "Konto klienta"}
            {tab === "payments" && t.projekty.tabPayments}
            {tab === "schedule" && t.projekty.tabSchedule}
            {tab === "history" && "Historia klienta"}
            {tab === "documents" && t.projekty.tabDocuments}
            {tab === "settings" && "Ustawienia klienta"}
          </button>
        ))}
      </div>

      {/* ── Tab: Informacje o kliencie ─────────────────────────────────────── */}
      {activeTab === "info" && (
        <div className="pt-4">
          {/* Created date */}
          <p className="text-[12px] text-muted-foreground mb-[18px]">
            Utworzono: {new Date(initialClient.createdAt).toLocaleDateString("pl-PL", { day: "numeric", month: "long", year: "numeric" })}
          </p>

          {/* Contacts section */}
          <div className="border-t border-border pt-4 mb-[18px]">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[13px] font-bold text-foreground">Kontakty</h2>
              <button
                onClick={() => setShowAddContact((v) => !v)}
                className="inline-flex items-center gap-1 text-[12px] font-semibold text-white bg-primary rounded-lg px-3 py-1.5 hover:bg-primary/90 transition-colors"
              >
                <Plus size={15} />
                Dodaj
              </button>
            </div>

            {/* Add contact form */}
            {showAddContact && (
              <div className="mb-3 p-4 border border-border rounded-[10px] bg-[#FAFAFB] dark:bg-muted/30 space-y-3">
                <p className="text-[13px] font-semibold">{t.projekty.newContact}</p>
                <div className="space-y-2">
                  <div className="space-y-1">
                    <Label className="text-[12.5px] font-medium">{t.projekty.clientFullName}</Label>
                    <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Jan Kowalski" autoFocus className="border-border rounded-lg" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[12.5px] font-medium">Rola</Label>
                    <Input value={newDescription} onChange={(e) => setNewDescription(e.target.value)} placeholder="np. Inwestor, Architekt..." className="border-border rounded-lg" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[12.5px] font-medium">{t.projekty.emailLabel}</Label>
                      <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="jan@domena.pl" className="border-border rounded-lg" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[12.5px] font-medium">{t.projekty.phoneLabel}</Label>
                      <Input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="+48 123 456 789" className="border-border rounded-lg" />
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button size="sm" variant="outline" onClick={() => { setShowAddContact(false); setNewName(""); setNewEmail(""); setNewPhone(""); setNewDescription(""); }}>
                    {t.common.cancel}
                  </Button>
                  <Button size="sm" disabled={addingContact || !newName.trim()} onClick={addContact}>
                    {addingContact ? t.projekty.adding : t.common.add}
                  </Button>
                </div>
              </div>
            )}

            {contacts.length === 0 && !showAddContact ? (
              <p className="text-[12.5px] text-muted-foreground py-4">{t.projekty.noContactsHint}</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-[10px]">
                {contacts.map((contact) => {
                  const isMain = contact.isMainContact;
                  const initials = contact.name.split(" ").map((p) => p[0]).join("").toUpperCase().slice(0, 2);
                  return (
                    <div
                      key={contact.id}
                      className={`flex items-center gap-[10px] rounded-[10px] px-3 py-2.5 border transition-shadow hover:shadow-[0_8px_22px_-14px_rgba(24,24,50,0.15)] ${
                        isMain
                          ? "bg-[#EEF2FF] dark:bg-indigo-950/40 border-[#E0E7FF] dark:border-indigo-800"
                          : "bg-white dark:bg-card border-border"
                      }`}
                    >
                      {/* Avatar */}
                      <div
                        className="w-[34px] h-[34px] rounded-full flex items-center justify-center flex-shrink-0 text-white text-[12px] font-bold"
                        style={{ background: isMain ? "#4F46E5" : "#c7cbe0" }}
                      >
                        {initials}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold leading-tight flex items-center gap-1.5 flex-wrap">
                          {contact.name}
                          {isMain && (
                            <span className="text-[10px] font-bold bg-primary text-white px-2 py-0.5 rounded-full tracking-wide">
                              GŁÓWNY
                            </span>
                          )}
                        </p>
                        {contact.description && (
                          <p className="text-[11px] text-muted-foreground mt-[1px] truncate">{contact.description}</p>
                        )}
                        <div className="flex flex-col gap-0 mt-[2px]">
                          {contact.email && (
                            <p className="text-[11px] text-muted-foreground flex items-center gap-1 truncate">
                              <Mail size={10} className="flex-shrink-0" />{contact.email}
                            </p>
                          )}
                          {contact.phone && (
                            <p className="text-[11px] text-muted-foreground flex items-center gap-1 truncate">
                              <Phone size={10} className="flex-shrink-0" />{contact.phone}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 flex-shrink-0" data-contact-menu>
                        {isMain && contact.phone && (
                          <a
                            href={`tel:${contact.phone}`}
                            className="w-[26px] h-[26px] rounded-lg flex items-center justify-center text-muted-foreground hover:bg-[#EEF2FF] hover:text-primary transition-colors"
                            title={contact.phone}
                          >
                            <Phone size={15} />
                          </a>
                        )}
                        {isMain && contact.email && (
                          <a
                            href={`mailto:${contact.email}`}
                            className="w-[26px] h-[26px] rounded-lg flex items-center justify-center text-muted-foreground hover:bg-[#EEF2FF] hover:text-primary transition-colors"
                            title={contact.email}
                          >
                            <Mail size={15} />
                          </a>
                        )}
                        {/* Three dots */}
                        <div className="relative" data-contact-menu>
                          <button
                            onClick={() => setOpenMenuId(openMenuId === contact.id ? null : contact.id)}
                            className="w-[26px] h-[26px] rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                          >
                            <MoreVertical size={15} />
                          </button>
                          {openMenuId === contact.id && (
                            <div className="absolute top-[30px] right-0 bg-white dark:bg-popover border border-border rounded-lg shadow-[0_12px_28px_-12px_rgba(24,24,50,0.25)] min-w-[140px] z-10 p-1" data-contact-menu>
                              <button
                                onClick={() => openDrawer(contact)}
                                className="w-full flex items-center gap-2 text-[12.5px] font-medium px-[10px] py-2 rounded-md hover:bg-[#FAFAFB] dark:hover:bg-muted transition-colors text-left"
                              >
                                <Pencil size={15} />
                                Edytuj
                              </button>
                              <button
                                onClick={() => { setOpenMenuId(null); removeContact(contact.id); }}
                                className="w-full flex items-center gap-2 text-[12.5px] font-medium px-[10px] py-2 rounded-md hover:bg-[#FAFAFB] dark:hover:bg-muted transition-colors text-left text-destructive"
                              >
                                <Trash2 size={15} />
                                Usuń
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Accordion: Informacje o kliencie */}
          <div className="border border-border rounded-[10px] mb-3 overflow-hidden">
            <button
              onClick={() => toggleAccordion("info")}
              className="w-full flex items-center justify-between px-[18px] py-[14px] bg-[#FAFAFB] dark:bg-muted/30 text-left"
            >
              <span className="text-[11px] font-bold tracking-[0.05em] uppercase text-muted-foreground">Informacje o kliencie</span>
              <ChevronDown
                size={18}
                className={`text-muted-foreground transition-transform duration-150 ${accordionOpen["info"] ? "rotate-180" : ""}`}
              />
            </button>
            {!accordionOpen["info"] && (
              <div className="px-[14px] py-[10px] bg-[#FAFAFB] dark:bg-muted/30 border-t border-border flex flex-col gap-[2px]">
                <p className="text-[11.5px] font-medium text-foreground">{clientName}</p>
                {clientDescription && <p className="text-[11px] text-muted-foreground">{clientDescription}</p>}
                {(clientStartDate || clientEndDate) && (
                  <p className="text-[11px] text-muted-foreground">
                    {clientStartDate && `Od: ${formatDate(clientStartDate + "T00:00:00")}`}
                    {clientStartDate && clientEndDate && " · "}
                    {clientEndDate && `Do: ${formatDate(clientEndDate + "T00:00:00")}`}
                  </p>
                )}
                {!clientDescription && !clientStartDate && !clientEndDate && (
                  <p className="text-[11px] text-muted-foreground">Brak szczegółowych danych</p>
                )}
              </div>
            )}
            {accordionOpen["info"] && (
              <div className="px-[18px] pb-[18px] pt-0.5 space-y-3.5">
                <div className="space-y-1.5">
                  <Label className="text-[12.5px] font-medium">{t.projekty.clientNameInputLabel}</Label>
                  <Input value={clientName} onChange={(e) => setClientName(e.target.value)} className="border-border rounded-lg" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[12.5px] font-medium">{t.projekty.descriptionLabel}</Label>
                  <Textarea value={clientDescription} onChange={(e) => setClientDescription(e.target.value)} placeholder={t.projekty.descriptionPlaceholder} rows={2} className="border-border rounded-lg" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[12.5px] font-medium">{t.projekty.startDateLabel}</Label>
                    <DatePicker value={clientStartDate} onChange={setClientStartDate} placeholder="DD.MM.RRRR" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[12.5px] font-medium">{t.projekty.endDateLabel}</Label>
                    <DatePicker value={clientEndDate} onChange={setClientEndDate} placeholder="DD.MM.RRRR" />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button onClick={saveInfo} disabled={savingInfo || !clientName.trim()} size="sm">
                    {savingInfo ? t.common.saving : t.common.save}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Accordion: Adres inwestycji */}
          <div className="border border-border rounded-[10px] mb-4 overflow-hidden">
            <button
              onClick={() => toggleAccordion("address")}
              className="w-full flex items-center justify-between px-[18px] py-[14px] bg-[#FAFAFB] dark:bg-muted/30 text-left"
            >
              <span className="text-[11px] font-bold tracking-[0.05em] uppercase text-muted-foreground">Adres inwestycji</span>
              <ChevronDown
                size={18}
                className={`text-muted-foreground transition-transform duration-150 ${accordionOpen["address"] ? "rotate-180" : ""}`}
              />
            </button>
            {!accordionOpen["address"] && (
              <div className="px-[14px] py-[10px] bg-[#FAFAFB] dark:bg-muted/30 border-t border-border flex flex-col gap-[2px]">
                {(addrStreet || addrCity || addrPostal || addrCountry) ? (
                  <>
                    {(addrStreet || addrCity) && (
                      <p className="text-[11.5px] font-medium text-foreground">{[addrStreet, addrCity].filter(Boolean).join(", ")}</p>
                    )}
                    {(addrPostal || addrCountry) && (
                      <p className="text-[11px] text-muted-foreground">{[addrPostal, addrCountry].filter(Boolean).join(", ")}</p>
                    )}
                  </>
                ) : (
                  <p className="text-[11px] text-muted-foreground">Brak adresu inwestycji</p>
                )}
              </div>
            )}
            {accordionOpen["address"] && (
              <div className="px-[18px] pb-[18px] pt-0.5 space-y-3.5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[12.5px] font-medium">{t.projekty.street}</Label>
                    <Input value={addrStreet} onChange={(e) => setAddrStreet(e.target.value)} placeholder="" className="border-border rounded-lg" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[12.5px] font-medium">{t.projekty.city}</Label>
                    <Input value={addrCity} onChange={(e) => setAddrCity(e.target.value)} placeholder="" className="border-border rounded-lg" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[12.5px] font-medium">{t.projekty.postalCode}</Label>
                    <Input value={addrPostal} onChange={(e) => setAddrPostal(e.target.value)} placeholder="" className="border-border rounded-lg" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[12.5px] font-medium">{t.projekty.country}</Label>
                    <Input value={addrCountry} onChange={(e) => setAddrCountry(e.target.value)} placeholder="" className="border-border rounded-lg" />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button onClick={saveAddress} disabled={savingAddr} size="sm">
                    {savingAddr ? t.common.saving : t.common.save}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Modules card */}
          <div className="bg-white dark:bg-card border border-border rounded-[12px] px-5 py-[18px]">
            <p className="text-[11px] font-bold tracking-[0.04em] uppercase text-muted-foreground mb-[14px]">Moduły</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-[14px]">
              {/* RenderFlow */}
              <div className="border border-border rounded-[10px] p-[14px]">
                <div className="flex gap-[10px] items-start">
                  <div className="w-8 h-8 rounded-lg bg-[#EEF2FF] dark:bg-indigo-950/40 flex items-center justify-center flex-shrink-0">
                    <PushPin size={17} className="text-primary" />
                  </div>
                  <div>
                    <h4 className="text-[13.5px] font-semibold flex items-center gap-1.5">
                      {t.projekty.moduleRenderflow}
                      <span className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full ${!hiddenModules.includes("renderflow") ? "bg-[#dcfce7] text-[#16a34a]" : "bg-muted text-muted-foreground"}`}>
                        {!hiddenModules.includes("renderflow") ? "Aktywny" : t.projekty.moduleHidden}
                      </span>
                    </h4>
                    <p className="text-[11.5px] text-muted-foreground mt-0.5">{t.projekty.moduleDescRenderflow}</p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-border space-y-2">
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-[12px]">{t.projekty.moduleVisibleClient}</span>
                    <Switch checked={!hiddenModules.includes("renderflow")} onCheckedChange={() => toggleModule("renderflow")} />
                  </label>
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-[12px]">{t.projekty.clientCanUploadLabel}</span>
                    <Switch checked={clientCanUpload} onCheckedChange={toggleClientUpload} />
                  </label>
                </div>
              </div>

              {/* Listy */}
              <div className="border border-border rounded-[10px] p-[14px]">
                <div className="flex gap-[10px] items-start">
                  <div className="w-8 h-8 rounded-lg bg-[#EEF2FF] dark:bg-indigo-950/40 flex items-center justify-center flex-shrink-0">
                    <LocalMall size={17} className="text-primary" />
                  </div>
                  <div>
                    <h4 className="text-[13.5px] font-semibold flex items-center gap-1.5">
                      {t.projekty.moduleLists}
                      <span className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full ${!hiddenModules.includes("listy") ? "bg-[#dcfce7] text-[#16a34a]" : "bg-muted text-muted-foreground"}`}>
                        {!hiddenModules.includes("listy") ? "Aktywny" : t.projekty.moduleHidden}
                      </span>
                    </h4>
                    <p className="text-[11.5px] text-muted-foreground mt-0.5">{t.projekty.moduleDescLists}</p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-border">
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-[12px]">{t.projekty.moduleVisibleClient}</span>
                    <Switch checked={!hiddenModules.includes("listy")} onCheckedChange={() => toggleModule("listy")} />
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: Konto klienta ─────────────────────────────────────────────── */}
      {activeTab === "accounts" && (
        <section className="bg-card border border-border rounded-xl p-5 mt-4">
          {/* Info note */}
          <div className="flex items-start gap-[10px] bg-[#EEF2FF] dark:bg-indigo-950/40 border border-[#E0E7FF] dark:border-indigo-800 rounded-[10px] px-[14px] py-3 mb-4">
            <Info size={18} className="text-primary flex-shrink-0 mt-[1px]" />
            <p className="text-[12.5px] text-foreground leading-relaxed">Konto umożliwia klientowi dostęp do panelu projektu przez indywidualny link lub hasło. Link jest stały i nie wygasa.</p>
          </div>

          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Konto klienta</h2>
            <Button size="sm" className="gap-1.5" onClick={() => setShowAddAccount((v) => !v)}>
              <Plus size={13} />
              Dodaj konto
            </Button>
          </div>

          {showAddAccount && (
            <div className="mb-4 p-4 border border-border rounded-xl bg-muted/30 space-y-3">
              <p className="text-sm font-medium">Dodaj konto dostępowe</p>
              <div className="space-y-1.5">
                <Label className="text-xs">Wybierz kontakt</Label>
                <div className="relative" ref={contactDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setContactDropdownOpen((v) => !v)}
                    className="w-full h-9 rounded-lg border border-border bg-background px-3 text-sm text-left flex items-center justify-between gap-2 focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <span className={addAccountContactId ? "text-foreground" : "text-muted-foreground"}>
                      {addAccountContactId
                        ? (() => { const c = contacts.find((c) => c.id === addAccountContactId); return c ? `${c.name}${c.email ? ` (${c.email})` : ""}` : "— wybierz kontakt —"; })()
                        : "— wybierz kontakt —"}
                    </span>
                    <ChevronDown size={14} className="text-muted-foreground flex-shrink-0" />
                  </button>
                  {contactDropdownOpen && (
                    <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-popover shadow-md py-1">
                      <button
                        type="button"
                        onClick={() => { setAddAccountContactId(""); setAddAccountEmail(""); setContactDropdownOpen(false); }}
                        className="w-full px-3 py-2 text-sm text-left text-muted-foreground hover:bg-muted transition-colors"
                      >
                        — wybierz kontakt —
                      </button>
                      {contacts.filter((c) => !c.userId).map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setAddAccountContactId(c.id);
                            setAddAccountEmail(c.email ?? "");
                            setContactDropdownOpen(false);
                          }}
                          className="w-full px-3 py-2 text-sm text-left text-foreground hover:bg-muted transition-colors"
                        >
                          {c.name}{c.email ? ` (${c.email})` : ""}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              {addAccountContactId && (
                <div className="space-y-1.5">
                  <Label className="text-xs">E-mail logowania</Label>
                  <Input type="email" value={addAccountEmail} onChange={(e) => setAddAccountEmail(e.target.value)} placeholder="email@domena.pl (opcjonalnie)" className="h-8 text-sm" />
                  <p className="text-xs text-muted-foreground">Pozostaw puste, jeśli kontakt ma już przypisany e-mail</p>
                </div>
              )}
              <div className="flex gap-2 justify-end">
                <Button size="sm" variant="outline" onClick={() => { setShowAddAccount(false); setAddAccountContactId(""); setAddAccountEmail(""); }}>{t.common.cancel}</Button>
                <Button size="sm" disabled={addingAccount || !addAccountContactId} onClick={addContactAccount}>
                  {addingAccount ? t.projekty.creatingAccount : t.projekty.createAccount}
                </Button>
              </div>
            </div>
          )}

          {contacts.filter((c) => c.userId).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">Brak kont. Kliknij „Dodaj konto" aby przypisać dostęp do jednego z kontaktów.</p>
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleContactDragEnd}>
              <SortableContext items={nonMainContacts.filter((c) => c.userId).map((c) => c.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {contacts.filter((c) => c.userId).map((contact) => (
                    <SortableContactItem key={contact.id} contact={contact}>
                      <div className={`pl-7 pr-4 py-3 bg-card border border-border rounded-xl ${contact.isMainContact ? "pl-4" : ""}`}>
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-sm font-semibold text-primary">{contact.name.charAt(0).toUpperCase()}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-semibold text-sm text-foreground">{contact.name}</span>
                              {contact.isMainContact && (
                                <span className="text-[11px] px-1.5 py-0.5 rounded-md bg-primary/10 text-primary font-medium">{t.projekty.mainContactBadge}</span>
                              )}
                              {!contact.userId && (
                                <span className="text-[11px] px-1.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 font-medium">{t.projekty.noAccount}</span>
                              )}
                              {contact.userId && contact.user && !contact.user.firstLoginAt && (
                                <span className="text-[11px] px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground font-medium">Nie aktywowano</span>
                              )}
                              {contact.userId && contact.user?.firstLoginAt && (
                                <span className="text-[11px] px-1.5 py-0.5 rounded-md bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium flex items-center gap-1">
                                  <CheckCircle size={10} />Aktywne
                                </span>
                              )}
                            </div>
                            {contact.email && <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5"><Mail size={11} className="flex-shrink-0" />{contact.email}</p>}
                            {contact.phone && <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Phone size={11} className="flex-shrink-0" />{contact.phone}</p>}
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger className="p-1 rounded-md hover:bg-muted text-muted-foreground flex-shrink-0 mt-0.5 disabled:opacity-40" disabled={!!deactivatingAccount[contact.id]}>
                              <MoreVertical size={15} />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem variant="destructive" onClick={() => deactivateAccount(contact)}>
                                <Trash2 size={14} />Dezaktywuj konto
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        {contact.userId && contact.user && (
                          <div className="mt-2 pt-2 border-t border-border space-y-1.5">
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                              <span className="flex items-center gap-1 text-xs text-muted-foreground"><KeyRound size={11} /><span className="font-mono">{contact.user.login}</span></span>
                              {contact.user.firstLoginAt && (
                                <span className="flex items-center gap-1 text-xs text-muted-foreground"><CheckCircle size={11} />Aktywny od: {formatDate(contact.user.firstLoginAt)}</span>
                              )}
                              {contact.lastLoginAt && (
                                <span className="flex items-center gap-1 text-xs text-muted-foreground"><Clock size={11} />Ostatnio aktywny: {formatDate(contact.lastLoginAt)}</span>
                              )}
                            </div>
                            {(contact.email || (contact.user.email && !contact.user.email.endsWith(".internal"))) && (
                              <div className="flex gap-1.5 flex-wrap">
                                <button
                                  className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border border-border text-foreground hover:bg-muted transition-colors disabled:opacity-50"
                                  disabled={!!sendingLink[contact.id]}
                                  onClick={() => sendAccessLink(contact.user!.id, contact.id)}
                                >
                                  <Send size={11} />{sendingLink[contact.id] ? "Wysyłanie..." : "Wyślij link"}
                                </button>
                                <button
                                  className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border border-border text-foreground hover:bg-muted transition-colors disabled:opacity-50"
                                  disabled={!!copyingLink[contact.user.id]}
                                  onClick={() => copyAccessLink(contact.user!.id)}
                                >
                                  <Copy size={11} />{copyingLink[contact.user.id] ? "Kopiowanie..." : "Kopiuj link"}
                                </button>
                              </div>
                            )}
                            <div className="flex items-center gap-2 pt-1">
                              <Switch
                                size="sm"
                                checked={contact.emailNotifications ?? false}
                                onCheckedChange={(val) => toggleEmailNotifications(contact.id, val)}
                              />
                              <span className="text-xs text-muted-foreground">Powiadomienia e-mail</span>
                              <span
                                title="Gdy włączone, kontakt otrzyma e-mail z linkiem przy każdym udostępnieniu listy zakupowej przez projektanta."
                                className="flex items-center text-muted-foreground/60 hover:text-muted-foreground cursor-help"
                              >
                                <Info size={12} />
                              </span>
                            </div>
                          </div>
                        )}

                        {!contact.userId && (
                          <div className="mt-2 pt-2 border-t border-border">
                            <div className="flex items-center gap-2 flex-wrap">
                              {!contact.email && (
                                <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1 flex-1 min-w-0">
                                  <Info size={11} className="flex-shrink-0" /><span>Brak adresu e-mail - dodaj, aby utworzyć konto.</span>
                                </p>
                              )}
                              <button
                                onClick={() => setCreateAccountOpen((prev) => ({ ...prev, [contact.id]: !prev[contact.id] }))}
                                className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors ml-auto shrink-0"
                              >
                                <KeyRound size={11} />{createAccountOpen[contact.id] ? t.projekty.hide : t.projekty.createAccount}
                              </button>
                            </div>
                            {createAccountOpen[contact.id] && (
                              <div className="mt-2 p-2.5 rounded-lg bg-muted/50 border border-border space-y-2">
                                {contact.email ? (
                                  <div className="flex items-center gap-1.5">
                                    <Button size="sm" className="h-7 text-xs" disabled={!!creatingAccount[contact.id]} onClick={() => createContactAccount(contact.id)}>
                                      {creatingAccount[contact.id] ? t.projekty.creatingAccount : t.projekty.createAccount}
                                    </Button>
                                    <span className="text-xs text-muted-foreground">dla {contact.email}</span>
                                  </div>
                                ) : (
                                  <>
                                    <p className="text-xs text-muted-foreground font-medium">{t.projekty.emailLoginLabel}</p>
                                    <div className="flex gap-1.5">
                                      <Input type="email" value={createAccountEmail[contact.id] ?? ""} onChange={(e) => setCreateAccountEmail((prev) => ({ ...prev, [contact.id]: e.target.value }))} placeholder={t.projekty.emailLoginHintShort} className="text-xs h-7 flex-1" />
                                      <Button size="sm" className="h-7 text-xs" disabled={!!creatingAccount[contact.id]} onClick={() => createContactAccount(contact.id)}>
                                        {creatingAccount[contact.id] ? t.projekty.creatingAccount : t.projekty.createAccount}
                                      </Button>
                                    </div>
                                  </>
                                )}
                                <p className="text-xs text-muted-foreground">Klient zaloguje się przez link wysłany e-mailem.</p>
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
        </section>
      )}

      {/* ── Tab: Płatności ─────────────────────────────────────────────────── */}
      {activeTab === "payments" && (
        mainContact ? (
          <PaymentsTab clientId={mainContact.id} paymentsSharedWithClient={false} defaultCurrency={defaultCurrency} />
        ) : (
          <div className="bg-card border border-border rounded-xl p-10 text-center text-muted-foreground mt-4">
            <p className="text-sm">{t.projekty.addContactHint} <button onClick={() => setActiveTab("accounts")} className="underline hover:no-underline">Konto klienta</button>, {t.projekty.paymentsConfigSuffix}</p>
          </div>
        )
      )}

      {/* ── Tab: Harmonogram ───────────────────────────────────────────────── */}
      {activeTab === "schedule" && (
        mainContact ? (
          <ScheduleTab clientId={mainContact.id} projectId={mainContact.projectId ?? undefined} scheduleSharedWithClient={mainContact.scheduleSharedWithClient} />
        ) : (
          <div className="bg-card border border-border rounded-xl p-10 text-center text-muted-foreground mt-4">
            <p className="text-sm">{t.projekty.addContactHint} <button onClick={() => setActiveTab("accounts")} className="underline hover:no-underline">Konto klienta</button>, {t.projekty.scheduleConfigSuffix}</p>
          </div>
        )
      )}

      {/* ── Tab: Dokumenty ─────────────────────────────────────────────────── */}
      {activeTab === "documents" && (
        mainContact ? (
          <section className="bg-card border border-border rounded-xl p-5 mt-4">
            <DocumentsTab clientId={mainContact.id} />
          </section>
        ) : (
          <div className="bg-card border border-border rounded-xl p-10 text-center text-muted-foreground mt-4">
            <p className="text-sm">{t.projekty.addContactHint} <button onClick={() => setActiveTab("accounts")} className="underline hover:no-underline">Konto klienta</button>, {t.projekty.documentsConfigSuffix}</p>
          </div>
        )
      )}

      {/* ── Tab: Historia klienta ──────────────────────────────────────────── */}
      {activeTab === "history" && (
        <div className="mt-4">
          <ClientHistoryTab apiUrl={`/api/klienci/${initialClient.id}/client-history`} />
        </div>
      )}

      {/* ── Tab: Ustawienia klienta ───────────────────────────────────────── */}
      {activeTab === "settings" && (
        <section className="bg-card border border-border rounded-xl p-5 space-y-4 mt-4">
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
                  style={{ background: c.bar, outline: selected ? `3px solid ${c.bar}` : "none", outlineOffset: selected ? "2px" : "0" }}
                >
                  {selected && <span className="material-symbols-rounded text-white" style={{ fontSize: 18, fontVariationSettings: "'wght' 600" }}>check</span>}
                </button>
              );
            })}
            <div className="w-px h-8 bg-border" />
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Własny:</span>
              <div style={accentColor?.startsWith("#") ? { outline: `3px solid ${customHex}`, outlineOffset: "2px", borderRadius: "10px" } : {}}>
                <ColorPicker
                  value={customHex}
                  onChange={(hex) => {
                    setCustomHex(hex);
                    clearTimeout(saveColorDebounceRef.current);
                    saveColorDebounceRef.current = setTimeout(() => { saveAccentColor(hex); }, 600);
                  }}
                  openDown
                />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Edit contact drawer ───────────────────────────────────────────── */}
      {drawerContact && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/35 z-40"
            onClick={closeDrawer}
          />
          {/* Drawer */}
          <div className="fixed right-0 top-0 h-full w-[380px] bg-white dark:bg-card shadow-[-16px_0_40px_-20px_rgba(24,24,50,0.35)] z-50 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-[18px] border-b border-border flex-shrink-0">
              <h3 className="text-[15px] font-semibold">Edytuj kontakt</h3>
              <button
                onClick={closeDrawer}
                className="w-[30px] h-[30px] rounded-lg flex items-center justify-center text-muted-foreground hover:bg-[#FAFAFB] dark:hover:bg-muted transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-[14px]">
              {/* Avatar */}
              <div className="flex items-center gap-[14px] mb-[18px]">
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center text-white text-[18px] font-bold flex-shrink-0"
                  style={{ background: drawerContact.isMainContact ? "#4F46E5" : "#c7cbe0" }}
                >
                  {drawerContact.name.split(" ").map((p) => p[0]).join("").toUpperCase().slice(0, 2)}
                </div>
              </div>

              {/* Fields */}
              <div className="space-y-1.5">
                <Label className="text-[12.5px] font-medium">Imię i nazwisko</Label>
                <Input
                  value={drawerName}
                  onChange={(e) => setDrawerName(e.target.value)}
                  className="border-border rounded-lg"
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[12.5px] font-medium">Rola</Label>
                <Input
                  value={drawerRole}
                  onChange={(e) => setDrawerRole(e.target.value)}
                  placeholder="np. Inwestor, Architekt..."
                  className="border-border rounded-lg"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[12.5px] font-medium">Adres e-mail</Label>
                <Input
                  type="email"
                  value={drawerEmail}
                  onChange={(e) => setDrawerEmail(e.target.value)}
                  className="border-border rounded-lg"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[12.5px] font-medium">Numer telefonu</Label>
                <Input
                  value={drawerPhone}
                  onChange={(e) => setDrawerPhone(e.target.value)}
                  className="border-border rounded-lg"
                />
              </div>

              {/* Set as main */}
              <div className="space-y-1">
                <label className="flex items-center gap-2 text-[13px] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={drawerIsMain}
                    onChange={(e) => setDrawerIsMain(e.target.checked)}
                    className="rounded border-border w-4 h-4"
                  />
                  Ustaw jako kontakt główny
                </label>
                <p className="text-[12.5px] text-muted-foreground ml-6">
                  Kontakt główny jest wyróżniony na liście i widoczny jako pierwszy punkt kontaktu.
                </p>
              </div>

              {/* Danger zone */}
              {!drawerContact.isMainContact && (
                <div className="mt-[22px] pt-[18px] border-t border-border">
                  <p className="text-[11px] font-bold tracking-[0.04em] uppercase text-destructive mb-2">Strefa zagrożenia</p>
                  <button
                    onClick={() => { closeDrawer(); removeContact(drawerContact.id); }}
                    className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold px-[14px] py-[9px] rounded-lg border border-red-200 bg-[#fef2f2] text-destructive hover:bg-red-100 transition-colors"
                  >
                    <Trash2 size={14} />
                    Usuń kontakt
                  </button>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-[10px] px-5 py-4 border-t border-border flex-shrink-0">
              <button
                onClick={closeDrawer}
                className="border border-border rounded-lg px-4 py-[9px] text-[13px] font-semibold text-foreground bg-white dark:bg-card hover:bg-muted transition-colors"
              >
                Anuluj
              </button>
              <button
                onClick={saveDrawer}
                disabled={savingDrawer || !drawerName.trim()}
                className="bg-primary text-white rounded-lg px-4 py-[9px] text-[13px] font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60"
              >
                {savingDrawer ? t.common.saving : "Zapisz zmiany"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
