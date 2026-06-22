"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { UserPlus, Trash2, Loader2, Mail, Users, Clock, Shield } from "@/components/ui/icons";
import { useT } from "@/lib/i18n";
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

  async function load() {
    const res = await fetch("/api/team/invite");
    if (!res.ok) return;
    const data = await res.json();
    setMembers(data.members);
    setInvitations(data.invitations);
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

  return (
    <div className="space-y-8">
      {/* Invite form */}
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
