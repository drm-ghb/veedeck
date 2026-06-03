import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; assignmentId: string; folderId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const designerId = getWorkspaceUserId(session);
  const { id, assignmentId, folderId } = await params;

  const contractor = await prisma.contractor.findFirst({ where: { id, designerId } });
  if (!contractor) {
    return NextResponse.json({ error: "Nie znaleziono wykonawcy" }, { status: 404 });
  }

  const folder = await prisma.contractorFolder.findFirst({
    where: { id: folderId, assignmentId },
  });
  if (!folder) {
    return NextResponse.json({ error: "Nie znaleziono folderu" }, { status: 404 });
  }

  const { visible } = await req.json();

  const updated = await prisma.contractorFolder.update({
    where: { id: folderId },
    data: { visible: visible ?? folder.visible },
  });

  return NextResponse.json(updated);
}
