import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import AdminTicketsClient from "@/components/admin/AdminTicketsClient";

export default async function AdminTicketsPage() {
  const session = await auth();
  if (!(session?.user as any)?.isAdmin) notFound();

  const tickets = await prisma.helpRequest.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { id: true, email: true, fullName: true, name: true } },
      discussion: { select: { id: true } },
    },
    // attachments field included automatically via select *
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-white">Zgłoszenia</h1>
        <p className="text-sm text-white/40 mt-1">Zgłoszenia użytkowników ze formularza Pomoc</p>
      </div>
      <AdminTicketsClient tickets={tickets as any} />
    </div>
  );
}
