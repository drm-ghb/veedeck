"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Plus, MoreVertical, Users, Trash2, Pencil, Archive, ArchiveRestore, ArrowUpDown, Check, AlertTriangle } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import AddClientDialog from "@/components/projekty/AddClientDialog";
import EditClientDialog from "@/components/projekty/EditClientDialog";
import { useT } from "@/lib/i18n";

interface ClientProject {
  id: string;
  title: string;
  slug: string | null;
  createdAt: string;
}

interface Client {
  id: string;
  name: string;
  createdAt: string;
  archived: boolean;
  _count: { projects: number };
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
  const [menuUp, setMenuUp] = useState(false);
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
    if (!confirm(`${t.projekty.confirmDeleteProject.replace("{title}", client.name)}`)) return;
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
        <Button onClick={() => setAddOpen(true)} className="flex items-center gap-2 sm:self-start">
          <Plus size={16} />
          {t.projekty.addClient}
        </Button>
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
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.projekty.searchClientPlaceholderV2}
              className="w-full pl-9 pr-4 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-transparent"
            />
          </div>
          <div className="relative">
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
        <div className="border border-border rounded-xl overflow-hidden divide-y divide-border">
          {filtered.map((client) => (
            <div key={client.id} className="flex items-center gap-4 px-4 py-3.5 hover:bg-muted/30 transition-colors">
              <Link href={`/klienci/klient/${client.id}`} className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-foreground truncate">{client.name}</p>
                  {client.hasContactsWithoutAccount && (
                    <span title={t.projekty.contactsWithoutAccount} className="flex-shrink-0 text-amber-500">
                      <AlertTriangle size={14} />
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {client._count.projects === 0
                    ? t.projekty.clientNoProjects
                    : `${client._count.projects} ${client._count.projects === 1 ? t.projekty.clientProjectSg : client._count.projects < 5 ? t.projekty.clientProjectFw : t.projekty.clientProjectPl}`}
                </p>
              </Link>


              {/* Menu */}
              <div className="relative">
                <button
                  onClick={(e) => { e.stopPropagation(); const rect = e.currentTarget.getBoundingClientRect(); setMenuUp(rect.bottom > window.innerHeight - 160); setMenuOpen(menuOpen === client.id ? null : client.id); }}
                  className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <MoreVertical size={16} />
                </button>
                {menuOpen === client.id && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(null)} />
                    <div className={`absolute right-0 z-20 bg-popover border border-border rounded-lg shadow-lg py-1 w-44 text-sm ${menuUp ? "bottom-8" : "top-8"}`}>
                      <button
                        onClick={() => { setEditClient(client); setMenuOpen(null); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-muted transition-colors"
                      >
                        <Pencil size={14} /> {t.projekty.editClientLabel}
                      </button>
                      <button
                        onClick={() => handleArchive(client)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-muted transition-colors"
                      >
                        {client.archived ? <ArchiveRestore size={14} /> : <Archive size={14} />}
                        {client.archived ? t.projekty.restoreClientLabel : t.projekty.archiveClientLabel}
                      </button>
                      <button
                        onClick={() => handleDelete(client)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-muted text-destructive transition-colors"
                      >
                        <Trash2 size={14} /> {t.projekty.deleteClientLabel}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

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
