import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; assignmentId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const designerId = getWorkspaceUserId(session);
  const { id, assignmentId } = await params;

  const contractor = await prisma.contractor.findFirst({ where: { id, designerId } });
  if (!contractor) {
    return NextResponse.json({ error: "Nie znaleziono wykonawcy" }, { status: 404 });
  }

  const assignment = await prisma.contractorAssignment.findFirst({
    where: { id: assignmentId, contractorId: id },
  });
  if (!assignment) {
    return NextResponse.json({ error: "Nie znaleziono przypisania" }, { status: 404 });
  }

  const { archived } = await req.json();

  const updated = await prisma.contractorAssignment.update({
    where: { id: assignmentId },
    data: { archived: archived ?? assignment.archived },
    include: {
      project: { select: { id: true, title: true, clientName: true } },
      folders: { include: { _count: { select: { files: true } } }, orderBy: { order: "asc" } },
    },
  });

  return NextResponse.json(updated);
}
