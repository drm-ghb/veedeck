import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getClientProject } from "@/lib/client-access";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; renderId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId, renderId } = await params;
  const project = await getClientProject(session, projectId);
  if (!project) return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });

  if (!project.user.allowClientAcceptance && !project.user.allowDirectStatusChange) {
    return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 });
  }

  const render = await prisma.render.findFirst({ where: { id: renderId, projectId } });
  if (!render) return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });

  const { status } = await req.json();
  const updated = await prisma.render.update({ where: { id: renderId }, data: { status } });
  return NextResponse.json(updated);
}
