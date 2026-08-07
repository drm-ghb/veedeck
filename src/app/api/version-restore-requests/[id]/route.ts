import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { action } = await req.json(); // "confirm" | "reject"

  const request = await prisma.versionRestoreRequest.findUnique({ where: { id } });
  if (!request) return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });

  const project = await prisma.project.findUnique({
    where: { id: request.projectId },
    select: { userId: true },
  });

  if (!project || project.userId !== session.user.id) {
    return NextResponse.json({ error: "Brak dostępu" }, { status: 403 });
  }

  if (request.status !== "PENDING") {
    return NextResponse.json({ error: "Prośba już rozpatrzona" }, { status: 409 });
  }

  const newStatus = action === "confirm" ? "CONFIRMED" : "REJECTED";

  await prisma.versionRestoreRequest.update({ where: { id }, data: { status: newStatus } });

  if (action === "confirm") {
    const render = await prisma.render.findUnique({
      where: { id: request.renderId },
      include: { _count: { select: { versions: true } } },
    });
    const version = await prisma.renderVersion.findUnique({ where: { id: request.versionId } });

    if (render && version) {
      const versionNumber = render._count.versions + 1;
      const currentActiveVersionId = (render as any).activeVersionId as string | null;

      await prisma.$transaction(async (tx) => {
        let archiveVersionId: string;

        if (currentActiveVersionId) {
          archiveVersionId = currentActiveVersionId;
        } else {
          const snapshot = await tx.renderVersion.create({
            data: {
              renderId: render.id,
              fileUrl: render.fileUrl,
              fileKey: render.fileKey,
              versionNumber,
              archivedAt: new Date(),
            },
          });
          archiveVersionId = snapshot.id;
        }

        await tx.comment.updateMany({
          where: { renderId: render.id, archivedVersionId: null, posX: { not: null } },
          data: { archivedVersionId: archiveVersionId },
        });
        await tx.renderProductPin.updateMany({
          where: { renderId: render.id, archivedVersionId: null },
          data: { archivedVersionId: archiveVersionId },
        });
        await tx.comment.updateMany({
          where: { renderId: render.id, archivedVersionId: request.versionId },
          data: { archivedVersionId: null },
        });
        await tx.renderProductPin.updateMany({
          where: { renderId: render.id, archivedVersionId: request.versionId },
          data: { archivedVersionId: null },
        });
        await tx.render.update({
          where: { id: render.id },
          data: { fileUrl: version.fileUrl, fileKey: version.fileKey ?? render.fileKey, activeVersionId: request.versionId } as any,
        });
      });
    }
  }

  const resultMessage =
    action === "confirm"
      ? `Projektant przywrócił wersję pliku „${request.renderName}".`
      : `Projektant odrzucił prośbę o przywrócenie wersji pliku „${request.renderName}".`;

  await pusherServer.trigger(`share-${request.shareToken}`, "version-restore-resolved", {
    requestId: id,
    result: newStatus,
    message: resultMessage,
  });

  return NextResponse.json({ status: newStatus });
}
