import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if ((session.user as any).role !== "client") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const links = await prisma.projectClient.findMany({
    where: { userId: session.user.id },
    include: {
      project: {
        select: {
          id: true,
          title: true,
          archived: true,
          user: { select: { name: true, clientLogoUrl: true, showProfileName: true, showClientLogo: true } },
        },
      },
    },
  });

  const projects = links
    .filter((l) => !l.project.archived)
    .map((l) => ({
      id: l.project.id,
      title: l.project.title,
      designerName: l.project.user.showProfileName ? l.project.user.name : null,
      clientLogoUrl: l.project.user.showClientLogo ? l.project.user.clientLogoUrl : null,
    }));

  return NextResponse.json(projects);
}
