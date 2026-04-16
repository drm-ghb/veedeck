import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";

// DELETE — usuń członka zespołu lub cofnij zaproszenie
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ownerId = getWorkspaceUserId(session);
  const { id } = await params;

  // Próba usunięcia zaproszenia
  const invitation = await prisma.invitation.findFirst({
    where: { id, designerId: ownerId },
  });

  if (invitation) {
    await prisma.invitation.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  }

  // Próba usunięcia członka zespołu
  const member = await prisma.user.findFirst({
    where: { id, ownerId },
  });

  if (!member) return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });

  // Odłącz od workspace (nie usuwa konta)
  await prisma.user.update({
    where: { id },
    data: { ownerId: null },
  });

  return NextResponse.json({ ok: true });
}
