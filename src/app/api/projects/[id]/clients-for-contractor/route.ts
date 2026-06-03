import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const designerId = getWorkspaceUserId(session);
  const { id } = await params;

  const project = await prisma.project.findFirst({
    where: { id, userId: designerId },
  });
  if (!project) {
    return NextResponse.json({ error: "Nie znaleziono projektu" }, { status: 404 });
  }

  const clients = await prisma.projectClient.findMany({
    where: { projectId: id },
    select: { id: true, name: true, email: true },
    orderBy: { order: "asc" },
  });

  return NextResponse.json(clients);
}
