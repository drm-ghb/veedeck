import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";
import ProjektyView from "@/components/projekty/ProjektyView";

export default async function ProjektyPage() {
  const session = await auth();
  const userId = getWorkspaceUserId(session!);

  const [projects, archivedProjects] = await Promise.all([
    prisma.project.findMany({
      where: { userId, archived: false },
      include: { _count: { select: { renders: true, rooms: true, shoppingLists: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.project.findMany({
      where: { userId, archived: true },
      include: { _count: { select: { renders: true, rooms: true, shoppingLists: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const serialize = (p: typeof projects[0]) => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    clientName: p.clientName,
    clientEmail: p.clientEmail,
    description: p.description,
    renderCount: p._count.renders,
    roomCount: p._count.rooms,
    listCount: p._count.shoppingLists,
    pinned: p.pinned,
    createdAt: p.createdAt.toISOString(),
  });

  return (
    <ProjektyView
      projects={projects.map(serialize)}
      archivedProjects={archivedProjects.map(serialize)}
    />
  );
}
