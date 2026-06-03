import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/client-docs/files?clientId=...
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

  const docs = await prisma.clientDoc.findMany({
    where: { clientId },
    orderBy: { order: "asc" },
  });

  return NextResponse.json(docs);
}

// POST /api/client-docs/files
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { clientId, folderId, name, fileUrl, fileKey, fileType } = body;
  if (!clientId || !name || !fileUrl || !fileKey) {
    return NextResponse.json({ error: "clientId, name, fileUrl, fileKey required" }, { status: 400 });
  }

  const client = await prisma.projectClient.findFirst({
    where: {
      id: clientId,
      OR: [{ client: { designerId: session.user.id } }, { project: { userId: session.user.id } }],
    },
  });
  if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const count = await prisma.clientDoc.count({ where: { clientId, folderId: folderId ?? null } });
  const doc = await prisma.clientDoc.create({
    data: {
      clientId,
      folderId: folderId ?? null,
      name,
      fileUrl,
      fileKey,
      fileType: fileType ?? "file",
      order: count,
    },
  });

  return NextResponse.json(doc, { status: 201 });
}
