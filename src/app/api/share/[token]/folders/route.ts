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

  const { name, roomId } = await req.json();
  if (!name?.trim() || !roomId) {
    return NextResponse.json({ error: "Brak danych" }, { status: 400 });
  }

  // Verify room belongs to this project
  const room = await prisma.room.findFirst({
    where: { id: roomId, projectId: project.id, archived: false },
  });

  if (!room) {
    return NextResponse.json({ error: "Brak dostępu" }, { status: 403 });
  }

  const folder = await prisma.folder.create({
    data: { name: name.trim(), roomId },
  });

  return NextResponse.json(folder, { status: 201 });
}
