import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const project = await prisma.project.findUnique({
    where: { shareToken: token },
    select: { id: true, clientCanUpload: true, archived: true },
  });

  if (!project || project.archived) {
    return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });
  }

  if (!project.clientCanUpload) {
    return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 });
  }

  const { name, fileUrl, fileKey, roomId, folderId } = await req.json();
  if (!name?.trim() || !fileUrl) {
    return NextResponse.json({ error: "Brak danych" }, { status: 400 });
  }

  // Verify room belongs to this project
  if (roomId) {
    const room = await prisma.room.findFirst({
      where: { id: roomId, projectId: project.id, archived: false },
    });
    if (!room) {
      return NextResponse.json({ error: "Brak dostępu" }, { status: 403 });
    }
  }

  // Check for existing render with same name in same room (versioning)
  const existing = await prisma.render.findFirst({
    where: {
      projectId: project.id,
      roomId: roomId || null,
      name: { equals: name.trim(), mode: "insensitive" },
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
        data: { fileUrl, fileKey },
      }),
    ]);
    const updated = await prisma.render.findUnique({ where: { id: existing.id } });
    return NextResponse.json({ ...updated, versioned: true }, { status: 200 });
  }

  const count = await prisma.render.count({ where: { projectId: project.id } });
  const render = await prisma.render.create({
    data: {
      projectId: project.id,
      name: name.trim(),
      fileUrl,
      fileKey: fileKey || null,
      order: count,
      roomId: roomId || null,
      folderId: folderId || null,
      status: "REVIEW",
    },
  });

  return NextResponse.json(render, { status: 201 });
}
