import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";
import { checkTeamPermission } from "@/lib/permissions";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!await checkTeamPermission(session, "pfCanUpload")) {
    return NextResponse.json({ error: "Brak uprawnień do przesyłania plików" }, { status: 403 });
  }
  const userId = getWorkspaceUserId(session);

  const { projectId, name, fileUrl, fileKey, roomId, folderId, fileType } = await req.json();

  const project = await prisma.project.findFirst({
    where: { id: projectId, userId },
    include: { user: { select: { defaultRenderStatus: true } } },
  });

  if (!project) {
    return NextResponse.json({ error: "Projekt nie znaleziony" }, { status: 404 });
  }

  // Check for existing render with same name (case-insensitive) in same project+room
  const existing = await prisma.render.findFirst({
    where: {
      projectId,
      roomId: roomId || null,
      folderId: folderId || null,
      name: { equals: name, mode: "insensitive" },
      archived: false,
    },
    include: { _count: { select: { versions: true } } },
  });

  if (existing) {
    // Archive current version, then replace file data
    const versionNumber = existing._count.versions + 1;
    const now = new Date();

    await prisma.$transaction([
      prisma.renderVersion.create({
        data: {
          renderId: existing.id,
          fileUrl: existing.fileUrl,
          fileKey: existing.fileKey,
          versionNumber,
          archivedAt: now,
        },
      }),
      prisma.comment.deleteMany({ where: { renderId: existing.id } }),
      prisma.render.update({
        where: { id: existing.id },
        data: { fileUrl, fileKey, fileType: fileType || "image" },
      }),
    ]);

    const updated = await prisma.render.findUnique({ where: { id: existing.id } });
    return NextResponse.json({ ...updated, versioned: true }, { status: 200 });
  }

  // New render
  const count = await prisma.render.count({ where: { projectId } });
  const render = await prisma.render.create({
    data: {
      projectId,
      name,
      fileUrl,
      fileKey,
      order: count,
      roomId: roomId || null,
      folderId: folderId || null,
      status: project.user.defaultRenderStatus,
      fileType: fileType || "image",
    },
  });

  // Sync to linked contractor folders
  if (folderId) {
    const linkedFolders = await prisma.contractorFolder.findMany({
      where: { sourceFolderId: folderId },
      select: { id: true },
    });
    if (linkedFolders.length > 0) {
      await prisma.contractorFile.createMany({
        data: linkedFolders.map((cf) => ({
          folderId: cf.id,
          renderId: render.id,
          name: render.name,
          fileType: render.fileType,
          uploadedById: userId,
        })),
      });
    }
  }

  return NextResponse.json(render, { status: 201 });
}
