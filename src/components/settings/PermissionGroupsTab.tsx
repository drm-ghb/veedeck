"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  Plus, Loader2, Users, Lock, Shield, ChevronRight,
  PushPin, LocalMall, Engineering, CheckSquare, Package,
  CalendarDays, NotebookText, ChatBubble, ClipboardList,
  Interests, Settings, UserPlus, X, ArrowLeft,
} from "@/components/ui/icons";
import type { ModuleSlug } from "@/lib/permissions";

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
  _count: { projectAssignments: number };
}

// ── Sub-components ────────────────────────────────────────────────────────────

function LevelSegment({
  level, active, onClick, readOnly,
}: { level: number; active: boolean; onClick: () => void; readOnly?: boolean }) {
  return (
    <button
      type="button"
      disabled={readOnly}
      onClick={onClick}
      title={readOnly ? "Edycja grup dostępna w planie Agencja" : undefined}
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
  const canEdit = plan === "agencja";

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

  function selectGroup(group: PermissionGroup) {
    if (dirty) {
      if (!confirm("Masz niezapisane zmiany. Odrzucić?")) return;
    }
    setSelectedId(group.id);
    setDraft({ ...group, permissions: { ...(group.permissions as Record<ModuleSlug, number>) } });
    setDirty(false);
    setMembersView(false);
  }

  function setLevel(slug: ModuleSlug, level: number) {
    if (!draft || !canEdit) return;
    setDraft((d) => d ? { ...d, permissions: { ...d.permissions, [slug]: level } } : d);
    setDirty(true);
  }

  function setScope(scope: "assigned" | "all") {
    if (!draft || !canEdit) return;
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
    const name = prompt("Nazwa nowej grupy:");
    if (!name?.trim()) return;
    const res = await fetch("/api/team/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });
    if (!res.ok) { toast.error("Nie udało się utworzyć grupy"); return; }
    const created: PermissionGroup = await res.json();
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
    const [membRes, wsRes] = await Promise.all([
      fetch(`/api/team/groups/${draft.id}/members`),
      fetch("/api/team/invite"),
    ]);
    if (membRes.ok) {
      const data = await membRes.json();
      setGroupMembers(data.map((m: { user: GroupMemberUser }) => m.user));
    }
    if (wsRes.ok) {
      const data = await wsRes.json();
      setWorkspaceMembers(data.members ?? []);
    }
    setLoadingMembers(false);
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
      if (!confirm("To ostatnia grupa tej osoby. Po usunięciu straci dostęp do wszystkich modułów. Usunąć?")) return;
    }
    setRemovingUserId(userId);
    await fetch(`/api/team/groups/${draft.id}/members/${userId}`, { method: "DELETE" });
    setRemovingUserId(null);
    toast.success("Usunięto z grupy");
    await openMembersView();
    onGroupsChanged?.();
  }

  const selected = draft;
  const clientsLevel = selected?.permissions["klienci"] ?? 0;

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 size={22} className="animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="flex gap-6 min-h-[500px]">

      {/* Left column — group list */}
      <div className="w-44 shrink-0 flex flex-col gap-1">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">Grupy</span>
          {canEdit && (
            <button onClick={handleCreate} className="text-primary hover:opacity-70 transition-opacity" title="Nowa grupa">
              <Plus size={15} />
            </button>
          )}
        </div>
        {groups.map((g) => (
          <button
            key={g.id}
            onClick={() => selectGroup(g)}
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-left transition-colors hover:bg-muted/50 w-full"
          >
            <GroupAvatar name={g.name} active={selectedId === g.id} />
            <div className="flex-1 min-w-0">
              <p className="truncate text-[13px] font-medium">{g.name}</p>
              <p className="text-[11px] text-muted-foreground">{g._count?.members ?? 0} os.</p>
            </div>
          </button>
        ))}
      </div>

      {/* Right panel */}
      {selected && !membersView && (
        <div className="flex-1 flex flex-col gap-4 min-w-0">

          {/* Group header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-semibold text-base">{selected.name}</p>
              <button
                onClick={openMembersView}
                className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
              >
                <Users size={12} />
                {selected._count?.members ?? 0} os.
                {selected.isTemplate ? " · grupa szablonowa" : " · grupa własna"}
              </button>
            </div>

            {/* Project scope */}
            <div className="flex items-center gap-1 bg-muted/40 rounded-full p-0.5 shrink-0">
              {(["assigned", "all"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={!canEdit}
                  onClick={() => setScope(s)}
                  className={`px-3 py-1 text-xs font-medium rounded-full transition-all duration-150 ${
                    selected.projectScope === s
                      ? "text-white"
                      : "text-muted-foreground hover:bg-muted/60"
                  } ${!canEdit ? "cursor-default" : ""}`}
                  style={selected.projectScope === s ? { background: "#4F46E5" } : {}}
                  title={!canEdit ? "Edycja dostępna w planie Agencja" : undefined}
                >
                  {s === "assigned" ? "Przypisane projekty" : "Wszystkie projekty"}
                </button>
              ))}
            </div>
          </div>

          {/* Permissions matrix */}
          <div>
            <p className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase mb-2">
              Uprawnienia w modułach
            </p>
            <div className="border border-border rounded-xl overflow-hidden">
              {MODULE_LIST.map(({ slug, label, icon }, i) => {
                const level = (selected.permissions[slug] as number) ?? 0;
                return (
                  <div
                    key={slug}
                    className={`flex items-center gap-3 px-4 py-2.5 ${i > 0 ? "border-t border-border/50" : ""}`}
                  >
                    <span className="text-muted-foreground shrink-0">{icon}</span>
                    <span className="flex-1 text-sm">{label}</span>
                    <div className="flex items-center gap-0.5 bg-muted/40 rounded-full p-0.5">
                      {([0, 1, 2, 3] as const).map((l) => (
                        <LevelSegment
                          key={l}
                          level={l}
                          active={level === l}
                          onClick={() => setLevel(slug, l)}
                          readOnly={!canEdit}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Note: Klienci < 3 */}
          {clientsLevel < 3 && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl text-xs"
              style={{ background: "#EEEDFE", color: "#3C3489" }}>
              <Lock size={13} className="shrink-0 mt-0.5" />
              <p>
                <strong>„Zarządzanie"</strong> w module Klienci obejmuje zapraszanie klientów i publikowanie im materiałów.
                Ta grupa przygotowuje treści, ale nie publikuje ich klientowi.
              </p>
            </div>
          )}

          {/* Note: system limits */}
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl text-xs bg-muted/40 text-muted-foreground">
            <Shield size={13} className="shrink-0 mt-0.5" />
            <p>
              Zapraszanie nowych osób do workspace i zarządzanie rolami systemowymi znajdziesz w zakładce Członkowie.
              Billing zarządza wyłącznie Właściciel — w Ustawieniach → Plan i rozliczenia.
            </p>
          </div>

          {/* Footer actions */}
          <div className="flex items-center gap-2 pt-1">
            {selected.isTemplate && canEdit && (
              <button
                onClick={handleRestore}
                className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted/40 transition-colors"
              >
                Przywróć domyślne
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={!dirty || saving || !canEdit}
              className="ml-auto flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: "#4F46E5", color: "#fff" }}
            >
              {saving && <Loader2 size={13} className="animate-spin" />}
              Zapisz zmiany
            </button>
          </div>

          {!canEdit && (
            <p className="text-xs text-muted-foreground text-center">
              Edycja macierzy uprawnień dostępna w planie Agencja.{" "}
              <a href="/ustawienia/plan-i-rozliczenia" className="text-primary hover:underline">Upgrade ↗</a>
            </p>
          )}
        </div>
      )}

      {/* Members subview */}
      {selected && membersView && (
        <div className="flex-1 flex flex-col gap-4 min-w-0">
          <button
            onClick={() => setMembersView(false)}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors self-start"
          >
            <ArrowLeft size={14} />
            Powrót do uprawnień
          </button>
          <div className="flex items-center gap-3">
            <GroupAvatar name={selected.name} active />
            <div>
              <p className="font-semibold">{selected.name} · członkowie</p>
              <p className="text-xs text-muted-foreground">{groupMembers.length} os.</p>
            </div>
          </div>

          {/* Add member picker */}
          {canEdit && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">Dodaj osobę z workspace do grupy</p>
              <div className="flex flex-col gap-1">
                {workspaceMembers
                  .filter((m) => !groupMembers.find((gm) => gm.id === m.id))
                  .map((m) => (
                    <div key={m.id} className="flex items-center gap-3 px-3 py-2 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
                        style={{ background: "#EEEDFE", color: "#3C3489" }}>
                        {((m.fullName || m.name || m.email)[0] ?? "?").toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{m.fullName || m.name || m.email}</p>
                        <p className="text-xs text-muted-foreground">
                          {m.permissionGroups.length > 0
                            ? `obecnie: ${m.permissionGroups.map((g) => g.group.name).join(", ")}`
                            : "bez grupy"}
                        </p>
                      </div>
                      <button
                        onClick={() => addToGroup(m.id)}
                        disabled={addingUserId === m.id}
                        className="p-1.5 rounded-md text-primary hover:bg-primary/10 transition-colors"
                        title="Dodaj do grupy"
                      >
                        {addingUserId === m.id ? <Loader2 size={13} className="animate-spin" /> : <UserPlus size={13} />}
                      </button>
                    </div>
                  ))}
                {workspaceMembers.filter((m) => !groupMembers.find((gm) => gm.id === m.id)).length === 0 && (
                  <p className="text-xs text-muted-foreground px-1">Wszyscy członkowie workspace są już w tej grupie.</p>
                )}
              </div>
            </div>
          )}

          {/* Current members */}
          {loadingMembers ? (
            <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-muted-foreground" /></div>
          ) : groupMembers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Brak członków w tej grupie</p>
          ) : (
            <div className="border border-border rounded-xl overflow-hidden">
              {groupMembers.map((m, i) => (
                <div key={m.id}
                  className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? "border-t border-border" : ""}`}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold shrink-0"
                    style={{ background: "#EEEDFE", color: "#3C3489" }}>
                    {((m.fullName || m.name || m.email)[0] ?? "?").toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium truncate">{m.fullName || m.name || m.email}</p>
                      <span className="text-[11px] text-muted-foreground">{m._count.projectAssignments} proj.</span>
                      {/* Current group chip */}
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                        style={{ background: "#EEEDFE", color: "#3C3489" }}>{selected.name}</span>
                      {/* Other groups */}
                      {m.permissionGroups
                        .filter((g) => g.group.id !== selected.id)
                        .map(({ group }) => (
                          <span key={group.id} className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                            {group.name}
                          </span>
                        ))}
                    </div>
                    {(m.fullName || m.name) && (
                      <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                    )}
                  </div>
                  {canEdit && (
                    <button
                      onClick={() => removeFromGroup(m.id, m.permissionGroups.length)}
                      disabled={removingUserId === m.id}
                      className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      title="Usuń z grupy"
                    >
                      {removingUserId === m.id ? <Loader2 size={13} className="animate-spin" /> : <X size={13} />}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          <p className="text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
            Uprawnienia się sumują — obowiązuje najszerszy poziom ze wszystkich grup.
            Nowe osoby do workspace zaprosisz w zakładce Członkowie.
          </p>
        </div>
      )}
    </div>
  );
}
