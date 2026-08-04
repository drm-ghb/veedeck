"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { UserPlus, Trash2, Loader2, Mail, Users, Clock, ChevronRight, Shield, ShieldCheck, X } from "@/components/ui/icons";
import Link from "next/link";
import PermissionGroupsTab from "./PermissionGroupsTab";

interface Group {
  id: string;
  name: string;
}

interface Member {
  id: string;
  email: string;
  name: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  createdAt: string;
  systemRole: string;
  permissionGroups: { group: { id: string; name: string } }[];
}

interface Invitation {
  id: string;
  email: string;
  createdAt: string;
  expiresAt: string;
  group: { id: string; name: string } | null;
}

function Avatar({ member }: { member: Pick<Member, "name" | "fullName" | "email" | "avatarUrl"> }) {
  const initials = ((member.fullName || member.name || member.email)[0] ?? "?").toUpperCase();
  if (member.avatarUrl) {
    return <img src={member.avatarUrl} alt={initials} className="w-8 h-8 rounded-full object-cover shrink-0" />;
  }
  return (
    <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold shrink-0"
      style={{ background: "#EEEDFE", color: "#3C3489" }}>
      {initials}
    </div>
  );
}

function RoleChip({ systemRole }: { systemRole: string }) {
  if (systemRole === "owner") return (
    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
      style={{ background: "#4F46E5", color: "#fff" }}>Właściciel</span>
  );
  if (systemRole === "admin") return (
    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
      style={{ background: "#4F46E5", color: "#fff" }}>Admin</span>
  );
  return null;
}

function GroupChip({ name }: { name: string }) {
  return (
    <span className="text-[11px] font-medium px-2 py-0.5 rounded-full"
      style={{ background: "#EEEDFE", color: "#3C3489" }}>{name}</span>
  );
}

export default function TeamSettings() {
  const [activeTab, setActiveTab] = useState<"members" | "groups">("members");
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [sending, setSending] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [plan, setPlan] = useState<string | null>(null);
  const [memberLimit, setMemberLimit] = useState<number | null>(null);
  // Owner identifier — members whose systemRole is NOT owner, so we know who the owner is
  const ownerMember = members.find((m) => (m as any).systemRole === "owner");

  async function load() {
    try {
      const [teamRes, groupsRes] = await Promise.all([
        fetch("/api/team/invite"),
        fetch("/api/team/groups"),
      ]);
      if (teamRes.ok) {
        const data = await teamRes.json();
        setMembers(data.members ?? []);
        setInvitations(data.invitations ?? []);
        setPlan(data.plan);
        setMemberLimit(data.memberLimit);
      }
      if (groupsRes.ok) {
        const groupsData = await groupsRes.json();
        setGroups(Array.isArray(groupsData) ? groupsData : []);
      }
    } catch (e) {
      console.error("[TeamSettings] load error:", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleInvite() {
    if (!email.trim()) return;
    if (!email.includes("@")) { toast.error("Podaj prawidłowy adres e-mail"); return; }
    setSending(true);
    const res = await fetch("/api/team/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), groupId: selectedGroupId || undefined }),
    });
    const data = await res.json();
    setSending(false);
    if (!res.ok) { toast.error(data.error || "Nie udało się wysłać zaproszenia"); return; }
    toast.success("Zaproszenie wysłane");
    setEmail("");
    setSelectedGroupId("");
    load();
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    const res = await fetch(`/api/team/members/${id}`, { method: "DELETE" });
    setDeletingId(null);
    if (!res.ok) { toast.error("Nie udało się usunąć"); return; }
    toast.success("Usunięto z zespołu");
    load();
  }

  async function handleToggleAdmin(member: Member) {
    const newRole = member.systemRole === "admin" ? "member" : "admin";
    const res = await fetch(`/api/team/members/${member.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ systemRole: newRole }),
    });
    if (!res.ok) { toast.error("Nie udało się zmienić roli"); return; }
    toast.success(newRole === "admin" ? "Nadano rolę Admin" : "Odebrano rolę Admin");
    load();
  }

  async function handleChangeGroups(member: Member) {
    // TODO: open group assignment dialog
    toast.info("Zarządzanie grupami członka — wkrótce");
  }

  const totalUsed = members.length + invitations.length;
  const atLimit = memberLimit !== null && totalUsed >= memberLimit;
  const canInvite = plan === "studio" || plan === "agencja";
  const canEditGroups = plan === "studio" || plan === "agencja";

  const tabClass = (active: boolean) =>
    `px-4 py-2.5 text-sm font-medium transition-colors border-b-2 ${
      active
        ? "border-primary text-primary"
        : "border-transparent text-muted-foreground hover:text-foreground"
    }`;

  return (
    <div className="space-y-6">

      {/* Page header row — title + seats card on the right */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">Użytkownicy</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Zarządzaj członkami swojego zespołu i ich uprawnieniami. Zaproszeni użytkownicy widzą projekty i moduły zgodnie ze swoimi grupami.
          </p>
        </div>
        {!loading && canInvite && memberLimit !== null && (
          <div className="sm:shrink-0 border border-border rounded-xl p-4 sm:w-56 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-foreground">Miejsca w zespole</p>
              <span className="text-sm font-semibold text-foreground">{totalUsed}/{memberLimit}</span>
            </div>
            <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${atLimit ? "bg-amber-500" : "bg-primary"}`}
                style={{ width: `${Math.min(100, (totalUsed / memberLimit) * 100)}%` }}
              />
            </div>
            {atLimit && (
              <p className="text-xs text-muted-foreground">
                Potrzebujesz więcej miejsc?{" "}
                <a href="https://veedeck.com/kontakt" target="_blank" rel="noopener noreferrer"
                  className="text-primary hover:underline font-medium">
                  Skontaktuj się z nami ↗
                </a>
              </p>
            )}
          </div>
        )}
      </div>

      {/* Solo upsell */}
      {!loading && !canInvite && (
        <div className="bg-card border border-border rounded-2xl p-6 flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <Users size={18} className="text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-foreground">Członkowie zespołu dostępni w planie Studio</p>
              <p className="text-sm text-muted-foreground mt-1">
                Plan Solo przeznaczony jest dla freelancerów pracujących samodzielnie. Aby dodać współpracowników, przejdź na plan Studio.
              </p>
            </div>
          </div>
          <Link
            href="/ustawienia/plan-i-rozliczenia"
            className="self-start flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
          >
            Przejdź na Studio
            <ChevronRight size={14} />
          </Link>
        </div>
      )}


      {/* Tabs */}
      {canInvite && (
        <>
          <div className="flex border-b border-border -mb-2">
            <button onClick={() => setActiveTab("members")} className={tabClass(activeTab === "members")}>
              Członkowie
            </button>
            <button onClick={() => setActiveTab("groups")} className={tabClass(activeTab === "groups")}>
              Grupy uprawnień
            </button>
          </div>

          {/* ── Tab: Członkowie ── */}
          {activeTab === "members" && (
            <div className="space-y-6 pt-6">

              {/* Invite form */}
              {!atLimit && (
                <div>
                  <h2 className="text-sm font-semibold mb-1">Zaproś do zespołu</h2>
                  <p className="text-xs text-muted-foreground mb-4">Zaproszony użytkownik otrzyma e-mail z linkiem do dołączenia.</p>
                  <div className="flex gap-2 flex-wrap">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleInvite()}
                      placeholder="adres@email.com"
                      className="flex-1 min-w-[200px] px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
                    />
                    {groups.length > 0 && (
                      <select
                        value={selectedGroupId}
                        onChange={(e) => setSelectedGroupId(e.target.value)}
                        className="px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                      >
                        <option value="">Bez grupy</option>
                        {groups.map((g) => (
                          <option key={g.id} value={g.id}>{g.name}</option>
                        ))}
                      </select>
                    )}
                    <button
                      onClick={handleInvite}
                      disabled={sending || !email.trim()}
                      className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                      style={{ background: "#4F46E5", color: "#fff" }}
                    >
                      {sending ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
                      Zaproś
                    </button>
                  </div>
                </div>
              )}

              {/* Pending invitations */}
              {!loading && invitations.length > 0 && (
                <div>
                  <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Clock size={14} className="text-muted-foreground" />
                    Oczekujące zaproszenia
                  </h2>
                  <div className="border border-border rounded-xl overflow-hidden">
                    {invitations.map((inv, i) => (
                      <div key={inv.id}
                        className={`flex items-center justify-between px-4 py-3 ${i > 0 ? "border-t border-border" : ""}`}>
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                            <Mail size={14} className="text-muted-foreground" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm truncate">{inv.email}</p>
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-xs text-muted-foreground">
                                Wygasa: {new Date(inv.expiresAt).toLocaleDateString("pl-PL")}
                              </p>
                              {inv.group && <GroupChip name={inv.group.name} />}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDelete(inv.id)}
                          disabled={deletingId === inv.id}
                          className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          title="Cofnij zaproszenie"
                        >
                          {deletingId === inv.id ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Active members */}
              <div>
                <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Users size={14} className="text-muted-foreground" />
                  Aktywni członkowie
                </h2>
                {loading ? (
                  <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-muted-foreground" /></div>
                ) : members.length === 0 ? (
                  <div className="border-2 border-dashed border-border rounded-xl p-8 text-center">
                    <Users size={24} className="mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Brak członków zespołu</p>
                    <p className="text-xs text-muted-foreground mt-1">Wyślij zaproszenie, aby dodać pierwszego współpracownika.</p>
                  </div>
                ) : (
                  <div className="border border-border rounded-xl overflow-hidden">
                    {members.map((member, i) => {
                      const isOwner = !member.systemRole || member.systemRole === "owner" || !ownerMember;
                      return (
                        <div key={member.id}
                          className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? "border-t border-border" : ""}`}>
                          <Avatar member={member} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-medium truncate">
                                {member.fullName || member.name || member.email}
                              </p>
                              <RoleChip systemRole={member.systemRole} />
                              {member.permissionGroups.map(({ group }) => (
                                <GroupChip key={group.id} name={group.name} />
                              ))}
                              {!member.systemRole || (member.systemRole === "member" && member.permissionGroups.length === 0) ? (
                                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                                  bez grupy
                                </span>
                              ) : null}
                            </div>
                            {(member.fullName || member.name) && (
                              <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                            )}
                          </div>
                          {/* Actions — only non-owners */}
                          {!isOwner && (
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => handleToggleAdmin(member)}
                                className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                                title={member.systemRole === "admin" ? "Odbierz rolę Admin" : "Nadaj rolę Admin"}
                              >
                                <ShieldCheck size={14} />
                              </button>
                              <button
                                onClick={() => handleDelete(member.id)}
                                disabled={deletingId === member.id}
                                className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                                title="Usuń z zespołu"
                              >
                                {deletingId === member.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Info note */}
              <p className="text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
                Osoba może należeć do wielu grup — uprawnienia się sumują, obowiązuje najszerszy poziom. Grupy edytujesz w zakładce Grupy uprawnień.
              </p>
            </div>
          )}

          {/* ── Tab: Grupy uprawnień ── */}
          {activeTab === "groups" && (
            <div className="pt-6">
              <PermissionGroupsTab plan={plan} onGroupsChanged={load} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
