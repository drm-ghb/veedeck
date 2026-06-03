import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const designerId = getWorkspaceUserId(session);

  const clients = await prisma.client.findMany({
    where: { designerId, archived: false },
    include: {
      _count: { select: { projects: true } },
      projects: {
        where: { archived: false },
        select: { id: true, title: true, slug: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(clients);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const designerId = getWorkspaceUserId(session);

  const { name } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Nazwa klienta jest wymagana" }, { status: 400 });

  const client = await prisma.client.create({
    data: { designerId, name: name.trim() },
  });

  return NextResponse.json(client, { status: 201 });
}
