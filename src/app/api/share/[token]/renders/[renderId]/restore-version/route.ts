import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string; renderId: string }> }
) {
  const { token, renderId } = await params;
  const { versionId } = await req.json();

  const project = await prisma.project.findUnique({
    where: { shareToken: token },
    include: { user: { select: { allowClientVersionRestore: true } } },
  });

  if (!project) return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });
  if (!project.user.allowClientVersionRestore) {
    return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 });
  }

  const render = await prisma.render.findUnique({
    where: { id: renderId },
    include: { _count: { select: { versions: true } } },
  });

  if (!render || render.projectId !== project.id) {
    return NextResponse.json({ error: "Brak dostępu" }, { status: 403 });
  }

  const version = await prisma.renderVersion.findUnique({ where: { id: versionId } });
  if (!version || version.renderId !== renderId) {
    return NextResponse.json({ error: "Wersja nie znaleziona" }, { status: 404 });
  }

  const versionNumber = render._count.versions + 1;
  const currentActiveVersionId = (render as any).activeVersionId as string | null;

  await prisma.$transaction(async (tx) => {
    let archiveVersionId: string;

    if (currentActiveVersionId) {
      archiveVersionId = currentActiveVersionId;
    } else {
      const snapshot = await tx.renderVersion.create({
        data: {
          renderId,
          fileUrl: render.fileUrl,
          fileKey: render.fileKey,
          versionNumber,
          archivedAt: new Date(),
        },
      });
      archiveVersionId = snapshot.id;
    }

    await tx.comment.updateMany({
      where: { renderId, archivedVersionId: null, posX: { not: null } },
      data: { archivedVersionId: archiveVersionId },
    });
    await tx.renderProductPin.updateMany({
      where: { renderId, archivedVersionId: null },
      data: { archivedVersionId: archiveVersionId },
    });
    await tx.comment.updateMany({
      where: { renderId, archivedVersionId: versionId },
      data: { archivedVersionId: null },
    });
    await tx.renderProductPin.updateMany({
      where: { renderId, archivedVersionId: versionId },
      data: { archivedVersionId: null },
    });
    await tx.render.update({
      where: { id: renderId },
      data: { fileUrl: version.fileUrl, fileKey: version.fileKey ?? render.fileKey, activeVersionId: versionId } as any,
    });
  });

  return NextResponse.json({ success: true });
}
