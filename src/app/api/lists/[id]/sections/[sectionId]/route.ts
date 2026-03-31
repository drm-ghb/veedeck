import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; sectionId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, sectionId } = await params;
  const { name } = await req.json();

  if (!name?.trim()) return NextResponse.json({ error: "Nazwa jest wymagana" }, { status: 400 });

  const section = await prisma.listSection.findFirst({
    where: { id: sectionId, listId: id, list: { userId: session.user.id } },
  });

  if (!section) return NextResponse.json({ error: "Nie znaleziono sekcji" }, { status: 404 });

  const updated = await prisma.listSection.update({
    where: { id: sectionId },
    data: { name: name.trim() },
  });

  return NextResponse.json(updated);
}
