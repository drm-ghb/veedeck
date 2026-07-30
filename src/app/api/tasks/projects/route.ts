import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";
import { hasPermission } from "@/lib/permissions";

// GET — list active ProjectFlow projects for the task project dropdown
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!await hasPermission(session, "zadania", 1)) return NextResponse.json({ error: "Brak dostępu" }, { status: 403 });

  const ownerId = getWorkspaceUserId(session);

  const projects = await prisma.project.findMany({
    where: { userId: ownerId, archived: false },
    select: { id: true, title: true },
    orderBy: { title: "asc" },
  });

  return NextResponse.json(projects);
}
