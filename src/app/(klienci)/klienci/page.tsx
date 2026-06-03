import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";
import ClientsView from "@/components/projekty/ClientsView";

export default async function KlienciPage() {
  const session = await auth();
  const userId = getWorkspaceUserId(session!);

  // Auto-migrate: if no clients exist but projects with clientName exist, run migration
  const clientCount = await prisma.client.count({ where: { designerId: userId } });
  if (clientCount === 0) {
    const projectsWithClient = await prisma.project.findMany({
      where: { userId, clientId: null, NOT: { clientName: null } },
      select: { id: true, clientName: true },
    });
    if (projectsWithClient.length > 0) {
      const grouped = new Map<string, string[]>();
      for (const p of projectsWithClient) {
        const name = p.clientName!;
        if (!grouped.has(name)) grouped.set(name, []);
        grouped.get(name)!.push(p.id);
      }
      for (const [name, projectIds] of grouped) {
        const client = await prisma.client.create({ data: { designerId: userId, name } });
        await prisma.project.updateMany({ where: { id: { in: projectIds } }, data: { clientId: client.id } });
      }
    }
  }

  const [clients, archivedClients] = await Promise.all([
    prisma.client.findMany({
      where: { designerId: userId, archived: false },
      include: {
        _count: { select: { projects: true } },
        projects: {
          where: { archived: false },
          select: { id: true, title: true, slug: true, createdAt: true },
          orderBy: { createdAt: "desc" },
        },
        contacts: {
          where: { userId: null },
          select: { id: true },
          take: 1,
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.client.findMany({
      where: { designerId: userId, archived: true },
      include: {
        _count: { select: { projects: true } },
        projects: {
          where: { archived: false },
          select: { id: true, title: true, slug: true, createdAt: true },
          orderBy: { createdAt: "desc" },
        },
        contacts: {
          where: { userId: null },
          select: { id: true },
          take: 1,
        },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  const serialize = (c: typeof clients[0]) => ({
    id: c.id,
    name: c.name,
    createdAt: c.createdAt.toISOString(),
    archived: c.archived,
    _count: c._count,
    hasContactsWithoutAccount: c.contacts.length > 0,
    projects: c.projects.map((p) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      createdAt: p.createdAt.toISOString(),
    })),
  });

  return (
    <ClientsView
      clients={clients.map(serialize)}
      archivedClients={archivedClients.map(serialize)}
    />
  );
}
