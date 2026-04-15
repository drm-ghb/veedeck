"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2, ShieldCheck, FolderOpen, KeyRound, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface User {
  id: string;
  name: string | null;
  email: string;
  isAdmin: boolean;
  createdAt: Date | string;
  _count: { projects: number };
}

export default function AdminUsersClient({
  users,
  currentUserId,
}: {
  users: User[];
  currentUserId: string;
}) {
  const [list, setList] = useState(users);
  const [passwordModal, setPasswordModal] = useState<{
    id: string;
    name: string | null;
  } | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const router = useRouter();

  async function handleDelete(id: string, name: string | null) {
    if (
      !confirm(
        `Usunąć użytkownika "${name ?? "bez nazwy"}"? Wszystkie jego projekty zostaną usunięte.`
      )
    )
      return;

    const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    if (res.ok) {
      setList((prev) => prev.filter((u) => u.id !== id));
      toast.success("Użytkownik usunięty");
    } else {
      const body = await res.json();
      toast.error(body.error ?? "Błąd usuwania");
    }
  }

  async function handleChangePassword() {
    if (!passwordModal) return;
    if (newPassword.length < 8) {
      toast.error("Hasło musi mieć minimum 8 znaków");
      return;
    }
    setSavingPassword(true);
    const res = await fetch(`/api/admin/users/${passwordModal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: newPassword }),
    });
    setSavingPassword(false);
    if (res.ok) {
      toast.success(
        `Hasło zmienione dla ${passwordModal.name ?? passwordModal.id}`
      );
      setPasswordModal(null);
      setNewPassword("");
    } else {
      const body = await res.json();
      toast.error(body.error ?? "Błąd zmiany hasła");
    }
  }

  return (
    <>
      <div className="bg-white/3 border border-white/8 rounded-xl overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[1fr_200px_80px_80px] gap-4 px-5 py-3 bg-white/3 border-b border-white/8 text-xs font-medium text-white/30 uppercase tracking-wide">
          <span>Użytkownik</span>
          <span>Dołączył</span>
          <span>Projekty</span>
          <span></span>
        </div>

        {list.length === 0 && (
          <p className="text-center text-white/30 py-12 text-sm">
            Brak użytkowników
          </p>
        )}

        {list.map((user, i) => (
          <div
            key={user.id}
            className={`grid grid-cols-[1fr_200px_80px_80px] gap-4 px-5 py-4 items-center ${
              i !== list.length - 1 ? "border-b border-white/5" : ""
            } ${user.id === currentUserId ? "bg-blue-500/5" : ""}`}
          >
            {/* Name + email */}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-white truncate">
                  {user.name ?? "—"}
                </p>
                {user.isAdmin && (
                  <span className="flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/20 flex-shrink-0">
                    <ShieldCheck size={9} />
                    Admin
                  </span>
                )}
                {user.id === currentUserId && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-white/8 text-white/40 flex-shrink-0">
                    Ty
                  </span>
                )}
              </div>
              <p className="text-xs text-white/30 truncate">{user.email}</p>
            </div>

            {/* Date */}
            <p className="text-sm text-white/30">
              {new Date(user.createdAt).toLocaleDateString("pl-PL", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </p>

            {/* Projects */}
            <div className="flex items-center gap-1 text-sm text-white/30">
              <FolderOpen size={13} />
              {user._count.projects}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-1">
              <Button
                size="icon-sm"
                variant="ghost"
                title="Zmień hasło"
                className="text-white/25 hover:text-white/70 hover:bg-white/8"
                onClick={() => {
                  setPasswordModal({ id: user.id, name: user.name });
                  setNewPassword("");
                }}
              >
                <KeyRound size={14} />
              </Button>
              {user.id !== currentUserId && (
                <Button
                  size="icon-sm"
                  variant="ghost"
                  className="text-red-400/60 hover:text-red-400 hover:bg-red-500/10"
                  onClick={() => handleDelete(user.id, user.name)}
                >
                  <Trash2 size={14} />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Password modal */}
      {passwordModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
          onClick={() => setPasswordModal(null)}
        >
          <div
            className="bg-[#1a1d24] border border-white/10 rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-white">Zmień hasło</h2>
              <button
                onClick={() => setPasswordModal(null)}
                className="text-white/30 hover:text-white/70 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <p className="text-sm text-white/40 mb-4">
              Ustawiasz nowe hasło dla:{" "}
              <span className="font-medium text-white/80">
                {passwordModal.name ?? passwordModal.id}
              </span>
            </p>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleChangePassword()}
              placeholder="Nowe hasło (min. 8 znaków)"
              autoFocus
              className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/20 focus:outline-none focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20 mb-4 transition-all"
            />
            <div className="flex gap-2 justify-end">
              <Button
                variant="ghost"
                size="sm"
                className="text-white/40 hover:text-white/80"
                onClick={() => setPasswordModal(null)}
              >
                Anuluj
              </Button>
              <Button
                size="sm"
                className="bg-blue-600 hover:bg-blue-500 text-white border-0"
                onClick={handleChangePassword}
                disabled={savingPassword || newPassword.length < 8}
              >
                {savingPassword ? "Zapisywanie..." : "Ustaw hasło"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
