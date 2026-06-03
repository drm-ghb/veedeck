import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if ((session.user as any).role !== "client") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const links = await prisma.projectClient.findMany({
    where: { userId: session.user.id },
    select: {
      clientId: true,
      project: {
        select: {
          id: true,
          title: true,
          description: true,
          createdAt: true,
          archived: true,
          _count: { select: { renders: true } },
          user: { select: { name: true, clientLogoUrl: true, showProfileName: true, showClientLogo: true } },
        },
      },
    },
  });

  const projectSelect = {
    id: true,
    title: true,
    description: true,
    createdAt: true,
    _count: { select: { renders: true } },
    user: { select: { name: true, clientLogoUrl: true, showProfileName: true, showClientLogo: true } },
  } as const;

  const directProjects = links.flatMap((l) => {
    if (!l.project || l.project.archived) return [];
    return [l.project];
  });

  // Also find projects via Client entity
  const clientIds = [...new Set(links.map((l) => l.clientId).filter((id): id is string => !!id))];
  const clientEntityProjects = clientIds.length > 0
    ? await prisma.project.findMany({
        where: { clientId: { in: clientIds }, archived: false },
        select: projectSelect,
      })
    : [];

  // Deduplicate
  type ProjectEntry = { id: string; title: string; description: string | null; createdAt: Date; _count: { renders: number }; user: { name: string | null; clientLogoUrl: string | null; showProfileName: boolean; showClientLogo: boolean } };
  const seen = new Map<string, ProjectEntry>();
  for (const p of [...directProjects, ...clientEntityProjects]) seen.set(p.id, p);

  const projects = [...seen.values()].map((p) => ({
    id: p.id,
    title: p.title,
    description: p.description ?? null,
    createdAt: p.createdAt.toISOString(),
    renderCount: p._count.renders,
    designerName: p.user.showProfileName ? p.user.name : null,
    clientLogoUrl: p.user.showClientLogo ? p.user.clientLogoUrl : null,
  }));

  return NextResponse.json(projects);
}
