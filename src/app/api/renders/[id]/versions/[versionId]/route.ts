import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, versionId } = await params;
  const { label } = await req.json();

  const version = await prisma.renderVersion.findUnique({
    where: { id: versionId },
    include: { render: { select: { project: { select: { userId: true } } } } },
  });

  if (!version || version.renderId !== id) {
    return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });
  }
  if (version.render.project.userId !== getWorkspaceUserId(session)) {
    return NextResponse.json({ error: "Brak dostępu" }, { status: 403 });
  }

  const updated = await prisma.renderVersion.update({
    where: { id: versionId },
    data: { label: label?.trim() || null },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, versionId } = await params;

  const version = await prisma.renderVersion.findUnique({
    where: { id: versionId },
    include: { render: { select: { activeVersionId: true, project: { select: { userId: true } } } } },
  });

  if (!version || version.renderId !== id) {
    return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });
  }
  if ((version.render as any).project.userId !== getWorkspaceUserId(session)) {
    return NextResponse.json({ error: "Brak dostępu" }, { status: 403 });
  }
  if ((version.render as any).activeVersionId === versionId) {
    return NextResponse.json({ error: "Nie można usunąć aktywnej wersji" }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.comment.deleteMany({ where: { archivedVersionId: versionId } }),
    prisma.renderProductPin.deleteMany({ where: { archivedVersionId: versionId } }),
    prisma.renderVersion.delete({ where: { id: versionId } }),
  ]);

  return NextResponse.json({ success: true });
}
