import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { fileUrl, fileKey, label } = await req.json();

    const render = await prisma.render.findUnique({
      where: { id },
      include: { _count: { select: { versions: true } }, project: true },
    });

    if (!render || render.project.userId !== getWorkspaceUserId(session)) {
      return NextResponse.json({ error: "Brak dostępu" }, { status: 403 });
    }

    let newVersionNumber = 0;

    await prisma.$transaction(async (tx) => {
      let archiveVersionId: string;

      if ((render as any).activeVersionId) {
        // Already tracking: archive pins under the currently-active version
        archiveVersionId = (render as any).activeVersionId as string;
        newVersionNumber = render._count.versions + 1;
      } else if (render._count.versions === 0) {
        // First version ever: create "Oryginał" snapshot first, then new version
        const original = await tx.renderVersion.create({
          data: {
            renderId: id,
            fileUrl: render.fileUrl,
            fileKey: render.fileKey,
            versionNumber: 1,
            label: "Oryginał",
            archivedAt: new Date(),
          },
        });
        archiveVersionId = original.id;
        newVersionNumber = 2;
      } else {
        // Old render (versions exist but no activeVersionId tracking) — one-time snapshot transition
        const snapshot = await tx.renderVersion.create({
          data: {
            renderId: id,
            fileUrl: render.fileUrl,
            fileKey: render.fileKey,
            versionNumber: render._count.versions + 1,
            archivedAt: new Date(),
          },
        });
        archiveVersionId = snapshot.id;
        newVersionNumber = render._count.versions + 2;
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

      // Create the new version
      const newVersion = await tx.renderVersion.create({
        data: {
          renderId: id,
          fileUrl,
          fileKey,
          versionNumber: newVersionNumber,
          label: label || null,
          archivedAt: new Date(),
        },
      });

      await tx.render.update({
        where: { id },
        data: { fileUrl, fileKey, activeVersionId: newVersion.id } as any,
      });
    });

    // Log version upload as system chat message
    await prisma.comment.create({
      data: {
        renderId: id,
        author: "__system__",
        content: JSON.stringify({ event: "version_upload", versionNumber: newVersionNumber, label: label || null }),
      },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: "Błąd serwera" }, { status: 500 });
  }
}
