import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { versionId } = await req.json();

  const render = await prisma.render.findUnique({
    where: { id },
    include: { project: true, _count: { select: { versions: true } } },
  });

  if (!render || render.project.userId !== getWorkspaceUserId(session)) {
    return NextResponse.json({ error: "Brak dostępu" }, { status: 403 });
  }

  const version = await prisma.renderVersion.findUnique({ where: { id: versionId } });
  if (!version || version.renderId !== id) {
    return NextResponse.json({ error: "Wersja nie znaleziona" }, { status: 404 });
  }

  const versionNumber = render._count.versions + 1;

  const restoredVersionNumber = version.versionNumber;
  const restoredVersionLabel = version.label;
  const currentActiveVersionId = (render as any).activeVersionId as string | null;

  await prisma.$transaction(async (tx) => {
    let archiveVersionId: string;

    if (currentActiveVersionId) {
      // New system: archive current pins back into the currently-active version — no new version created
      archiveVersionId = currentActiveVersionId;
    } else {
      // Old render (no activeVersionId tracking) — one-time snapshot transition
      const snapshot = await tx.renderVersion.create({
        data: {
          renderId: id,
          fileUrl: render.fileUrl,
          fileKey: render.fileKey,
          versionNumber,
          archivedAt: new Date(),
        },
      });
      archiveVersionId = snapshot.id;
    }

    // Archive current pin comments (posX not null) — chat messages preserved
    await tx.comment.updateMany({
      where: { renderId: id, archivedVersionId: null, posX: { not: null } },
      data: { archivedVersionId: archiveVersionId },
    });
    await tx.renderProductPin.updateMany({
      where: { renderId: id, archivedVersionId: null },
      data: { archivedVersionId: archiveVersionId },
    });
    // Restore pins belonging to the target version
    await tx.comment.updateMany({
      where: { renderId: id, archivedVersionId: versionId },
      data: { archivedVersionId: null },
    });
    await tx.renderProductPin.updateMany({
      where: { renderId: id, archivedVersionId: versionId },
      data: { archivedVersionId: null },
    });
    await tx.render.update({
      where: { id },
      data: { fileUrl: version.fileUrl, fileKey: version.fileKey ?? render.fileKey, activeVersionId: versionId } as any,
    });
  });

  // Log version restore as system chat message
  await prisma.comment.create({
    data: {
      renderId: id,
      author: "__system__",
      content: JSON.stringify({ event: "version_restore", versionNumber: restoredVersionNumber, label: restoredVersionLabel || null }),
    },
  });

  return NextResponse.json({ success: true });
}
