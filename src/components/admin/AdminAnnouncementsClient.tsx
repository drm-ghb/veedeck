"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus, Megaphone, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";

type Announcement = {
  id: string;
  title: string;
  status: string;
  frequency: string;
  recipientType: string;
  publishAt: string | Date | null;
  createdAt: string | Date;
  _count: { dismissals: number };
};

export default function AdminAnnouncementsClient({
  announcements: initial,
}: {
  announcements: Announcement[];
}) {
  const t = useT();
  const router = useRouter();
  const [announcements, setAnnouncements] = useState(initial);
  const [creating, setCreating] = useState(false);

  async function handleCreate() {
    setCreating(true);
    try {
      const res = await fetch("/api/admin/announcements", { method: "POST" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      router.push(`/admin/komunikaty/${data.id}`);
    } catch {
      toast.error(t.admin.genericError);
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm(t.admin.deleteAnnouncementConfirm)) return;
    try {
      const res = await fetch(`/api/admin/announcements/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
      toast.success(t.admin.announcementDeleted);
    } catch {
      toast.error(t.admin.genericError);
    }
  }

  return (
    <div>
      <button
        onClick={handleCreate}
        disabled={creating}
        className="mb-6 flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500/15 text-blue-400 text-sm font-medium hover:bg-blue-500/25 transition-colors disabled:opacity-50"
      >
        <Plus size={15} />
        {t.admin.newAnnouncement}
      </button>

      {announcements.length === 0 ? (
        <p className="text-white/30 text-sm">{t.admin.noAnnouncements}</p>
      ) : (
        <div className="space-y-2">
          {announcements.map((a) => (
            <div
              key={a.id}
              className="flex items-center gap-4 px-4 py-3 rounded-lg bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] transition-colors cursor-pointer"
              onClick={() => router.push(`/admin/komunikaty/${a.id}`)}
            >
              <Megaphone size={16} className="text-white/20 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">
                  {a.title || <span className="text-white/30 italic">Bez tytułu</span>}
                </p>
                <p className="text-xs text-white/30 mt-0.5">
                  {new Date(a.createdAt).toLocaleDateString("pl-PL")}
                  {" · "}
                  {a.frequency === "once" ? t.admin.frequencyOnce : t.admin.frequencyRecurring}
                  {" · "}
                  {a.recipientType === "all" ? t.admin.recipientAll : t.admin.recipientSelected}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs text-white/30">
                  {a._count.dismissals} {t.admin.dismissals.toLowerCase()}
                </span>
                <span
                  className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                    a.status === "sent"
                      ? "bg-emerald-500/15 text-emerald-400"
                      : "bg-white/8 text-white/40"
                  }`}
                >
                  {a.status === "sent" ? t.admin.announcementSent : t.admin.announcementDraft}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(a.id);
                  }}
                  className="p-1.5 rounded-md text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
