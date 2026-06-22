"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Trash2, ShieldCheck, FolderOpen, KeyRound, X, Clock, Gift, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";

interface Discount {
  id: string;
  type: string;
  value: number;
  validFrom: Date | string;
  validUntil: Date | string | null;
  note: string | null;
}

interface User {
  id: string;
  name: string | null;
  fullName: string | null;
  email: string;
  isAdmin: boolean;
  role: string;
  createdAt: Date | string;
  trialEndsAt: Date | string | null;
  isFree: boolean;
  subscription: { plan: string; status: string } | null;
  discounts: Discount[];
  _count: { projects: number };
}

export default function AdminUsersClient({
  users: initialUsers,
  currentUserId,
}: {
  users: User[];
  currentUserId: string;
}) {
  const t = useT();
  const [list, setList] = useState(initialUsers);
  const [passwordModal, setPasswordModal] = useState<{ id: string; name: string | null } | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [trialModal, setTrialModal] = useState<User | null>(null);
  const [extraDays, setExtraDays] = useState("");
  const [savingTrial, setSavingTrial] = useState(false);
  const [discountModal, setDiscountModal] = useState<User | null>(null);
  const [discountType, setDiscountType] = useState<"percent" | "amount">("percent");
  const [discountValue, setDiscountValue] = useState("");
  const [discountFrom, setDiscountFrom] = useState("");
  const [discountUntil, setDiscountUntil] = useState("");
  const [discountNote, setDiscountNote] = useState("");
  const [savingDiscount, setSavingDiscount] = useState(false);
  const router = useRouter();

  async function handleDelete(id: string, name: string | null) {
    if (!confirm(`${t.admin.confirmDeleteUser} "${name ?? t.admin.noNameLabel}"? ${t.admin.confirmDeleteUserSuffix}`)) return;
    const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    if (res.ok) {
      setList((prev) => prev.filter((u) => u.id !== id));
      toast.success(t.admin.userDeleted);
    } else {
      toast.error((await res.json()).error ?? t.admin.deleteError);
    }
  }

  async function handleChangePassword() {
    if (!passwordModal) return;
    if (newPassword.length < 8) { toast.error(t.admin.passwordMinLength); return; }
    setSavingPassword(true);
    const res = await fetch(`/api/admin/users/${passwordModal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: newPassword }),
    });
    setSavingPassword(false);
    if (res.ok) {
      toast.success(`${t.admin.passwordChangedFor} ${passwordModal.name ?? passwordModal.id}`);
      setPasswordModal(null);
      setNewPassword("");
    } else {
      toast.error((await res.json()).error ?? t.admin.passwordChangeError);
    }
  }

  async function handleTrialSave() {
    if (!trialModal) return;
    setSavingTrial(true);
    const body: Record<string, unknown> = {};
    if (extraDays !== "") body.extraDays = parseInt(extraDays, 10);

    const res = await fetch(`/api/admin/users/${trialModal.id}/trial`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSavingTrial(false);
    if (res.ok) {
      const data = await res.json();
      setList((prev) => prev.map((u) => u.id === trialModal.id ? { ...u, trialEndsAt: data.trialEndsAt } : u));
      toast.success(t.admin.trialUpdated);
      setTrialModal(null);
      setExtraDays("");
    } else {
      toast.error(t.admin.trialUpdateError);
    }
  }

  async function handleToggleFree(user: User) {
    const res = await fetch(`/api/admin/users/${user.id}/trial`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isFree: !user.isFree }),
    });
    if (res.ok) {
      setList((prev) => prev.map((u) => u.id === user.id ? { ...u, isFree: !u.isFree } : u));
      toast.success(!user.isFree ? t.admin.freeEnabled : t.admin.freeDisabled);
    } else {
      toast.error(t.admin.genericError);
    }
  }

  async function handleAddDiscount() {
    if (!discountModal) return;
    const val = parseFloat(discountValue);
    if (!val || val <= 0) { toast.error(t.admin.discountRequired); return; }
    setSavingDiscount(true);
    const res = await fetch(`/api/admin/users/${discountModal.id}/discount`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: discountType,
        value: val,
        validFrom: discountFrom || undefined,
        validUntil: discountUntil || undefined,
        note: discountNote || undefined,
      }),
    });
    setSavingDiscount(false);
    if (res.ok) {
      const newDiscount = await res.json();
      setList((prev) => prev.map((u) => u.id === discountModal.id ? { ...u, discounts: [newDiscount, ...u.discounts] } : u));
      setDiscountModal((prev) => prev ? { ...prev, discounts: [newDiscount, ...prev.discounts] } : prev);
      toast.success(t.admin.discountAdded);
      setDiscountValue(""); setDiscountFrom(""); setDiscountUntil(""); setDiscountNote("");
    } else {
      toast.error(t.admin.discountError);
    }
  }

  async function handleDeleteDiscount(userId: string, discountId: string) {
    const res = await fetch(`/api/admin/users/${userId}/discount`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ discountId }),
    });
    if (res.ok) {
      setList((prev) => prev.map((u) => u.id === userId ? { ...u, discounts: u.discounts.filter((d) => d.id !== discountId) } : u));
      setDiscountModal((prev) => prev ? { ...prev, discounts: prev.discounts.filter((d) => d.id !== discountId) } : prev);
      toast.success(t.admin.discountDeleted);
    }
  }

  function trialLabel(user: User) {
    if (user.isFree) return { text: t.admin.freeBadge, color: "text-emerald-400" };
    if (user.subscription?.status === "active") return { text: `${t.admin.subscriptionLabel} ${user.subscription.plan}`, color: "text-violet-400" };
    if (!user.trialEndsAt) return { text: t.admin.noTrial, color: "text-white/20" };
    const days = Math.ceil((new Date(user.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (days < 0) return { text: t.admin.trialExpired, color: "text-red-400" };
    return { text: `${t.admin.trialDaysLabel2} ${days}d`, color: days <= 5 ? "text-amber-400" : "text-white/50" };
  }

  return (
    <>
      <div className="bg-white/3 border border-white/8 rounded-xl overflow-hidden">
        <div className="grid grid-cols-[1fr_140px_100px_60px_120px] gap-4 px-5 py-3 bg-white/3 border-b border-white/8 text-xs font-medium text-white/30 uppercase tracking-wide">
          <span>{t.admin.usersNav}</span>
          <span>{t.admin.joined}</span>
          <span>{t.admin.trialPlan}</span>
          <span>{t.admin.projects}</span>
          <span></span>
        </div>

        {list.length === 0 && (
          <p className="text-center text-white/30 py-12 text-sm">{t.admin.noUsers}</p>
        )}

        {list.map((user, i) => {
          const { text: trialText, color: trialColor } = trialLabel(user);
          return (
            <div
              key={user.id}
              className={`grid grid-cols-[1fr_140px_100px_60px_120px] gap-4 px-5 py-4 items-center ${
                i !== list.length - 1 ? "border-b border-white/5" : ""
              } ${user.id === currentUserId ? "bg-blue-500/5" : ""}`}
            >
              {/* Name + email — link to detail page */}
              <Link href={`/admin/users/${user.id}`} className="min-w-0 hover:opacity-80 transition-opacity">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-white truncate">
                    {user.fullName ?? user.name ?? "—"}
                  </p>
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                    user.role === "client"
                      ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                      : "bg-violet-500/15 text-violet-400 border border-violet-500/20"
                  }`}>
                    {user.role === "client" ? t.admin.clientRole : t.admin.designerRole}
                  </span>
                  {user.isAdmin && (
                    <span className="flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/20 flex-shrink-0">
                      <ShieldCheck size={9} /> Admin
                    </span>
                  )}
                  {user.isFree && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 flex-shrink-0">
                      {t.admin.freeBadge}
                    </span>
                  )}
                  {user.id === currentUserId && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-white/8 text-white/40 flex-shrink-0">{t.admin.selfBadge}</span>
                  )}
                </div>
                <p className="text-xs text-white/30 truncate">{user.email}</p>
              </Link>

              {/* Date */}
              <p className="text-sm text-white/30">
                {new Date(user.createdAt).toLocaleDateString("pl-PL", { day: "2-digit", month: "short", year: "numeric" })}
              </p>

              {/* Trial status */}
              <p className={`text-xs font-medium ${trialColor}`}>{trialText}</p>

              {/* Projects */}
              <div className="flex items-center gap-1 text-sm text-white/30">
                <FolderOpen size={13} />
                {user._count.projects}
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-1">
                {user.role === "designer" && !user.isAdmin && (
                  <>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      title={user.isFree ? t.admin.disableFree : t.admin.enableFree}
                      className={`hover:bg-white/8 ${user.isFree ? "text-emerald-400 hover:text-emerald-300" : "text-white/25 hover:text-white/70"}`}
                      onClick={() => handleToggleFree(user)}
                    >
                      <Gift size={14} />
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      title={t.admin.manageTrial}
                      className="text-white/25 hover:text-amber-400 hover:bg-white/8"
                      onClick={() => { setTrialModal(user); setExtraDays(""); }}
                    >
                      <Clock size={14} />
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      title={t.admin.discountsTitle}
                      className="text-white/25 hover:text-violet-400 hover:bg-white/8"
                      onClick={() => setDiscountModal(user)}
                    >
                      <Plus size={14} />
                    </Button>
                  </>
                )}
                <Button
                  size="icon-sm"
                  variant="ghost"
                  title={t.admin.changePassword}
                  className="text-white/25 hover:text-white/70 hover:bg-white/8"
                  onClick={() => { setPasswordModal({ id: user.id, name: user.name }); setNewPassword(""); }}
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
          );
        })}
      </div>

      {/* Password modal */}
      {passwordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={() => setPasswordModal(null)}>
          <div className="bg-[#1a1d24] border border-white/10 rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-white">{t.admin.changePassword}</h2>
              <button onClick={() => setPasswordModal(null)} className="text-white/30 hover:text-white/70 transition-colors"><X size={18} /></button>
            </div>
            <p className="text-sm text-white/40 mb-4">
              {t.admin.passwordFor} <span className="font-medium text-white/80">{passwordModal.name ?? passwordModal.id}</span>
            </p>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleChangePassword()}
              placeholder={t.admin.passwordPlaceholder}
              autoFocus
              className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/20 focus:outline-none focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20 mb-4 transition-all"
            />
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" className="text-white/40 hover:text-white/80" onClick={() => setPasswordModal(null)}>{t.common.cancel}</Button>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-500 text-white border-0" onClick={handleChangePassword} disabled={savingPassword || newPassword.length < 8}>
                {savingPassword ? t.common.saving : t.admin.setPassword}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Trial modal */}
      {trialModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={() => setTrialModal(null)}>
          <div className="bg-[#1a1d24] border border-white/10 rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-white">{t.admin.trialSection} — {trialModal.fullName ?? trialModal.name ?? trialModal.email}</h2>
              <button onClick={() => setTrialModal(null)} className="text-white/30 hover:text-white/70"><X size={18} /></button>
            </div>

            <div className="mb-4 text-sm text-white/50">
              {trialModal.trialEndsAt
                ? <>{t.admin.trialEnds} <span className="text-white/80">{new Date(trialModal.trialEndsAt).toLocaleDateString("pl-PL", { day: "2-digit", month: "long", year: "numeric" })}</span></>
                : t.admin.noTrialSet}
            </div>

            <label className="block text-xs text-white/40 mb-1.5">{t.admin.trialDaysLabel}</label>
            <input
              type="number"
              value={extraDays}
              onChange={(e) => setExtraDays(e.target.value)}
              placeholder="np. 7"
              className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/20 focus:outline-none focus:border-amber-500/40 mb-4"
            />

            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" className="text-white/40 hover:text-white/80" onClick={() => setTrialModal(null)}>{t.common.cancel}</Button>
              <Button size="sm" className="bg-amber-600 hover:bg-amber-500 text-white border-0" onClick={handleTrialSave} disabled={savingTrial || extraDays === ""}>
                {savingTrial ? t.common.saving : t.admin.saveBtn}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Discount modal */}
      {discountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={() => setDiscountModal(null)}>
          <div className="bg-[#1a1d24] border border-white/10 rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-white">{t.admin.discountsTitle} — {discountModal.fullName ?? discountModal.name ?? discountModal.email}</h2>
              <button onClick={() => setDiscountModal(null)} className="text-white/30 hover:text-white/70"><X size={18} /></button>
            </div>

            {/* Existing discounts */}
            {discountModal.discounts.length > 0 && (
              <div className="mb-5 space-y-2">
                {discountModal.discounts.map((d) => (
                  <div key={d.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/5 border border-white/8">
                    <div className="text-sm">
                      <span className="text-violet-400 font-semibold">
                        {d.type === "percent" ? `${d.value}%` : `${d.value} zł`}
                      </span>
                      <span className="text-white/40 text-xs ml-2">
                        {new Date(d.validFrom).toLocaleDateString("pl-PL")}
                        {d.validUntil && ` – ${new Date(d.validUntil).toLocaleDateString("pl-PL")}`}
                      </span>
                      {d.note && <span className="text-white/30 text-xs ml-1">({d.note})</span>}
                    </div>
                    <button onClick={() => handleDeleteDiscount(discountModal.id, d.id)} className="text-red-400/50 hover:text-red-400 ml-3">
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-3">
              <p className="text-xs text-white/40 font-medium uppercase tracking-wide">{t.admin.addDiscount}</p>

              <div className="flex gap-2">
                <button onClick={() => setDiscountType("percent")} className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${discountType === "percent" ? "bg-violet-600/20 border-violet-500/40 text-violet-300" : "bg-white/5 border-white/10 text-white/40 hover:text-white/60"}`}>
                  {t.admin.percentDiscount}
                </button>
                <button onClick={() => setDiscountType("amount")} className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${discountType === "amount" ? "bg-violet-600/20 border-violet-500/40 text-violet-300" : "bg-white/5 border-white/10 text-white/40 hover:text-white/60"}`}>
                  {t.admin.amountDiscount}
                </button>
              </div>

              <input
                type="number"
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                placeholder={discountType === "percent" ? t.admin.percentPlaceholder : t.admin.amountPlaceholder}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/20 focus:outline-none focus:border-violet-500/40"
              />

              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-xs text-white/30 mb-1">{t.admin.validFrom}</label>
                  <input type="date" value={discountFrom} onChange={(e) => setDiscountFrom(e.target.value)} className="w-full px-3 py-2 text-sm rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-violet-500/40" />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-white/30 mb-1">{t.admin.validUntil}</label>
                  <input type="date" value={discountUntil} onChange={(e) => setDiscountUntil(e.target.value)} className="w-full px-3 py-2 text-sm rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-violet-500/40" />
                </div>
              </div>

              <input
                value={discountNote}
                onChange={(e) => setDiscountNote(e.target.value)}
                placeholder={t.admin.notePlaceholder}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/20 focus:outline-none focus:border-violet-500/40"
              />

              <div className="flex gap-2 justify-end pt-1">
                <Button variant="ghost" size="sm" className="text-white/40 hover:text-white/80" onClick={() => setDiscountModal(null)}>{t.common.close}</Button>
                <Button size="sm" className="bg-violet-600 hover:bg-violet-500 text-white border-0" onClick={handleAddDiscount} disabled={savingDiscount || !discountValue}>
                  {savingDiscount ? t.admin.addingDiscount : t.admin.addDiscount}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
