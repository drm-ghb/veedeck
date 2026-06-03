import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";

// POST /api/payment-groups — create group
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = getWorkspaceUserId(session);

  const body = await req.json();
  const { clientId, parentId, name, rfProjectId } = body;

  if (!clientId || !name) {
    return NextResponse.json({ error: "clientId, name required" }, { status: 400 });
  }

  const client = await prisma.projectClient.findFirst({
    where: {
      id: clientId,
      OR: [{ client: { designerId: userId } }, { project: { userId } }],
    },
  });
  if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const count = await prisma.paymentGroup.count({ where: { clientId, parentId: null } });

  const group = await prisma.paymentGroup.create({
    data: {
      clientId,
      parentId: parentId ?? null,
      rfProjectId: rfProjectId ?? null,
      name,
      order: count,
    },
  });

  return NextResponse.json(group, { status: 201 });
}
