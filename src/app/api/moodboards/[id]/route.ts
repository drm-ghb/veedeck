import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = getWorkspaceUserId(session);
  const { id } = await params;

  const moodboard = await prisma.moodboard.findFirst({
    where: { id, userId },
    include: {
      client: { select: { id: true, name: true } },
      project: { select: { id: true, title: true } },
    },
  });

  if (!moodboard) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(moodboard);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = getWorkspaceUserId(session);
  const { id } = await params;

  const moodboard = await prisma.moodboard.findFirst({ where: { id, userId } });
  if (!moodboard) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const data: Record<string, unknown> = {};

  if (body.title !== undefined) data.title = body.title;
  if (body.canvasData !== undefined) data.canvasData = body.canvasData;
  if (body.isSharedWithClient !== undefined) data.isSharedWithClient = body.isSharedWithClient;
  if (body.archived !== undefined) data.archived = body.archived;
  if (body.clientId !== undefined) data.clientId = body.clientId || null;
  if (body.projectId !== undefined) data.projectId = body.projectId || null;

  const updated = await prisma.moodboard.update({ where: { id }, data });
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = getWorkspaceUserId(session);
  const { id } = await params;

  const moodboard = await prisma.moodboard.findFirst({ where: { id, userId } });
  if (!moodboard) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.moodboard.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
