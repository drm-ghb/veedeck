import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = getWorkspaceUserId(session);
  const { id } = await params;

  const discussion = await prisma.discussion.findUnique({ where: { id } });
  if (!discussion) return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });
  if (discussion.ownerId !== userId) return NextResponse.json({ error: "Brak dostępu" }, { status: 403 });
  if (discussion.type === "project") return NextResponse.json({ error: "Nie można edytować dyskusji projektu" }, { status: 400 });

  const { title } = await req.json();
  if (!title) return NextResponse.json({ error: "Tytuł jest wymagany" }, { status: 400 });

  const updated = await prisma.discussion.update({ where: { id }, data: { title } });
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = getWorkspaceUserId(session);
  const { id } = await params;

  const discussion = await prisma.discussion.findUnique({ where: { id } });
  if (!discussion) return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });
  if (discussion.ownerId !== userId) return NextResponse.json({ error: "Brak dostępu" }, { status: 403 });
  if (discussion.type === "project") return NextResponse.json({ error: "Nie można usunąć dyskusji projektu" }, { status: 400 });

  await prisma.discussion.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
