"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Plus, MoreVertical, Users, Trash2, Pencil, Archive, ArchiveRestore, ArrowUpDown, Check, AlertTriangle, PushPin } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import AddClientDialog from "@/components/projekty/AddClientDialog";
import EditClientDialog from "@/components/projekty/EditClientDialog";
import { useT } from "@/lib/i18n";
import TrialGate from "@/components/ui/TrialGate";
import { useIsTrialExpired } from "@/lib/trial-context";
import { accentColors } from "@/lib/accent-color";
import { showConfirm } from "@/lib/confirm";

interface ClientProject {
  id: string;
  title: string;
  slug: string | null;
  createdAt: string;
}

interface Client {
  id: string;
  name: string;
  accentColor?: string | null;
  createdAt: string;
  archived: boolean;
  _count: { projects: number; shoppingLists: number };
  hasContactsWithoutAccount: boolean;
  projects: ClientProject[];
}

interface Props {
  clients: Client[];
  archivedClients: Client[];
}

type Tab = "active" | "archived";
type SortBy = "name" | "newest" | "oldest" | "projects";

function sortClients(list: Client[], sortBy: SortBy): Client[] {
  const arr = [...list];
  if (sortBy === "name") arr.sort((a, b) => a.name.localeCompare(b.name, "pl"));
  else if (sortBy === "newest") arr.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  else if (sortBy === "oldest") arr.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  else if (sortBy === "projects") arr.sort((a, b) => b._count.projects - a._count.projects);
  return arr;
}

export default function ClientsView({ clients, archivedClients }: Props) {
  const router = useRouter();
  const t = useT();
  const expired = useIsTrialExpired();
  const SORT_LABELS: Record<SortBy, string> = {
    name: t.projekty.sortName,
    newest: t.projekty.sortNewest,
    oldest: t.projekty.sortOldest,
    projects: t.projekty.sortMostProjects,
  };
  const [tab, setTab] = useState<Tab>("active");
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);
  const [sortBy, setSortBy] = useState<SortBy>(() => {
    if (typeof window === "undefined") return "name";
    const saved = localStorage.getItem("klienci-sort");
    return (saved === "name" || saved === "newest" || saved === "oldest" || saved === "projects") ? saved : "name";
  });
  const [sortOpen, setSortOpen] = useState(false);

  const list = tab === "active" ? clients : archivedClients;
  const filtered = sortClients(
    list.filter((c) => c.name.toLowerCase().includes(search.toLowerCase())),
    sortBy
  );

  function handleSetSort(s: SortBy) {
    setSortBy(s);
    setSortOpen(false);
    localStorage.setItem("klienci-sort", s);
  }

  async function handleArchive(client: Client) {
    const res = await fetch(`/api/clients/${client.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived: !client.archived }),
    });
    if (res.ok) {
      toast.success(client.archived ? t.projekty.clientRestored : t.projekty.clientArchived);
      router.refresh();
    } else {
      toast.error(t.common.error);
    }
    setMenuOpen(null);
  }

  async function handleDelete(client: Client) {
    if (!await showConfirm(`${t.projekty.confirmDeleteProject.replace("{title}", client.name)}`)) return;
    const res = await fetch(`/api/clients/${client.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success(t.projekty.clientDeleted);
      router.refresh();
    } else {
      toast.error(t.common.error);
    }
    setMenuOpen(null);
  }

  const allClients = [...clients, ...archivedClients];

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-bold">{t.projekty.title}</h1>
          <p className="text-muted-foreground mt-1">
            {clients.length === 0
              ? t.projekty.noClientsEmpty
              : `${clients.length} ${clients.length === 1 ? t.projekty.clientActiveSg : t.projekty.clientActivePl}`}
          </p>
        </div>
        <TrialGate>
          <Button onClick={() => setAddOpen(true)} className="flex items-center gap-2 sm:self-start">
            <Plus size={16} />
            {t.projekty.addClient}
          </Button>
        </TrialGate>
      </div>

      {/* Tabs */}
      {allClients.length > 0 && (
        <div className="flex items-center gap-1 mb-5 border-b border-border">
          <button
            onClick={() => setTab("active")}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === "active" ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.projekty.activeTab}
            {clients.length > 0 && (
              <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${tab === "active" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                {clients.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab("archived")}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === "archived" ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.projekty.archivedTab}
            {archivedClients.length > 0 && (
              <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${tab === "archived" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                {archivedClients.length}
              </span>
            )}
          </button>
        </div>
      )}

      {/* Toolbar */}
      {list.length > 0 && (
        <div className="flex items-center gap-2 mb-6">
          <div className="relative w-full max-w-sm">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.projekty.searchClientPlaceholderV2}
              className="w-full pl-9 pr-4 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-transparent"
            />
          </div>
          <div className="relative ml-auto">
            <button
              onClick={() => setSortOpen((v) => !v)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm transition-colors ${sortBy !== "name" ? "border-primary/40 bg-primary/5 text-primary" : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"}`}
            >
              <ArrowUpDown size={14} />
              <span className="hidden sm:inline">{SORT_LABELS[sortBy]}</span>
            </button>
            {sortOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setSortOpen(false)} />
                <div className="absolute right-0 top-full mt-1 z-20 bg-popover border border-border rounded-lg shadow-md py-1 min-w-[180px]">
                  {(["name", "newest", "oldest", "projects"] as SortBy[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => handleSetSort(s)}
                      className={`flex items-center justify-between w-full px-3 py-1.5 text-sm transition-colors hover:bg-muted ${sortBy === s ? "text-foreground font-medium" : "text-muted-foreground"}`}
                    >
                      {SORT_LABELS[s]}
                      {sortBy === s && <Check size={12} />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Empty state — no clients at all */}
      {allClients.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <Users size={28} className="text-primary" />
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-1">{t.projekty.noClientsEmpty}</h2>
          <p className="text-sm text-muted-foreground max-w-xs">{t.projekty.noClientsEmptyDesc}</p>
        </div>
      )}

      {/* Empty state — tab empty */}
      {allClients.length > 0 && list.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-sm">{tab === "archived" ? t.projekty.noArchivedClients : t.projekty.noActiveClients}</p>
        </div>
      )}

      {/* No search results */}
      {list.length > 0 && filtered.length === 0 && search && (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-sm">{t.projekty.noClientsSearch} &quot;{search}&quot;</p>
        </div>
      )}

      {/* List */}
      {filtered.length > 0 && (
        <div className="space-y-[10px]">
          {filtered.map((client) => (
            <div key={client.id} className="relative flex items-center gap-3 px-4 py-[14px] overflow-hidden rounded-xl border border-border bg-card transition-[box-shadow,transform] duration-[180ms] hover:shadow-[0_8px_24px_-12px_rgba(24,24,50,.15)] hover:-translate-y-px">
              <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: accentColors(client.accentColor).bar }} />
              <Link href={`/klienci/klient/${client.id}`} className="flex-1 min-w-0 pl-2">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-[14.5px] text-foreground truncate">{client.name}</p>
                  {client.hasContactsWithoutAccount && (
                    <span title={t.projekty.contactsWithoutAccount} className="flex-shrink-0" style={{ color: "#f59e0b" }}>
                      <AlertTriangle size={15} />
                    </span>
                  )}
                </div>
                <p className="text-[12px] text-muted-foreground mt-[2px]">
                  Utworzono: {new Date(client.createdAt).toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit", year: "numeric" })}
                </p>
              </Link>

              {/* Stats */}
              <div className="flex items-center gap-2 shrink-0 mr-1">
                <div className="flex items-center gap-1 text-[11.5px] text-muted-foreground" title="Projekty ProjectFlow">
                  <PushPin size={13} />
                  <span className="font-medium text-[#4B5063]">{client._count.projects}</span>
                </div>
                <div className="w-px h-3 bg-border" />
                <div className="flex items-center gap-1 text-[11.5px] text-muted-foreground" title="Listy zakupowe">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 12h6M9 16h4"/></svg>
                  <span className="font-medium text-[#4B5063]">{client._count.shoppingLists}</span>
                </div>
              </div>

              {/* Menu trigger only — dropdown rendered outside this overflow-hidden card */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (menuOpen === client.id) { setMenuOpen(null); return; }
                  const rect = e.currentTarget.getBoundingClientRect();
                  const spaceBelow = window.innerHeight - rect.bottom;
                  const top = spaceBelow < 160 ? rect.top - 104 : rect.bottom + 4;
                  setMenuPos({ top, right: window.innerWidth - rect.right });
                  setMenuOpen(client.id);
                }}
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
              >
                <MoreVertical size={18} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Global client menu — outside overflow-hidden/transform ancestors */}
      {menuOpen && menuPos && (() => {
        const client = filtered.find((c) => c.id === menuOpen);
        if (!client) return null;
        return (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(null)} />
            <div
              className="fixed z-50 bg-popover border border-border rounded-lg shadow-lg py-1 w-44 text-sm"
              style={{ top: menuPos.top, right: menuPos.right }}
            >
              <button
                disabled={expired}
                onClick={() => { setEditClient(client); setMenuOpen(null); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-muted transition-colors disabled:opacity-40 disabled:pointer-events-none"
                title={expired ? "Dostępne w płatnym planie" : undefined}
              >
                <Pencil size={14} /> {t.projekty.editClientLabel}
              </button>
              <button
                disabled={expired}
                onClick={() => handleArchive(client)}
                className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-muted transition-colors disabled:opacity-40 disabled:pointer-events-none"
                title={expired ? "Dostępne w płatnym planie" : undefined}
              >
                {client.archived ? <ArchiveRestore size={14} /> : <Archive size={14} />}
                {client.archived ? t.projekty.restoreClientLabel : t.projekty.archiveClientLabel}
              </button>
              <button
                disabled={expired}
                onClick={() => handleDelete(client)}
                className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-muted text-destructive transition-colors disabled:opacity-40 disabled:pointer-events-none"
                title={expired ? "Dostępne w płatnym planie" : undefined}
              >
                <Trash2 size={14} /> {t.projekty.deleteClientLabel}
              </button>
            </div>
          </>
        );
      })()}

      <AddClientDialog open={addOpen} onOpenChange={setAddOpen} onCreated={() => router.refresh()} />
      {editClient && (
        <EditClientDialog
          client={editClient}
          open={!!editClient}
          onOpenChange={(v) => { if (!v) setEditClient(null); }}
          onSaved={() => { setEditClient(null); router.refresh(); }}
        />
      )}
    </div>
  );
}
