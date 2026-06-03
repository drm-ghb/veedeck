import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";

// Returns clients with their projects — used by AssignProjectDialog
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const designerId = getWorkspaceUserId(session);

  const clients = await prisma.client.findMany({
    where: { designerId, archived: false },
    select: {
      id: true,
      name: true,
      projects: {
        where: { archived: false },
        select: { id: true, title: true },
        orderBy: { title: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(clients);
}
