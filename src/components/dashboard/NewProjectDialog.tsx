"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Search, ChevronRight, Eye, EyeOff, Plus } from "@/components/ui/icons";
import { useT } from "@/lib/i18n";

interface NewProjectDialogProps {
  module?: string;
  label?: string;
  clientMode?: boolean;
  iconOnly?: boolean;
  // When passed, project is created directly under this client (no client picker step)
  clientId?: string;
  clientName?: string;
}

interface ClientOption {
  id: string;
  name: string;
}

export default function NewProjectDialog({ module, label, iconOnly, clientMode, clientId: fixedClientId, clientName: fixedClientName }: NewProjectDialogProps = {}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"new" | "existing">("new");

  // New project form
  const [title, setTitle] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientEmailError, setClientEmailError] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientPassword, setClientPassword] = useState("");
  const [showClientPassword, setShowClientPassword] = useState(false);
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  // Client picker (when no fixedClientId)
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [clientSearch, setClientSearch] = useState("");
  const [loadingClients, setLoadingClients] = useState(false);

  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    if (!fixedClientId && clients.length === 0) fetchClients();
  }, [open, tab]);

  async function fetchClients() {
    setLoadingClients(true);
    try {
      const res = await fetch("/api/clients");
      if (res.ok) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data: any[] = await res.json();
        setClients(data.map((c) => ({ id: c.id, name: c.name })));
      }
    } finally {
      setLoadingClients(false);
    }
  }

  const effectiveClientId = fixedClientId || selectedClientId || undefined;

  async function handleSubmit() {
    if (!title.trim()) return;
    if (tab === "existing" && !selectedClientId) return;
    // Without module and no fixed client: fall back to old email-based flow
    if (!module && !fixedClientId && tab === "new" && !selectedClientId) {
      if (!clientEmail.trim()) return;
      if (!clientEmail.includes("@")) {
        setClientEmailError(t.projekty.emailInvalid);
        return;
      }
    }
    setClientEmailError("");
    setLoading(true);

    const body = {
      title: title.trim(),
      clientName: clientName.trim() || fixedClientName || undefined,
      clientEmail: clientEmail.trim() || undefined,
      clientPhone: clientPhone.trim() || undefined,
      clientPassword: clientPassword.trim() || undefined,
      description: description.trim() || undefined,
      clientId: effectiveClientId,
      ...(module && { module }),
    };

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error();

      toast.success(t.projekty.projectCreated);
      setOpen(false);
      setTitle("");
      setClientName("");
      setClientEmail("");
      setClientPhone("");
      setClientPassword("");
      setShowClientPassword(false);
      setDescription("");
      setSelectedClientId("");
      setClientSearch("");
      router.refresh();
    } catch {
      toast.error(t.projekty.projectCreateError);
    } finally {
      setLoading(false);
    }
  }

  function handleOpenChange(val: boolean) {
    setOpen(val);
    if (!val) {
      setTab("new");
      setTitle("");
      setClientName("");
      setClientEmail("");
      setClientPhone("");
      setClientPassword("");
      setShowClientPassword(false);
      setDescription("");
      setSelectedClientId("");
      setClientSearch("");
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={iconOnly
          ? <button className="w-8 h-8 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-center transition-colors shrink-0" />
          : <Button />
        }
      >
        {iconOnly ? <Plus size={16} /> : (label ?? t.projekty.newProject)}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{label ?? t.projekty.newProject}</DialogTitle>
        </DialogHeader>

        {/* Client picker — only when no fixed client, not in module context, not in legacy clientMode */}
        {!fixedClientId && tab === "new" && !clientMode && !module && (
          <div className="space-y-1.5">
            <Label>{t.projekty.colClient} <span className="text-destructive">*</span></Label>
            {loadingClients ? (
              <div className="h-9 rounded-lg border border-border bg-muted/30 animate-pulse" />
            ) : clients.length === 0 ? (
              <p className="text-xs text-muted-foreground">{t.projekty.noClientsHint}</p>
            ) : selectedClientId ? (
              <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted border border-border">
                <span className="text-sm font-medium">{clients.find((c) => c.id === selectedClientId)?.name}</span>
                <button type="button" onClick={() => setSelectedClientId("")} className="text-xs text-muted-foreground hover:text-foreground">{t.projekty.changeBtn}</button>
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <input
                    type="text"
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                    placeholder={t.projekty.searchClientPlaceholder}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div className="border border-border rounded-lg overflow-hidden divide-y divide-border max-h-36 overflow-y-auto">
                  {clients
                    .filter((c) => c.name.toLowerCase().includes(clientSearch.toLowerCase()))
                    .map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setSelectedClientId(c.id)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
                      >
                        {c.name}
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Fixed client info */}
        {fixedClientId && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 text-sm text-muted-foreground">
            {t.projekty.colClient}: <span className="font-semibold text-foreground">{fixedClientName}</span>
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="title">{clientMode ? t.projekty.clientNameInputLabel : t.projekty.projectNameLabel} <span className="text-destructive">*</span></Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder={t.projekty.projectNamePlaceholder}
            autoFocus
          />
        </div>

        {/* Tabs — only when adding to a specific module */}
        {module && (
          <div className="flex gap-1 bg-muted rounded-lg p-1">
            <button
              onClick={() => { setTab("new"); setSelectedClientId(""); setClientSearch(""); }}
              className={`flex-1 text-sm py-1.5 rounded-md font-medium transition-colors ${
                tab === "new"
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.projekty.newProjectTab}
            </button>
            <button
              onClick={() => setTab("existing")}
              className={`flex-1 text-sm py-1.5 rounded-md font-medium transition-colors ${
                tab === "existing"
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.projekty.existingProjectTab}
            </button>
          </div>
        )}

        {(!module || tab === "new") ? (
          <div className="space-y-5">
            {/* Contact fields — shown when no client selected via picker (or in clientMode) */}
            {((!fixedClientId && !selectedClientId) || !!clientMode) && (
              <>
                {module && !fixedClientId && (
                  <div className="space-y-1.5">
                    <Label htmlFor="clientName">{t.projekty.clientNameInputLabel} <span className="text-destructive">*</span></Label>
                    <Input
                      id="clientName"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder={t.projekty.clientNamePlaceholder}
                    />
                  </div>
                )}
                <div className={`grid gap-4 ${module ? "grid-cols-2" : "grid-cols-3"}`}>
                  {!module && (
                    <div className="space-y-1.5">
                      <Label htmlFor="clientNameGrid">{t.projekty.clientNameLabel}</Label>
                      <Input
                        id="clientNameGrid"
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                        placeholder={t.projekty.clientNamePlaceholder}
                      />
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <Label htmlFor="clientEmail">{t.projekty.clientEmailLabel}<span className="text-destructive">*</span></Label>
                    <Input
                      id="clientEmail"
                      type="email"
                      value={clientEmail}
                      onChange={(e) => { setClientEmail(e.target.value); if (clientEmailError) setClientEmailError(""); }}
                      placeholder={t.projekty.clientEmailPlaceholder}
                    />
                    {clientEmailError && <p className="text-xs text-destructive mt-1">{clientEmailError}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="clientPhone">{t.projekty.phoneLabel}</Label>
                    <Input
                      id="clientPhone"
                      type="tel"
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      placeholder="+48 123 456 789"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="clientPassword">
                    {t.projekty.clientPasswordLabel}{" "}
                    <span className="text-muted-foreground font-normal">{t.common.optional}</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="clientPassword"
                      type={showClientPassword ? "text" : "password"}
                      value={clientPassword}
                      onChange={(e) => setClientPassword(e.target.value)}
                      placeholder={t.projekty.clientPasswordLoginPlaceholder}
                      className="pr-9"
                    />
                    <button
                      type="button"
                      onClick={() => setShowClientPassword((v) => !v)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showClientPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  {clientPassword.trim() && (
                    clientEmail.trim()
                      ? <p className="text-xs text-muted-foreground">Login: <span className="font-mono font-medium text-foreground">{clientEmail.trim().toLowerCase()}</span></p>
                      : <p className="text-xs text-destructive">{t.projekty.emailRequiredForPassword}</p>
                  )}
                </div>
              </>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="description">{t.projekty.descriptionLabel}</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t.projekty.descriptionPlaceholder}
                rows={3}
              />
            </div>

            <div className="flex gap-2 justify-end pt-1">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                {t.common.cancel}
              </Button>
              <Button type="button" onClick={handleSubmit} disabled={
                loading ||
                !title.trim() ||
                (!module && !fixedClientId && !selectedClientId && !clientEmail.trim())
              }>
                {loading ? t.projekty.creating : t.projekty.createProject}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {selectedClientId ? (
              <>
                <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-muted border border-border">
                  <p className="text-sm font-medium truncate">
                    {clients.find((c) => c.id === selectedClientId)?.name}
                  </p>
                  <button
                    type="button"
                    onClick={() => setSelectedClientId("")}
                    className="text-xs text-muted-foreground hover:text-foreground ml-2 shrink-0"
                  >
                    {t.projekty.changeBtn}
                  </button>
                </div>
                <div className="flex gap-2 justify-end pt-1">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                    {t.common.cancel}
                  </Button>
                  <Button type="button" onClick={handleSubmit} disabled={loading || !title.trim() || !selectedClientId}>
                    {loading ? t.projekty.creating : t.projekty.createProject}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="relative">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <input
                    autoFocus
                    type="text"
                    placeholder={t.projekty.searchClientPlaceholder}
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div className="max-h-64 overflow-y-auto rounded-lg border border-border">
                  {loadingClients ? (
                    <p className="text-sm text-muted-foreground text-center py-8">{t.common.loading}</p>
                  ) : clients.filter((c) => c.name.toLowerCase().includes(clientSearch.toLowerCase())).length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      {clientSearch ? t.common.noResults : t.projekty.noClientsSearch}
                    </p>
                  ) : (
                    clients
                      .filter((c) => c.name.toLowerCase().includes(clientSearch.toLowerCase()))
                      .map((c, i, arr) => (
                        <button
                          key={c.id}
                          onClick={() => { setSelectedClientId(c.id); setClientSearch(""); }}
                          className={`w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/50 transition-colors ${
                            i !== arr.length - 1 ? "border-b border-border" : ""
                          }`}
                        >
                          <p className="text-sm font-medium text-foreground truncate">{c.name}</p>
                          <ChevronRight size={14} className="text-muted-foreground shrink-0" />
                        </button>
                      ))
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
