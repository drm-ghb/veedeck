import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const note = await prisma.note.findUnique({ where: { id } });
  if (!note) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (note.userId !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { title, content, archived } = body;

  const updated = await prisma.note.update({
    where: { id },
    data: {
      ...(title !== undefined && { title: title?.trim() || null }),
      ...(content !== undefined && { content: content.trim() }),
      ...(archived !== undefined && { archived }),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const note = await prisma.note.findUnique({ where: { id } });
  if (!note) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (note.userId !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.note.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
