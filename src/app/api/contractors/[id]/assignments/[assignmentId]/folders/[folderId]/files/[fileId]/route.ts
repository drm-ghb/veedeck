import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";
import { UTApi } from "uploadthing/server";

const utapi = new UTApi();

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; assignmentId: string; folderId: string; fileId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const designerId = getWorkspaceUserId(session);
  const { id, folderId, fileId } = await params;

  const contractor = await prisma.contractor.findFirst({ where: { id, designerId } });
  if (!contractor) {
    return NextResponse.json({ error: "Nie znaleziono wykonawcy" }, { status: 404 });
  }

  const file = await prisma.contractorFile.findFirst({
    where: { id: fileId, folderId },
  });
  if (!file) {
    return NextResponse.json({ error: "Nie znaleziono pliku" }, { status: 404 });
  }

  if (file.fileKey) {
    try {
      await utapi.deleteFiles(file.fileKey);
    } catch {
      // ignore upload deletion errors
    }
  }

  await prisma.contractorFile.delete({ where: { id: fileId } });

  return NextResponse.json({ ok: true });
}
