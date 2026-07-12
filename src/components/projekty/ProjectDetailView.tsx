"use client";

import { useState, useRef, useEffect } from "react";
import DatePicker from "@/components/ui/DatePicker";
import { PaymentsTab } from "@/components/projekty/PaymentsTab";
import { ScheduleTab } from "@/components/projekty/ScheduleTab";
import DocumentsTab from "@/components/projekty/DocumentsTab";
import ClientHistoryTab from "@/components/projekty/ClientHistoryTab";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  LocalMall,
  Pin,
  PushPin,
  Copy,
  Eye,
  EyeOff,
  X,
  Plus,
  AlertTriangle,
  Check,
  Pencil,
  KeyRound,
  GripVertical,
  Mail,
  ChevronRight,
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
import { generateClientLogin } from "@/lib/client-login";
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
  startDate: string | null;
  endDate: string | null;
  userId: string | null;
  user: { id: string; login: string } | null;
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
  startDate: string | null;
  endDate: string | null;
  paymentsSharedWithClient: boolean;
  scheduleSharedWithClient: boolean;
  clientId?: string | null;
  clientName?: string | null;
  clientEntityId?: string | null;
  clients: ProjectClient[];
  clientProjects?: { id: string; title: string; slug: string | null }[];
}

const MODULES_CONFIG = [
  {
    slug: "renderflow",
    labelKey: "moduleRenderflow" as const,
    descriptionKey: "moduleDescRenderflow" as const,
    icon: "renderflow" as const,
  },
  {
    slug: "listy",
    labelKey: "moduleLists" as const,
    descriptionKey: "moduleDescLists" as const,
    icon: "cart" as const,
  },
];

export default function ProjectDetailView({ project }: { project: ProjectData }) {
  const clientProjects = project.clientProjects ?? [];
  const clientHref = project.clientEntityId
    ? `/klienci/klient/${project.clientEntityId}`
    : "/klienci";
  const router = useRouter();
  const t = useT();

  // Info form state
  const [clientEntityName, setClientEntityName] = useState(project.clientName ?? "");
  const [title, setTitle] = useState(project.title);
  const [description, setDescription] = useState(project.description ?? "");
  const [sharePassword, setSharePassword] = useState(project.sharePassword ?? "");
  const [shareExpiresAt, setShareExpiresAt] = useState(
    project.shareExpiresAt ? project.shareExpiresAt.slice(0, 10) : ""
  );
  const [projectStartDate, setProjectStartDate] = useState(project.startDate ?? "");
  const [projectEndDate, setProjectEndDate] = useState(project.endDate ?? "");
  const [showPassword, setShowPassword] = useState(false);
  const [savingInfo, setSavingInfo] = useState(false);

  // Tab state
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<"info" | "contacts" | "payments" | "documents" | "schedule" | "history">(
    searchParams.get("tab") === "contacts" ? "contacts" : "info"
  );

  // Clients state
  const [clients, setClients] = useState<ProjectClient[]>(project.clients);
  const clientSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function handleClientDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = clients.findIndex((c) => c.id === active.id);
    const newIndex = clients.findIndex((c) => c.id === over.id);
    const reordered = arrayMove(clients, oldIndex, newIndex);
    setClients(reordered);
    fetch(`/api/projects/${project.id}/clients/reorder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: reordered.map((c) => c.id) }),
    }).catch(() => {});
  }
  const [newClientName, setNewClientName] = useState("");
  const [newClientEmail, setNewClientEmail] = useState("");
  const [newClientPhone, setNewClientPhone] = useState("");
  const [newClientPassword, setNewClientPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [newClientIsMain, setNewClientIsMain] = useState(false);
  const [addingClient, setAddingClient] = useState(false);
  const [showAddClient, setShowAddClient] = useState(false);

  // Per-client inline credential editing
  const [clientCreds, setClientCreds] = useState<Record<string, { login: string; password: string; showPassword: boolean }>>(() =>
    Object.fromEntries(
      project.clients
        .filter((c) => c.user)
        .map((c) => [c.id, { login: c.user!.login, password: "", showPassword: false }])
    )
  );
  const [credentialsOpen, setCredentialsOpen] = useState<Record<string, boolean>>({});

  // Inline contact editing state (email/phone only)
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const previewLogin = newClientName.trim().split(/\s+/).length >= 2
    ? generateClientLogin(newClientName.trim())
    : "";

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
    const hasClientAccounts = project.clients.some((c) => c.userId);
    const link = hasClientAccounts
      ? `${window.location.origin}/client/${project.id}`
      : `${window.location.origin}/share/${project.shareToken}/dashboard`;
    navigator.clipboard.writeText(link);
    setCopiedPanel(true);
    setTimeout(() => setCopiedPanel(false), 2000);
  }

  // No-account banner
  const [bannerDismissed, setBannerDismissed] = useState(false);

  // Create account inline state (for clients without userId)
  const [createAccountOpen, setCreateAccountOpen] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(project.clients.filter((c) => !c.userId).map((c) => [c.id, true]))
  );
  const [createAccountEmail, setCreateAccountEmail] = useState<Record<string, string>>(() =>
    Object.fromEntries(project.clients.filter((c) => !c.userId && c.email).map((c) => [c.id, c.email!]))
  );
  const [createAccountPassword, setCreateAccountPassword] = useState<Record<string, string>>({});
  const [createAccountShowPass, setCreateAccountShowPass] = useState<Record<string, boolean>>({});
  const [creatingAccount, setCreatingAccount] = useState<Record<string, boolean>>({});

  // Invite client dialog state
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteEmailExists, setInviteEmailExists] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [sendingInvite, setSendingInvite] = useState(false);
  const emailCheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleInviteEmailChange(value: string) {
    setInviteEmail(value);
    setInviteEmailExists(false);
    if (emailCheckTimer.current) clearTimeout(emailCheckTimer.current);
    if (!value.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
      setCheckingEmail(false);
      return;
    }
    setCheckingEmail(true);
    emailCheckTimer.current = setTimeout(() => {
      fetch(`/api/client-invite/check-email?email=${encodeURIComponent(value.trim())}`)
        .then((r) => r.json())
        .then((data) => {
          setInviteEmailExists(!!data.exists);
          setCheckingEmail(false);
        })
        .catch(() => setCheckingEmail(false));
    }, 400);
  }

  async function sendClientInvite() {
    if (!inviteEmail.trim()) return;
    if (!inviteEmail.includes("@")) {
      toast.error(t.projekty.emailInvalid);
      return;
    }
    setSendingInvite(true);
    const res = await fetch("/api/client-invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail.trim(), projectId: project.id }),
    });
    const data = await res.json().catch(() => ({}));
    setSendingInvite(false);
    if (!res.ok) {
      toast.error((data as { error?: string }).error || t.projekty.inviteSendError);
      return;
    }
    toast.success(t.projekty.inviteSent);
    setShowInviteDialog(false);
    setInviteEmail("");
  }

  // Warning dialog state
  const [warningDialog, setWarningDialog] = useState<{
    open: boolean;
    slug: string;
    label: string;
    link: string;
  }>({ open: false, slug: "", label: "", link: "" });

  async function saveInfo() {
    if (project.clientEntityId && !clientEntityName.trim()) return;
    if (!project.clientEntityId && !title.trim()) return;
    setSavingInfo(true);
    try {
      const calls: Promise<Response>[] = [];

      if (project.clientEntityId && clientEntityName.trim() !== (project.clientName ?? "")) {
        calls.push(fetch(`/api/clients/${project.clientEntityId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: clientEntityName.trim() }),
        }));
      }

      calls.push(fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          sharePassword: sharePassword.trim() || null,
          shareExpiresAt: shareExpiresAt || null,
          startDate: projectStartDate || null,
          endDate: projectEndDate || null,
        }),
      }));

      const results = await Promise.all(calls);
      if (results.some((r) => !r.ok)) throw new Error();
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
    if (!newClientName.trim() || !newClientPassword.trim()) return;
    if (newClientEmail.trim() && !newClientEmail.includes("@")) {
      toast.error(t.projekty.emailInvalid);
      return;
    }
    setAddingClient(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/clients`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newClientName.trim(),
          email: newClientEmail.trim() || null,
          phone: newClientPhone.trim() || null,
          password: newClientPassword.trim(),
          isMainContact: newClientIsMain,
        }),
      });
      if (!res.ok) throw new Error();
      const created = await res.json();
      setClients((prev) => [...prev, created]);
      if (created.user?.login) {
        setClientCreds((prev) => ({
          ...prev,
          [created.id]: { login: created.user.login, password: "", showPassword: false },
        }));
        setCredentialsOpen((prev) => ({ ...prev, [created.id]: true }));
      }
      setNewClientName("");
      setNewClientEmail("");
      setNewClientPhone("");
      setNewClientPassword("");
      setShowNewPassword(false);
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
    if (editEmail.trim() && !editEmail.includes("@")) {
      toast.error(t.projekty.emailInvalid);
      return;
    }
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

  async function saveClientCreds(clientId: string) {
    const creds = clientCreds[clientId];
    if (!creds) return;
    const body: Record<string, string> = {};
    if (creds.login.trim()) body.login = creds.login.trim();
    if (creds.password.trim()) body.password = creds.password.trim();
    if (!Object.keys(body).length) return;
    try {
      const res = await fetch(`/api/projects/${project.id}/clients/${clientId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setClients((prev) => prev.map((c) => c.id === clientId ? { ...c, user: updated.user ?? c.user } : c));
      setClientCreds((prev) => ({ ...prev, [clientId]: { ...prev[clientId], password: "", showPassword: false } }));
      toast.success(t.common.saved);
    } catch {
      toast.error(t.settings.saveError);
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

  async function createClientAccount(clientId: string) {
    const password = createAccountPassword[clientId];
    if (!password?.trim() || password.trim().length < 4) return;
    const accEmail = createAccountEmail[clientId]?.trim();
    if (accEmail && !accEmail.includes("@")) {
      toast.error(t.projekty.emailInvalid);
      return;
    }
    setCreatingAccount((prev) => ({ ...prev, [clientId]: true }));
    try {
      const res = await fetch(`/api/projects/${project.id}/clients/${clientId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: password.trim(),
          ...(createAccountEmail[clientId]?.trim() ? { email: createAccountEmail[clientId].trim().toLowerCase() } : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error || t.projekty.accountCreateError);
      setClients((prev) =>
        prev.map((c) => c.id === clientId ? { ...c, userId: data.userId, user: data.user } : c)
      );
      if (data.user?.login) {
        setClientCreds((prev) => ({
          ...prev,
          [clientId]: { login: data.user.login, password: "", showPassword: false },
        }));
        setCredentialsOpen((prev) => ({ ...prev, [clientId]: true }));
      }
      setCreateAccountOpen((prev) => ({ ...prev, [clientId]: false }));
      setCreateAccountPassword((prev) => ({ ...prev, [clientId]: "" }));
      toast.success(t.projekty.accountCreated);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.projekty.accountCreateError);
    } finally {
      setCreatingAccount((prev) => ({ ...prev, [clientId]: false }));
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
    const hasClientAccounts = project.clients.some((c) => c.userId);
    if (hasClientAccounts) return `${window.location.origin}/client/${project.id}`;
    if (slug === "renderflow") return `${window.location.origin}/share/${project.shareToken}`;
    if (slug === "listy") return `${window.location.origin}/share/${project.shareToken}/dashboard`;
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
    <div className="max-w-3xl mx-auto">
      {/* Back nav */}
      <div className="mb-6">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Link href={clientHref} className="hover:text-foreground transition-colors">{t.projekty.title}</Link>
          <span>/</span>
          <span className="text-foreground font-medium truncate max-w-[200px]">{project.clientName ?? project.title}</span>
        </div>
        <div className="flex items-center justify-between gap-3 mt-2">
          <h1 className="text-2xl font-bold">{project.clientName ?? project.title}</h1>
          <Button variant="outline" size="sm" onClick={copyPanelLink} className="gap-2 flex-shrink-0">
            {copiedPanel ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
            {copiedPanel ? t.projekty.copiedPanel : t.projekty.copyPanelLink}
          </Button>
        </div>
      </div>

      {/* No-account banner */}
      {!bannerDismissed && clients.some((c) => !c.userId) && (
        <div className="mb-5 flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-3 py-2.5 text-sm text-amber-800 dark:text-amber-300">
          <AlertTriangle size={15} className="flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            {clients.filter((c) => !c.userId).length === 1 ? (
              <>
                {t.projekty.bannerNoAccountSingle.replace("{name}", clients.find((c) => !c.userId)?.name ?? "")}{" "}
                <button onClick={() => setActiveTab("contacts")} className="underline hover:no-underline">
                  {t.projekty.bannerContactsTabLink}
                </button>
              </>
            ) : (
              <>
                {t.projekty.bannerNoAccountMultiple.replace("{count}", String(clients.filter((c) => !c.userId).length))}{" "}
                <button onClick={() => setActiveTab("contacts")} className="underline hover:no-underline">
                  {t.projekty.bannerContactsTabLinkMultiple}
                </button>
              </>
            )}
          </div>
          <button
            onClick={() => setBannerDismissed(true)}
            className="text-amber-500 hover:text-amber-700 flex-shrink-0 p-0.5"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-border mb-6 overflow-hidden">
        <div className="flex gap-1 overflow-x-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
          {(["info", "contacts", "payments", "schedule", "documents", "history"] as const).map((tab) => (
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
              {tab === "documents" && t.projekty.tabDocuments}
              {tab === "history" && "Historia klienta"}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "contacts" && (
        <section className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {t.projekty.clients}
            </h2>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                title={t.projekty.sendInvite}
                onClick={() => setShowInviteDialog(true)}
              >
                <Mail size={13} />
                <span className="hidden sm:inline">{t.projekty.sendInvite}</span>
              </Button>
              <Button
                size="sm"
                className="gap-1.5"
                title={t.projekty.addClient}
                onClick={() => setShowAddClient((v) => !v)}
              >
                <Plus size={13} />
                <span className="hidden sm:inline">{t.projekty.addClient}</span>
              </Button>
            </div>
          </div>

          {showAddClient && (
            <div className="mb-4 p-4 rounded-lg border border-border bg-muted/30 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>
                    {t.projekty.clientFullName}
                    <span className="text-destructive ml-0.5">*</span>
                  </Label>
                  <Input
                    value={newClientName}
                    onChange={(e) => setNewClientName(e.target.value)}
                    placeholder={t.projekty.clientFullNamePlaceholder}
                  />
                  {previewLogin && (
                    <p className="text-xs text-muted-foreground">
                      Login: <span className="font-mono font-medium text-foreground">{previewLogin}</span>
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>
                    {t.projekty.passwordClientLabel}
                    <span className="text-destructive ml-0.5">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      type={showNewPassword ? "text" : "password"}
                      value={newClientPassword}
                      onChange={(e) => setNewClientPassword(e.target.value)}
                      placeholder={t.projekty.passwordClientPlaceholder}
                      className="pr-9"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword((v) => !v)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showNewPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>{t.projekty.clientEmailOpt}</Label>
                  <Input
                    type="email"
                    value={newClientEmail}
                    onChange={(e) => setNewClientEmail(e.target.value)}
                    placeholder="jan@example.com"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t.projekty.phoneOptLabel}</Label>
                  <Input
                    type="tel"
                    value={newClientPhone}
                    onChange={(e) => setNewClientPhone(e.target.value)}
                    placeholder="+48 123 456 789"
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
                      setNewClientPassword("");
                      setShowNewPassword(false);
                      setNewClientIsMain(false);
                    }}
                  >
                    {t.common.cancel}
                  </Button>
                  <Button
                    size="sm"
                    onClick={addClient}
                    disabled={addingClient || !newClientName.trim() || !newClientPassword.trim()}
                  >
                    {addingClient ? t.projekty.adding : t.common.add}
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
            <DndContext sensors={clientSensors} collisionDetection={closestCenter} onDragEnd={handleClientDragEnd}>
            <SortableContext items={clients.map((c) => c.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {clients.map((client) => (
                <SortableClientItem key={client.id} id={client.id}>
                <div
                  className={`rounded-lg border bg-background transition-colors ${
                    client.isMainContact ? "border-primary/30 bg-primary/5" : "border-border"
                  }`}
                >
                  <div className="flex items-center gap-2 px-4 py-2.5">
                    <SortableClientItemHandle id={client.id} />
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{client.name}</p>
                      {client.isMainContact && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-primary text-white flex-shrink-0">
                          {t.projekty.mainContact}
                        </span>
                      )}
                      {!client.userId && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 flex-shrink-0">
                          {t.projekty.noAccount}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {(client.email || client.phone) && editingClientId !== client.id && (
                        <span className="text-xs text-muted-foreground mr-1 hidden sm:inline">
                          {[client.email, client.phone].filter(Boolean).join(" · ")}
                        </span>
                      )}
                      {!client.isMainContact && (
                        <button
                          onClick={() => setMainContact(client.id)}
                          className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-muted hidden sm:inline"
                          title={t.projekty.setAsMain}
                        >
                          {t.projekty.setAsMain}
                        </button>
                      )}
                      {!client.userId && (
                        <button
                          onClick={() => setCreateAccountOpen((prev) => ({ ...prev, [client.id]: !prev[client.id] }))}
                          className={`transition-colors p-1 rounded ${createAccountOpen[client.id] ? "text-amber-600" : "text-muted-foreground hover:text-foreground"}`}
                          title={t.projekty.grantPassword}
                        >
                          <KeyRound size={14} />
                        </button>
                      )}
                      {client.user && clientCreds[client.id] !== undefined && (
                        <button
                          onClick={() => setCredentialsOpen((prev) => ({ ...prev, [client.id]: !prev[client.id] }))}
                          className={`transition-colors p-1 rounded ${credentialsOpen[client.id] ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
                          title={t.projekty.loginData}
                        >
                          <KeyRound size={14} />
                        </button>
                      )}
                      <button
                        onClick={() => editingClientId === client.id ? cancelEditing() : startEditing(client)}
                        className="text-muted-foreground hover:text-foreground transition-colors p-1"
                        title={t.projekty.editContact}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => removeClient(client.id)}
                        className="text-muted-foreground hover:text-destructive transition-colors p-1"
                        title={t.projekty.deleteClient}
                      >
                        <X size={15} />
                      </button>
                    </div>
                  </div>
                  {client.user && credentialsOpen[client.id] && clientCreds[client.id] !== undefined && (
                    <div className="px-4 pb-3 space-y-2 border-t border-border/50 pt-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Input
                          value={clientCreds[client.id].login}
                          onChange={(e) => setClientCreds((prev) => ({ ...prev, [client.id]: { ...prev[client.id], login: e.target.value } }))}
                          placeholder={t.projekty.loginPlaceholder}
                          className="h-7 text-xs font-mono w-32 px-2"
                        />
                        <div className="relative w-36">
                          <Input
                            type={clientCreds[client.id].showPassword ? "text" : "password"}
                            value={clientCreds[client.id].password}
                            onChange={(e) => setClientCreds((prev) => ({ ...prev, [client.id]: { ...prev[client.id], password: e.target.value } }))}
                            placeholder={t.projekty.newPasswordPlaceholder}
                            className="h-7 text-xs pr-7 w-full px-2"
                          />
                          <button
                            type="button"
                            onClick={() => setClientCreds((prev) => ({ ...prev, [client.id]: { ...prev[client.id], showPassword: !prev[client.id].showPassword } }))}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {clientCreds[client.id].showPassword ? <EyeOff size={11} /> : <Eye size={11} />}
                          </button>
                        </div>
                        {(clientCreds[client.id].login !== (client.user?.login ?? "") || clientCreds[client.id].password.trim() !== "") && (
                          <Button size="sm" className="h-7 text-xs" onClick={() => saveClientCreds(client.id)}>
                            {t.common.save}
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                  {editingClientId === client.id && (
                    <div className="px-4 pb-3 space-y-2 border-t border-border/50 pt-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <Input
                          type="email"
                          value={editEmail}
                          onChange={(e) => setEditEmail(e.target.value)}
                          placeholder={t.projekty.contactEmailPlaceholder}
                          className="h-8 text-sm"
                        />
                        <Input
                          type="tel"
                          value={editPhone}
                          onChange={(e) => setEditPhone(e.target.value)}
                          placeholder={t.projekty.phonePlaceholder}
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
                  {!client.userId && createAccountOpen[client.id] && (
                    <div className="px-4 pb-3 space-y-2 border-t border-border/50 pt-3">
                      <Input
                        type="email"
                        value={createAccountEmail[client.id] ?? ""}
                        onChange={(e) => setCreateAccountEmail((prev) => ({ ...prev, [client.id]: e.target.value }))}
                        placeholder={t.projekty.emailLoginPlaceholder}
                        className="h-7 text-xs px-2"
                      />
                      {createAccountEmail[client.id]?.trim()
                        ? <p className="text-xs text-muted-foreground">Login: <span className="font-mono font-medium text-foreground">{createAccountEmail[client.id].trim().toLowerCase()}</span></p>
                        : <p className="text-xs text-muted-foreground">Login: <span className="font-mono font-medium text-foreground">{generateClientLogin(client.name)}</span> <span className="text-muted-foreground/60">{t.projekty.loginHintEmail}</span></p>
                      }
                      <div className="flex items-center gap-2">
                        <div className="relative w-48">
                          <Input
                            type={createAccountShowPass[client.id] ? "text" : "password"}
                            value={createAccountPassword[client.id] ?? ""}
                            onChange={(e) =>
                              setCreateAccountPassword((prev) => ({ ...prev, [client.id]: e.target.value }))
                            }
                            placeholder={t.projekty.setPasswordPlaceholder}
                            className="h-7 text-xs pr-7 px-2"
                            onKeyDown={(e) => e.key === "Enter" && createClientAccount(client.id)}
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setCreateAccountShowPass((prev) => ({ ...prev, [client.id]: !prev[client.id] }))
                            }
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {createAccountShowPass[client.id] ? <EyeOff size={11} /> : <Eye size={11} />}
                          </button>
                        </div>
                        <Button
                          size="sm"
                          className="h-7 text-xs"
                          disabled={
                            !(createAccountPassword[client.id]?.trim()) ||
                            (createAccountPassword[client.id]?.trim().length ?? 0) < 4 ||
                            !!creatingAccount[client.id]
                          }
                          onClick={() => createClientAccount(client.id)}
                        >
                          {creatingAccount[client.id] ? t.projekty.creatingAccount : t.projekty.createAccount}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
                </SortableClientItem>
              ))}
            </div>
            </SortableContext>
            </DndContext>
          )}
        </section>
      )}

      {activeTab === "payments" && (
        <PaymentsTab
          clientId={clients[0]?.id ?? ""}
          projectId={project.id}
          paymentsSharedWithClient={project.paymentsSharedWithClient}
        />
      )}

      {activeTab === "documents" && (
        <section className="bg-card border border-border rounded-xl p-5">
          <DocumentsTab clientId={clients[0]?.id ?? ""} />
        </section>
      )}

      {activeTab === "schedule" && (
        <ScheduleTab
          clientId={clients[0]?.id ?? ""}
          projectId={project.id}
          scheduleSharedWithClient={project.scheduleSharedWithClient}
        />
      )}

      {activeTab === "history" && (
        <ClientHistoryTab apiUrl={`/api/projekty/${project.id}/client-history`} />
      )}

      {activeTab === "info" && <div className="space-y-6">
        {/* === Info section === */}
        <section className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">
            {t.projekty.projectInfo}
          </h2>
          <div className="space-y-4">
            {project.clientEntityId ? (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="client-name">{t.projekty.clientNameInputLabel}</Label>
                  <Input
                    id="client-name"
                    value={clientEntityName}
                    onChange={(e) => setClientEntityName(e.target.value)}
                    placeholder={t.projekty.clientNameInputLabel}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="proj-title">{t.projekty.projectNameLabel}</Label>
                  <Input
                    id="proj-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={t.projekty.projectNameLabel}
                  />
                </div>
              </>
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor="proj-title">{t.projekty.projectNameLabel}</Label>
                <Input
                  id="proj-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t.projekty.projectNameLabel}
                />
              </div>
            )}
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
                <Label htmlFor="proj-start">{t.projekty.startDateLabel}</Label>
                <DatePicker value={projectStartDate} onChange={setProjectStartDate} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="proj-end">{t.projekty.endDateLabel}</Label>
                <DatePicker value={projectEndDate} onChange={setProjectEndDate} />
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

        {/* === Other client projects === */}
        {clientProjects.length > 0 && (
          <section className="bg-card border border-border rounded-xl p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              {t.projekty.clientProjectsHeader}
            </h2>
            <div className="space-y-1">
              {clientProjects.map((p) => (
                <Link
                  key={p.id}
                  href={`/klienci/${p.slug ?? p.id}`}
                  className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors text-sm"
                >
                  <span className="truncate">{p.title}</span>
                  <ChevronRight size={14} className="text-muted-foreground flex-shrink-0" />
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* === Modules section === */}
        <section className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">
            {t.projekty.modules}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {MODULES_CONFIG.map((mod) => {
              const label = t.projekty[mod.labelKey];
              const description = t.projekty[mod.descriptionKey];
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
                        <PushPin
                          size={18}
                          className={active ? "text-white" : "text-muted-foreground opacity-40"}
                        />
                      ) : (
                        <LocalMall
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
                      <p className="text-xs text-muted-foreground">{description}</p>
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
      }

      {/* Invite client dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.projekty.sendInvite}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              {t.projekty.inviteDesc}
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="invite-email">{t.projekty.inviteEmailLabel}</Label>
              <Input
                id="invite-email"
                type="email"
                value={inviteEmail}
                onChange={(e) => handleInviteEmailChange(e.target.value)}
                placeholder="klient@example.com"
                onKeyDown={(e) => e.key === "Enter" && !inviteEmailExists && sendClientInvite()}
                autoFocus
              />
              {checkingEmail && (
                <p className="text-xs text-muted-foreground">{t.projekty.checkingEmail}</p>
              )}
              {!checkingEmail && inviteEmailExists && (
                <p className="text-xs text-destructive">{t.projekty.emailAlreadyExists}</p>
              )}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setShowInviteDialog(false); setInviteEmail(""); setInviteEmailExists(false); setCheckingEmail(false); }}>
              {t.common.cancel}
            </Button>
            <Button onClick={sendClientInvite} disabled={sendingInvite || !inviteEmail.trim() || inviteEmailExists || checkingEmail}>
              {sendingInvite ? t.projekty.sending : t.projekty.send}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

function SortableClientItem({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  return <div ref={setNodeRef} style={style}>{children}</div>;
}

function SortableClientItemHandle({ id }: { id: string }) {
  const t = useT();
  const { attributes, listeners } = useSortable({ id });
  return (
    <div
      {...attributes}
      {...listeners}
      className="text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing flex-shrink-0"
      title={t.projekty.dragToReorder}
    >
      <GripVertical size={14} />
    </div>
  );
}
