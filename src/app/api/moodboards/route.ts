import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = getWorkspaceUserId(session);

  const moodboards = await prisma.moodboard.findMany({
    where: { userId, archived: false },
    select: {
      id: true,
      title: true,
      slug: true,
      isSharedWithClient: true,
      createdAt: true,
      updatedAt: true,
      client: { select: { id: true, name: true } },
      project: { select: { id: true, title: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(moodboards);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = getWorkspaceUserId(session);

  const { title, clientId, projectId } = await req.json();
  if (!title?.trim()) return NextResponse.json({ error: "Tytuł jest wymagany" }, { status: 400 });

  const moodboard = await prisma.moodboard.create({
    data: {
      title: title.trim(),
      userId,
      clientId: clientId || null,
      projectId: projectId || null,
      canvasData: { elements: [], viewport: { x: 0, y: 0, scale: 1 } },
    },
    select: { id: true, title: true, slug: true, createdAt: true },
  });

  return NextResponse.json(moodboard, { status: 201 });
}
