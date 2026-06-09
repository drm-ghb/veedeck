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
  const { fileUrl, fileKey, label } = await req.json();

  const render = await prisma.render.findUnique({
    where: { id },
    include: { _count: { select: { versions: true } }, project: true },
  });

  if (!render || render.project.userId !== getWorkspaceUserId(session)) {
    return NextResponse.json({ error: "Brak dostępu" }, { status: 403 });
  }

  const versionNumber = render._count.versions + 1;

  try {
    await prisma.$transaction(async (tx) => {
      const newVersion = await tx.renderVersion.create({
        data: {
          renderId: id,
          fileUrl: render.fileUrl,
          fileKey: render.fileKey,
          versionNumber,
          label: label || null,
          archivedAt: new Date(),
        },
      });
      await tx.comment.updateMany({
        where: { renderId: id, archivedVersionId: null },
        data: { archivedVersionId: newVersion.id },
      });
      await tx.renderProductPin.updateMany({
        where: { renderId: id, archivedVersionId: null },
        data: { archivedVersionId: newVersion.id },
      });
      await tx.render.update({ where: { id }, data: { fileUrl, fileKey } });
    });
  } catch (e) {
    console.error("version create error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
