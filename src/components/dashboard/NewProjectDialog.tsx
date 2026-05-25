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
import { Search, ChevronRight, Eye, EyeOff } from "@/components/ui/icons";
import { useT } from "@/lib/i18n";

interface ExistingProject {
  id: string;
  title: string;
  clientName: string | null;
  clientEmail: string | null;
  renderCount: number;
}

interface NewProjectDialogProps {
  module?: string;
  label?: string;
  clientMode?: boolean;
}

export default function NewProjectDialog({ module, label, clientMode }: NewProjectDialogProps = {}) {
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

  // Existing projects
  const [projects, setProjects] = useState<ExistingProject[]>([]);
  const [search, setSearch] = useState("");
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [selectedExistingProject, setSelectedExistingProject] = useState<ExistingProject | null>(null);

  const router = useRouter();

  useEffect(() => {
    if (open && tab === "existing" && projects.length === 0) {
      fetchProjects();
    }
  }, [open, tab]);

  async function fetchProjects() {
    setLoadingProjects(true);
    try {
      const res = await fetch("/api/projects");
      if (res.ok) {
        const data = await res.json();
        setProjects(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          data.filter((p: any) => !p.archived).map((p: any) => ({
            id: p.id,
            title: p.title,
            clientName: p.clientName ?? null,
            clientEmail: p.clientEmail ?? null,
            renderCount: p._count?.renders ?? 0,
          }))
        );
      }
    } finally {
      setLoadingProjects(false);
    }
  }

  async function handleSubmit() {
    if (!title.trim()) return;
    if (tab === "new" && !clientEmail.trim()) return;
    if (tab === "new" && !clientEmail.includes("@")) {
      setClientEmailError("Podaj poprawny adres e-mail (brak znaku @)");
      return;
    }
    if (tab === "existing" && !selectedExistingProject) return;
    setClientEmailError("");
    setLoading(true);

    const body = tab === "existing" && selectedExistingProject
      ? {
          title: title.trim(),
          clientName: selectedExistingProject.clientName || undefined,
          clientEmail: selectedExistingProject.clientEmail || undefined,
          ...(module && { module }),
        }
      : {
          title: title.trim(),
          clientName: clientName.trim() || undefined,
          clientEmail: clientEmail.trim() || undefined,
          clientPhone: clientPhone.trim() || undefined,
          clientPassword: clientPassword.trim() || undefined,
          description: description.trim() || undefined,
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
      setSelectedExistingProject(null);
      router.refresh();
    } catch {
      toast.error(t.projekty.projectCreateError);
    } finally {
      setLoading(false);
    }
  }

  async function handleSelectProject(id: string) {
    if (module) {
      await fetch(`/api/projects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addModule: module }),
      });
    }
    setOpen(false);
    router.push(`/projects/${id}`);
  }

  function handleOpenChange(val: boolean) {
    setOpen(val);
    if (!val) {
      setTab("new");
      setSearch("");
      setTitle("");
      setClientName("");
      setClientEmail("");
      setClientPhone("");
      setClientPassword("");
      setShowClientPassword(false);
      setDescription("");
      setSelectedExistingProject(null);
    }
  }

  const filtered = projects.filter((p) => {
    const q = search.toLowerCase();
    return (
      p.title.toLowerCase().includes(q) ||
      (p.clientName?.toLowerCase().includes(q) ?? false)
    );
  });

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button />}>{label ?? t.projekty.newProject}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{label ?? t.projekty.newProject}</DialogTitle>
        </DialogHeader>

        <div className="space-y-1.5">
          <Label htmlFor="title">{clientMode ? "Nazwa klienta" : t.projekty.projectNameLabel} <span className="text-destructive">*</span></Label>
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
              onClick={() => { setTab("new"); setSelectedExistingProject(null); setSearch(""); }}
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
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="clientName">{t.projekty.clientNameLabel}</Label>
                <Input
                  id="clientName"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder={t.projekty.clientNamePlaceholder}
                />
              </div>
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
                <Label htmlFor="clientPhone">Telefon</Label>
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
                Hasło do konta klienta{" "}
                <span className="text-muted-foreground font-normal">(opcjonalnie)</span>
              </Label>
              <div className="relative">
                <Input
                  id="clientPassword"
                  type={showClientPassword ? "text" : "password"}
                  value={clientPassword}
                  onChange={(e) => setClientPassword(e.target.value)}
                  placeholder="Klient zaloguje się tym hasłem"
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
                  : <p className="text-xs text-destructive">Podaj e-mail klienta — będzie używany jako login do panelu</p>
              )}
            </div>

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
              <Button type="button" onClick={handleSubmit} disabled={loading || !title.trim() || !clientEmail.trim()}>
                {loading ? t.projekty.creating : t.projekty.createProject}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {selectedExistingProject ? (
              <>
                <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-muted border border-border">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{selectedExistingProject.title}</p>
                    {selectedExistingProject.clientName && (
                      <p className="text-xs text-muted-foreground truncate">{selectedExistingProject.clientName}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedExistingProject(null)}
                    className="text-xs text-muted-foreground hover:text-foreground ml-2 shrink-0"
                  >
                    Zmień
                  </button>
                </div>
                <div className="flex gap-2 justify-end pt-1">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                    {t.common.cancel}
                  </Button>
                  <Button type="button" onClick={handleSubmit} disabled={loading || !title.trim()}>
                    {loading ? t.projekty.creating : t.projekty.createProject}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="relative">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <Input
                    autoFocus
                    placeholder={t.projekty.searchPlaceholder}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="max-h-64 overflow-y-auto rounded-lg border border-border">
                  {loadingProjects ? (
                    <p className="text-sm text-muted-foreground text-center py-8">{t.common.loading}</p>
                  ) : filtered.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      {search ? t.common.noResults : t.projekty.noProjects}
                    </p>
                  ) : (
                    filtered.map((p, i) => (
                      <button
                        key={p.id}
                        onClick={() => { setSelectedExistingProject(p); setSearch(""); }}
                        className={`w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/50 transition-colors ${
                          i !== filtered.length - 1 ? "border-b border-border" : ""
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{p.title}</p>
                          {p.clientName && (
                            <p className="text-xs text-muted-foreground truncate">{p.clientName}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 ml-3 shrink-0">
                          {p.renderCount > 0 && (
                            <span className="text-xs text-muted-foreground">{p.renderCount} {t.projekty.renders}</span>
                          )}
                          <ChevronRight size={14} className="text-muted-foreground" />
                        </div>
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
