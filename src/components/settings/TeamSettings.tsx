"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { UserPlus, Trash2, Loader2, Mail, Users, Clock, Shield, ChevronRight } from "@/components/ui/icons";
import { useT } from "@/lib/i18n";
import Link from "next/link";
import TeamMemberPermissionsDialog from "./TeamMemberPermissionsDialog";

interface Member {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
}

interface Invitation {
  id: string;
  email: string;
  createdAt: string;
  expiresAt: string;
}

export default function TeamSettings() {
  const t = useT();
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [permsFor, setPermsFor] = useState<{ id: string; name: string } | null>(null);
  const [plan, setPlan] = useState<string | null>(null);
  const [memberLimit, setMemberLimit] = useState<number | null>(null);

  async function load() {
    const res = await fetch("/api/team/invite");
    if (!res.ok) return;
    const data = await res.json();
    setMembers(data.members);
    setInvitations(data.invitations);
    setPlan(data.plan);
    setMemberLimit(data.memberLimit);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleInvite() {
    if (!email.trim()) return;
    if (!email.includes("@")) { toast.error(t.projekty.emailInvalid); return; }
    setSending(true);
    const res = await fetch("/api/team/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim() }),
    });
    const data = await res.json();
    setSending(false);
    if (!res.ok) { toast.error(data.error || t.team.inviteError); return; }
    toast.success(t.team.inviteSuccess);
    setEmail("");
    load();
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    const res = await fetch(`/api/team/members/${id}`, { method: "DELETE" });
    setDeletingId(null);
    if (!res.ok) { toast.error(t.team.deleteError); return; }
    toast.success(t.team.deletedSuccess);
    load();
  }

  const totalUsed = members.length + invitations.length;
  const atLimit = memberLimit !== null && totalUsed >= memberLimit;
  const canInvite = plan === "studio" || plan === "agencja";

  return (
    <div className="space-y-8">

      {/* Solo upsell — brak planu lub plan freelancer */}
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
            href="/ustawienia/subskrypcja"
            className="self-start flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
          >
            Przejdź na Studio
            <ChevronRight size={14} />
          </Link>
        </div>
      )}

      {/* Studio — pasek limitu */}
      {!loading && plan === "studio" && memberLimit !== null && (
        <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
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
              Potrzebujesz dodać kolejnych członków zespołu?{" "}
              <a
                href="https://veedeck.com/kontakt"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline font-medium"
              >
                Skontaktuj się z nami i porozmawiajmy o planie Biuro ↗
              </a>
            </p>
          )}
        </div>
      )}

      {/* Invite form — tylko gdy plan pozwala i nie ma limitu */}
      {canInvite && !atLimit && (
      <div>
        <h2 className="text-sm font-semibold mb-1">{t.team.inviteTitle}</h2>
        <p className="text-xs text-muted-foreground mb-4">
          {t.team.inviteDesc}
        </p>
        <div className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleInvite()}
            placeholder="adres@email.com"
            className="flex-1 px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
          />
          <button
            onClick={handleInvite}
            disabled={sending || !email.trim()}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {sending ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
            {t.team.inviteBtn}
          </button>
        </div>
      </div>
      )}

      {/* Pending invitations */}
      {!loading && invitations.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Clock size={14} className="text-muted-foreground" />
            {t.team.pendingInvites}
          </h2>
          <div className="border border-border rounded-xl overflow-hidden">
            {invitations.map((inv, i) => (
              <div
                key={inv.id}
                className={`flex items-center justify-between px-4 py-3 ${i > 0 ? "border-t border-border" : ""}`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <Mail size={14} className="text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm truncate">{inv.email}</p>
                    <p className="text-xs text-muted-foreground">
                      {t.team.expiresPrefix} {new Date(inv.expiresAt).toLocaleDateString("pl-PL")}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(inv.id)}
                  disabled={deletingId === inv.id}
                  className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  title={t.team.revokeInvite}
                >
                  {deletingId === inv.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
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
          {t.team.membersTitle}
        </h2>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-muted-foreground" /></div>
        ) : members.length === 0 ? (
          <div className="border-2 border-dashed border-border rounded-xl p-8 text-center">
            <Users size={24} className="mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{t.team.noMembers}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {t.team.noMembersHint}
            </p>
          </div>
        ) : (
          <div className="border border-border rounded-xl overflow-hidden">
            {members.map((member, i) => (
              <div
                key={member.id}
                className={`flex items-center justify-between px-4 py-3 ${i > 0 ? "border-t border-border" : ""}`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold shrink-0">
                    {(member.name || member.email)[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{member.name || member.email}</p>
                    {member.name && <p className="text-xs text-muted-foreground truncate">{member.email}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => setPermsFor({ id: member.id, name: member.name || member.email })}
                    className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                    title={t.team.managePerms}
                  >
                    <Shield size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(member.id)}
                    disabled={deletingId === member.id}
                    className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    title={t.team.removeFromTeam}
                  >
                    {deletingId === member.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {permsFor && (
        <TeamMemberPermissionsDialog
          memberId={permsFor.id}
          memberName={permsFor.name}
          onClose={() => setPermsFor(null)}
        />
      )}
    </div>
  );
}
