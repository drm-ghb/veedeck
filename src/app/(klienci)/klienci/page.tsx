import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";
import { getAllowedClientIds } from "@/lib/permissions";
import ClientsView from "@/components/projekty/ClientsView";

export default async function KlienciPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const designerId = getWorkspaceUserId(session!);
  const allowedIds = await getAllowedClientIds(session!);

  let allClients = await prisma.client.findMany({
    where: { designerId, ...(allowedIds ? { id: { in: allowedIds } } : {}) },
    include: {
      _count: { select: { projects: { where: { archived: false } } } },
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

  // Auto-migrate step 1: if no clients yet, create Client records from projects with clientName
  if (allClients.length === 0 && !allowedIds) {
    const projectsWithName = await prisma.project.findMany({
      where: { userId: designerId, clientId: null, NOT: { clientName: null } },
      select: { id: true, clientName: true },
    });
    if (projectsWithName.length > 0) {
      const grouped = new Map<string, string[]>();
      for (const p of projectsWithName) {
        const name = p.clientName!;
        if (!grouped.has(name)) grouped.set(name, []);
        grouped.get(name)!.push(p.id);
      }
      for (const [name, projectIds] of grouped) {
        let client = await prisma.client.findFirst({ where: { designerId, name } });
        if (!client) {
          client = await prisma.client.create({ data: { designerId, name } });
        }
        await prisma.project.updateMany({ where: { id: { in: projectIds } }, data: { clientId: client.id } });
      }
    }
  }

  // Auto-migrate step 2: link ProjectClient contacts to Client entity (clientId)
  // Skip for restricted team members — they don't own the workspace data
  const orphanContacts = allowedIds ? [] : await prisma.projectClient.findMany({
    where: { clientId: null, project: { userId: designerId, NOT: { clientId: null } } },
    select: { id: true, project: { select: { clientId: true } } },
  });
  if (orphanContacts.length > 0) {
    for (const contact of orphanContacts) {
      if (contact.project?.clientId) {
        await prisma.projectClient.update({
          where: { id: contact.id },
          data: { clientId: contact.project.clientId },
        });
      }
    }
  }

  allClients = await prisma.client.findMany({
    where: { designerId, ...(allowedIds ? { id: { in: allowedIds } } : {}) },
    include: {
      _count: { select: { projects: { where: { archived: false } } } },
      projects: {
        where: { archived: false },
        select: { id: true, title: true, slug: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      },
      contacts: { select: { userId: true } },
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
