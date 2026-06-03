import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/client-docs/folders?clientId=...
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const clientId = req.nextUrl.searchParams.get("clientId");
  if (!clientId) return NextResponse.json({ error: "clientId required" }, { status: 400 });

  const client = await prisma.projectClient.findFirst({
    where: {
      id: clientId,
      OR: [{ client: { designerId: session.user.id } }, { project: { userId: session.user.id } }],
    },
  });
  if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const folders = await prisma.clientDocFolder.findMany({
    where: { clientId },
    orderBy: { order: "asc" },
    include: {
      docs: { orderBy: { order: "asc" } },
    },
  });

  return NextResponse.json(folders);
}

// POST /api/client-docs/folders
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { clientId, name } = body;
  if (!clientId || !name) return NextResponse.json({ error: "clientId and name required" }, { status: 400 });

  const client = await prisma.projectClient.findFirst({
    where: {
      id: clientId,
      OR: [{ client: { designerId: session.user.id } }, { project: { userId: session.user.id } }],
    },
  });
  if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const count = await prisma.clientDocFolder.count({ where: { clientId } });
  const folder = await prisma.clientDocFolder.create({
    data: { clientId, name, order: count },
    include: { docs: true },
  });

  return NextResponse.json(folder, { status: 201 });
}
