import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";

async function getClient(id: string, designerId: string) {
  return prisma.client.findFirst({ where: { id, designerId } });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const designerId = getWorkspaceUserId(session);
  const { id } = await params;

  const client = await prisma.client.findFirst({
    where: { id, designerId },
    include: {
      projects: {
        where: { archived: false },
        select: {
          id: true,
          title: true,
          slug: true,
          description: true,
          createdAt: true,
          clientName: true,
          _count: { select: { renders: true, rooms: true, shoppingLists: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(client);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const designerId = getWorkspaceUserId(session);
  const { id } = await params;

  const existing = await getClient(id, designerId);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.name !== undefined) data.name = body.name.trim() || existing.name;
  if (body.archived !== undefined) data.archived = body.archived;

  const updated = await prisma.client.update({ where: { id }, data });
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const designerId = getWorkspaceUserId(session);
  const { id } = await params;

  const existing = await getClient(id, designerId);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Unlink projects before deleting
  await prisma.project.updateMany({ where: { clientId: id }, data: { clientId: null } });
  await prisma.client.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
