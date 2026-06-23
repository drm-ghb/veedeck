import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";
import { getAllowedClientIds } from "@/lib/permissions";
import ProjectsView from "@/components/dashboard/ProjectsView";

export default async function DashboardPage() {
  const session = await auth();
  const userId = getWorkspaceUserId(session!);
  const allowedIds = await getAllowedClientIds(session!);

  const projectInclude = {
    _count: { select: { renders: true } },
    client: { select: { name: true } },
    clients: { where: { isMainContact: true as const }, select: { userId: true }, take: 1 },
  };

  const clientFilter = allowedIds ? { clientId: { in: allowedIds } } : {};

  const [projects, archivedProjects] = await Promise.all([
    prisma.project.findMany({
      where: { userId, archived: false, modules: { has: "renderflow" }, ...clientFilter },
      include: projectInclude,
      orderBy: { createdAt: "desc" },
    }),
    prisma.project.findMany({
      where: { userId, archived: true, modules: { has: "renderflow" }, ...clientFilter },
      include: projectInclude,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  function serialize(p: typeof projects[0]) {
    return {
      id: p.id,
      title: p.title,
      clientName: p.client?.name ?? p.clientName,
      clientEmail: p.clientEmail,
      description: p.description,
      renderCount: p._count.renders,
      createdAt: p.createdAt.toISOString(),
      shareToken: p.shareToken,
      pinned: p.pinned,
      hiddenModules: p.hiddenModules,
      clientCanUpload: p.clientCanUpload,
      clientHasNoAccount: !!(p.clientName) && !(p.clients[0]?.userId),
    };
  }

  return (
    <ProjectsView
      projects={projects.map(serialize)}
      archivedProjects={archivedProjects.map(serialize)}
    />
  );
}
