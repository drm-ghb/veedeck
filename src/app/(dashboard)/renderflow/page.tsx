import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ProjectsView from "@/components/dashboard/ProjectsView";

export default async function DashboardPage() {
  const session = await auth();

  const [projects, archivedProjects] = await Promise.all([
    prisma.project.findMany({
      where: { userId: session!.user!.id!, archived: false, modules: { has: "renderflow" } },
      include: { _count: { select: { renders: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.project.findMany({
      where: { userId: session!.user!.id!, archived: true, modules: { has: "renderflow" } },
      include: { _count: { select: { renders: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  function serialize(p: typeof projects[0]) {
    return {
      id: p.id,
      title: p.title,
      clientName: p.clientName,
      clientEmail: p.clientEmail,
      description: p.description,
      renderCount: p._count.renders,
      createdAt: p.createdAt.toISOString(),
      shareToken: p.shareToken,
      pinned: p.pinned,
      hiddenModules: p.hiddenModules,
      clientCanUpload: p.clientCanUpload,
    };
  }

  return (
    <ProjectsView
      projects={projects.map(serialize)}
      archivedProjects={archivedProjects.map(serialize)}
    />
  );
}
