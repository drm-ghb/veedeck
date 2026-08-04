"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import {
  Plus, Loader2, Users, Lock, Shield, ChevronRight,
  PushPin, LocalMall, Engineering, CheckSquare, Package,
  CalendarDays, NotebookText, ChatBubble, ClipboardList,
  Interests, Settings, UserPlus, X, ArrowLeft, MoreVertical,
} from "@/components/ui/icons";
import type { ModuleSlug } from "@/lib/permissions";
import { showConfirm } from "@/lib/confirm";

// ── Constants ────────────────────────────────────────────────────────────────

const MODULE_LIST: { slug: ModuleSlug; label: string; icon: React.ReactNode }[] = [
  { slug: "klienci",    label: "Klienci",              icon: <Users size={16} /> },
  { slug: "projectflow",label: "ProjectFlow",           icon: <PushPin size={16} /> },
  { slug: "listy",      label: "Listy zakupowe",        icon: <LocalMall size={16} /> },
  { slug: "moodboardy", label: "Moodboardy",            icon: <Interests size={16} /> },
  { slug: "zadania",    label: "Zadania",               icon: <CheckSquare size={16} /> },
  { slug: "ankiety",    label: "Ankiety",               icon: <ClipboardList size={16} /> },
  { slug: "produkty",   label: "Produkty",              icon: <Package size={16} /> },
  { slug: "wykonawcy",  label: "Wykonawcy",             icon: <Engineering size={16} /> },
  { slug: "kalendarz",  label: "Kalendarz",             icon: <CalendarDays size={16} /> },
  { slug: "notatnik",   label: "Notatnik",              icon: <NotebookText size={16} /> },
  { slug: "dyskusje",   label: "Dyskusje",              icon: <ChatBubble size={16} /> },
  { slug: "ustawienia", label: "Ustawienia workspace",  icon: <Settings size={16} /> },
];

const LEVEL_LABELS = ["Brak", "Podgląd", "Edycja", "Zarządzanie"] as const;

// Tooltips per module × level (index = level 0–3)
const LEVEL_TOOLTIPS: Record<ModuleSlug, [string, string, string, string]> = {
  klienci:     ["Brak dostępu do listy klientów", "Może przeglądać listę klientów", "Może dodawać i edytować klientów", "Może zapraszać klientów i publikować im materiały"],
  projectflow: ["Brak dostępu do renderów i pokoi", "Może przeglądać rendery i pokoje", "Może przesyłać pliki i dodawać komentarze", "Może zarządzać pokojami i usuwać rendery"],
  listy:       ["Brak dostępu do list zakupowych", "Może przeglądać listy i produkty", "Może tworzyć i edytować listy zakupowe", "Może usuwać listy i w pełni nimi zarządzać"],
  moodboardy:  ["Brak dostępu do moodboardów", "Może przeglądać moodboardy", "Może tworzyć i edytować moodboardy", "Może usuwać moodboardy i zarządzać nimi"],
  zadania:     ["Brak dostępu do zadań", "Może przeglądać zadania", "Może tworzyć i edytować zadania", "Może usuwać zadania i zarządzać nimi"],
  ankiety:     ["Brak dostępu do ankiet", "Może przeglądać ankiety i odpowiedzi", "Może tworzyć i edytować ankiety", "Może usuwać ankiety i zarządzać szablonami"],
  produkty:    ["Brak dostępu do bazy produktów", "Może przeglądać produkty", "Może dodawać i edytować produkty", "Może usuwać produkty i zarządzać bazą"],
  wykonawcy:   ["Brak dostępu do wykonawców", "Może przeglądać wykonawców i ich foldery", "Może dodawać wykonawców i pliki", "Może usuwać wykonawców i zarządzać przypisaniami"],
  kalendarz:   ["Brak dostępu do kalendarza", "Może przeglądać wydarzenia", "Może dodawać i edytować wydarzenia", "Może zarządzać kalendarzem i usuwać wydarzenia"],
  notatnik:    ["Brak dostępu do notatnika", "Może przeglądać notatki", "Może tworzyć i edytować notatki", "Może usuwać notatki i zarządzać nimi"],
  dyskusje:    ["Brak dostępu do dyskusji", "Może przeglądać dyskusje", "Może uczestniczyć i wysyłać wiadomości", "Może zarządzać dyskusjami i je usuwać"],
  ustawienia:  ["Brak dostępu do ustawień workspace", "Może przeglądać ustawienia", "Może edytować ustawienia workspace", "Pełen dostęp do ustawień, integracji i eksportu"],
};

// ── Types ─────────────────────────────────────────────────────────────────────

interface PermissionGroup {
  id: string;
  name: string;
  isTemplate: boolean;
  templateKey: string | null;
  projectScope: "assigned" | "all";
  permissions: Record<ModuleSlug, number>;
  _count?: { members: number };
}

interface GroupMemberUser {
  id: string;
  name: string | null;
  fullName: string | null;
  email: string;
  avatarUrl: string | null;
  systemRole: string;
  permissionGroups: { group: { id: string; name: string } }[];
  _count: { clientAssignments: number };
}

// ── Sub-components ────────────────────────────────────────────────────────────

function LevelSegment({
  level, active, onClick, readOnly, tooltip,
}: { level: number; active: boolean; onClick: () => void; readOnly?: boolean; tooltip?: string }) {
  return (
    <button
      type="button"
      disabled={readOnly}
      onClick={onClick}
      title={tooltip}
      className={`px-2.5 py-1 text-xs font-medium rounded-full transition-all duration-150 ${
        active
          ? "text-white"
          : "text-muted-foreground hover:bg-muted/60"
      } ${readOnly ? "cursor-default" : "cursor-pointer"}`}
      style={active ? { background: "#4F46E5" } : {}}
    >
      {LEVEL_LABELS[level]}
    </button>
  );
}

function GroupAvatar({ name, active }: { name: string; active: boolean }) {
  const initials = (name[0] ?? "?").toUpperCase();
  return (
    <div
      className="w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-bold shrink-0"
      style={active ? { background: "#4F46E5", color: "#fff" } : { background: "#EEEDFE", color: "#3C3489" }}
    >
      {initials}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function PermissionGroupsTab({
  plan,
  onGroupsChanged,
}: {
  plan: string | null;
  onGroupsChanged?: () => void;
}) {
  const canManageScope = true; // scope toggle + project assignments always available

  const [groups, setGroups] = useState<PermissionGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<PermissionGroup | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [membersView, setMembersView] = useState(false);
  const [groupMembers, setGroupMembers] = useState<GroupMemberUser[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [workspaceMembers, setWorkspaceMembers] = useState<GroupMemberUser[]>([]);
  const [addingUserId, setAddingUserId] = useState<string | null>(null);
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [editSnapshot, setEditSnapshot] = useState<PermissionGroup | null>(null);
  const [allClients, setAllClients] = useState<{ id: string; name: string }[]>([]);
  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null);
  const [memberClientsMap, setMemberClientsMap] = useState<Record<string, string[]>>({});
  const [togglingClientId, setTogglingClientId] = useState<string | null>(null);
  const [openMenuGroupId, setOpenMenuGroupId] = useState<string | null>(null);
  const [renamingGroupId, setRenamingGroupId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const cancelRenameRef = useRef(false);

  const loadGroups = useCallback(async () => {
    const res = await fetch("/api/team/groups");
    if (!res.ok) return;
    const data: PermissionGroup[] = await res.json();
    setGroups(data);
    if (data.length > 0 && !selectedId) {
      setSelectedId(data[0].id);
      setDraft({ ...data[0], permissions: { ...(data[0].permissions as Record<ModuleSlug, number>) } });
    }
    setLoading(false);
  }, [selectedId]);

  useEffect(() => { loadGroups(); }, []);

  async function selectGroup(group: PermissionGroup) {
    if (dirty) {
      if (!await showConfirm("Masz niezapisane zmiany. Odrzucić?")) return;
    }
    setSelectedId(group.id);
    setDraft({ ...group, permissions: { ...(group.permissions as Record<ModuleSlug, number>) } });
    setDirty(false);
    setEditMode(false);
    setEditSnapshot(null);
    setExpandedMemberId(null);
    setMemberClientsMap({});
    // Auto-load members for the selected group
    setLoadingMembers(true);
    const [membRes, wsRes, clientRes] = await Promise.all([
      fetch(`/api/team/groups/${group.id}/members`),
      fetch("/api/team/invite"),
      fetch("/api/clients"),
    ]);
    if (membRes.ok) {
      const data = await membRes.json();
      setGroupMembers(data.map((m: { user: GroupMemberUser }) => m.user));
    }
    if (wsRes.ok) {
      const data = await wsRes.json();
      setWorkspaceMembers(data.members ?? []);
    }
    if (clientRes.ok) {
      const data = await clientRes.json();
      setAllClients(data.map((c: { id: string; name: string }) => ({ id: c.id, name: c.name })));
    }
    setLoadingMembers(false);
  }

  function setLevel(slug: ModuleSlug, level: number) {
    if (!draft || !canEdit) return;
    setDraft((d) => d ? { ...d, permissions: { ...d.permissions, [slug]: level } } : d);
    setDirty(true);
  }

  function setScope(scope: "assigned" | "all") {
    if (!draft || !canManageScope) return;
    setDraft((d) => d ? { ...d, projectScope: scope } : d);
    setDirty(true);
  }

  async function handleSave() {
    if (!draft || !dirty) return;
    setSaving(true);
    const res = await fetch(`/api/team/groups/${draft.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ permissions: draft.permissions, projectScope: draft.projectScope, name: draft.name }),
    });
    setSaving(false);
    if (!res.ok) { toast.error("Nie udało się zapisać"); return; }
    toast.success("Zapisano zmiany grupy");
    setDirty(false);
    setEditMode(false);
    setEditSnapshot(null);
    await loadGroups();
    onGroupsChanged?.();
  }

  async function handleRestore() {
    if (!draft) return;
    const res = await fetch(`/api/team/groups/${draft.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ restoreDefaults: true }),
    });
    if (!res.ok) { toast.error("Nie udało się przywrócić"); return; }
    toast.success("Przywrócono wartości domyślne");
    setDirty(false);
    await loadGroups();
    const updated: PermissionGroup = await res.json();
    setDraft({ ...updated, permissions: { ...(updated.permissions as Record<ModuleSlug, number>) } });
  }

  async function handleCreate() {
    const name = newGroupName.trim();
    if (!name) return;
    const res = await fetch("/api/team/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) { toast.error("Nie udało się utworzyć grupy"); return; }
    const created: PermissionGroup = await res.json();
    setNewGroupName("");
    setCreatingGroup(false);
    await loadGroups();
    setSelectedId(created.id);
    setDraft({ ...created, permissions: { ...(created.permissions as Record<ModuleSlug, number>) } });
    setDirty(false);
    toast.success("Utworzono grupę");
    onGroupsChanged?.();
  }

  async function openMembersView() {
    if (!draft) return;
    setMembersView(true);
    setLoadingMembers(true);
    setExpandedMemberId(null);
    setMemberClientsMap({});
    const [membRes, wsRes, clientRes] = await Promise.all([
      fetch(`/api/team/groups/${draft.id}/members`),
      fetch("/api/team/invite"),
      fetch("/api/clients"),
    ]);
    if (membRes.ok) {
      const data = await membRes.json();
      setGroupMembers(data.map((m: { user: GroupMemberUser }) => m.user));
    }
    if (wsRes.ok) {
      const data = await wsRes.json();
      setWorkspaceMembers(data.members ?? []);
    }
    if (clientRes.ok) {
      const data = await clientRes.json();
      setAllClients(data.map((c: { id: string; name: string }) => ({ id: c.id, name: c.name })));
    }
    setLoadingMembers(false);
  }

  async function toggleMemberExpanded(memberId: string) {
    if (expandedMemberId === memberId) {
      setExpandedMemberId(null);
      return;
    }
    setExpandedMemberId(memberId);
    if (!memberClientsMap[memberId]) {
      const res = await fetch(`/api/team/members/${memberId}/clients`);
      if (res.ok) {
        const data: { id: string; name: string }[] = await res.json();
        setMemberClientsMap((prev) => ({ ...prev, [memberId]: data.map((c) => c.id) }));
      }
    }
  }

  async function toggleClientAssignment(memberId: string, clientId: string, isAssigned: boolean) {
    setTogglingClientId(clientId);
    const res = await fetch(`/api/team/members/${memberId}/clients`, {
      method: isAssigned ? "DELETE" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId }),
    });
    setTogglingClientId(null);
    if (!res.ok) { toast.error("Nie udało się zmienić przypisania"); return; }
    setMemberClientsMap((prev) => ({
      ...prev,
      [memberId]: isAssigned
        ? (prev[memberId] ?? []).filter((id) => id !== clientId)
        : [...(prev[memberId] ?? []), clientId],
    }));
    setGroupMembers((prev) => prev.map((m) => {
      if (m.id !== memberId) return m;
      const delta = isAssigned ? -1 : 1;
      return { ...m, _count: { ...m._count, clientAssignments: m._count.clientAssignments + delta } };
    }));
  }

  async function addToGroup(userId: string) {
    if (!draft) return;
    setAddingUserId(userId);
    const res = await fetch(`/api/team/groups/${draft.id}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    setAddingUserId(null);
    if (!res.ok) { toast.error("Nie udało się dodać"); return; }
    toast.success("Dodano do grupy");
    await openMembersView();
    onGroupsChanged?.();
  }

  async function removeFromGroup(userId: string, userGroups: number) {
    if (!draft) return;
    if (userGroups <= 1) {
      if (!await showConfirm("To ostatnia grupa tej osoby. Po usunięciu straci dostęp do wszystkich modułów. Usunąć?")) return;
    }
    setRemovingUserId(userId);
    await fetch(`/api/team/groups/${draft.id}/members/${userId}`, { method: "DELETE" });
    setRemovingUserId(null);
    toast.success("Usunięto z grupy");
    await openMembersView();
    onGroupsChanged?.();
  }

  async function handleRenameGroup(id: string) {
    const name = renameValue.trim();
    setRenamingGroupId(null);
    setRenameValue("");
    if (!name) return;
    const res = await fetch(`/api/team/groups/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) { toast.error("Nie udało się zmienić nazwy"); return; }
    toast.success("Nazwa zmieniona");
    setGroups((prev) => prev.map((g) => g.id === id ? { ...g, name } : g));
    if (draft?.id === id) setDraft((d) => d ? { ...d, name } : d);
    onGroupsChanged?.();
  }

  async function handleDeleteGroup(group: PermissionGroup) {
    if (!await showConfirm(`Usunąć grupę „${group.name}"? Członkowie stracą dostęp do modułów przypisanych przez tę grupę.`)) return;
    const res = await fetch(`/api/team/groups/${group.id}`, { method: "DELETE" });
    if (!res.ok) { toast.error("Nie udało się usunąć grupy"); return; }
    toast.success("Usunięto grupę");
    const newGroups = groups.filter((g) => g.id !== group.id);
    setGroups(newGroups);
    if (selectedId === group.id) {
      const next = newGroups[0] ?? null;
      setSelectedId(next?.id ?? null);
      setDraft(next ? { ...next, permissions: { ...(next.permissions as Record<ModuleSlug, number>) } } : null);
    }
    onGroupsChanged?.();
  }

  const selected = draft;
  const canEdit = plan === "studio" || plan === "agencja";
  const clientsLevel = selected?.permissions["klienci"] ?? 0;

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 size={22} className="animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="flex gap-6 min-h-[500px]">

      {/* Left column — group list */}
      <div className="w-48 shrink-0 flex flex-col gap-1 border-r border-border pr-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">Grupy</span>
          <button
            onClick={() => { setCreatingGroup(true); setNewGroupName(""); }}
            className="text-primary hover:opacity-70 transition-opacity"
            title="Nowa grupa"
          >
            <Plus size={15} />
          </button>
        </div>
        {openMenuGroupId && (
          <div className="fixed inset-0 z-[9]" onClick={() => setOpenMenuGroupId(null)} />
        )}
        {groups.map((g) => (
          <div key={g.id} className="relative group/item">
            {renamingGroupId === g.id ? (
              <div className="flex gap-1 px-1 py-0.5">
                <input
                  autoFocus
                  type="text"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleRenameGroup(g.id);
                    if (e.key === "Escape") { cancelRenameRef.current = true; setRenamingGroupId(null); setRenameValue(""); }
                  }}
                  onBlur={() => {
                    if (cancelRenameRef.current) { cancelRenameRef.current = false; return; }
                    handleRenameGroup(g.id);
                  }}
                  className="flex-1 min-w-0 px-2 py-1 text-[13px] border border-primary/40 rounded-md bg-background focus:outline-none"
                />
              </div>
            ) : (
              <button
                onClick={() => selectGroup(g)}
                className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-sm text-left transition-colors w-full ${selectedId === g.id ? "bg-[#EEEDFE]" : "hover:bg-muted/50"}`}
              >
                <GroupAvatar name={g.name} active={selectedId === g.id} />
                <div className="flex-1 min-w-0">
                  <p className="truncate text-[13px] font-medium">{g.name}</p>
                  <p className="text-[11px] text-muted-foreground">{g._count?.members ?? 0} os.</p>
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setOpenMenuGroupId(openMenuGroupId === g.id ? null : g.id); }}
                  className="shrink-0 opacity-0 group-hover/item:opacity-100 transition-opacity w-5 h-5 flex items-center justify-center rounded hover:bg-black/10 text-muted-foreground"
                >
                  <MoreVertical size={13} />
                </button>
              </button>
            )}
            {openMenuGroupId === g.id && (
              <div className="absolute right-0 top-full z-10 mt-0.5 w-36 rounded-lg border border-border bg-background shadow-lg py-1">
                <button
                  type="button"
                  onClick={() => { setRenamingGroupId(g.id); setRenameValue(g.name); setOpenMenuGroupId(null); }}
                  className="w-full px-3 py-1.5 text-[13px] text-left hover:bg-muted/50 transition-colors"
                >
                  Zmień nazwę
                </button>
                <button
                  type="button"
                  onClick={() => { setOpenMenuGroupId(null); handleDeleteGroup(g); }}
                  className="w-full px-3 py-1.5 text-[13px] text-left text-destructive hover:bg-muted/50 transition-colors"
                >
                  Usuń grupę
                </button>
              </div>
            )}
          </div>
        ))}
        {creatingGroup && (
          <div className="mt-1 flex flex-col gap-1.5">
            <input
              autoFocus
              type="text"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
                if (e.key === "Escape") { setCreatingGroup(false); setNewGroupName(""); }
              }}
              placeholder="Nazwa grupy…"
              className="w-full px-2 py-1.5 text-[13px] border border-primary/40 rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <div className="flex gap-1">
              <button
                onClick={handleCreate}
                disabled={!newGroupName.trim()}
                className="flex-1 py-1 text-[11px] font-medium rounded-md hover:opacity-90 transition-opacity disabled:opacity-40"
                style={{ background: "#4F46E5", color: "#fff" }}
              >
                Utwórz
              </button>
              <button
                onClick={() => { setCreatingGroup(false); setNewGroupName(""); }}
                className="px-2 py-1 text-[11px] rounded-md border border-border text-muted-foreground hover:bg-muted/40 transition-colors"
              >
                Anuluj
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Center — permissions panel */}
      {selected && (
        <div className="flex-1 flex flex-col gap-4 min-w-0">

          {/* Group header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-semibold text-base">{selected.name}</p>
              <p className="text-xs text-muted-foreground">
                {selected.isTemplate ? "Grupa szablonowa" : "Grupa własna"}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {/* Project scope */}
              <div className="flex items-center gap-1 bg-muted/40 rounded-full p-0.5">
                {(["assigned", "all"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setScope(s)}
                    className={`px-3 py-1 text-xs font-medium rounded-full transition-all duration-150 ${
                      selected.projectScope === s ? "text-white" : "text-muted-foreground hover:bg-muted/60"
                    }`}
                    style={selected.projectScope === s ? { background: "#4F46E5" } : {}}
                  >
                    {s === "assigned" ? "Przypisani klienci" : "Wszyscy klienci"}
                  </button>
                ))}
              </div>
              {!editMode && canEdit && (
                <button
                  onClick={() => { setEditSnapshot({ ...draft! }); setEditMode(true); }}
                  className="px-3 py-1.5 text-xs font-medium border border-border rounded-lg hover:bg-muted/40 transition-colors"
                >
                  Edytuj
                </button>
              )}
            </div>
          </div>

          {/* Permissions matrix */}
          <div>
            <p className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase mb-2">
              Uprawnienia w modułach
            </p>
            <div className={`border border-border rounded-xl overflow-hidden transition-opacity ${!editMode ? "opacity-50 pointer-events-none" : ""}`}>
              {MODULE_LIST.map(({ slug, label, icon }, i) => {
                const level = (selected.permissions[slug] as number) ?? 0;
                return (
                  <div key={slug} className={`flex items-center gap-3 px-4 py-2.5 ${i > 0 ? "border-t border-border/50" : ""}`}>
                    <span className="text-muted-foreground shrink-0">{icon}</span>
                    <span className="flex-1 text-sm">{label}</span>
                    <div className="flex items-center gap-0.5 bg-muted/40 rounded-full p-0.5">
                      {([0, 1, 2, 3] as const).map((l) => (
                        <LevelSegment key={l} level={l} active={level === l} onClick={() => setLevel(slug, l)} readOnly={false} tooltip={LEVEL_TOOLTIPS[slug][l]} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {clientsLevel < 3 && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl text-xs" style={{ background: "#EEEDFE", color: "#3C3489" }}>
              <Lock size={13} className="shrink-0 mt-0.5" />
              <p><strong>„Zarządzanie"</strong> w module Klienci obejmuje zapraszanie klientów i publikowanie im materiałów.</p>
            </div>
          )}

          <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl text-xs bg-muted/40 text-muted-foreground">
            <Shield size={13} className="shrink-0 mt-0.5" />
            <p>Zapraszanie nowych osób do workspace i zarządzanie rolami systemowymi znajdziesz w zakładce Członkowie.</p>
          </div>

          {editMode && (
            <div className="flex items-center gap-2 pt-1">
              {selected.isTemplate && (
                <button onClick={handleRestore} className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted/40 transition-colors">
                  Przywróć domyślne
                </button>
              )}
              <button
                onClick={() => {
                  if (editSnapshot) setDraft({ ...editSnapshot, permissions: { ...(editSnapshot.permissions as Record<ModuleSlug, number>) } });
                  setDirty(false);
                  setEditMode(false);
                  setEditSnapshot(null);
                }}
                className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted/40 transition-colors"
              >
                Anuluj
              </button>
              <button
                onClick={handleSave}
                disabled={!dirty || saving}
                className="ml-auto flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: "#4F46E5", color: "#fff" }}
              >
                {saving && <Loader2 size={13} className="animate-spin" />}
                Zapisz zmiany
              </button>
            </div>
          )}

        </div>
      )}

      {/* Right — members sidebar */}
      {selected && (
        <div className="w-96 shrink-0 flex flex-col gap-3 border-l border-border pl-6">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">Członkowie</p>
            <span className="text-[11px] text-muted-foreground">{groupMembers.length} os.</span>
          </div>

          {/* Add member picker */}
          {workspaceMembers.filter((m) => !groupMembers.find((gm) => gm.id === m.id)).length > 0 && (
            <div className="flex flex-col gap-1">
              {workspaceMembers
                .filter((m) => !groupMembers.find((gm) => gm.id === m.id))
                .map((m) => (
                  <div key={m.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg border border-dashed border-border hover:bg-muted/30 transition-colors">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold shrink-0"
                      style={{ background: "#F3F4F6", color: "#6B7280" }}>
                      {((m.fullName || m.name || m.email)[0] ?? "?").toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs truncate text-muted-foreground">{m.fullName || m.name || m.email}</p>
                    </div>
                    <button
                      onClick={() => addToGroup(m.id)}
                      disabled={addingUserId === m.id}
                      className="p-1 rounded text-primary hover:bg-primary/10 transition-colors"
                      title="Dodaj do grupy"
                    >
                      {addingUserId === m.id ? <Loader2 size={11} className="animate-spin" /> : <UserPlus size={11} />}
                    </button>
                  </div>
                ))}
              <div className="border-t border-border/50 my-1" />
            </div>
          )}

          {/* Current members */}
          {loadingMembers ? (
            <div className="flex justify-center py-6"><Loader2 size={18} className="animate-spin text-muted-foreground" /></div>
          ) : groupMembers.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">Brak członków w tej grupie</p>
          ) : (
            <div className="flex flex-col gap-0 border border-border rounded-xl overflow-hidden">
              {groupMembers.map((m, i) => {
                const isExpanded = expandedMemberId === m.id;
                const assignedIds = memberClientsMap[m.id] ?? null;
                return (
                  <div key={m.id} className={i > 0 ? "border-t border-border" : ""}>
                    <div className="flex items-center gap-2 px-3 py-2.5">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold shrink-0"
                        style={{ background: "#EEEDFE", color: "#3C3489" }}>
                        {((m.fullName || m.name || m.email)[0] ?? "?").toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{m.fullName || m.name || m.email}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{m._count.clientAssignments} kl.</p>
                      </div>
                      <button
                        onClick={() => toggleMemberExpanded(m.id)}
                        className={`flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-md border transition-colors shrink-0 ${
                          isExpanded ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                        }`}
                        title="Przypisz klientów"
                      >
                        <ChevronRight size={10} className={`transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                        Klienci
                      </button>
                      <button
                        onClick={() => removeFromGroup(m.id, m.permissionGroups.length)}
                        disabled={removingUserId === m.id}
                        className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        title="Usuń z grupy"
                      >
                        {removingUserId === m.id ? <Loader2 size={11} className="animate-spin" /> : <X size={11} />}
                      </button>
                    </div>

                    {isExpanded && (
                      <div className="px-3 pb-2.5 pt-1 border-t border-border/50 bg-muted/20">
                        {assignedIds === null ? (
                          <div className="flex items-center gap-1.5 py-1">
                            <Loader2 size={11} className="animate-spin text-muted-foreground" />
                            <span className="text-[11px] text-muted-foreground">Ładowanie...</span>
                          </div>
                        ) : allClients.length === 0 ? (
                          <p className="text-[11px] text-muted-foreground">Brak klientów.</p>
                        ) : (
                          <div className="flex flex-col gap-0.5">
                            {allClients.map((client) => {
                              const isAssigned = assignedIds.includes(client.id);
                              const isToggling = togglingClientId === client.id;
                              return (
                                <div key={client.id} className="flex items-center gap-2 py-0.5">
                                  <button
                                    onClick={() => toggleClientAssignment(m.id, client.id, isAssigned)}
                                    disabled={isToggling}
                                    className={`w-3.5 h-3.5 rounded flex items-center justify-center border transition-colors shrink-0 ${
                                      isAssigned ? "border-primary bg-primary text-white" : "border-border bg-background hover:border-primary/60"
                                    }`}
                                  >
                                    {isToggling ? <Loader2 size={8} className="animate-spin" /> : isAssigned ? <span style={{ fontSize: 8, lineHeight: 1 }}>✓</span> : null}
                                  </button>
                                  <span className={`text-[11px] truncate ${isAssigned ? "text-foreground" : "text-muted-foreground"}`}>{client.name}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <p className="text-[11px] text-muted-foreground">
            Uprawnienia się sumują — obowiązuje najszerszy poziom ze wszystkich grup.
          </p>
        </div>
      )}
    </div>
  );
}
