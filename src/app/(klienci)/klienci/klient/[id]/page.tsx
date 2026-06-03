import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";
import ClientDetailView from "@/components/projekty/ClientDetailView";

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const designerId = getWorkspaceUserId(session as any);
  const { id } = await params;

  const client = await prisma.client.findFirst({
    where: { id, designerId },
    select: {
      id: true,
      name: true,
      createdAt: true,
      contacts: {
        orderBy: [{ isMainContact: "desc" }, { order: "asc" }, { createdAt: "asc" }],
        include: { user: { select: { id: true, login: true, email: true } } },
      },
    },
  });

  if (!client) notFound();

  const serialized = {
    id: client.id,
    name: client.name,
    createdAt: client.createdAt.toISOString(),
    contacts: client.contacts.map((c) => ({
      id: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone ?? null,
      isMainContact: c.isMainContact,
      createdAt: c.createdAt.toISOString(),
      userId: c.userId ?? null,
      user: c.user ? { id: c.user.id, login: c.user.login ?? "", email: c.user.email ?? null } : null,
    })),
  };

  return <ClientDetailView client={serialized} />;
}
