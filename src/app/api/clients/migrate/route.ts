import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";

// POST /api/clients/migrate
// One-time migration: groups existing projects by clientName → creates Client records
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const designerId = getWorkspaceUserId(session);

  // Only migrate projects that have a clientName but no clientId yet
  const projects = await prisma.project.findMany({
    where: { userId: designerId, clientId: null, NOT: { clientName: null } },
    select: { id: true, clientName: true },
  });

  if (projects.length === 0) {
    return NextResponse.json({ created: 0, linked: 0, message: "Brak projektów do migracji" });
  }

  // Group by clientName
  const grouped = new Map<string, string[]>();
  for (const p of projects) {
    const name = p.clientName!;
    if (!grouped.has(name)) grouped.set(name, []);
    grouped.get(name)!.push(p.id);
  }

  let created = 0;
  let linked = 0;

  for (const [name, projectIds] of grouped) {
    // Check if Client with this name already exists for this designer
    let client = await prisma.client.findFirst({ where: { designerId, name } });
    if (!client) {
      client = await prisma.client.create({ data: { designerId, name } });
      created++;
    }
    await prisma.project.updateMany({
      where: { id: { in: projectIds } },
      data: { clientId: client.id },
    });
    linked += projectIds.length;
  }

  return NextResponse.json({ created, linked });
}
