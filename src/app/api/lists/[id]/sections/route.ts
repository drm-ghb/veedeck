import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { order }: { order: string[] } = await req.json();

  if (!Array.isArray(order)) return NextResponse.json({ error: "Nieprawidłowe dane" }, { status: 400 });

  const list = await prisma.shoppingList.findFirst({ where: { id, userId: getWorkspaceUserId(session) } });
  if (!list) return NextResponse.json({ error: "Nie znaleziono listy" }, { status: 404 });

  await Promise.all(
    order.map((sectionId, index) =>
      prisma.listSection.updateMany({
        where: { id: sectionId, listId: id },
        data: { order: index },
      })
    )
  );

  return NextResponse.json({ ok: true });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { name } = await req.json();

  if (!name?.trim()) {
    return NextResponse.json({ error: "Nazwa jest wymagana" }, { status: 400 });
  }

  const list = await prisma.shoppingList.findFirst({
    where: { id, userId: getWorkspaceUserId(session) },
  });

  if (!list) {
    return NextResponse.json({ error: "Nie znaleziono listy" }, { status: 404 });
  }

  const count = await prisma.listSection.count({ where: { listId: id } });

  const section = await prisma.listSection.create({
    data: { name: name.trim(), listId: id, order: count },
    include: { products: true },
  });

  return NextResponse.json(section, { status: 201 });
}
