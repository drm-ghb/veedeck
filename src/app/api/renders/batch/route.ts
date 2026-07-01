import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";

interface FileItem {
  name: string;
  fileUrl: string;
  fileKey: string;
  fileType: string;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = getWorkspaceUserId(session);

  const { projectId, roomId, folderId, files } = await req.json();

  if (!Array.isArray(files) || files.length === 0) {
    return NextResponse.json({ error: "Brak plików" }, { status: 400 });
  }

  const project = await prisma.project.findFirst({
    where: { id: projectId, userId },
    include: { user: { select: { defaultRenderStatus: true } } },
  });

  if (!project) {
    return NextResponse.json({ error: "Projekt nie znaleziony" }, { status: 404 });
  }

  const results = [];

  for (const file of files as FileItem[]) {
    const { name, fileUrl, fileKey, fileType } = file;

    // Check for existing render with same name (case-insensitive)
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
      results.push({ ...updated, versioned: true });
    } else {
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

      results.push(render);
    }
  }

  return NextResponse.json(results, { status: 201 });
}
