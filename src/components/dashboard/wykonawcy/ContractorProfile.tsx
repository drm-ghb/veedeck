"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Plus,
  Archive,
  ArchiveRestore,
  ChevronLeft,
  Eye,
  EyeOff,
  KeyRound,
  Trash2,
  X,
  Info,
} from "@/components/ui/icons";
import AssignProjectDialog from "./AssignProjectDialog";

const TRADE_OPTIONS = [
  { value: "malarz", label: "Malarz" },
  { value: "hydraulik", label: "Hydraulik" },
  { value: "elektryk", label: "Elektryk" },
  { value: "firma wykończeniowa", label: "Firma wykończeniowa" },
  { value: "inne", label: "Inne" },
];

interface Assignment {
  id: string;
  archived: boolean;
  createdAt: string;
  unreadCount: number;
  project: { id: string; title: string; clientName: string | null };
}

interface ContractorUser {
  id: string;
  login: string | null;
  email: string | null;
}

interface Contractor {
  id: string;
  name: string;
  company: string | null;
  trade: string | null;
  email: string | null;
  phone: string | null;
  user: ContractorUser | null;
  assignments: Assignment[];
}

interface Props {
  contractor: Contractor;
}

export default function ContractorProfile({ contractor }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<"active" | "archived">("active");
  const [assignOpen, setAssignOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);

  // ── Editable info fields ───────────────────────────────────────────────────
  const [name, setName] = useState(contractor.name);
  const [company, setCompany] = useState(contractor.company ?? "");
  const [trade, setTrade] = useState(contractor.trade ?? "");
  const [email, setEmail] = useState(contractor.email ?? "");
  const [phone, setPhone] = useState(contractor.phone ?? "");
  const [savingInfo, setSavingInfo] = useState(false);

  // ── Account ───────────────────────────────────────────────────────────────
  const [accountUser, setAccountUser] = useState<ContractorUser | null>(contractor.user);
  const [createOpen, setCreateOpen] = useState(false);
  const [createEmail, setCreateEmail] = useState(contractor.email ?? "");
  const [createPassword, setCreatePassword] = useState("");
  const [showCreatePass, setShowCreatePass] = useState(false);
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [credsOpen, setCredsOpen] = useState(false);
  const [credLogin, setCredLogin] = useState(contractor.user?.login ?? "");
  const [credPassword, setCredPassword] = useState("");
  const [showCredPass, setShowCredPass] = useState(false);
  const [savingCreds, setSavingCreds] = useState(false);

  const active = contractor.assignments.filter((a) => !a.archived);
  const archived = contractor.assignments.filter((a) => a.archived);
  const displayed = tab === "active" ? active : archived;

  async function deleteAssignment(assignment: Assignment) {
    if (!confirm(`Usunąć przypisanie projektu "${assignment.project.title}"? Spowoduje to usunięcie wszystkich folderów i plików przypisanych do tego wykonawcy.`)) return;
    const res = await fetch(`/api/contractors/${contractor.id}/assignments/${assignment.id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      toast.success("Przypisanie usunięte");
      router.refresh();
    } else {
      toast.error("Błąd podczas usuwania przypisania");
    }
  }

  async function toggleArchive(assignment: Assignment) {
    const res = await fetch(`/api/contractors/${contractor.id}/assignments/${assignment.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived: !assignment.archived }),
    });
    if (res.ok) {
      toast.success(assignment.archived ? "Przywrócono projekt" : "Projekt zarchiwizowany");
      router.refresh();
    } else {
      toast.error("Błąd podczas aktualizacji");
    }
  }

  async function saveInfo() {
    if (!name.trim()) {
      toast.error("Imię i nazwisko jest wymagane");
      return;
    }
    setSavingInfo(true);
    try {
      const res = await fetch(`/api/contractors/${contractor.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          company: company.trim() || null,
          trade: trade || null,
          email: email.trim() || null,
          phone: phone.trim() || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Błąd podczas zapisywania");
        return;
      }
      toast.success("Zapisano");
      router.refresh();
    } finally {
      setSavingInfo(false);
    }
  }

  async function createAccount() {
    if (!createPassword.trim() || createPassword.trim().length < 4) {
      toast.error("Hasło musi mieć co najmniej 4 znaki");
      return;
    }
    setCreatingAccount(true);
    try {
      const res = await fetch(`/api/contractors/${contractor.id}/account`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: createEmail.trim() || undefined,
          password: createPassword.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Błąd tworzenia konta");
        return;
      }
      setAccountUser(data.user);
      setCredLogin(data.user.login);
      setCreateOpen(false);
      setCreatePassword("");
      setCredsOpen(true);
      toast.success("Konto wykonawcy zostało utworzone");
    } finally {
      setCreatingAccount(false);
    }
  }

  async function saveAccountCreds() {
    if (!credLogin.trim() && !credPassword.trim()) return;
    setSavingCreds(true);
    try {
      const body: Record<string, string> = {};
      if (credLogin.trim()) body.login = credLogin.trim();
      if (credPassword.trim()) body.password = credPassword.trim();
      const res = await fetch(`/api/contractors/${contractor.id}/account`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Błąd zapisu");
        return;
      }
      setAccountUser(data.user);
      setCredLogin(data.user.login);
      setCredPassword("");
      toast.success("Dane logowania zaktualizowane");
    } finally {
      setSavingCreds(false);
    }
  }

  async function unlinkAccount() {
    const res = await fetch(`/api/contractors/${contractor.id}/account`, { method: "DELETE" });
    if (res.ok) {
      setAccountUser(null);
      setCredLogin("");
      setCredPassword("");
      setCredsOpen(false);
      setCreateOpen(false);
      toast.success("Konto odłączone");
    } else {
      toast.error("Błąd podczas odłączania konta");
    }
  }

  const displayTitle = company.trim() || contractor.company || null;

  const infoPanelContent = (
    <div className="overflow-y-auto flex-1">
      {/* Dane */}
      <section className="p-4 space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Dane</h3>

        <div className="space-y-1">
          <Label className="text-xs">Imię i nazwisko *</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Jan Kowalski"
            className="h-8 text-sm"
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Firma</Label>
          <Input
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="Nazwa firmy"
            className="h-8 text-sm"
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Specjalizacja</Label>
          <select
            value={trade}
            onChange={(e) => setTrade(e.target.value)}
            className="w-full px-3 py-1.5 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">Wybierz specjalizację</option>
            {TRADE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Email</Label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="jan@firma.pl"
            className="h-8 text-sm"
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Telefon</Label>
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+48 123 456 789"
            className="h-8 text-sm"
          />
        </div>

        <div className="flex justify-end pt-1">
          <Button size="sm" onClick={saveInfo} disabled={savingInfo || !name.trim()}>
            {savingInfo ? "Zapisywanie…" : "Zapisz"}
          </Button>
        </div>
      </section>

      {/* Konto wykonawcy */}
      <section className="border-t border-border p-4 space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Konto wykonawcy</h3>

        {accountUser ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm">
                <KeyRound size={14} className="text-muted-foreground" />
                <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{accountUser.login}</span>
              </div>
              <button
                onClick={() => setCredsOpen((v) => !v)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {credsOpen ? "Ukryj" : "Edytuj"}
              </button>
            </div>

            {credsOpen && (
              <div className="p-3 rounded-lg bg-muted/50 border border-border space-y-2">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium">Login</p>
                  <Input
                    value={credLogin}
                    onChange={(e) => setCredLogin(e.target.value)}
                    className="text-xs h-7 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium">Nowe hasło</p>
                  <div className="relative">
                    <Input
                      type={showCredPass ? "text" : "password"}
                      value={credPassword}
                      onChange={(e) => setCredPassword(e.target.value)}
                      placeholder="Zostaw puste aby nie zmieniać"
                      className="text-xs h-7 pr-7"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCredPass((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                    >
                      {showCredPass ? <EyeOff size={11} /> : <Eye size={11} />}
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2 pt-1">
                  <button
                    onClick={unlinkAccount}
                    className="text-xs text-destructive hover:text-destructive/80 transition-colors"
                  >
                    Odłącz konto
                  </button>
                  <Button
                    size="sm"
                    className="h-7 text-xs"
                    disabled={savingCreds || (!credLogin.trim() && !credPassword.trim())}
                    onClick={saveAccountCreds}
                  >
                    {savingCreds ? "Zapis…" : "Zapisz"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Wykonawca nie ma jeszcze konta w systemie.</p>
            <button
              onClick={() => setCreateOpen((v) => !v)}
              className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-800 dark:hover:text-amber-300 transition-colors"
            >
              <KeyRound size={11} />
              {createOpen ? "Anuluj" : "Utwórz konto"}
            </button>

            {createOpen && (
              <div className="p-3 rounded-lg bg-muted/50 border border-border space-y-2">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium">Email / login</p>
                  <Input
                    type="email"
                    value={createEmail}
                    onChange={(e) => setCreateEmail(e.target.value)}
                    placeholder="email@domena.pl (będzie loginem)"
                    className="text-xs h-7"
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium">Hasło</p>
                  <div className="relative">
                    <Input
                      type={showCreatePass ? "text" : "password"}
                      value={createPassword}
                      onChange={(e) => setCreatePassword(e.target.value)}
                      placeholder="Min. 4 znaki"
                      className="text-xs h-7 pr-7"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCreatePass((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                    >
                      {showCreatePass ? <EyeOff size={11} /> : <Eye size={11} />}
                    </button>
                  </div>
                </div>
                <div className="flex justify-end pt-1">
                  <Button
                    size="sm"
                    className="h-7 text-xs"
                    disabled={creatingAccount || !createPassword.trim() || createPassword.trim().length < 4}
                    onClick={createAccount}
                  >
                    {creatingAccount ? "Tworzenie…" : "Utwórz konto"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <Link href="/wykonawcy" className="text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft size={20} />
        </Link>
        <nav className="flex items-center gap-1 text-sm text-muted-foreground overflow-hidden">
          <Link href="/wykonawcy" className="hover:text-foreground transition-colors shrink-0">Wykonawcy</Link>
          <span className="shrink-0">/</span>
          <span className="text-foreground font-medium truncate">{displayTitle || contractor.name}</span>
        </nav>
      </div>

      {/* Two-column layout: main content + info panel */}
      <div className="flex gap-6 items-start">
        {/* Main content */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* Title row */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              {displayTitle ? (
                <>
                  <h1 className="text-2xl font-semibold truncate">{displayTitle}</h1>
                  <p className="text-sm text-muted-foreground mt-0.5 truncate">{name || contractor.name}</p>
                </>
              ) : (
                <h1 className="text-2xl font-semibold truncate">{name || contractor.name}</h1>
              )}
              {(trade || contractor.trade) && (
                <div className="mt-1">
                  <Badge variant="secondary">{trade || contractor.trade}</Badge>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {/* Informacje button — only on mobile (panel always visible on desktop) */}
              <Button variant="outline" size="sm" onClick={() => setInfoOpen(true)} className="gap-2 lg:hidden">
                <Info size={14} />
                Informacje
              </Button>
              <Button onClick={() => setAssignOpen(true)} size="sm" className="gap-2 hidden sm:flex">
                <Plus size={16} />
                Przypisz projekt
              </Button>
            </div>
          </div>

          {/* Mobile: full-width assign button */}
          <Button onClick={() => setAssignOpen(true)} className="sm:hidden w-full gap-2">
            <Plus size={16} />
            Przypisz projekt
          </Button>

          {/* Tabs */}
          <div className="flex items-center gap-1 border-b border-border">
            <button
              onClick={() => setTab("active")}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${tab === "active" ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              Aktywne
              <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${tab === "active" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{active.length}</span>
            </button>
            <button
              onClick={() => setTab("archived")}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${tab === "archived" ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              Zarchiwizowane
              {archived.length > 0 && <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${tab === "archived" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{archived.length}</span>}
            </button>
          </div>

          {/* Projects list */}
          {displayed.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">
              {tab === "active" ? "Brak aktywnych projektów" : "Brak zarchiwizowanych projektów"}
            </div>
          ) : (
            <div className="space-y-2">
              {displayed.map((a) => (
                <div key={a.id} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-4 rounded-xl border border-border bg-card hover:border-primary/30 transition-colors">
                  <Link href={`/wykonawcy/${contractor.id}/projekty/${a.id}`} className="flex-1 min-w-0">
                    <p className="font-medium truncate">{a.project.title}</p>
                    {a.project.clientName && (
                      <p className="text-sm text-muted-foreground truncate">Klient: {a.project.clientName}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Przypisano: {new Date(a.createdAt).toLocaleDateString("pl-PL")}
                    </p>
                  </Link>
                  <div className="flex items-center gap-2 justify-end sm:justify-start shrink-0 flex-wrap">
                    {a.unreadCount > 0 && (
                      <Badge variant="default" className="text-xs whitespace-nowrap">
                        Nieprzeczytane: {a.unreadCount > 99 ? "99+" : a.unreadCount}
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleArchive(a)}
                      className="gap-1.5"
                    >
                      {a.archived ? <ArchiveRestore size={14} /> : <Archive size={14} />}
                      <span className="hidden sm:inline">{a.archived ? "Przywróć" : "Archiwizuj"}</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteAssignment(a)}
                      className="gap-1.5 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                    >
                      <Trash2 size={14} />
                      <span className="hidden sm:inline">Usuń</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Desktop info panel — always visible on lg+ */}
        <div className="hidden lg:flex flex-col w-72 shrink-0 rounded-xl border border-border bg-card">
          <div className="px-4 py-3 border-b border-border shrink-0">
            <h2 className="text-sm font-semibold">Informacje o wykonawcy</h2>
          </div>
          {infoPanelContent}
        </div>
      </div>

      {/* Mobile modal — only on < lg */}
      {infoOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4"
          onClick={() => setInfoOpen(false)}
        >
          <div
            className="w-full h-full sm:h-auto sm:max-w-sm bg-card rounded-none sm:rounded-2xl shadow-xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
              <h2 className="text-sm font-semibold">Informacje o wykonawcy</h2>
              <button
                onClick={() => setInfoOpen(false)}
                className="w-7 h-7 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            {infoPanelContent}
          </div>
        </div>
      )}

      <AssignProjectDialog
        open={assignOpen}
        onOpenChange={setAssignOpen}
        contractorId={contractor.id}
        onAssigned={() => router.refresh()}
      />
    </div>
  );
}
