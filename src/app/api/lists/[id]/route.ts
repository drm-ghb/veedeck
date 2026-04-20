import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uniqueSlug } from "@/lib/slug";
import { getWorkspaceUserId } from "@/lib/workspace";

async function getOwnedList(id: string, userId: string) {
  return prisma.shoppingList.findFirst({ where: { id, userId } });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = getWorkspaceUserId(session);

  const { id } = await params;
  const list = await getOwnedList(id, userId);
  if (!list) return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });

  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.name !== undefined) {
    data.name = body.name.trim();
    data.slug = await uniqueSlug(body.name.trim(), (s) =>
      prisma.shoppingList.findFirst({ where: { slug: s, id: { not: id } } }).then(Boolean)
    );
  }
  if (body.archived !== undefined) data.archived = body.archived;
  if (body.pinned !== undefined) data.pinned = body.pinned;
  if (body.projectId !== undefined) data.projectId = body.projectId ?? null;
  if (body.budget !== undefined) data.budget = body.budget !== null ? parseFloat(body.budget) : null;
  if (body.hidePrices !== undefined) data.hidePrices = Boolean(body.hidePrices);

  const updated = await prisma.shoppingList.update({ where: { id }, data });
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
  const list = await getOwnedList(id, userId);
  if (!list) return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });

  await prisma.shoppingList.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
