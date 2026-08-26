import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import AdminAnnouncementEditClient from "@/components/admin/AdminAnnouncementEditClient";

export default async function AdminAnnouncementEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!(session?.user as any)?.isAdmin) notFound();

  const { id } = await params;
  const announcement = await prisma.announcement.findUnique({
    where: { id },
    include: { _count: { select: { dismissals: true } } },
  });

  if (!announcement) notFound();

  return <AdminAnnouncementEditClient announcement={announcement} />;
}
