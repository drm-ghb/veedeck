import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";
import ClientsView from "@/components/projekty/ClientsView";

export default async function KlienciPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const designerId = getWorkspaceUserId(session!);

  const allClients = await prisma.client.findMany({
    where: { designerId },
    include: {
      _count: { select: { projects: true } },
      projects: {
        where: { archived: false },
        select: { id: true, title: true, slug: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      },
      contacts: {
        select: { userId: true },
      },
    },
    orderBy: { name: "asc" },
  });

  const serialize = (c: typeof allClients[0]) => ({
    id: c.id,
    name: c.name,
    createdAt: c.createdAt.toISOString(),
    archived: c.archived,
    _count: { projects: c._count.projects },
    hasContactsWithoutAccount: c.contacts.some((contact) => !contact.userId),
    projects: c.projects.map((p) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      createdAt: p.createdAt.toISOString(),
    })),
  });

  const clients = allClients.filter((c) => !c.archived).map(serialize);
  const archivedClients = allClients.filter((c) => c.archived).map(serialize);

  return <ClientsView clients={clients} archivedClients={archivedClients} />;
}
