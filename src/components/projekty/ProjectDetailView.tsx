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

interface ProjectClient {
  id: string;
  name: string;
  email: string | null;
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
  addressCountry: string | null;
  addressCity: string | null;
  addressPostalCode: string | null;
  addressStreet: string | null;
  hasRenders: boolean;
  hasLists: boolean;
  clients: ProjectClient[];
}

const MODULES = [
  {
    slug: "renderflow",
    label: "RenderFlow",
    description: "Wizualizacje projektu",
    icon: "renderflow" as const,
  },
  {
    slug: "listy",
    label: "Listy zakupowe",
    description: "Listy produktów dla klienta",
    icon: "cart" as const,
  },
];

export default function ProjectDetailView({ project }: { project: ProjectData }) {
  const router = useRouter();

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
  const [newClientIsMain, setNewClientIsMain] = useState(false);
  const [addingClient, setAddingClient] = useState(false);
  const [showAddClient, setShowAddClient] = useState(false);

  // Address state
  const [addressCountry, setAddressCountry] = useState(project.addressCountry ?? "");
  const [addressCity, setAddressCity] = useState(project.addressCity ?? "");
  const [addressPostalCode, setAddressPostalCode] = useState(project.addressPostalCode ?? "");
  const [addressStreet, setAddressStreet] = useState(project.addressStreet ?? "");
  const [savingAddress, setSavingAddress] = useState(false);

  // Modules state
  const [hiddenModules, setHiddenModules] = useState<string[]>(project.hiddenModules);

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
      toast.success("Zapisano");
      router.refresh();
    } catch {
      toast.error("Błąd zapisu");
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
      toast.success("Adres zapisany");
    } catch {
      toast.error("Błąd zapisu");
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
        body: JSON.stringify({ name: newClientName.trim(), email: newClientEmail.trim() || null, isMainContact: newClientIsMain }),
      });
      if (!res.ok) throw new Error();
      const created = await res.json();
      setClients((prev) => [...prev, created]);
      setNewClientName("");
      setNewClientEmail("");
      setNewClientIsMain(false);
      setShowAddClient(false);
      toast.success("Klient dodany");
    } catch {
      toast.error("Błąd dodawania klienta");
    } finally {
      setAddingClient(false);
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
      toast.success("Główny kontakt ustawiony");
    } catch {
      toast.error("Błąd zapisu");
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
      toast.error("Błąd usuwania klienta");
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
      toast.error("Błąd zapisu");
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
    toast.success("Link skopiowany");
  }

  function forceCopy(link: string) {
    navigator.clipboard.writeText(link);
    setWarningDialog((d) => ({ ...d, open: false }));
    toast.success("Link skopiowany");
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
          Projekty
        </Link>
        <h1 className="text-2xl font-bold mt-2">{project.title}</h1>
      </div>

      <div className="space-y-6">
        {/* === Info section === */}
        <section className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">
            Informacje o projekcie
          </h2>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="proj-title">Nazwa projektu *</Label>
              <Input
                id="proj-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Nazwa projektu"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="proj-desc">Opis</Label>
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
                <Label htmlFor="proj-password">Hasło do linka</Label>
                <div className="relative">
                  <Input
                    id="proj-password"
                    type={showPassword ? "text" : "password"}
                    value={sharePassword}
                    onChange={(e) => setSharePassword(e.target.value)}
                    placeholder="Brak hasła"
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
                <Label htmlFor="proj-expires">Data wygaśnięcia</Label>
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
                Utworzono:{" "}
                {new Date(project.createdAt).toLocaleDateString("pl-PL", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </p>
              <Button onClick={saveInfo} disabled={savingInfo || !title.trim()} size="sm">
                {savingInfo ? "Zapisywanie..." : "Zapisz"}
              </Button>
            </div>
          </div>
        </section>

        {/* === Address section === */}
        <section className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">
            Adres inwestycji
          </h2>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="addr-street">Ulica</Label>
                <Input
                  id="addr-street"
                  value={addressStreet}
                  onChange={(e) => setAddressStreet(e.target.value)}
                  placeholder="ul. Przykładowa 12/3"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="addr-city">Miasto</Label>
                <Input
                  id="addr-city"
                  value={addressCity}
                  onChange={(e) => setAddressCity(e.target.value)}
                  placeholder="Warszawa"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="addr-postal">Kod pocztowy</Label>
                <Input
                  id="addr-postal"
                  value={addressPostalCode}
                  onChange={(e) => setAddressPostalCode(e.target.value)}
                  placeholder="00-000"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="addr-country">Kraj</Label>
                <Input
                  id="addr-country"
                  value={addressCountry}
                  onChange={(e) => setAddressCountry(e.target.value)}
                  placeholder="Polska"
                />
              </div>
            </div>
            <div className="flex justify-end pt-1">
              <Button onClick={saveAddress} disabled={savingAddress} size="sm">
                {savingAddress ? "Zapisywanie..." : "Zapisz"}
              </Button>
            </div>
          </div>
        </section>

        {/* === Clients section === */}
        <section id="klienci" className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Klienci
            </h2>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => setShowAddClient((v) => !v)}
            >
              <Plus size={13} />
              Dodaj klienta
            </Button>
          </div>

          {showAddClient && (
            <div className="mb-4 p-4 rounded-lg border border-border bg-muted/30 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Imię i nazwisko *</Label>
                  <Input
                    value={newClientName}
                    onChange={(e) => setNewClientName(e.target.value)}
                    placeholder="Jan Kowalski"
                    onKeyDown={(e) => e.key === "Enter" && addClient()}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Email (opcjonalnie)</Label>
                  <Input
                    type="email"
                    value={newClientEmail}
                    onChange={(e) => setNewClientEmail(e.target.value)}
                    placeholder="jan@example.com"
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
                  <span className="text-sm">Główny kontakt</span>
                </label>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setShowAddClient(false);
                      setNewClientName("");
                      setNewClientEmail("");
                      setNewClientIsMain(false);
                    }}
                  >
                    Anuluj
                  </Button>
                  <Button
                    size="sm"
                    onClick={addClient}
                    disabled={addingClient || !newClientName.trim()}
                  >
                    {addingClient ? "Dodawanie..." : "Dodaj"}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {clients.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Brak przypisanych klientów
            </p>
          ) : (
            <div className="space-y-2">
              {clients.map((client) => (
                <div
                  key={client.id}
                  className={`flex items-center justify-between px-4 py-3 rounded-lg border bg-background transition-colors ${
                    client.isMainContact ? "border-[#C45824]/30 bg-[#C45824]/5" : "border-border"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{client.name}</p>
                      {client.isMainContact && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[#C45824] text-white flex-shrink-0">
                          Główny kontakt
                        </span>
                      )}
                    </div>
                    {client.email && (
                      <p className="text-xs text-muted-foreground truncate">{client.email}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 ml-3 flex-shrink-0">
                    {!client.isMainContact && (
                      <button
                        onClick={() => setMainContact(client.id)}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-muted"
                        title="Ustaw jako główny kontakt"
                      >
                        Ustaw głównym
                      </button>
                    )}
                    <button
                      onClick={() => removeClient(client.id)}
                      className="text-muted-foreground hover:text-destructive transition-colors p-1"
                      title="Usuń klienta"
                    >
                      <X size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* === Modules section === */}
        <section className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">
            Moduły
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {MODULES.map((mod) => {
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
                        active ? "bg-[#C45824]" : "bg-muted"
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
                          {mod.label}
                        </p>
                        <span
                          className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                            active
                              ? "bg-green-100 text-green-700"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {active ? "Aktywny" : "Brak zasobów"}
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
                          <span className="text-muted-foreground">Ukryty dla klienta</span>
                        ) : (
                          <span>Widoczny dla klienta</span>
                        )}
                      </Label>
                    </div>
                    <button
                      onClick={() => handleCopyLink(mod.slug, mod.label)}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                      title="Kopiuj link"
                    >
                      <Copy size={13} />
                      Kopiuj link
                    </button>
                  </div>
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
              Moduł jest ukryty dla klienta
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Moduł <strong>{warningDialog.label}</strong> jest oznaczony jako{" "}
            <strong>NIE WIDOCZNY</strong> dla klienta. Przed udostępnieniem linku zmień to
            w ustawieniach projektu.
          </p>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setWarningDialog((d) => ({ ...d, open: false }))}
            >
              Zamknij
            </Button>
            <Button
              variant="ghost"
              className="gap-1.5"
              onClick={() => forceCopy(warningDialog.link)}
            >
              <Check size={14} />
              Mimo to skopiuj
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
