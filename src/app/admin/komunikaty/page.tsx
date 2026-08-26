import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import AdminAnnouncementsClient from "@/components/admin/AdminAnnouncementsClient";

export default async function AdminAnnouncementsPage() {
  const session = await auth();
  if (!(session?.user as any)?.isAdmin) notFound();

  const announcements = await prisma.announcement.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { dismissals: true } } },
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-white">Komunikaty</h1>
        <p className="text-sm text-white/40 mt-1">
          Twórz i zarządzaj komunikatami dla projektantów
        </p>
      </div>
      <AdminAnnouncementsClient announcements={announcements} />
    </div>
  );
}
