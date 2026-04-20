import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; sectionId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, sectionId } = await params;

  const section = await prisma.listSection.findFirst({
    where: { id: sectionId, listId: id, list: { userId: session.user.id } },
  });
  if (!section) return NextResponse.json({ error: "Nie znaleziono sekcji" }, { status: 404 });

  await prisma.listSection.delete({ where: { id: sectionId } });
  return NextResponse.json({ ok: true });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; sectionId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, sectionId } = await params;
  const { name, sortBy, budget } = await req.json();

  const section = await prisma.listSection.findFirst({
    where: { id: sectionId, listId: id, list: { userId: session.user.id } },
  });

  if (!section) return NextResponse.json({ error: "Nie znaleziono sekcji" }, { status: 404 });

  const data: Record<string, unknown> = {};
  if (name !== undefined) {
    if (!name?.trim()) return NextResponse.json({ error: "Nazwa jest wymagana" }, { status: 400 });
    data.name = name.trim();
  }
  if (sortBy !== undefined) data.sortBy = sortBy;
  if (budget !== undefined) data.budget = budget !== null ? parseFloat(budget) : null;

  const updated = await prisma.listSection.update({
    where: { id: sectionId },
    data,
  });

  return NextResponse.json(updated);
}
