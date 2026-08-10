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

  const texture = await prisma.texture.findUnique({ where: { id } });
  if (!texture || texture.userId !== userId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const updated = await prisma.texture.update({
    where: { id },
    data: {
      ...(body.name !== undefined ? { name: body.name.trim() } : {}),
      ...(body.category !== undefined ? { category: body.category?.trim() || null } : {}),
      ...(body.manufacturer !== undefined ? { manufacturer: body.manufacturer?.trim() || null } : {}),
      ...(body.resolution !== undefined ? { resolution: body.resolution?.trim() || null } : {}),
      ...(body.scale !== undefined ? { scale: body.scale?.trim() || null } : {}),
      ...(body.finish !== undefined ? { finish: body.finish || null } : {}),
      ...(body.imageUrl !== undefined ? { imageUrl: body.imageUrl || null } : {}),
      ...(body.favorite !== undefined ? { favorite: body.favorite } : {}),
    },
  });
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

  const texture = await prisma.texture.findUnique({ where: { id } });
  if (!texture || texture.userId !== userId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.texture.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
