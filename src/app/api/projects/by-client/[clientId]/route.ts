import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const designerId = getWorkspaceUserId(session);
  const { clientId } = await params;

  const client = await prisma.projectClient.findFirst({
    where: {
      id: clientId,
      OR: [
        { client: { designerId } },
        { project: { userId: designerId } },
      ],
    },
    include: { project: { select: { id: true, title: true } } },
  });

  if (!client) {
    return NextResponse.json({ error: "Nie znaleziono klienta" }, { status: 404 });
  }

  return NextResponse.json(client.project);
}
