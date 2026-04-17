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

  await prisma.$transaction([
    prisma.renderVersion.create({
      data: {
        renderId: id,
        fileUrl: render.fileUrl,
        fileKey: render.fileKey,
        versionNumber,
        archivedAt: new Date(),
      },
    }),
    prisma.render.update({
      where: { id },
      data: { fileUrl: version.fileUrl, fileKey: version.fileKey ?? render.fileKey },
    }),
  ]);

  return NextResponse.json({ success: true });
}
