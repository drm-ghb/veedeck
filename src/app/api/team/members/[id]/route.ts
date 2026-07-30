import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";

// PATCH — change systemRole (admin toggle). Only workspace owner may do this.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Only the workspace owner can promote/demote admins
  if ((session.user as any).ownerId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ownerId = getWorkspaceUserId(session);
  const { id } = await params;
  const { systemRole } = await req.json();

  if (systemRole !== "admin" && systemRole !== "member") {
    return NextResponse.json({ error: "Nieprawidłowa rola" }, { status: 400 });
  }

  const member = await prisma.user.findFirst({ where: { id, ownerId } });
  if (!member) return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });

  const updated = await prisma.user.update({
    where: { id },
    data: { systemRole },
    select: { id: true, systemRole: true },
  });

  return NextResponse.json(updated);
}

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
