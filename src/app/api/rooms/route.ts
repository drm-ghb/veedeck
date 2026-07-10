import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = getWorkspaceUserId(session);

  const projectId = req.nextUrl.searchParams.get("projectId");
  if (!projectId) return NextResponse.json({ error: "Brak projectId" }, { status: 400 });

  const project = await prisma.project.findFirst({ where: { id: projectId, userId } });
  if (!project) return NextResponse.json({ error: "Brak dostępu" }, { status: 403 });

  const rooms = await prisma.room.findMany({
    where: { projectId, archived: false },
    orderBy: [{ pinned: "desc" }, { order: "asc" }],
    select: {
      id: true,
      name: true,
      folders: {
        where: { archived: false },
        orderBy: [{ pinned: "desc" }, { order: "asc" }],
        select: { id: true, name: true },
      },
    },
  });

  return NextResponse.json(rooms);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = getWorkspaceUserId(session);

  const { projectId, name, type, icon } = await req.json();
  if (!projectId || !name?.trim()) {
    return NextResponse.json({ error: "Brakujące pola" }, { status: 400 });
  }

  const project = await prisma.project.findFirst({
    where: { id: projectId, userId },
  });
  if (!project) {
    return NextResponse.json({ error: "Brak dostępu" }, { status: 403 });
  }

  const duplicate = await prisma.room.findFirst({
    where: { projectId, name: { equals: name.trim(), mode: "insensitive" }, archived: false },
  });
  if (duplicate) {
    return NextResponse.json({ error: "Pomieszczenie o tej nazwie już istnieje" }, { status: 409 });
  }

  const count = await prisma.room.count({ where: { projectId } });
  const room = await prisma.room.create({
    data: { projectId, name: name.trim(), type: type ?? "INNE", icon: icon ?? null, order: count },
  });

  return NextResponse.json(room, { status: 201 });
}
