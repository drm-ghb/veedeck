"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { UserPlus, Trash2, Loader2, Mail, Users, Clock } from "lucide-react";

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
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
    setSending(true);
    const res = await fetch("/api/team/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim() }),
    });
    const data = await res.json();
    setSending(false);
    if (!res.ok) { toast.error(data.error || "Błąd wysyłania zaproszenia"); return; }
    toast.success("Zaproszenie wysłane");
    setEmail("");
    load();
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    const res = await fetch(`/api/team/members/${id}`, { method: "DELETE" });
    setDeletingId(null);
    if (!res.ok) { toast.error("Błąd usuwania"); return; }
    toast.success("Usunięto");
    load();
  }

  return (
    <div className="space-y-8">
      {/* Invite form */}
      <div>
        <h2 className="text-sm font-semibold mb-1">Zaproś użytkownika</h2>
        <p className="text-xs text-muted-foreground mb-4">
          Na podany adres e-mail zostanie wysłane zaproszenie z linkiem do ustawienia hasła.
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
            Zaproś
          </button>
        </div>
      </div>

      {/* Pending invitations */}
      {!loading && invitations.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Clock size={14} className="text-muted-foreground" />
            Oczekujące zaproszenia
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
                      Wygasa {new Date(inv.expiresAt).toLocaleDateString("pl-PL")}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(inv.id)}
                  disabled={deletingId === inv.id}
                  className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  title="Cofnij zaproszenie"
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
          Członkowie zespołu
        </h2>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-muted-foreground" /></div>
        ) : members.length === 0 ? (
          <div className="border-2 border-dashed border-border rounded-xl p-8 text-center">
            <Users size={24} className="mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Brak członków zespołu</p>
            <p className="text-xs text-muted-foreground mt-1">
              Zaproś pierwszą osobę, wpisując jej adres e-mail powyżej.
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
                <button
                  onClick={() => handleDelete(member.id)}
                  disabled={deletingId === member.id}
                  className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  title="Usuń z zespołu"
                >
                  {deletingId === member.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
